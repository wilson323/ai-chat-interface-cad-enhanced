// CAD AI多模态分析集成器
import { CADAnalysisResult } from '@/lib/types/cad';
import { cadMetrics } from './metrics';

// 支持的AI分析模型类型
type AIModelType = 
  | 'general'     // 通用分析
  | 'electrical'  // 电气分析
  | 'mechanical'  // 机械分析
  | 'architecture' // 建筑分析
  | 'plumbing';   // 管道分析

interface AIAnalysisOptions {
  modelType: AIModelType;
  detailLevel: 'basic' | 'standard' | 'comprehensive';
  includeVisualAnalysis: boolean;
  includeTechnicalValidation: boolean;
  includeOptimizationSuggestions: boolean;
  language?: string;
}

interface AIVisualAnalysisResult {
  detectedComponents: {
    type: string;
    confidence: number;
    count: number;
    description: string;
  }[];
  spatialRelationships: {
    description: string;
    confidence: number;
  }[];
  anomalies: {
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    location: string;
    confidence: number;
  }[];
}

interface AITechnicalAnalysisResult {
  standardsCompliance: {
    standard: string;
    compliant: boolean;
    issues: {
      description: string;
      severity: 'low' | 'medium' | 'high';
      recommendations: string[];
    }[];
  }[];
  technicalIssues: {
    category: string;
    description: string;
    impact: string;
    recommendations: string[];
  }[];
  performance: {
    metric: string;
    value: number;
    unit: string;
    benchmark: number;
    status: 'below_average' | 'average' | 'above_average';
  }[];
}

interface AIOptimizationResult {
  designOptimizations: {
    target: string;
    currentValue: string;
    suggestedValue: string;
    estimatedImprovement: string;
    implementationComplexity: 'low' | 'medium' | 'high';
  }[];
  materialSuggestions: {
    component: string;
    currentMaterial: string;
    suggestedMaterial: string;
    rationale: string;
  }[];
  workflowImprovements: string[];
}

export interface TechnicalIssue {
  category: string
  description: string
  impact: string
  severity?: 'critical' | 'high' | 'medium' | 'low'
}

export interface AIMultimodalAnalysisResult {
  confidenceScore: number
  summary: string
  categorySpecificInsights: string
  technicalAnalysis?: {
    technicalIssues: TechnicalIssue[]
  }
  optimizationSuggestions?: {
    workflowImprovements: string[]
  }
}

export class CADMultimodalAIAnalyzer {
  private static instance: CADMultimodalAIAnalyzer;
  
  private constructor() {}
  
  static getInstance(): CADMultimodalAIAnalyzer {
    if (!CADMultimodalAIAnalyzer.instance) {
      CADMultimodalAIAnalyzer.instance = new CADMultimodalAIAnalyzer();
    }
    return CADMultimodalAIAnalyzer.instance;
  }
  
