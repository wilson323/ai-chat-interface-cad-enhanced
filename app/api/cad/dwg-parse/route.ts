import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { v4 as uuidv4 } from "uuid";
import { createQueue } from '@/lib/utils/processingQueue';
import { ApiError, ApiErrorCode } from '@/lib/errors/error-handler';

// 使用处理队列限制并发
const dwgProcessingQueue = createQueue({
  concurrency: 2,
  timeout: 180_000 // 3分钟超时
});

export async function POST(request: NextRequest) {
  return dwgProcessingQueue.add(async () => {
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
      if (fileExt !== "dwg") {
        throw ApiError.badRequest(`不支持的文件类型: ${fileExt}, 需要DWG文件`);
      }

      // 保存文件到临时目录
      const tempDir = path.join(process.cwd(), "tmp");
      await fs.mkdir(tempDir, { recursive: true });

      const fileId = uuidv4();
      const tempFilePath = path.join(tempDir, `${fileId}.dwg`);
      const fileBuffer = await file.arrayBuffer();
      await fs.writeFile(tempFilePath, Buffer.from(fileBuffer));

      try {
        const result = await convertDwgAndParse(tempFilePath, file.name, precision);

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
      console.error("DWG解析错误:", error);

      if (error instanceof ApiError) {
        return NextResponse.json(
          { error: error.message, code: error.code },
          { status: error.statusCode }
        );
      }

      return NextResponse.json(
        {
          error: `DWG解析失败: ${error instanceof Error ? error.message : String(error)}`,
          code: ApiErrorCode.FILE_PROCESSING_ERROR
        },
        { status: 500 }
      );
    }
  });
}

async function convertDwgAndParse(dwgPath: string, originalName: string, precision: string): Promise<any> {
  const converterUrl = process.env.DWG_CONVERTER_URL;

  if (!converterUrl) {
    throw ApiError.serviceUnavailable(
      'DWG转换服务未配置：请设置 DWG_CONVERTER_URL 指向可用的 DWG->DXF 转换服务（如自建微服务或商用库网关）。',
    );
  }

  // 1) 上传 DWG 到转换服务，获取 DXF
  const dxfBuffer = await convertDwgToDxf(converterUrl, dwgPath, originalName);
  // 2) 使用 dxf-parser 解析 DXF
  const result = await parseDxfBuffer(dxfBuffer);

  return {
    fileInfo: {
      id: path.basename(dwgPath, '.dwg'),
      name: originalName,
      type: 'dwg',
    },
    entities: result.entities,
    layers: result.layers,
    dimensions: result.dimensions,
    metadata: result.metadata,
    devices: result.devices || [],
    wiring: result.wiring || { totalLength: 0, details: [] },
  };
}

async function convertDwgToDxf(converterUrl: string, dwgPath: string, originalName: string): Promise<Buffer> {
  const fileData = await fs.readFile(dwgPath);
  const formData = new FormData();
  const uint8 = new Uint8Array(fileData as unknown as ArrayBuffer);
  const blob = new Blob([uint8], { type: 'application/acad' });
  formData.append('file', blob, originalName);

  const maxRetries = 2;
  const timeoutMs = 60_000;
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const resp = await fetch(`${converterUrl}/convert/dwg-to-dxf`, { method: 'POST', body: formData, signal: controller.signal });
      clearTimeout(timer);
      if (!resp.ok) {
        throw ApiError.serviceUnavailable(`DWG转换失败：${resp.status} ${resp.statusText}`);
      }
      const arrayBuf = await resp.arrayBuffer();
      return Buffer.from(arrayBuf);
    } catch (err) {
      clearTimeout(timer);
      lastError = err;
      if (attempt < maxRetries) {
        const backoffMs = 500 * Math.pow(2, attempt);
        await new Promise(r => setTimeout(r, backoffMs));
        continue;
      }
      break;
    }
  }

  if (lastError instanceof Error) {
    throw ApiError.serviceUnavailable(`DWG转换服务不可用：${lastError.message}`);
  }
  throw ApiError.serviceUnavailable('DWG转换服务不可用：未知错误');
}

async function parseDxfBuffer(dxfBuffer: Buffer): Promise<any> {
  const mod = await import('dxf-parser');
  const Parser = (mod as any).Parser as new () => { parseSync: (content: string) => any };
  const parser = new Parser();
  const dxfContent = dxfBuffer.toString('utf8');
  const doc = parser.parseSync(dxfContent);

  // 提取实体统计
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
      software: 'DXF (converted from DWG)',
      createdAt: new Date().toISOString(),
    },
    devices: [],
    wiring: { totalLength: 0, details: [] },
  };
} 