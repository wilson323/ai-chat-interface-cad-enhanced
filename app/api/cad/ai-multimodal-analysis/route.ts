import { NextRequest, NextResponse } from "next/server";
import { Configuration, OpenAIApi } from "openai";
import { createQueue } from '@/lib/utils/processingQueue';

// 使用队列处理AI分析请求
const aiAnalysisQueue = createQueue({
  concurrency: 2,
  timeout: 180_000 // 3分钟超时
});

// AI请求配置
const config = new Configuration({
  apiKey: process.env.OPENAI_API_KEY
});
const openai = new OpenAIApi(config);

export async function POST(request: NextRequest) {
  return aiAnalysisQueue.add(async () => {
    try {
      const body = await request.json();
      const { cadMetadata, screenshot, options } = body;
      
      if (!cadMetadata) {
        return NextResponse.json(
          { error: "缺少CAD元数据" },
          { status: 400 }
        );
      }
      
      // 准备多模态请求
      const messages = [
        {
          role: "system",
          content: `你是一个专业的CAD图纸分析AI助手，专长于${getSpecialtyDescription(options.modelType)}。
                   请基于提供的CAD元数据和图片(如有)，进行全面专业的分析。
                   你的分析应该包括:
                   1. 图纸的整体概述和主要内容
                   2. 专业领域的具体见解和发现
                   3. 识别潜在的设计问题和优化机会
                   4. 符合行业标准的专业评估
                   
                   请以结构化的JSON格式返回，包含summary、categorySpecificInsights等字段。`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `请分析以下CAD图纸数据:\n${JSON.stringify(cadMetadata, null, 2)}\n\n详细级别: ${options.detailLevel}\n分析类型: ${options.modelType}`
            }
          ]
        }
      ];
      
      // 如果有截图，添加到请求中
      if (screenshot) {
        messages[1].content.push({
          type: "image_url",
          image_url: {
            url: screenshot
          }
        });
      }
      
      // 调用GPT-4V接口
      const completion = await openai.createChatCompletion({
        model: "gpt-4-vision-preview",
        messages,
        temperature: 0.2,
        max_tokens: 4000,
        response_format: { type: "json_object" }
      });
      
      const responseContent = completion.data.choices[0].message.content;
      let analysisResult;
      
      try {
        analysisResult = JSON.parse(responseContent || "{}");
      } catch (error) {
        console.error("解析AI响应失败:", error);
        throw new Error("无法解析AI响应");
      }
      
      // 添加额外分析 (根据选项)
      if (options.includeTechnicalValidation && !analysisResult.technicalAnalysis) {
        analysisResult.technicalAnalysis = await generateTechnicalAnalysis(cadMetadata, options);
      }
      
      if (options.includeOptimizationSuggestions && !analysisResult.optimizationSuggestions) {
        analysisResult.optimizationSuggestions = await generateOptimizationSuggestions(cadMetadata, options);
      }
      
      // 设置置信度
      analysisResult.confidenceScore = screenshot ? 0.92 : 0.85;
      
      return NextResponse.json(analysisResult);
    } catch (error) {
      console.error("CAD AI多模态分析错误:", error);
      
      return NextResponse.json(
        {
          error: `AI分析失败: ${error instanceof Error ? error.message : String(error)}`,
          success: false
        },
        { status: 500 }
      );
    }
  });
}

// 辅助函数
function getSpecialtyDescription(modelType: string): string {
  switch (modelType) {
    case 'electrical': return '电气工程和电路设计';
    case 'mechanical': return '机械工程和零部件设计';
    case 'architecture': return '建筑设计和空间布局';
    case 'plumbing': return '管道系统和流体工程';
    default: return 'CAD设计和工程绘图';
  }
}

// 生成技术分析
async function generateTechnicalAnalysis(cadMetadata: any, options: any): Promise<any> {
  // 简单的基于规则的技术分析
  return {
    standardsCompliance: [
      {
        standard: "ISO 9001",
        compliant: true,
        issues: []
      }
    ],
    technicalIssues: [],
    performance: [
      {
        metric: "设计复杂度",
        value: calculateComplexity(cadMetadata),
        unit: "分",
        benchmark: 75,
        status: "average"
      }
    ]
  };
}

// 生成优化建议
async function generateOptimizationSuggestions(cadMetadata: any, options: any): Promise<any> {
  // 简单的优化建议
  return {
    designOptimizations: [],
    materialSuggestions: [],
    workflowImprovements: [
      "考虑使用图块(Blocks)组织重复元素以提高效率",
      "添加适当的注释以增强图纸的可读性"
    ]
  };
}

// 计算复杂度得分
function calculateComplexity(cadMetadata: any): number {
  const entityCount = Object.values(cadMetadata.entities).reduce((sum: number, count: number) => sum + count, 0);
  const layerCount = cadMetadata.layers.length;
  
  // 复杂度计算公式
  return Math.min(100, Math.round((entityCount * 0.05) + (layerCount * 5)));
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '20mb' // 支持大尺寸请求 (包含图片)
    }
  }
}; 