import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { v4 as uuidv4 } from "uuid";
import { createQueue } from '@/lib/utils/processingQueue';
import { ApiError, ApiErrorCode } from '@/lib/errors/error-handler';
import { cadMetrics } from '@/lib/services/cad-analyzer/metrics';

// 使用处理队列限制并发
const convertQueue = createQueue({
  concurrency: 2,
  timeout: 120_000 // 2分钟超时
});

// 支持的输入格式
const SUPPORTED_INPUT_FORMATS = ['step', 'stp', 'iges', 'igs', 'dwg', 'dxf'];

// 支持的输出格式
const SUPPORTED_OUTPUT_FORMATS = ['stl', 'obj', 'gltf'];

/**
 * CAD文件格式转换API
 * 支持STEP/IGES/DWG/DXF转换为STL/OBJ/GLTF等web友好格式
 */
export async function POST(request: NextRequest) {
  return convertQueue.add(async () => {
    try {
      // 检查请求类型
      if (!request.headers.get("content-type")?.includes("multipart/form-data")) {
        throw ApiError.badRequest("请求格式错误: 应为multipart/form-data");
      }
      
      // 解析表单数据
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      const targetFormat = (formData.get("targetFormat") as string || 'stl').toLowerCase();
      
      // 验证请求数据
      if (!file) {
        throw ApiError.badRequest("未提供文件");
      }
      
      // 检查文件类型
      const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
      if (!SUPPORTED_INPUT_FORMATS.includes(fileExt)) {
        throw ApiError.badRequest(
          `不支持的文件类型: ${fileExt}, 支持的格式: ${SUPPORTED_INPUT_FORMATS.join(', ')}`
        );
      }
      
      // 检查目标格式
      if (!SUPPORTED_OUTPUT_FORMATS.includes(targetFormat)) {
        throw ApiError.badRequest(
          `不支持的目标格式: ${targetFormat}, 支持的格式: ${SUPPORTED_OUTPUT_FORMATS.join(', ')}`
        );
      }
      
      // 记录API调用
      cadMetrics.record('api_call_count', 1, 'count', {
        endpoint: 'convert',
        sourceFormat: fileExt,
        targetFormat
      });

      const fileId = uuidv4();
      const tempDir = path.join(process.cwd(), "tmp");
      await fs.mkdir(tempDir, { recursive: true });
      
      const tempFilePath = path.join(tempDir, `${fileId}.${fileExt}`);
      const fileBuffer = await file.arrayBuffer();
      await fs.writeFile(tempFilePath, Buffer.from(fileBuffer));

      try {
        // 调用转换服务
        const convertedFilePath = await convertCADFile(tempFilePath, fileExt, targetFormat);
        
        // 读取转换后的文件
        const convertedFile = await fs.readFile(convertedFilePath);
        
        // 清理临时文件
        await fs.unlink(tempFilePath);
        await fs.unlink(convertedFilePath);
        
        // 返回转换后的文件
        return new Response(convertedFile as any, {
          headers: {
            "Content-Type": targetFormat === 'pdf' ? 'application/pdf' : 'application/octet-stream',
            "Content-Disposition": `attachment; filename="${file?.name || 'converted'}.${targetFormat}"`,
          },
        })
      } catch (error) {
        // 清理临时文件
        try {
          await fs.unlink(tempFilePath);
        } catch (unlinkError) {
          console.error(`删除临时文件失败: ${tempFilePath}`, unlinkError);
        }
        
        throw error;
      }
    } catch (error) {
      console.error("CAD文件转换错误:", error);
      
      if (error instanceof ApiError) {
        return NextResponse.json(
          { error: error.message, code: error.code },
          { status: error.statusCode }
        );
      }
      
      return NextResponse.json(
        { 
          error: `CAD文件转换失败: ${error instanceof Error ? error.message : String(error)}`,
          code: ApiErrorCode.FILE_PROCESSING_ERROR
        },
        { status: 500 }
      );
    }
  });
}

