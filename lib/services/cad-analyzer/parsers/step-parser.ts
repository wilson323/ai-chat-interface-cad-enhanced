// STEP专用解析器
import type { CADAnalysisResult } from '@/lib/types/cad';
import type { ParserOptions } from './index';

export class STEPParser {
  async parse(fileData: File | ArrayBuffer, options: ParserOptions): Promise<CADAnalysisResult> {
    // 转换为ArrayBuffer处理
    const buffer = fileData instanceof File 
      ? await fileData.arrayBuffer()
      : fileData;
    
    // 基本信息提取
    const fileName = fileData instanceof File ? fileData.name : 'unknown.step';
    const id = Date.now().toString();
    
    try {
      // STEP是ISO标准的3D模型交换格式，需要专用库或服务解析
      // 调用后端解析服务
      const formData = new FormData();
      const file = fileData instanceof File 
        ? fileData 
        : new File([buffer], fileName, { type: 'application/step' });
      
      formData.append('file', file);
      formData.append('precision', options.precision);
      
      const response = await fetch('/api/cad/step-parse', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`STEP解析服务返回错误: ${response.status}`);
      }
      
      const result = await response.json();
      
      // 整合解析结果
      const entities = this.processEntities(result.entities);
      
      return {
        id,
        fileName,
        fileType: 'step',
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
          summary: this.generateSummary(entities, result.assemblies || ['默认'], result.dimensions),
          recommendations: this.generateRecommendations(entities),
        },
      };
    } catch (error) {
      console.error('STEP解析失败:', error);
      
      // 如果服务解析失败，返回基本结果
      return this.createFallbackResult(fileData, buffer, id, fileName);
    }
  }
  
  // 处理实体数据
  private processEntities(rawEntities: any): CADAnalysisResult['entities'] {
    if (!rawEntities) {
      return this.getDefaultEntities();
    }
    
    // STEP文件常见实体类型及映射到标准格式
    return {
      lines: rawEntities.edges || 0,
      circles: rawEntities.circles || 0,
      arcs: rawEntities.arcs || 0,
      polylines: rawEntities.polylines || 0,
      text: rawEntities.text || 0,
      dimensions: rawEntities.dimensions || 0,
      blocks: rawEntities.solids || 0,
      // 3D特有的实体类型作为扩展类型
      faces: rawEntities.faces || 0,
      edges: rawEntities.edges || 0,
      vertices: rawEntities.vertices || 0,
      shells: rawEntities.shells || 0,
      solids: rawEntities.solids || 0,
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
    
    // 检查模型复杂度
    const entityCount = result.entities ? (
      (result.entities.faces || 0) + 
      (result.entities.edges || 0) + 
      (result.entities.vertices || 0)
    ) : 0;
    
    if (entityCount > 10000) {
      risks.push({
        description: '模型非常复杂，可能影响渲染性能',
        level: 'medium',
        solution: '考虑简化模型或使用更高性能的硬件'
      });
    }
    
    // 检查尺寸异常
    if (result.dimensions) {
      const maxDimension = Math.max(
        result.dimensions.width || 0, 
        result.dimensions.height || 0, 
        result.dimensions.depth || 0
      );
      
      if (maxDimension > 5000) {
        risks.push({
          description: '模型尺寸异常大，可能不符合实际设计标准',
          level: 'low',
          solution: '检查模型比例单位是否正确'
        });
      }
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
      fileType: 'step',
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
        description: '无法解析STEP文件，需要专业CAD软件支持',
        level: 'medium',
        solution: '使用专业3D CAD软件查看或转换为其他格式'
      }],
      originalFile: fileData instanceof File ? fileData : undefined,
      aiInsights: {
        summary: '这是一个STEP格式的3D CAD模型文件。STEP是产品数据交换的国际标准格式，广泛用于机械设计领域。',
        recommendations: [
          "使用专业CAD软件如Solidworks、Fusion 360或FreeCAD查看",
          "可以转换为STL格式以便于Web端预览",
          "STEP文件通常包含完整的产品制造信息(PMI)"
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
  private generateSummary(entities: CADAnalysisResult['entities'], assemblies: string[], dimensions: any): string {
    const totalEntities = (entities.faces || 0) + (entities.edges || 0) + (entities.vertices || 0);
    const solidCount = entities.solids || 0;
    
    return `这是一个STEP格式的3D模型，包含${solidCount}个实体对象，${assemblies.length}个装配体。模型尺寸约为${dimensions.width}x${dimensions.height}x${dimensions.depth}${dimensions.unit}。`;
  }
  
  // 生成建议
  private generateRecommendations(entities: CADAnalysisResult['entities']): string[] {
    const recommendations = [
      "使用专业CAD软件如Solidworks、Fusion 360或FreeCAD获取完整信息",
      "STEP文件通常用于机械零件设计，包含完整的几何和拓扑信息"
    ];
    
    if ((entities.faces || 0) > 1000) {
      recommendations.push("模型较复杂，可能需要较高性能设备进行渲染");
    }
    
    return recommendations;
  }
} 