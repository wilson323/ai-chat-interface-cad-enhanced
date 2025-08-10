// IGES专用解析器
import type { CADAnalysisResult } from '@/lib/types/cad';
import type { ParserOptions } from './index';

export class IGESParser {
  async parse(fileData: File | ArrayBuffer, options: ParserOptions): Promise<CADAnalysisResult> {
    // 转换为ArrayBuffer处理
    const buffer = fileData instanceof File 
      ? await fileData.arrayBuffer()
      : fileData;
    
    // 基本信息提取
    const fileName = fileData instanceof File ? fileData.name : 'unknown.iges';
    const id = Date.now().toString();
    
    try {
      // IGES是一种3D模型交换格式，需要专用库或服务解析
      const formData = new FormData();
      const file = fileData instanceof File 
        ? fileData 
        : new File([buffer], fileName, { type: 'application/iges' });
      
      formData.append('file', file);
      formData.append('precision', options.precision);
      
      const response = await fetch('/api/cad/iges-parse', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`IGES解析服务返回错误: ${response.status}`);
      }
      
      const result = await response.json();
      
      // 整合解析结果
      const entities = this.processEntities(result.entities);
      
      return {
        fileId: id,
        id,
        fileName,
        fileType: 'iges',
        fileSize: buffer.byteLength,
        url: fileData instanceof File ? URL.createObjectURL(fileData) : '',
        entities,
        layers: result.assemblies || ['默认'],
        dimensions: this.processDimensions(result.dimensions),
        metadata: {
          author: result.metadata?.author || '未知',
          createdAt: result.metadata?.createdAt || new Date().toISOString(),
          modifiedAt: result.metadata?.modifiedAt,
          software: result.metadata?.software || '未知',
          version: result.metadata?.version || '未知',
        },
        devices: [],
        wiring: {
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
      console.error('IGES解析失败:', error);
      
      // 如果服务解析失败，返回基本结果
      return this.createFallbackResult(fileData, buffer, id, fileName);
    }
  }
  
  // 处理实体数据
  private processEntities(rawEntities: any): CADAnalysisResult['entities'] {
    if (!rawEntities) {
      return this.getDefaultEntities();
    }
    
    // IGES文件实体类型映射到标准格式
    return {
      lines: rawEntities.lines || rawEntities.edges || 0,
      circles: rawEntities.circles || 0,
      arcs: rawEntities.arcs || 0,
      polylines: rawEntities.polylines || 0,
      text: rawEntities.text || 0,
      dimensions: rawEntities.dimensions || 0,
      blocks: rawEntities.blocks || 0,
      // IGES特有的3D实体类型
      faces: rawEntities.faces || 0,
      edges: rawEntities.edges || 0,
      vertices: rawEntities.vertices || 0,
      shells: rawEntities.shells || 0,
      solids: rawEntities.solids || 0,
      surfaces: rawEntities.surfaces || 0,
      curves: rawEntities.curves || 0,
      points: rawEntities.points || 0,
    };
  }
  
  // 处理尺寸信息
  private processDimensions(rawDimensions: any): any {
    if (!rawDimensions) {
      return this.getDefaultDimensions();
    }
    
    // 提取边界盒信息
    return {
      width: rawDimensions.width || rawDimensions.x || 100,
      height: rawDimensions.height || rawDimensions.y || 100,
      depth: rawDimensions.depth || rawDimensions.z || 100,
      unit: rawDimensions.unit || 'mm',
    };
  }
  
  // 识别潜在问题
  private identifyRisks(result: any): any[] {
    const risks = [];
    
    // 检查IGES兼容性问题
    if (result.warnings && result.warnings.length > 0) {
      for (const warning of result.warnings) {
        risks.push({
          description: warning.message || '解析发现兼容性问题',
          level: warning.level || 'medium',
          solution: warning.solution || '考虑使用更现代的3D格式如STEP'
        });
      }
    }
    
    // 检查模型复杂度
    const entityCount = result.entities ? (
      (result.entities.surfaces || 0) + 
      (result.entities.curves || 0) + 
      (result.entities.points || 0)
    ) : 0;
    
    if (entityCount > 10000) {
      risks.push({
        description: '模型非常复杂，可能影响渲染性能',
        level: 'medium',
        solution: '考虑简化模型或使用更高性能的硬件'
      });
    }
    
    // IGES格式老旧的提示
    risks.push({
      description: 'IGES是一种较老的格式，可能存在兼容性问题',
      level: 'low',
      solution: '建议转换为STEP或其他现代3D格式'
    });
    
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
      fileId: id,
      id,
      fileName,
      fileType: 'iges',
      fileSize: buffer.byteLength,
      url: fileData instanceof File ? URL.createObjectURL(fileData) : '',
      entities,
      layers: ['默认'],
      dimensions,
      metadata: {
        author: '未知',
        createdAt: new Date().toISOString(),
        software: '未知',
        version: '未知',
      },
      devices: [],
      wiring: {
        totalLength: 0,
        details: []
      },
      risks: [{
        description: '无法解析IGES文件，需要专业CAD软件支持',
        level: 'medium',
        solution: '使用专业3D CAD软件查看或转换为STEP格式'
      }],
      originalFile: fileData instanceof File ? fileData : undefined,
      aiInsights: {
        summary: '这是一个IGES格式的3D模型文件。IGES是较早的产品数据交换标准，虽然已经被STEP格式部分取代，但仍在一些领域使用。',
        recommendations: [
          "使用专业CAD软件如Solidworks、Fusion 360或FreeCAD查看",
          "推荐转换为STEP格式以获得更好的兼容性",
          "IGES文件可能缺少某些高级特性，如参数化设计信息"
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
      // 3D特有的实体类型
      faces: 0,
      edges: 0,
      vertices: 0,
      shells: 0,
      solids: 0,
      surfaces: 0,
      curves: 0,
      points: 0,
    };
  }
  
  // 默认尺寸
  private getDefaultDimensions(): any {
    return {
      width: 100,
      height: 100,
      depth: 100,
      unit: 'mm'
    };
  }
  
  // 生成摘要
  private generateSummary(entities: CADAnalysisResult['entities'], dimensions: any): string {
    const surfaceCount = entities.surfaces || 0;
    const curveCount = entities.curves || 0;
    
    return `这是一个IGES格式的3D模型，包含${surfaceCount}个曲面和${curveCount}条曲线。模型尺寸约为${dimensions.width}x${dimensions.height}x${dimensions.depth}${dimensions.unit}。IGES是较早的3D交换格式，主要用于曲面建模。`;
  }
  
  // 生成建议
  private generateRecommendations(entities: CADAnalysisResult['entities']): string[] {
    const recommendations = [
      "考虑将IGES转换为STEP格式以获得更好的兼容性",
      "使用专业CAD软件如Solidworks、Catia或NX获取完整信息",
      "IGES主要用于曲面信息交换，可能缺少完整的参数化历史"
    ];
    
    if ((entities.surfaces || 0) > 1000) {
      recommendations.push("模型包含大量曲面，建议使用高性能设备进行渲染");
    }
    
    return recommendations;
  }
} 