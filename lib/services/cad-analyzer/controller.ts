// CAD多维度解析集成控制器
import { parseCADFile, ParserOptions } from './parsers';
import { cadAIAnalyzer, AIMultimodalAnalysisResult } from './ai-analyzer';
import { validateCADAnalysisResult } from './validation';
import { cadMetrics } from './metrics';
import { generateCADReport, ReportOptions } from './report-generator';
import { CADAnalysisResult } from '@/lib/types/cad';
import { captureException } from '@/lib/utils/error';

// 高级解析选项
export interface AdvancedAnalysisOptions extends ParserOptions {
  // 解析选项
  generateThumbnail: boolean;
  extractColors: boolean;
  
  // AI分析选项
  useAI: boolean;
  aiModelType: 'general' | 'electrical' | 'mechanical' | 'architecture' | 'plumbing';
  aiDetailLevel: 'basic' | 'standard' | 'comprehensive';
  
  // 验证选项
  performValidation: boolean;
  validationLevel: 'basic' | 'strict';
  
  // 报告选项
  generateReport: boolean;
  reportFormat: 'pdf' | 'html' | 'markdown';
  
  // 性能选项
  useWorker: boolean;
  cacheResults: boolean;
}

// 分析结果
export interface CADEnhancedAnalysisResult {
  basicResult: CADAnalysisResult;
  aiResult?: AIMultimodalAnalysisResult;
  validationResult?: any;
  report?: string | Blob;
  thumbnail?: string;
  processingMetrics: {
    totalTime: number;
    parsingTime: number;
    aiAnalysisTime?: number;
    validationTime?: number;
    reportGenerationTime?: number;
  };
}

// 分析状态更新回调
export type ProgressCallback = (progress: number, stage: string) => void;

/**
 * CAD解析控制中心 - 协调所有解析和分析流程
 */
export class CADAnalysisController {
  private static instance: CADAnalysisController;
  
  private constructor() {}
  
  static getInstance(): CADAnalysisController {
    if (!CADAnalysisController.instance) {
      CADAnalysisController.instance = new CADAnalysisController();
    }
    return CADAnalysisController.instance;
  }
  
  /**
   * 执行全面的CAD文件分析
   */
  async analyzeCADFile(
    file: File,
    options: Partial<AdvancedAnalysisOptions> = {},
    progressCallback?: ProgressCallback
  ): Promise<CADEnhancedAnalysisResult> {
    const startTime = Date.now();
    const metrics: CADEnhancedAnalysisResult['processingMetrics'] = {
      totalTime: 0,
      parsingTime: 0
    };
    
    // 设置默认选项
    const defaultOptions: AdvancedAnalysisOptions = {
      // 解析选项
      precision: 'standard',
      extractLayers: true,
      extractMetadata: true,
      extractEntities: true,
      extractDimensions: true,
      generateThumbnail: true,
      extractColors: true,
      
      // AI分析选项
      useAI: true,
      aiModelType: 'general',
      aiDetailLevel: 'standard',
      
      // 验证选项
      performValidation: true,
      validationLevel: 'basic',
      
      // 报告选项
      generateReport: false,
      reportFormat: 'markdown',
      
      // 性能选项
      useWorker: file.size > 5 * 1024 * 1024, // 大于5MB使用工作线程
      cacheResults: true,
      
      ...options
    };
    
    try {
      // 步骤1: 基础解析
      progressCallback?.(10, '正在解析CAD文件结构...');
      const parseStartTime = Date.now();
      
      const fileType = file.name.split('.').pop()?.toLowerCase() || '';
      const basicResult = await parseCADFile(file, fileType, {
        precision: defaultOptions.precision,
        extractLayers: defaultOptions.extractLayers,
        extractMetadata: defaultOptions.extractMetadata,
        extractEntities: defaultOptions.extractEntities,
        extractDimensions: defaultOptions.extractDimensions
      });
      
      metrics.parsingTime = Date.now() - parseStartTime;
      progressCallback?.(30, '基础解析完成，正在进行高级分析...');
      
      // 创建结果对象
      const result: CADEnhancedAnalysisResult = {
        basicResult,
        processingMetrics: metrics
      };
      
      // 步骤2: 验证 (如果启用)
      if (defaultOptions.performValidation) {
        progressCallback?.(40, '正在验证CAD文件...');
        const validationStartTime = Date.now();
        
        result.validationResult = validateCADAnalysisResult(basicResult);
        
        metrics.validationTime = Date.now() - validationStartTime;
      }
      
      // 步骤3: 生成缩略图 (如果启用)
      let screenshot: string | undefined;
      if (defaultOptions.generateThumbnail) {
        progressCallback?.(50, '正在生成缩略图...');
        screenshot = await this.generateThumbnail(file, basicResult);
        result.thumbnail = screenshot;
      }
      
      // 步骤4: AI多模态分析 (如果启用)
      if (defaultOptions.useAI) {
        progressCallback?.(60, '正在进行AI智能分析...');
        const aiStartTime = Date.now();
        
        result.aiResult = await cadAIAnalyzer.analyze(basicResult, screenshot, {
          modelType: defaultOptions.aiModelType,
          detailLevel: defaultOptions.aiDetailLevel,
          includeVisualAnalysis: true,
          includeTechnicalValidation: true,
          includeOptimizationSuggestions: true
        });
        
        metrics.aiAnalysisTime = Date.now() - aiStartTime;
      }
      
      // 步骤5: 生成报告 (如果启用)
      if (defaultOptions.generateReport) {
        progressCallback?.(80, '正在生成分析报告...');
        const reportStartTime = Date.now();
        
        const reportOptions: Partial<ReportOptions> = {
          includeValidation: defaultOptions.performValidation,
          includeScreenshots: defaultOptions.generateThumbnail,
          includeAIInsights: defaultOptions.useAI,
          format: defaultOptions.reportFormat
        };
        
        result.report = await generateCADReport(basicResult, reportOptions);
        
        metrics.reportGenerationTime = Date.now() - reportStartTime;
      }
      
      // 完成处理
      metrics.totalTime = Date.now() - startTime;
      progressCallback?.(100, '分析完成');
      
      // 记录性能指标
      cadMetrics.record('total_analysis_time', metrics.totalTime, 'ms', {
        fileType,
        fileSize: `${Math.round(file.size / 1024)}KB`,
        aiEnabled: String(defaultOptions.useAI)
      });
      
      return result;
    } catch (error) {
      // 记录错误
      captureException(error);
      
      // 记录失败指标
      cadMetrics.record('analysis_error', 1, 'count', {
        fileType: file.name.split('.').pop()?.toLowerCase() || '',
        error: error instanceof Error ? error.message : String(error)
      });
      
      throw error;
    }
  }
  
  /**
   * 生成CAD文件缩略图
   */
  private async generateThumbnail(file: File, result: CADAnalysisResult): Promise<string | undefined> {
    try {
      // 这里应该根据CAD类型选择适当的渲染方法
      // 简单实现可以使用后端渲染服务或基于Three.js的前端渲染
      
      // 模拟实现 - 实际项目中替换为真实渲染代码
      const response = await fetch('/api/cad/generate-thumbnail', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fileType: result.fileType,
          fileId: result.id
        })
      });
      
      if (!response.ok) {
        throw new Error('缩略图生成失败');
      }
      
      const data = await response.json();
      return data.thumbnailUrl;
    } catch (error) {
      console.error('生成缩略图失败:', error);
      return undefined;
    }
  }
}

export const cadController = CADAnalysisController.getInstance(); 