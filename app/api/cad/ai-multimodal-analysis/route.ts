import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { createQueue } from '@/lib/utils/processingQueue';
import { ApiError, ApiErrorCode } from '@/lib/errors/error-handler';
import { CADAnalysisResult } from '@/lib/types/cad';
import path from "path";
import fs from "fs/promises";
import { AIMultimodalAnalysisResult } from '@/lib/services/cad-analyzer/ai-analyzer';
import { cadMetrics } from '@/lib/services/cad-analyzer/metrics';
import { 
  validateFile, 
  updateSessionStatus, 
  updateSessionProgress,
  createSession,
  generateBasicAnalysisResult,
  createAIAnalysisResult,
  createDomainAnalysis,
  parseIFCFile,
  extractComponentTypes,
  calculateCADStats
} from '@/lib/services/cad-analyzer/controller';
import { 
  CADFileType, 
  CADAnalysisType, 
  DomainSpecificAnalysis 
} from '@/lib/types/cad';
import { isBIMFile } from '@/lib/services/cad-analyzer/cad-analyzer-service';

// 使用处理队列限制并发
const aiAnalysisQueue = createQueue({
  concurrency: 1, // AI分析是计算密集型，限制并发数
  timeout: 300_000 // 5分钟超时
});

/**
 * CAD文件AI多模态分析API
 * 处理上传的CAD文件，使用AI进行增强分析，包括:
 * - 几何结构识别
 * - 组件和材质分析
 * - 专业领域分析（机械/建筑/电气/管道）
 * - 制造性和优化建议
 */
export async function POST(request: NextRequest) {
  try {
    // 获取表单数据
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const fileId = formData.get('fileId')?.toString() || `file_${uuidv4()}`;
    const userId = formData.get('userId')?.toString() || 'anonymous';
    const sessionId = formData.get('sessionId')?.toString() || `session_${uuidv4()}`;
    
    // 获取分析选项
    const analysisTypeRaw = formData.get('analysisType')?.toString() || 'standard';
    const analysisType = ['standard', 'detailed', 'professional', 'measurement'].includes(analysisTypeRaw) 
      ? analysisTypeRaw as CADAnalysisType 
      : 'standard';
    
    const optionsJson = formData.get('options')?.toString() || '{}';
    let options: any = {};
    try {
      options = JSON.parse(optionsJson);
    } catch (e) {
      console.error('解析选项失败，使用默认值', e);
    }
    
    // 验证文件
    const validation = validateFile(file);
    if (!validation.valid) {
      return NextResponse.json({ 
        error: validation.error 
      }, { status: 400 });
    }
    
    const fileType = validation.fileType as CADFileType;
    
    // 创建分析会话
    const session = createSession(file.name, fileType, file.size);
    session.analysisType = analysisType;
    session.sessionId = sessionId;
    
    // 更新会话状态为处理中
    updateSessionStatus(sessionId, 'processing');
    updateSessionProgress(sessionId, 10, '处理文件基本信息');

    // 生成分析结果
    // 注意：实际项目中，这里应该是一个异步过程，将文件发送到处理服务
    // 这里为了演示，我们使用同步代码模拟分析过程
    
    // 1. 生成基本分析结果
    const basicResult = generateBasicAnalysisResult(
      fileId,
      file.name,
      fileType,
      file.size
    );
    
    // 模拟处理时间
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 更新进度
    updateSessionProgress(sessionId, 30, '提取CAD实体数据');
    
    // 2. 计算CAD统计信息
    const stats = calculateCADStats({});
    basicResult.entities = stats.componentCounts;
    
    // 模拟更多分析过程
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 更新进度
    updateSessionProgress(sessionId, 50, 'AI多模态分析');
    
    // 3. 进行AI多模态分析
    let aiAnalysisResult: AIMultimodalAnalysisResult | null = null;
    let domainAnalysis: DomainSpecificAnalysis | null = null;
    
    if (options.includeAIAnalysis !== false) {
      // 根据文件类型构建提示语
      const prompt = `分析这个${file.name}CAD文件，提供详细的工程见解和建议`;
      
      // 调用AI分析
      aiAnalysisResult = await createAIAnalysisResult(prompt, undefined, {
        fileType,
        fileName: file.name,
        fileSize: file.size
      });
      
      // 更新进度
      updateSessionProgress(sessionId, 70, '领域专家分析');
      
      // 4. 如果指定了领域，进行领域特定分析
      if (options.aiModelType && options.aiModelType !== 'general') {
        domainAnalysis = await createDomainAnalysis(
          options.aiModelType as any,
          { fileType, fileName: file.name }
        );
      }
    }
    
    // 5. 如果是BIM/IFC文件，解析特定数据
    let bimData = null;
    if (isBIMFile(fileType) && options.ifcOptions) {
      // 更新进度
      updateSessionProgress(sessionId, 80, '解析BIM数据');
      
      bimData = await parseIFCFile(file, options.ifcOptions as any);
    }
    
    // 6. 生成缩略图链接
    let thumbnail = null;
    if (options.includeThumbnail !== false) {
      // 更新进度
      updateSessionProgress(sessionId, 90, '生成缩略图');
      
      // 模拟缩略图URL
      thumbnail = `/api/cad/generate-thumbnail?id=${fileId}`;
    }
    
    // 构建完整的分析结果
    const fullResult = {
      ...basicResult,
      thumbnail,
      aiAnalysis: aiAnalysisResult,
      domainAnalysis: domainAnalysis,
      bimData: bimData,
      processingTimeMs: 1500, // 模拟处理时间
      options: options
    };
    
    // 更新会话状态为完成
    updateSessionStatus(sessionId, 'completed');
    updateSessionProgress(sessionId, 100, '完成');
    
    // 返回结果
    return NextResponse.json(fullResult);
  } catch (error) {
    console.error('CAD AI多模态分析出错:', error);
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : '分析过程中发生错误',
    }, { status: 500 });
  }
}

/**
 * 获取分析状态与进度
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    
    if (!sessionId) {
      return NextResponse.json({ error: '缺少会话ID' }, { status: 400 });
    }
    
    // 获取指定会话的状态
    // 实际项目中应从数据库或缓存中获取
    const mockProgress = {
      percentage: Math.floor(Math.random() * 100),
      stage: '分析中',
      details: '正在处理组件数据...'
    };
    
    return NextResponse.json({
      sessionId,
      status: 'processing',
      progress: mockProgress
    });
  } catch (error) {
    console.error('获取CAD分析状态出错:', error);
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : '获取状态失败',
    }, { status: 500 });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '20mb' // 支持大尺寸请求 (包含图片)
    }
  }
}; 