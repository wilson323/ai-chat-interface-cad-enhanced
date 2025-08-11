import { NextRequest, NextResponse } from 'next/server';
import { cadMetrics } from '@/lib/services/cad-analyzer/metrics';
import { mkdir, writeFile, readFile, unlink } from 'fs/promises';
import { join, dirname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';
import sharp from 'sharp';
import { CAD_FILE_TYPES } from '@/config/cad-analyzer.config';
import { 
  is2DFileType, 
  is3DFileType, 
  getFileTypeCategory
} from '@/lib/utils/cad-file-utils';
import { cleanupTempFile } from '@/lib/utils/cad-file-utils.server';

const execPromise = promisify(exec);

// Configuration
const THUMBNAIL_WIDTH = 800;
const THUMBNAIL_HEIGHT = 600;
const THUMBNAIL_QUALITY = 85;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const TEMP_DIR = 'tmp/cad-thumbnails';

/**
 * CAD缩略图生成API端点
 * 接收CAD文件，生成缩略图，支持2D和3D文件
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  let tempFilePath = '';
  let thumbnailPath = '';
  
  try {
    // 检查请求格式
    if (!request.headers.get("content-type")?.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: 'Invalid request format: expected multipart/form-data' },
        { status: 400 }
      );
    }
    
    // 解析表单数据
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const mode = formData.get('mode') as string || 'auto'; // 'auto', '2d', or '3d'
    const width = Number(formData.get('width')) || THUMBNAIL_WIDTH;
    const height = Number(formData.get('height')) || THUMBNAIL_HEIGHT;
    const quality = Number(formData.get('quality')) || THUMBNAIL_QUALITY;
    
    // 验证请求数据
    if (!file) {
      return NextResponse.json(
        { error: 'Missing file' },
        { status: 400 }
      );
    }

    // 检查文件大小
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large: ${(file.size / (1024 * 1024)).toFixed(2)}MB, max allowed is ${MAX_FILE_SIZE / (1024 * 1024)}MB` },
        { status: 400 }
      );
    }
    
    // 获取文件类型
    const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
    
    // 记录API调用
    cadMetrics.record('api_call_count', 1, 'count', {
      endpoint: 'generate-thumbnail',
      fileType: fileExt,
      mode
    });
    
    // 验证文件类型
    const fileCategory = getFileTypeCategory(fileExt);
    if (!fileCategory) {
      return NextResponse.json(
        { error: `Unsupported file type: ${fileExt}` },
        { status: 400 }
      );
    }
    
    // 如果是auto模式，根据文件扩展名判断是2D还是3D
    let thumbnailMode = mode;
    if (mode === 'auto') {
      thumbnailMode = fileCategory;
    } else if (mode === '2d' && !is2DFileType(fileExt)) {
      return NextResponse.json(
        { error: `Cannot generate 2D thumbnail for 3D file type: ${fileExt}` },
        { status: 400 }
      );
    } else if (mode === '3d' && !is3DFileType(fileExt)) {
      return NextResponse.json(
        { error: `Cannot generate 3D thumbnail for 2D file type: ${fileExt}` },
        { status: 400 }
      );
    }
    
    // 保存文件到临时目录
    const tempDir = join(process.cwd(), TEMP_DIR);
    await mkdir(tempDir, { recursive: true });
    
    const fileId = uuidv4();
    tempFilePath = join(tempDir, `${fileId}.${fileExt}`);
    thumbnailPath = join(tempDir, `${fileId}-thumbnail.png`);
    
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(tempFilePath, buffer);
    
    // 生成缩略图
    let thumbnailData: string;
    
    try {
      if (thumbnailMode === '3d') {
        thumbnailData = await generate3DThumbnail(tempFilePath, fileExt, thumbnailPath, { width, height, quality });
      } else {
        thumbnailData = await generate2DThumbnail(tempFilePath, fileExt, thumbnailPath, { width, height, quality });
      }
    } catch (thumbnailError) {
      console.error('缩略图生成失败，使用默认缩略图:', thumbnailError);
      // 如果渲染失败，生成一个默认缩略图
      thumbnailData = await generateMockThumbnailFile(thumbnailMode as '2d' | '3d', fileExt, thumbnailPath, { width, height, quality });
    }
    
    // 记录处理时间
    const duration = Date.now() - startTime;
    cadMetrics.record('thumbnail_generation_time', duration, 'ms', {
      fileType: fileExt,
      mode: thumbnailMode
    });
    
    // 返回结果
    return NextResponse.json({ 
      thumbnail: thumbnailData,
      fileType: fileExt,
      mode: thumbnailMode,
      width,
      height,
      generationTimeMs: duration
    });
  } catch (error) {
    console.error('CAD缩略图生成失败:', error);
    
    // 记录错误
    cadMetrics.record('error_count', 1, 'count', {
      error: error instanceof Error ? error.message : String(error),
      endpoint: 'generate-thumbnail'
    });
    
    return NextResponse.json(
      { error: 'Failed to generate thumbnail', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  } finally {
    // 清理临时文件
    await Promise.all([
      cleanupTempFile(tempFilePath),
      cleanupTempFile(thumbnailPath)
    ]);
  }
}

/**
 * 生成3D模型缩略图
 */
async function generate3DThumbnail(
  filePath: string, 
  fileType: string, 
  outputPath: string,
  options: { width: number, height: number, quality: number }
): Promise<string> {
  try {
    // 检查是否有实际的3D渲染工具
    const has3DRenderer = await checkFor3DRenderer();
    
    if (has3DRenderer) {
      // 使用实际的3D渲染工具生成缩略图
      await render3DModel(filePath, fileType, outputPath, options);
    } else {
      // 退回到模拟生成
      await generateMockThumbnailFile('3d', fileType, outputPath, options);
    }
    
    // 读取生成的缩略图文件并转换为base64
    const imageBuffer = await readFile(outputPath);
    return `data:image/png;base64,${imageBuffer.toString('base64')}`;
  } catch (error) {
    console.error('3D缩略图生成失败:', error);
    throw new Error(`3D thumbnail generation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 生成2D图纸缩略图
 */
async function generate2DThumbnail(
  filePath: string, 
  fileType: string, 
  outputPath: string,
  options: { width: number, height: number, quality: number }
): Promise<string> {
  try {
    // 检查是否有实际的2D渲染工具
    const has2DRenderer = await checkFor2DRenderer();
    
    if (has2DRenderer) {
      // 使用实际的2D渲染工具生成缩略图
      await render2DDrawing(filePath, fileType, outputPath, options);
    } else {
      // 退回到模拟生成
      await generateMockThumbnailFile('2d', fileType, outputPath, options);
    }
    
    // 读取生成的缩略图文件并转换为base64
    const imageBuffer = await readFile(outputPath);
    return `data:image/png;base64,${imageBuffer.toString('base64')}`;
  } catch (error) {
    console.error('2D缩略图生成失败:', error);
    throw new Error(`2D thumbnail generation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 检查是否有3D渲染工具可用
 */
async function checkFor3DRenderer(): Promise<boolean> {
  try {
    // 检查node-occ或three.js渲染工具是否可用
    // 这里是一个简化的检查，实际实现应当检查特定的库或可执行文件
    return false; // 当前默认为不可用，实际项目中应该进行真实检测
  } catch (error) {
    console.warn('3D渲染工具检查失败:', error);
    return false;
  }
}

/**
 * 检查是否有2D渲染工具可用
 */
async function checkFor2DRenderer(): Promise<boolean> {
  try {
    // 检查PDF.js或DXF解析库是否可用
    // 这里是一个简化的检查，实际实现应当检查特定的库或可执行文件
    return false; // 当前默认为不可用，实际项目中应该进行真实检测
  } catch (error) {
    console.warn('2D渲染工具检查失败:', error);
    return false;
  }
}

/**
 * 使用Three.js或其他库渲染3D模型
 */
async function render3DModel(
  filePath: string, 
  fileType: string, 
  outputPath: string,
  options: { width: number, height: number, quality: number }
): Promise<void> {
  // 这里应该调用适当的3D渲染工具库
  // 例如，使用node-occ、three.js的node绑定等
  
  // 简化示例: 使用命令行工具生成渲染
  try {
    const command = `render3d --input "${filePath}" --output "${outputPath}" --width ${options.width} --height ${options.height} --quality ${options.quality}`;
    await execPromise(command);
    
    // 验证输出文件存在
    if (!existsSync(outputPath)) {
      throw new Error('Renderer did not produce output file');
    }
  } catch (error) {
    console.error('3D模型渲染失败:', error);
    throw new Error(`Failed to render 3D model: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 使用PDF.js或其他库渲染2D图纸
 */
async function render2DDrawing(
  filePath: string, 
  fileType: string, 
  outputPath: string,
  options: { width: number, height: number, quality: number }
): Promise<void> {
  // 这里应该调用适当的2D渲染工具库
  // 例如，使用PDF.js、DXF解析库等
  
  // 简化示例: 使用命令行工具生成渲染
  try {
    const command = `render2d --input "${filePath}" --output "${outputPath}" --width ${options.width} --height ${options.height} --quality ${options.quality}`;
    await execPromise(command);
    
    // 验证输出文件存在
    if (!existsSync(outputPath)) {
      throw new Error('Renderer did not produce output file');
    }
  } catch (error) {
    console.error('2D图纸渲染失败:', error);
    throw new Error(`Failed to render 2D drawing: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 生成模拟缩略图文件
 */
async function generateMockThumbnailFile(
  mode: '2d' | '3d', 
  fileType: string, 
  outputPath: string,
  options: { width: number, height: number, quality: number }
): Promise<string> {
  // 创建一个简单的SVG作为模拟缩略图
  const width = options.width;
  const height = options.height;
  let svg: string;
  
  if (mode === '3d') {
    // 生成3D模型示意图
    svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f0f0f0"/>
        <polygon points="${width/2},${height/4} ${width*3/4},${height*3/4} ${width/2},${height*3/4} ${width/4},${height*3/4}" 
                 fill="#6cb33f" stroke="#333" stroke-width="2"/>
        <polygon points="${width/2},${height/4} ${width/4},${height*3/4} ${width/2},${height*0.85}" 
                 fill="#4a9325" stroke="#333" stroke-width="2"/>
        <polygon points="${width/2},${height/4} ${width/2},${height*0.85} ${width*3/4},${height*3/4}" 
                 fill="#8bc34a" stroke="#333" stroke-width="2"/>
        <text x="${width/2}" y="${height*0.95}" font-family="Arial" font-size="${width/20}" text-anchor="middle">
          ${fileType.toUpperCase()} 3D Model
        </text>
      </svg>
    `;
  } else {
    // 生成2D图纸示意图
    svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f0f0f0"/>
        <line x1="${width/6}" y1="${height/4}" x2="${width*5/6}" y2="${height/4}" stroke="#333" stroke-width="2"/>
        <line x1="${width*5/6}" y1="${height/4}" x2="${width*5/6}" y2="${height*3/4}" stroke="#333" stroke-width="2"/>
        <line x1="${width*5/6}" y1="${height*3/4}" x2="${width/6}" y2="${height*3/4}" stroke="#333" stroke-width="2"/>
        <line x1="${width/6}" y1="${height*3/4}" x2="${width/6}" y2="${height/4}" stroke="#333" stroke-width="2"/>
        <circle cx="${width/2}" cy="${height/2}" r="${height/5}" fill="#6cb33f" stroke="#333" stroke-width="2"/>
        <text x="${width/2}" y="${height*0.9}" font-family="Arial" font-size="${width/20}" text-anchor="middle">
          ${fileType.toUpperCase()} 2D Drawing
        </text>
      </svg>
    `;
  }
  
  try {
    // 使用sharp将SVG转换为PNG
    await sharp(Buffer.from(svg))
      .png({ quality: options.quality })
      .toFile(outputPath);
    
    // 读取生成的缩略图文件并转换为base64
    const imageBuffer = await readFile(outputPath);
    return `data:image/png;base64,${imageBuffer.toString('base64')}`;
  } catch (error) {
    console.error('模拟缩略图生成失败:', error);
    throw new Error(`Failed to generate mock thumbnail: ${error instanceof Error ? error.message : String(error)}`);
  }
} 