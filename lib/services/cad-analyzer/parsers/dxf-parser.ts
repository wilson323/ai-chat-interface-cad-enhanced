// DXF专用解析器
import type { CADAnalysisResult } from '@/lib/types/cad';
import type { ParserOptions } from './index';

export class DXFParser {
  async parse(fileData: File | ArrayBuffer, options: ParserOptions): Promise<CADAnalysisResult> {
    // 转换为ArrayBuffer处理
    const buffer = fileData instanceof File 
      ? await fileData.arrayBuffer()
      : fileData;
    
    // 转换为文本进行处理
    const text = new TextDecoder().decode(buffer);
    const lines = text.split(/\r\n|\r|\n/);
    
    // 基本信息提取
    const fileName = fileData instanceof File ? fileData.name : 'unknown.dxf';
    const id = Date.now().toString();
    
    // 解析DXF结构
    const entities = this.extractEntities(lines, options.precision);
    const layers = this.extractLayers(lines);
    const metadata = this.extractMetadata(lines);
    const dimensions = this.extractDimensions(lines);
    
    // 处理风险
    const risks = this.analyzeRisks(entities, layers);
    
    // 构建结果
    return {
      fileId: id,
      id,
      fileName,
      fileType: 'dxf',
      fileSize: buffer.byteLength,
      url: fileData instanceof File ? URL.createObjectURL(fileData) : '',
      entities,
      layers,
      dimensions,
      metadata: {
        author: metadata.author || '未知',
        createdAt: metadata.createdAt || new Date().toISOString(),
        modifiedAt: metadata.modifiedAt,
        software: metadata.software || '未知',
        version: metadata.version || '未知',
      },
      devices: this.identifyDevices(entities, layers),
      wiring: this.analyzeWiring(entities, layers),
      risks,
      aiInsights: {
        summary: this.generateSummary(entities, layers, risks),
        recommendations: this.generateRecommendations(entities, risks),
      },
    };
  }
  
  // 提取实体信息
  private extractEntities(lines: string[], precision: string): Record<string, number> {
    const entities: Record<string, number> = {
      lines: 0,
      circles: 0,
      arcs: 0,
      polylines: 0,
      text: 0,
      dimensions: 0,
      blocks: 0,
    };
    
    let inEntitiesSection = false;
    let currentEntity = '';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line === 'SECTION' && lines[i+2]?.trim() === 'ENTITIES') {
        inEntitiesSection = true;
        continue;
      }
      
      if (line === 'ENDSEC' && inEntitiesSection) {
        inEntitiesSection = false;
        continue;
      }
      