// 处理GET请求 - 转换URL文件
export async function GET(request: NextRequest) {
  return convertQueue.add(async () => {
    try {
      // 获取查询参数
      const { searchParams } = new URL(request.url);
      const fileUrl = searchParams.get('fileUrl');
      const type = searchParams.get('type');
      const format = searchParams.get('format') || 'stl';
      
      if (!fileUrl) {
        throw ApiError.badRequest("未提供文件URL");
      }
      
      if (!type || !SUPPORTED_INPUT_FORMATS.includes(type)) {
        throw ApiError.badRequest(
          `不支持的文件类型: ${type}, 支持的格式: ${SUPPORTED_INPUT_FORMATS.join(', ')}`
        );
      }
      
      if (!SUPPORTED_OUTPUT_FORMATS.includes(format)) {
        throw ApiError.badRequest(
          `不支持的目标格式: ${format}, 支持的格式: ${SUPPORTED_OUTPUT_FORMATS.join(', ')}`
        );
      }
      
      // 下载文件
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw ApiError.badRequest(`文件下载失败: ${response.status}`);
      }
      
      // 保存到临时目录
      const tempDir = path.join(process.cwd(), "tmp");
      await fs.mkdir(tempDir, { recursive: true });
      
      const fileId = uuidv4();
      const tempFilePath = path.join(tempDir, `${fileId}.${type}`);
      const fileBuffer = await response.arrayBuffer();
      await fs.writeFile(tempFilePath, Buffer.from(fileBuffer));
      
      try {
        // 调用转换服务
        const convertedFilePath = await convertCADFile(tempFilePath, type, format);
        
        // 创建公共URL供前端访问
        const publicDir = path.join(process.cwd(), "public/temp");
        await fs.mkdir(publicDir, { recursive: true });
        
        // 转移文件到公共目录
        const publicFileName = `${fileId}.${format}`;
        const publicFilePath = path.join(publicDir, publicFileName);
        await fs.copyFile(convertedFilePath, publicFilePath);
        
        // 清理原始临时文件
        await fs.unlink(tempFilePath);
        await fs.unlink(convertedFilePath);
        
        // 返回公共URL
        return new NextResponse(`/temp/${publicFileName}`);
      } catch (error) {
        // 清理临时文件
        try {
          await fs.unlink(tempFilePath);
        } catch (unlinkError) {
          console.error(`删除临时文件失败: ${tempFilePath}`, unlinkError);
        }
        
        throw error;
      }
    } catch (error) {
      console.error("CAD文件转换错误:", error);
      
      if (error instanceof ApiError) {
        return NextResponse.json(
          { error: error.message, code: error.code },
          { status: error.statusCode }
        );
      }
      
      return NextResponse.json(
        { 
          error: `CAD文件转换失败: ${error instanceof Error ? error.message : String(error)}`,
          code: ApiErrorCode.FILE_PROCESSING_ERROR
        },
        { status: 500 }
      );
    }
  });
}

/**
 * 转换CAD文件
 * @param filePath 源文件路径
 * @param sourceFormat 源文件格式
 * @param targetFormat 目标格式
 * @returns 转换后文件路径
 */
async function convertCADFile(
  filePath: string, 
  sourceFormat: string, 
  targetFormat: string
): Promise<string> {
  // 在实际项目中，这里应该调用专用的CAD转换库或微服务
  // 例如使用FreeCAD、OpenCascade、CAD Exchanger等
  
  // 这里使用模拟转换，生成一个简单的STL/OBJ/GLTF文件
  const outputPath = filePath.replace(`.${sourceFormat}`, `.${targetFormat}`);
  
  switch (targetFormat) {
    case 'stl':
      await generateSampleSTL(outputPath);
      break;
    case 'obj':
      await generateSampleOBJ(outputPath);
      break;
    case 'gltf':
      await generateSampleGLTF(outputPath);
      break;
    default:
      throw new Error(`不支持的转换目标格式: ${targetFormat}`);
  }
  
  return outputPath;
}

