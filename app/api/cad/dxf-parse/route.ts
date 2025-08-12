import fs from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { v4 as uuidv4 } from "uuid";

import { ApiError, ApiErrorCode } from '@/lib/errors/error-handler';
import { createQueue } from '@/lib/utils/processingQueue';

// 使用处理队列限制并发
const dxfProcessingQueue = createQueue({
  concurrency: 2,
  timeout: 120_000 // 2分钟超时
});

export async function POST(request: NextRequest) {
  return dxfProcessingQueue.add(async () => {
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
      if (fileExt !== "dxf") {
        throw ApiError.badRequest(`不支持的文件类型: ${fileExt}, 需要DXF文件`);
      }

      // 保存文件到临时目录
      const tempDir = path.join(process.cwd(), "tmp");
      await fs.mkdir(tempDir, { recursive: true });

      const fileId = uuidv4();
      const tempFilePath = path.join(tempDir, `${fileId}.dxf`);
      const fileBuffer = await file.arrayBuffer();
      await fs.writeFile(tempFilePath, Buffer.from(fileBuffer));

      try {
        const result = await parseDxfFile(tempFilePath, file.name, precision);

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
      console.error("DXF解析错误:", error);

      if (error instanceof ApiError) {
        return NextResponse.json(
          { error: error.message, code: error.code },
          { status: error.statusCode }
        );
      }

      return NextResponse.json(
        {
          error: `DXF解析失败: ${error instanceof Error ? error.message : String(error)}`,
          code: ApiErrorCode.FILE_PROCESSING_ERROR
        },
        { status: 500 }
      );
    }
  });
}

async function parseDxfFile(filePath: string, originalName: string, precision: string): Promise<any> {
  try {
    const dxfContent = await fs.readFile(filePath, 'utf8');
    const mod = await import('dxf-parser');
    const Parser = (mod as any).Parser as new () => { parseSync: (content: string) => any };
    const parser = new Parser();
    const doc = parser.parseSync(dxfContent);

    // 实体统计
    const counts: Record<string, number> = {};
    const entities = Array.isArray(doc?.entities) ? doc.entities : [];
    for (const ent of entities) {
      const type = ent.type || ent.entityType || 'UNKNOWN';
      counts[type] = (counts[type] || 0) + 1;
    }

    const layers = Array.isArray(doc?.tables?.layers?.layers)
      ? doc.tables.layers.layers.map((l: any) => l.name)
      : [];

    const bbox = doc?.header?.$EXTMAX && doc?.header?.$EXTMIN
      ? {
          width: Math.abs((doc.header.$EXTMAX.x || 0) - (doc.header.$EXTMIN.x || 0)),
          height: Math.abs((doc.header.$EXTMAX.y || 0) - (doc.header.$EXTMIN.y || 0)),
          unit: 'unit',
        }
      : { width: 1000, height: 1000, unit: 'unit' };

    return {
      fileInfo: {
        id: path.basename(filePath, '.dxf'),
        name: originalName,
        type: 'dxf',
      },
      entities: {
        lines: counts.LINE || 0,
        circles: counts.CIRCLE || 0,
        arcs: counts.ARC || 0,
        polylines: (counts.LWPOLYLINE || 0) + (counts.POLYLINE || 0),
        text: (counts.TEXT || 0) + (counts.MTEXT || 0),
        dimensions: counts.DIMENSION || 0,
        blocks: counts.INSERT || 0,
      },
      layers,
      dimensions: bbox,
      metadata: {
        software: 'DXF',
        createdAt: new Date().toISOString(),
      },
      devices: [],
      wiring: { totalLength: 0, details: [] },
    };
  } catch (err) {
    console.error('DXF真实解析失败:', err);
    throw ApiError.serviceUnavailable(
      'DXF解析失败：请上传有效DXF文件。系统已禁用任何模拟回退。',
    );
  }
}

 