      if (inEntitiesSection && line === '0') {
        currentEntity = lines[i+1]?.trim() || '';
        
        if (currentEntity) {
          const entityKey = this.mapEntityType(currentEntity);
          entities[entityKey] = (entities[entityKey] || 0) + 1;
        }
      }
    }
    
    return entities;
  }
  
  // 其他提取和分析方法
  private extractLayers(lines: string[]): string[] { 
    const layers = new Set<string>();
    let inLayerSection = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line === 'SECTION' && lines[i+2]?.trim() === 'TABLES') {
        inLayerSection = true;
        continue;
      }
      
      if (line === 'ENDSEC' && inLayerSection) {
        inLayerSection = false;
        continue;
      }
      
      if (inLayerSection && line === 'LAYER') {
        // 找到层名 (通常在 2 代码后)
        for (let j = i; j < i + 20 && j < lines.length; j++) {
          if (lines[j].trim() === '2') {
            const layerName = lines[j+1]?.trim();
            if (layerName) {
              layers.add(layerName);
            }
            break;
          }
        }
      }
    }
    
    return Array.from(layers);
  }
  
  private extractMetadata(lines: string[]): any {
    const metadata: any = {};
    let inHeaderSection = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line === 'SECTION' && lines[i+2]?.trim() === 'HEADER') {
        inHeaderSection = true;
        continue;
      }
      
      if (line === 'ENDSEC' && inHeaderSection) {
        inHeaderSection = false;
        continue;
      }
      
      if (inHeaderSection) {
        if (line === '$ACADVER') {
          metadata.version = lines[i+2]?.trim();
        } else if (line === '$TDCREATE') {
          // 解析创建时间
          const julianDate = parseFloat(lines[i+2]?.trim() || '0');
          metadata.createdAt = this.julianToISO(julianDate);
        } else if (line === '$TDUPDATE') {
          // 解析修改时间
          const julianDate = parseFloat(lines[i+2]?.trim() || '0');
          metadata.modifiedAt = this.julianToISO(julianDate);
        } else if (line === '$FINGNAME') {
          metadata.author = lines[i+2]?.trim();
        }
      }
    }
    
    return metadata;
  }
  
  // 实用工具方法
  private julianToISO(julianDate: number): string {
    if (julianDate === 0) return new Date().toISOString();
    
    // DXF使用修改的儒略日期，其中2440000表示1968年1月1日
    const milliseconds = (julianDate - 2440000) * 86400000;
    return new Date(milliseconds).toISOString();
  }
  
  private mapEntityType(dxfEntity: string): string {
    const map: Record<string, string> = {
      'LINE': 'lines',
      'CIRCLE': 'circles',
      'ARC': 'arcs',
      'POLYLINE': 'polylines',
      'LWPOLYLINE': 'polylines',
      'TEXT': 'text',
      'MTEXT': 'text',
      'DIMENSION': 'dimensions',
      'BLOCK': 'blocks',
      // 更多实体类型映射
    };
    
    return map[dxfEntity] || 'other';
  }
  
  // 智能分析方法
  private identifyDevices(entities: Record<string, number>, layers: string[]): any[] {
    // 设备识别逻辑
    // 此处应实现设备识别算法，如电气符号识别、文本标签分析等
    return [];
  }
  
  private analyzeWiring(entities: Record<string, number>, layers: string[]): any {
    // 布线分析逻辑
    return {
      totalLength: 0,
      details: []
    };
  }
  
  private analyzeRisks(entities: Record<string, number>, layers: string[]): any[] {
    const risks = [];
    
    // 检查复杂性风险
    if (entities.lines > 1000 || entities.polylines > 500) {
      risks.push({
        id: `risk-complexity-${Date.now()}`,
        level: 'medium',
        type: 'complexity',
        description: '图纸复杂度较高，可能影响渲染和处理性能',
        location: [0, 0]
      });
    }
    
    // 检查文本数量
    if (entities.text > 200) {
      risks.push({
        id: `risk-text-${Date.now()}`,
        level: 'low',
        type: 'readability',
        description: '文本元素过多，可能影响图纸可读性',
        location: [0, 0]
      });
    }
    
    return risks;
  }
  
  private extractDimensions(lines: string[]): any {
    // 默认尺寸
    return {
      width: 841,
      height: 594,
      unit: 'mm'
    };
  }
  
  private generateSummary(entities: Record<string, number>, layers: string[], risks: any[]): string {
    const totalEntities = Object.values(entities).reduce((sum, count) => sum + count, 0);
    const riskLevels = risks.map(r => r.level);
    const highRisks = riskLevels.filter(l => l === 'high').length;
    
    return `该CAD图纸包含${totalEntities}个实体，分布在${layers.length}个图层中。
            识别出${risks.length}个潜在问题，其中${highRisks}个为高风险问题。
            主要实体类型为${this.getMainEntityTypes(entities)}。`;
  }
  
  private getMainEntityTypes(entities: Record<string, number>): string {
    const sorted = Object.entries(entities)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([type]) => type);
    
    return sorted.join('、');
  }
  
  private generateRecommendations(entities: Record<string, number>, risks: any[]): string[] {
    const recommendations = [];
    
    if (entities.blocks < 10 && entities.lines > 500) {
      recommendations.push('建议使用更多块引用(BLOCK)来组织复杂图形，提高文件效率');
    }
    
    if (risks.some(r => r.level === 'high')) {
      recommendations.push('修复高风险问题以确保图纸质量');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('图纸结构良好，无明显优化建议');
    }
    
    return recommendations;
  }
} 