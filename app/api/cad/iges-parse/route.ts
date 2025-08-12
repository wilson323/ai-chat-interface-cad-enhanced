import fs from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { v4 as uuidv4 } from "uuid";

import { ApiError, ApiErrorCode } from '@/lib/errors/error-handler';
import { createQueue } from '@/lib/utils/processingQueue';

// 使用处理队列限制并发
const igesProcessingQueue = createQueue({
  concurrency: 2,
  timeout: 240_000 // 4分钟超时 (3D文件处理需要更长时间)
});

export async function POST(request: NextRequest) {
  return igesProcessingQueue.add(async () => {
    try {
      // 检查请求
      if (!request.headers.get("content-type")?.includes("multipart/form-data")) {
        throw ApiError.badRequest("请求格式错误: 应为multipart/form-data");
      }

      // 解析表单
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      const precision = (formData.get("precision") as string) || "standard";

      if (!file) {
        throw ApiError.badRequest("未提供文件");
      }

      // 检查文件类型
      const fileExt = file.name.split(".").pop()?.toLowerCase();
      if (fileExt !== "iges" && fileExt !== "igs") {
        throw ApiError.badRequest(`不支持的文件类型: ${fileExt}, 需要IGES或IGS文件`);
      }

      // 保存文件到临时目录
      const tempDir = path.join(process.cwd(), "tmp");
      await fs.mkdir(tempDir, { recursive: true });

      const fileId = uuidv4();
      const tempFilePath = path.join(tempDir, `${fileId}.${fileExt}`);
      const fileBuffer = await file.arrayBuffer();
      await fs.writeFile(tempFilePath, Buffer.from(fileBuffer));

      try {
        const result = await parseIgesWithOcct(tempFilePath, precision);

        // 删除临时文件
        await fs.unlink(tempFilePath);

        return NextResponse.json(result);
      } catch (error) {
        // 删除临时文件
        try {
          await fs.unlink(tempFilePath);
        } catch (unlinkError) {
          console.error(`删除临时文件失败: ${tempFilePath}`, unlinkError);
        }

        throw error;
      }
    } catch (error) {
      console.error("IGES解析错误:", error);

      if (error instanceof ApiError) {
        return NextResponse.json(
          { error: error.message, code: error.code },
          { status: error.statusCode }
        );
      }

      return NextResponse.json(
        {
          error: `IGES解析失败: ${error instanceof Error ? error.message : String(error)}`,
          code: ApiErrorCode.FILE_PROCESSING_ERROR
        },
        { status: 500 }
      );
    }
  });
}

/* eslint-disable @typescript-eslint/no-var-requires */
async function parseIgesWithOcct(filePath: string, precision: string): Promise<any> {
  const occtEnabled = process.env.OCCT_IMPORT_ENABLED === 'true';

  if (!occtEnabled) {
    throw ApiError.serviceUnavailable(
      'IGES解析未启用：请设置 OCCT_IMPORT_ENABLED=true 并安装/配置 occt-import-js',
      { hint: 'Enable occt-import-js (WASM/Node) with OCCT_IMPORT_ENABLED=true' }
    );
  }

  try {
    const fileData = await fs.readFile(filePath);
    const occtModule: any = await import('occt-import-js');
    const occt: any = (occtModule as any).default || occtModule;

    const importFn: any = occt?.importIges || occt?.importIGES || occt?.readIges || occt?.readIGES;
    if (typeof importFn !== 'function') {
      throw ApiError.internalError('occt-import-js 不可用：未找到 IGES 导入函数');
    }

    const doc: any = await importFn.call(occt, fileData);

    const entities = extractEntitiesFromOcct(doc) || getDefaultEntities();
    const dimensions = extractBoundingBoxFromOcct(doc) || getDefaultDimensions();

    return {
      fileInfo: {
        id: path.basename(filePath, path.extname(filePath)),
        name: path.basename(filePath),
        type: 'iges',
      },
      entities,
      assemblies: ['默认'],
      dimensions,
      metadata: {
        author: doc?.metadata?.author || '未知',
        createdAt: doc?.metadata?.createdAt || new Date().toISOString(),
        modifiedAt: doc?.metadata?.modifiedAt,
        software: doc?.metadata?.software || 'OpenCascade',
        version: doc?.metadata?.version || 'unknown',
      },
      analysis: precision === 'high' ? { detail: 'high' } : null,
      warnings: [],
    };
  } catch (err) {
    console.error('occt-import-js IGES 解析异常:', err);
    throw ApiError.serviceUnavailable(
      'IGES解析失败：请确认 OCCT_IMPORT_ENABLED 已启用且 occt-import-js 可用',
    );
  }
}

function extractEntitiesFromOcct(doc: any): any | null {
  try {
    const counts = doc?.entities || doc?.counts || doc?.statistics;
    if (!counts) return null;
    return {
      lines: counts.lines ?? 0,
      circles: counts.circles ?? 0,
      arcs: counts.arcs ?? 0,
      polylines: counts.polylines ?? 0,
      text: counts.text ?? 0,
      dimensions: counts.dimensions ?? 0,
      blocks: counts.blocks ?? 0,
      faces: counts.faces ?? 0,
      edges: counts.edges ?? 0,
      vertices: counts.vertices ?? 0,
      shells: counts.shells ?? 0,
      solids: counts.solids ?? 0,
    };
  } catch {
    return null;
  }
}

function getDefaultEntities() {
  return {
    lines: 0,
    circles: 0,
    arcs: 0,
    polylines: 0,
    text: 0,
    dimensions: 0,
    blocks: 0,
    faces: 0,
    edges: 0,
    vertices: 0,
    shells: 0,
    solids: 0,
  };
}

function extractBoundingBoxFromOcct(doc: any): any | null {
  try {
    const bbox = doc?.bbox || doc?.boundingBox || doc?.aabb;
    if (!bbox) return null;
    const width = bbox.width ?? Math.abs((bbox.max?.x ?? 0) - (bbox.min?.x ?? 0));
    const height = bbox.height ?? Math.abs((bbox.max?.y ?? 0) - (bbox.min?.y ?? 0));
    const depth = bbox.depth ?? Math.abs((bbox.max?.z ?? 0) - (bbox.min?.z ?? 0));
    return { width, height, depth, unit: 'mm' };
  } catch {
    return null;
  }
}

function getDefaultDimensions() {
  return { width: 100, height: 100, depth: 100, unit: 'mm' };
} 