  /**
   * 使用先进的AI模型分析CAD文件
   */
  async analyze(
    cadResult: CADAnalysisResult,
    screenshot?: string, // base64编码的屏幕截图
    options: Partial<AIAnalysisOptions> = {}
  ): Promise<AIMultimodalAnalysisResult> {
    const startTime = Date.now();
    const defaultOptions: AIAnalysisOptions = {
      modelType: 'general',
      detailLevel: 'standard',
      includeVisualAnalysis: true,
      includeTechnicalValidation: true,
      includeOptimizationSuggestions: true,
      language: 'zh-CN',
      ...options
    };
    
    try {
      // 记录分析开始
      console.log(`开始AI多模态分析: ${cadResult.fileName}, 类型: ${defaultOptions.modelType}`);
      
      // 准备分析请求数据
      const analysisData = {
        cadMetadata: {
          fileType: cadResult.fileType,
          entities: cadResult.entities,
          layers: cadResult.layers,
          dimensions: cadResult.dimensions,
          metadata: cadResult.metadata
        },
        screenshot: screenshot || null,
        options: defaultOptions
      };
      
      // 调用AI分析API
      const response = await fetch('/api/cad/ai-multimodal-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(analysisData)
      });
      
      if (!response.ok) {
        throw new Error(`AI分析请求失败: ${response.status}`);
      }
      
      const result = await response.json();
      
      // 记录分析完成指标
      const analysisDuration = Date.now() - startTime;
      cadMetrics.record('ai_analysis_duration', analysisDuration, 'ms', {
        modelType: defaultOptions.modelType,
        detailLevel: defaultOptions.detailLevel
      });
      
      return this.enrichAnalysisResults(result, cadResult);
    } catch (error) {
      console.error('AI多模态分析失败:', error);
      
      // 记录失败
      cadMetrics.record('ai_analysis_error', 1, 'count', {
        error: error instanceof Error ? error.message : String(error)
      });
      
      // 返回基本结果
      return this.generateFallbackAnalysis(cadResult, defaultOptions);
    }
  }
  
  /**
   * 丰富AI分析结果，添加特定领域见解
   */
  private enrichAnalysisResults(
    aiResult: AIMultimodalAnalysisResult, 
    cadResult: CADAnalysisResult
  ): AIMultimodalAnalysisResult {
    // 基于CAD数据特征增强分析
    const entityCount = Object.values(cadResult.entities).reduce((sum, count) => sum + count, 0);
    
    if (entityCount > 1000) {
      aiResult.summary = `${aiResult.summary} 这是一个复杂度较高的设计，包含${entityCount}个元素。`;
    }
    
    // 如果有风险项，添加到技术分析中
    if (cadResult.risks && cadResult.risks.length > 0 && aiResult.technicalAnalysis) {
      cadResult.risks.forEach(risk => {
        if (!aiResult.technicalAnalysis!.technicalIssues.some(issue => 
          issue.description.includes(risk.description)
        )) {
          aiResult.technicalAnalysis!.technicalIssues.push({
            category: risk.type,
            description: risk.description,
            impact: `风险级别: ${risk.level}`,
            severity: risk.level === 'high' ? 'high' : risk.level === 'medium' ? 'medium' : 'low'
          });
        }
      });
    }
    
    return aiResult;
  }
  
  /**
   * 在AI分析失败时生成基本的分析结果
   */
  private generateFallbackAnalysis(
    cadResult: CADAnalysisResult,
    options: AIAnalysisOptions
  ): AIMultimodalAnalysisResult {
    const entityCount = Object.values(cadResult.entities).reduce((sum, count) => sum + count, 0);
    const entityTypes = Object.keys(cadResult.entities).filter(type => cadResult.entities[type] > 0);
    
    let categoryInsight = '';
    switch (options.modelType) {
      case 'electrical':
        categoryInsight = '这似乎是一个电气图纸，建议由专业电气工程师进行详细分析。';
        break;
      case 'mechanical':
        categoryInsight = '这是一个机械设计图纸，包含多种机械元素。';
        break;
      case 'architecture':
        categoryInsight = '这是一个建筑设计图纸，包含建筑结构和空间布局信息。';
        break;
      case 'plumbing':
        categoryInsight = '这是一个管道系统设计图纸，显示了管道布局和连接。';
        break;
      default:
        categoryInsight = '这是一个通用CAD设计图纸。';
    }
    
    return {
      summary: `这个${cadResult.fileType.toUpperCase()}文件包含${entityCount}个元素，分布在${cadResult.layers.length}个图层中。主要元素类型包括${entityTypes.join('、')}。`,
      categorySpecificInsights: categoryInsight,
      confidenceScore: 0.6, // 较低的置信度表明这是基本分析
      visualAnalysis: {
        detectedComponents: [],
        spatialRelationships: [],
        anomalies: []
      },
      technicalAnalysis: {
        standardsCompliance: [],
        technicalIssues: [
          {
            category: '系统稳定性',
            description: '系统稳定性不足',
            impact: '可能导致系统故障',
            severity: 'high'
          }
        ],
        performance: []
      },
      optimizationSuggestions: {
        workflowImprovements: []
      }
    };
  }
}

export const cadAIAnalyzer = CADMultimodalAIAnalyzer.getInstance(); 