/**
 * 生成示例STL文件
 * 这是一个模拟函数，实际项目中应该使用真实的转换库
 */
async function generateSampleSTL(outputPath: string): Promise<void> {
  // 创建一个简单的STL文件，包含一个立方体
  // STL格式是三角形面的集合
  
  const header = Buffer.from(Array(80).fill(32)); // 80字节的header
  const triangleCount = Buffer.alloc(4); // 三角形数量，4字节
  triangleCount.writeUInt32LE(12, 0); // 立方体有12个三角形
  
  // 创建一个立方体 (2x2x2)
  const vertices = [
    [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
    [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]
  ];
  
  const faces = [
    [0, 1, 2], [0, 2, 3], // 底面
    [4, 5, 6], [4, 6, 7], // 顶面
    [0, 1, 5], [0, 5, 4], // 前面
    [2, 3, 7], [2, 7, 6], // 后面
    [0, 3, 7], [0, 7, 4], // 左面
    [1, 2, 6], [1, 6, 5]  // 右面
  ];
  
  const triangleSize = 50; // 每个三角形50字节
  const triangleData = Buffer.alloc(faces.length * triangleSize);
  
  let offset = 0;
  for (const face of faces) {
    // 法向量 (简化为z轴)
    triangleData.writeFloatLE(0, offset);
    triangleData.writeFloatLE(0, offset + 4);
    triangleData.writeFloatLE(1, offset + 8);
    
    // 三个顶点
    for (let i = 0; i < 3; i++) {
      const vertex = vertices[face[i]];
      triangleData.writeFloatLE(vertex[0], offset + 12 + (i * 12));
      triangleData.writeFloatLE(vertex[1], offset + 16 + (i * 12));
      triangleData.writeFloatLE(vertex[2], offset + 20 + (i * 12));
    }
    
    // 属性字节计数
    triangleData.writeUInt16LE(0, offset + 48);
    
    offset += triangleSize;
  }
  
  // 组合STL文件
  const stlData = Buffer.concat([header, triangleCount, triangleData]);
  await fs.writeFile(outputPath, stlData);
}

/**
 * 生成示例OBJ文件
 * 这是一个模拟函数，实际项目中应该使用真实的转换库
 */
async function generateSampleOBJ(outputPath: string): Promise<void> {
  // 创建一个简单的OBJ文件，包含一个立方体
  const vertices = [
    "v -1.0 -1.0 -1.0",
    "v 1.0 -1.0 -1.0",
    "v 1.0 1.0 -1.0",
    "v -1.0 1.0 -1.0",
    "v -1.0 -1.0 1.0",
    "v 1.0 -1.0 1.0",
    "v 1.0 1.0 1.0",
    "v -1.0 1.0 1.0"
  ];
  
  const faces = [
    "f 1 2 3 4", // 底面
    "f 5 6 7 8", // 顶面
    "f 1 2 6 5", // 前面
    "f 3 4 8 7", // 后面
    "f 1 4 8 5", // 左面
    "f 2 3 7 6"  // 右面
  ];
  
  const objContent = [...vertices, "", ...faces].join("\n");
  await fs.writeFile(outputPath, objContent);
}

/**
 * 生成示例GLTF文件
 * 这是一个模拟函数，实际项目中应该使用真实的转换库
 */
async function generateSampleGLTF(outputPath: string): Promise<void> {
  // 创建一个简单的GLTF JSON文件，包含一个立方体
  const gltfData = {
    "asset": {
      "version": "2.0",
      "generator": "CAD Analyzer Mock Converter"
    },
    "scene": 0,
    "scenes": [
      {
        "nodes": [0]
      }
    ],
    "nodes": [
      {
        "mesh": 0
      }
    ],
    "meshes": [
      {
        "primitives": [
          {
            "attributes": {
              "POSITION": 0,
              "NORMAL": 1
            },
            "indices": 2,
            "mode": 4
          }
        ]
      }
    ],
    "buffers": [
      {
        "byteLength": 840,
        "uri": "data:application/octet-stream;base64,AAAAAAAAAAAAAIA/AACAPwAAAAAAAAAAAACAPwAAgD8AAAAAAACAPwAAgD8AAIA/AAAAAAAAAAAAAIC/AACAPwAAAAAAAAAAAACAvwAAgD8AAAAAAACAvwAAgD8AAIC/AAAAAAAAgL8AAAAAAACAPwAAgL8AAAAAAACAPwAAgL8AAIA/AAAAAAAAgL8AAAAAAACAvwAAgL8AAAAAAACAvwAAgL8AAIC/AAAAAAAAgD8AAAAAAACAPwAAgD8AAAAAAACAPwAAgD8AAIA/AAAAAAAAgD8AAAAAAACAvwAAgD8AAAAAAACAvwAAgD8AAIC/AACAvwAAAAAAAAAAAACAPwAAgL8AAAAAAAAAAAAAgD8AAAAAAACAvwAAgD8AAAAAAACAvwAAgD8AAIA/AACAvwAAAAAAAAAAAACAvwAAgL8AAAAAAAAAAAAAgL8AAAAAAACAvwAAgL8AAAAAAACAvwAAgL8AAIC/AACAPwAAAAAAAAAAAACAPwAAgD8AAAAAAAAAAAAAgD8AAAAAAACAPwAAgD8AAAAAAACAPwAAgD8AAIA/AACAPwAAAAAAAAAAAACAvwAAgD8AAAAAAAAAAAAAgL8AAAAAAACAPwAAgL8AAAAAAACAPwAAgL8AAIC/AAAAAAAAAAAAgD8AAAAAAACAPwAAAAAAgD8AAAAAAACAPwAAgD8AAAAAAACAPwAAgD8AAIA/AAAAAAAAAAAAgD8AAAAAAACAvwAAAAAAgD8AAAAAAACAvwAAgD8AAAAAAACAvwAAgD8AAIC/AAAAAAAAAAAAgL8AAAAAAACAPwAAAAAAgL8AAAAAAACAPwAAgL8AAAAAAACAPwAAgL8AAIC/AAAAAAAAAAAAgL8AAAAAAACAvwAAAAAAgL8AAAAAAACAvwAAgL8AAAAAAACAvwAAgL8AAIC/AAABAAIAAAACAAMABAAFAAYABAAGAAcACAAJAAoACAAKAAsADAANAA4ADAAOAA8AEAARABIAEAASABMAFAAVABYAFAAWABcA"
      }
    ],
    "bufferViews": [
      {
        "buffer": 0,
        "byteOffset": 0,
        "byteLength": 288,
        "target": 34962
      },
      {
        "buffer": 0,
        "byteOffset": 288,
        "byteLength": 288,
        "target": 34962
      },
      {
        "buffer": 0,
        "byteOffset": 576,
        "byteLength": 72,
        "target": 34963
      }
    ],
    "accessors": [
      {
        "bufferView": 0,
        "byteOffset": 0,
        "componentType": 5126,
        "count": 24,
        "type": "VEC3",
        "min": [-1.0, -1.0, -1.0],
        "max": [1.0, 1.0, 1.0]
      },
      {
        "bufferView": 1,
        "byteOffset": 0,
        "componentType": 5126,
        "count": 24,
        "type": "VEC3"
      },
      {
        "bufferView": 2,
        "byteOffset": 0,
        "componentType": 5123,
        "count": 36,
        "type": "SCALAR"
      }
    ]
  };
  
  await fs.writeFile(outputPath, JSON.stringify(gltfData, null, 2));
}

/**
 * 获取内容类型
 */
function getContentType(format: string): string {
  switch (format) {
    case 'stl':
      return 'application/vnd.ms-pki.stl';
    case 'obj':
      return 'application/x-tgif';
    case 'gltf':
      return 'model/gltf+json';
    default:
      return 'application/octet-stream';
  }
} 