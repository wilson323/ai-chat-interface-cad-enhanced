// DXF专用解析器
import type { CADAnalysisResult } from '@/lib/types/cad';

import type { ParserOptions } from './index';

interface DxfEntities {
  lines: number;
  circles: number;
  arcs: number;
  polylines: number;
  text: number;
  dimensions: number;
  blocks: number;
  [key: string]: number;
}

interface DxfMetadata {
  version?: string;
  createdAt?: string;
  modifiedAt?: string;
  author?: string;
  software?: string;
}

interface DxfDimensions { width: number; height: number; unit: string }

interface IdentifiedRisk {
  id: string;
  level: 'low' | 'medium' | 'high';
  type: string;
  description: string;
  location: [number, number];
}

function toNumber(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export class DXFParser {
  async parse(fileData: File | ArrayBuffer, options: ParserOptions): Promise<CADAnalysisResult> {
    const buffer = fileData instanceof File 
      ? await fileData.arrayBuffer()
      : fileData;
    
    const text = new TextDecoder().decode(buffer);
    const lines = text.split(/\r\n|\r|\n/);
    
    const fileName = fileData instanceof File ? fileData.name : 'unknown.dxf';
    const id = Date.now().toString();
    
    const entities = this.extractEntities(lines, options.precision);
    const layers = this.extractLayers(lines);
    const metadata = this.extractMetadata(lines);
    const dimensions = this.extractDimensions(lines);
    const risks = this.analyzeRisks(entities, layers);
    
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
        author: metadata.author ?? '未知',
        createdAt: metadata.createdAt ?? new Date().toISOString(),
        modifiedAt: metadata.modifiedAt,
        software: metadata.software ?? '未知',
        version: metadata.version ?? '未知',
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
  
  private extractEntities(lines: string[], precision: string): DxfEntities {
    const entities: DxfEntities = {
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
      const line = lines[i]?.trim() ?? '';
      
      if (line === 'SECTION' && (lines[i+2]?.trim() ?? '') === 'ENTITIES') {
        inEntitiesSection = true;
        continue;
      }
      
      if (line === 'ENDSEC' && inEntitiesSection === true) {
        inEntitiesSection = false;
        continue;
      }
      
      if (inEntitiesSection === true && line === '0') {
        currentEntity = lines[i+1]?.trim() ?? '';
        if (currentEntity !== '') {
          const entityKey = this.mapEntityType(currentEntity);
          entities[entityKey] = toNumber(entities[entityKey]) + 1;
        }
      }
    }
    
    return entities;
  }
  
  private extractLayers(lines: string[]): string[] { 
    const layers = new Set<string>();
    let inLayerSection = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]?.trim() ?? '';
      
      if (line === 'SECTION' && (lines[i+2]?.trim() ?? '') === 'TABLES') {
        inLayerSection = true;
        continue;
      }
      
      if (line === 'ENDSEC' && inLayerSection === true) {
        inLayerSection = false;
        continue;
      }
      
      if (inLayerSection === true && line === 'LAYER') {
        for (let j = i; j < i + 20 && j < lines.length; j++) {
          if ((lines[j]?.trim() ?? '') === '2') {
            const layerName = lines[j+1]?.trim();
            if (typeof layerName === 'string' && layerName.length > 0) {
              layers.add(layerName);
            }
            break;
          }
        }
      }
    }
    
    return Array.from(layers);
  }
  
  private extractMetadata(lines: string[]): DxfMetadata {
    const metadata: DxfMetadata = {};
    let inHeaderSection = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]?.trim() ?? '';
      
      if (line === 'SECTION' && (lines[i+2]?.trim() ?? '') === 'HEADER') {
        inHeaderSection = true;
        continue;
      }
      
      if (line === 'ENDSEC' && inHeaderSection === true) {
        inHeaderSection = false;
        continue;
      }
      
      if (inHeaderSection === true) {
        if (line === '$ACADVER') {
          metadata.version = lines[i+2]?.trim();
        } else if (line === '$TDCREATE') {
          const julianDate = Number(lines[i+2]?.trim() ?? '0');
          metadata.createdAt = this.julianToISO(julianDate);
        } else if (line === '$TDUPDATE') {
          const julianDate = Number(lines[i+2]?.trim() ?? '0');
          metadata.modifiedAt = this.julianToISO(julianDate);
        } else if (line === '$FINGNAME') {
          metadata.author = lines[i+2]?.trim();
        }
      }
    }
    
    return metadata;
  }
  
  private julianToISO(julianDate: number): string {
    if (!Number.isFinite(julianDate) || julianDate === 0) return new Date().toISOString();
    const milliseconds = (julianDate - 2440000) * 86400000;
    return new Date(milliseconds).toISOString();
  }
  
  private mapEntityType(dxfEntity: string): keyof DxfEntities {
    const map: Record<string, keyof DxfEntities> = {
      LINE: 'lines',
      CIRCLE: 'circles',
      ARC: 'arcs',
      POLYLINE: 'polylines',
      LWPOLYLINE: 'polylines',
      TEXT: 'text',
      MTEXT: 'text',
      DIMENSION: 'dimensions',
      BLOCK: 'blocks',
    };
    return map[dxfEntity] ?? 'lines';
  }
  
  private identifyDevices(_entities: DxfEntities, _layers: string[]): Array<never> {
    return [] as Array<never>;
  }
  
  private analyzeWiring(_entities: DxfEntities, _layers: string[]): { totalLength: number; details: Array<never> } {
    return { totalLength: 0, details: [] as Array<never> };
  }
  
  private analyzeRisks(entities: DxfEntities, layers: string[]): IdentifiedRisk[] {
    const risks: IdentifiedRisk[] = [];
    
    if (toNumber(entities.lines) > 1000 || toNumber(entities.polylines) > 500) {
      risks.push({
        id: `risk-complexity-${Date.now()}`,
        level: 'medium',
        type: 'complexity',
        description: '图纸复杂度较高，可能影响渲染和处理性能',
        location: [0, 0]
      });
    }
    
    if (toNumber(entities.text) > 200) {
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
  
  private extractDimensions(_lines: string[]): DxfDimensions {
    return { width: 841, height: 594, unit: 'mm' };
  }
  
  private generateSummary(entities: DxfEntities, layers: string[], risks: IdentifiedRisk[]): string {
    const totalEntities = Object.values(entities).reduce((sum, count) => sum + toNumber(count), 0);
    const highRisks = risks.filter(r => r.level === 'high').length;
    return `该CAD图纸包含${totalEntities}个实体，分布在${layers.length}个图层中。\n识别出${risks.length}个潜在问题，其中${highRisks}个为高风险问题。\n主要实体类型为${this.getMainEntityTypes(entities)}。`;
  }
  
  private getMainEntityTypes(entities: DxfEntities): string {
    const sorted = Object.entries(entities)
      .sort(([,a], [,b]) => toNumber(b) - toNumber(a))
      .slice(0, 3)
      .map(([type]) => type);
    return sorted.join('、');
  }
  
  private generateRecommendations(entities: DxfEntities, risks: IdentifiedRisk[]): string[] {
    const recommendations: string[] = [];
    if (toNumber(entities.blocks) < 10 && toNumber(entities.lines) > 500) {
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