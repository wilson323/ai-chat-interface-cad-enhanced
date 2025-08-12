/**
 * CAD AI多模态分析器
 * 使用AI增强分析CAD文件
 */

import { AIMultimodalAnalysisResult, CADAnalysisResult } from '@/lib/types/cad';

import { cadMetrics } from './metrics';

interface AnalysisOptions {
  modelType?: 'general' | 'electrical' | 'mechanical' | 'architecture' | 'plumbing';
  detailLevel?: 'basic' | 'standard' | 'detailed';
  includeVisualAnalysis?: boolean;
  includeTechnicalValidation?: boolean;
  includeOptimizationSuggestions?: boolean;
  includeInteractiveGuidance?: boolean;
  includeMaterialAnalysis?: boolean;
}

export class CADMultimodalAIAnalyzer {
  private static instance: CADMultimodalAIAnalyzer;
  private apiKey?: string;
  private endpoint?: string;
  
  private constructor() {}
  
  public static getInstance(): CADMultimodalAIAnalyzer {
    if (!CADMultimodalAIAnalyzer.instance) {
      CADMultimodalAIAnalyzer.instance = new CADMultimodalAIAnalyzer();
    }
    return CADMultimodalAIAnalyzer.instance;
  }
  
  public setCredentials(apiKey: string, endpoint?: string): void {
    this.apiKey = apiKey;
    this.endpoint = endpoint;
  }
  
  public async analyze(
    cadResult: CADAnalysisResult,
    thumbnailUrl?: string,
    options: AnalysisOptions = {}
  ): Promise<AIMultimodalAnalysisResult> {
    try {
      // 准备分析请求
      const apiEndpoint = this.endpoint || process.env.NEXT_PUBLIC_AI_MULTIMODAL_API_URL || '/api/cad/ai-multimodal-analysis';
      
      // 构建请求负载
      const payload = {
        cadMetadata: cadResult,
        screenshot: thumbnailUrl,
      options: {
        modelType: options.modelType || 'general',
        detailLevel: options.detailLevel || 'standard',
        includeVisualAnalysis: options.includeVisualAnalysis !== false,
        includeTechnicalValidation: options.includeTechnicalValidation !== false,
        includeOptimizationSuggestions: options.includeOptimizationSuggestions !== false,
          includeInteractiveGuidance: options.includeInteractiveGuidance === true,
          includeMaterialAnalysis: options.includeMaterialAnalysis === true
      }
    };
    
      // 发送请求
      const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {})
      },
        body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
        throw new Error(`AI分析请求失败: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      
      return this.processResponse(result);
    } catch (error) {
      console.error('CAD AI分析失败:', error);
      // 返回一个基本的结果，避免UI崩溃
      return this.getFallbackResult(cadResult);
    }
  }
  
  private processResponse(response: any): AIMultimodalAnalysisResult {
    // 处理和验证响应
    if (!response || typeof response !== 'object') {
      throw new Error('无效的AI分析响应');
    }
    
    // 确保所有必要的字段都存在
    const result: AIMultimodalAnalysisResult = {
      summary: response.summary || '无法生成摘要',
      observations: Array.isArray(response.observations) ? response.observations : [],
      recommendations: Array.isArray(response.recommendations) ? response.recommendations : [],
      issues: Array.isArray(response.issues) ? response.issues : [],
      components: Array.isArray(response.components) ? response.components : [],
      materialEstimation: Array.isArray(response.materialEstimation) ? response.materialEstimation : [],
      manufacturingDifficulty: response.manufacturingDifficulty || { level: '未知', explanation: '无法评估' },
      // 交互式引导非必需，按需扩展
      analysisVersion: response.analysisVersion || '1.0',
      analysisTimestamp: response.analysisTimestamp || new Date().toISOString()
    };
    
    return result;
  }
  
  private getFallbackResult(cadResult: CADAnalysisResult): AIMultimodalAnalysisResult {
    return {
      summary: `这是${cadResult.fileName}的CAD文件分析。文件包含多个实体，但分析过程中遇到了技术问题。请稍后再试。`,
      observations: ['文件似乎是一个标准的CAD设计', '包含基本的几何形状'],
      recommendations: ['尝试重新上传文件', '如果问题持续，请联系技术支持'],
      issues: [{
        title: '分析失败',
        description: 'AI分析过程中出现技术问题',
        severity: 'info',
        solution: '请稍后再试'
      }],
      components: [],
      materialEstimation: [],
      manufacturingDifficulty: { level: '未知', explanation: '无法评估' },
      // 交互式引导非必需，按需扩展
      analysisVersion: '1.0',
      analysisTimestamp: new Date().toISOString()
    };
  }

  // 新增：交互式分析会话
  public async startInteractiveSession(cadResultId: string): Promise<string> {
    try {
      const response = await fetch('/api/cad/interactive-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {})
        },
        body: JSON.stringify({ cadResultId })
      });
      
      if (!response.ok) {
        throw new Error(`创建交互式会话失败: ${response.status}`);
      }
      
      const result = await response.json();
      return result.sessionId;
    } catch (error) {
      console.error('创建交互式分析会话失败:', error);
      throw error;
    }
  }
  
  // 新增：向交互式会话发送查询
  public async queryInteractiveSession(
    sessionId: string, 
    query: string,
    highlightEntities?: string[]
  ): Promise<any> {
    try {
      const response = await fetch(`/api/cad/interactive-session/${sessionId}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {})
        },
        body: JSON.stringify({ 
          query,
          highlightEntities
        })
      });
      
      if (!response.ok) {
        throw new Error(`查询交互式会话失败: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('查询交互式分析会话失败:', error);
      throw error;
    }
  }
}

export type { AIMultimodalAnalysisResult }; 