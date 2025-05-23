// DWG专用解析器
import type { CADAnalysisResult } from '@/lib/types/cad';
import type { ParserOptions } from './index';

export class DWGParser {
  async parse(fileData: File | ArrayBuffer, options: ParserOptions): Promise<CADAnalysisResult> {
    // 转换为ArrayBuffer处理
    const buffer = fileData instanceof File 
      ? await fileData.arrayBuffer()
      : fileData;
    
    // 基本信息提取
    const fileName = fileData instanceof File ? fileData.name : 'unknown.dwg';
    const id = Date.now().toString();
    
    try {
      // DWG是AutoCAD的原生格式，需要专用服务解析
      const formData = new FormData();
      const file = fileData instanceof File 
        ? fileData 
        : new File([buffer], fileName, { type: 'application/acad' });
      
      formData.append('file', file);
      formData.append('precision', options.precision);
      
      const response = await fetch('/api/cad/dwg-parse', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`DWG解析服务返回错误: ${response.status}`);
      }
      
      const result = await response.json();
      
      // 整合解析结果
      const entities = this.processEntities(result.entities);
      
      return {
        id,
        fileName,
        fileType: 'dwg',
        fileSize: buffer.byteLength,
        url: fileData instanceof File ? URL.createObjectURL(fileData) : '',
        entities,
        layers: result.layers || ['默认'],
        dimensions: this.processDimensions(result.dimensions),
        metadata: {
          author: result.metadata?.author || '未知',
          createdAt: result.metadata?.createdAt || new Date().toISOString(),
          modifiedAt: result.metadata?.modifiedAt,
          software: result.metadata?.software || 'AutoCAD',
          version: result.metadata?.version || '未知',
        },
        devices: result.devices || [],
        wiring: result.wiring || {
          totalLength: 0,
          details: []
        },
        risks: this.identifyRisks(result),
        originalFile: fileData instanceof File ? fileData : undefined,
        aiInsights: {
          summary: this.generateSummary(entities, result.dimensions),
          recommendations: this.generateRecommendations(entities),
        },
      };
    } catch (error) {
      console.error('DWG解析失败:', error);
      
      // 如果服务解析失败，返回基本结果
      return this.createFallbackResult(fileData, buffer, id, fileName);
    }
  }
  
  // 处理实体数据
  private processEntities(rawEntities: any): CADAnalysisResult['entities'] {
    if (!rawEntities) {
      return this.getDefaultEntities();
    }
    
    // DWG文件实体类型映射到标准格式
    return {
      lines: rawEntities.lines || 0,
      circles: rawEntities.circles || 0,
      arcs: rawEntities.arcs || 0,
      polylines: rawEntities.polylines || 0,
      text: rawEntities.text || 0,
      dimensions: rawEntities.dimensions || 0,
      blocks: rawEntities.blocks || 0,
    };
  }
  
  // 处理尺寸信息
  private processDimensions(rawDimensions: any): any {
    if (!rawDimensions) {
      return this.getDefaultDimensions();
    }
    
    // 提取尺寸信息
    return {
      width: rawDimensions.width || 0,
      height: rawDimensions.height || 0,
      unit: rawDimensions.unit || 'mm',
    };
  }
  
  // 识别潜在问题
  private identifyRisks(result: any): any[] {
    const risks = [];
    
    // 检查实体数量
    const entityCount = result.entities ? (
      (result.entities.lines || 0) + 
      (result.entities.circles || 0) + 
      (result.entities.arcs || 0) + 
      (result.entities.polylines || 0)
    ) : 0;
    
    if (entityCount > 50000) {
      risks.push({
        description: '图纸包含大量实体，可能导致渲染性能问题',
        level: 'medium',
        solution: '考虑简化图纸或使用更高性能的硬件'
      });
    }
    
    // 检查文本实体 - 可能包含重要信息
    if ((result.entities?.text || 0) > 500) {
      risks.push({
        description: '图纸包含大量文本，确保重要注释不被忽略',
        level: 'low',
        solution: '仔细检查文本注释，尤其是技术规格和警告'
      });
    }
    
    // 从后端返回的风险
    if (result.risks && Array.isArray(result.risks)) {
      risks.push(...result.risks);
    }
    
    return risks;
  }
  
  // 创建后备结果
  private createFallbackResult(
    fileData: File | ArrayBuffer, 
    buffer: ArrayBuffer, 
    id: string, 
    fileName: string
  ): CADAnalysisResult {
    const entities = this.getDefaultEntities();
    const dimensions = this.getDefaultDimensions();
    
    return {
      id,
      fileName,
      fileType: 'dwg',
      fileSize: buffer.byteLength,
      url: fileData instanceof File ? URL.createObjectURL(fileData) : '',
      entities,
      layers: ['默认'],
      dimensions,
      metadata: {
        author: '未知',
        createdAt: new Date().toISOString(),
        software: 'AutoCAD',
        version: '未知',
      },
      devices: [],
      wiring: {
        totalLength: 0,
        details: []
      },
      risks: [{
        description: '无法解析DWG文件，需要专业CAD软件支持',
        level: 'high',
        solution: '使用AutoCAD或其他支持DWG格式的软件打开'
      }],
      originalFile: fileData instanceof File ? fileData : undefined,
      aiInsights: {
        summary: 'DWG是AutoCAD的原生文件格式，包含完整的设计数据，但需要专业软件完全解析。',
        recommendations: [
          "使用AutoCAD或DWG查看器打开此文件",
          "考虑转换为DXF格式以获得更好的兼容性",
          "查找文件关联的其他资源（如参照文件或外部引用）"
        ],
      },
    };
  }
  
  // 默认实体
  private getDefaultEntities(): CADAnalysisResult['entities'] {
    return {
      lines: 0,
      circles: 0,
      arcs: 0,
      polylines: 0,
      text: 0,
      dimensions: 0,
      blocks: 0,
    };
  }
  
  // 默认尺寸
  private getDefaultDimensions(): any {
    return {
      width: 841,
      height: 594,
      unit: 'mm'
    };
  }
  
  // 生成摘要
  private generateSummary(entities: CADAnalysisResult['entities'], dimensions: any): string {
    const totalEntities = 
      (entities.lines || 0) + 
      (entities.circles || 0) + 
      (entities.arcs || 0) + 
      (entities.polylines || 0);
    
    return `这是一个DWG格式的AutoCAD图纸，包含约${totalEntities}个绘图实体。图纸尺寸约为${dimensions.width}x${dimensions.height}${dimensions.unit}。DWG是AutoCAD的原生格式，包含完整的绘图数据和属性。`;
  }
  
  // 生成建议
  private generateRecommendations(entities: CADAnalysisResult['entities']): string[] {
    const recommendations = [
      "使用AutoCAD或兼容软件查看完整内容",
      "检查图纸比例和测量单位是否正确"
    ];
    
    if ((entities.blocks || 0) > 10) {
      recommendations.push("注意图纸中包含多个块引用，可能表示标准组件或复杂结构");
    }
    
    if ((entities.dimensions || 0) > 0) {
      recommendations.push("图纸包含尺寸标注，确保解析正确");
    }
    
    return recommendations;
  }
} 