import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { v4 as uuidv4 } from "uuid";
import { createQueue } from '@/lib/utils/processingQueue';
import { ApiError, ApiErrorCode } from '@/lib/errors/error-handler';

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
      const precision = formData.get("precision") as string || "standard";

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
        // 调用IGES解析服务
        // 在实际实现中，可以使用专业库如OpenCascade或WebAssembly包装的IGES解析器
        
        // 模拟解析结果 - 在实际实现中替换为真实处理
        const result = await simulateIgesParsing(tempFilePath, precision);
        
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

// 模拟IGES解析函数 - 实际项目中替换为真实解析逻辑
async function simulateIgesParsing(filePath: string, precision: string): Promise<any> {
  // 模拟处理延迟
  await new Promise(resolve => setTimeout(resolve, 2500));
  
  // IGES通常包含曲面和曲线
  const surfaceCount = Math.floor(Math.random() * 2000) + 500;
  const curveCount = Math.floor(Math.random() * 5000) + 1000;
  const pointCount = Math.floor(Math.random() * 3000) + 500;
  
  // IGES格式也可能包含一些实体信息
  const faceCount = Math.floor(surfaceCount * 0.8);
  const edgeCount = Math.floor(curveCount * 0.8);
  
  // 随机尺寸 (毫米)
  const width = Math.floor(Math.random() * 500) + 100;
  const height = Math.floor(Math.random() * 400) + 100;
  const depth = Math.floor(Math.random() * 300) + 50;
  
  // 返回模拟结果
  return {
    fileInfo: {
      id: path.basename(filePath, path.extname(filePath)),
      name: path.basename(filePath),
      type: 'iges'
    },
    entities: {
      // IGES特有的实体类型
      surfaces: surfaceCount,
      curves: curveCount,
      points: pointCount,
      
      // 映射到标准类型
      faces: faceCount,
      edges: edgeCount,
      vertices: pointCount,
      
      // 2D元素 (IGES可以包含2D和3D数据)
      lines: Math.floor(curveCount * 0.5),
      circles: Math.floor(Math.random() * 200),
      arcs: Math.floor(Math.random() * 150),
    },
    assemblies: ['默认'], // IGES通常不包含装配体信息
    dimensions: {
      width,
      height,
      depth,
      unit: 'mm'
    },
    metadata: {
      author: 'Unknown',
      createdAt: new Date(Date.now() - Math.random() * 20000000000).toISOString(), // IGES是较老的格式
      modifiedAt: new Date(Date.now() - Math.random() * 5000000000).toISOString(),
      software: generateRandomSoftware(),
      version: `${Math.floor(Math.random() * 10) + 5}.0` // 较旧版本
    },
    // 详细分析结果 (基于精度设置)
    analysis: precision === 'high' ? {
      // 包含的元素类型
      entityTypes: [
        { type: 110, name: '直线', count: Math.floor(Math.random() * 1000) + 100 },
        { type: 126, name: 'B样条曲线', count: Math.floor(Math.random() * 500) + 50 },
        { type: 128, name: 'B样条曲面', count: Math.floor(Math.random() * 300) + 30 },
        { type: 100, name: '圆弧', count: Math.floor(Math.random() * 200) + 20 },
      ]
    } : null,
    // IGES格式特有的警告
    warnings: [
      {
        message: 'IGES是较老的格式，可能存在精度和兼容性问题',
        level: 'low',
        solution: '考虑转换为STEP格式以获得更好的兼容性'
      },
      {
        message: Math.random() > 0.5 ? '检测到部分曲面定义不完整' : null,
        level: 'medium',
        solution: '检查原始模型或使用修复工具'
      }
    ].filter(w => w.message)
  };
}

// 生成随机CAD软件名称 (偏向老旧软件，因为IGES是较老的格式)
function generateRandomSoftware(): string {
  const softwares = [
    'CATIA V4',
    'AutoCAD',
    'Pro/ENGINEER',
    'I-DEAS',
    'CADDS',
    'Unigraphics',
    'EUCLID',
    'CADAM'
  ];
  
  return softwares[Math.floor(Math.random() * softwares.length)];
} 