// DWG专用解析器
import type { CADAnalysisResult } from '@/lib/types/cad';
import type { ParserOptions } from './index';

interface RawEntities {
  lines?: unknown;
  circles?: unknown;
  arcs?: unknown;
  polylines?: unknown;
  text?: unknown;
  dimensions?: unknown;
  blocks?: unknown;
  [key: string]: unknown;
}

interface RawDimensions {
  width?: unknown;
  height?: unknown;
  unit?: unknown;
}

interface RawResultShape {
  entities?: RawEntities;
  layers?: Array<string>;
  dimensions?: RawDimensions;
  metadata?: Record<string, unknown>;
  devices?: Array<unknown>;
  wiring?: { totalLength?: unknown; details?: Array<unknown> };
  risks?: Array<unknown>;
}

function toNumber(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toStringSafe(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export class DWGParser {
  async parse(fileData: File | ArrayBuffer, options: ParserOptions): Promise<CADAnalysisResult> {
    const buffer = fileData instanceof File 
      ? await fileData.arrayBuffer()
      : fileData;
    
    const fileName = fileData instanceof File ? fileData.name : 'unknown.dwg';
    const id = Date.now().toString();
    
    try {
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
      
      if (response.ok !== true) {
        throw new Error(`DWG解析服务返回错误: ${response.status}`);
      }
      
      const resultJson = (await response.json()) as unknown;
      const result: RawResultShape = isRecord(resultJson) ? (resultJson as RawResultShape) : {};
      
      const entities = this.processEntities(result.entities);
      
      return {
        fileId: id,
        id,
        fileName,
        fileType: 'dwg',
        fileSize: buffer.byteLength,
        url: fileData instanceof File ? URL.createObjectURL(fileData) : '',
        entities,
        layers: Array.isArray(result.layers) ? result.layers : ['默认'],
        dimensions: this.processDimensions(result.dimensions),
        metadata: {
          author: toStringSafe(result.metadata?.author, '未知'),
          createdAt: toStringSafe(result.metadata?.createdAt, new Date().toISOString()),
          modifiedAt: isRecord(result.metadata) ? toStringSafe(result.metadata.modifiedAt) : undefined,
          software: toStringSafe(result.metadata?.software, 'AutoCAD'),
          version: toStringSafe(result.metadata?.version, '未知'),
        },
        devices: Array.isArray(result.devices) ? (result.devices as Array<unknown>) : [],
        wiring: isRecord(result.wiring)
          ? {
              totalLength: toNumber((result.wiring as Record<string, unknown>).totalLength, 0),
              details: Array.isArray((result.wiring as Record<string, unknown>).details)
                ? ((result.wiring as Record<string, unknown>).details as Array<unknown>)
                : [],
            }
          : { totalLength: 0, details: [] },
        risks: this.identifyRisks(result),
        originalFile: fileData instanceof File ? fileData : undefined,
        aiInsights: {
          summary: this.generateSummary(entities, this.processDimensions(result.dimensions)),
          recommendations: this.generateRecommendations(entities),
        },
      };
    } catch (error) {
      console.error('DWG解析失败:', error);
      return this.createFallbackResult(fileData, buffer, id, fileName);
    }
  }
  
  private processEntities(rawEntities: unknown): CADAnalysisResult['entities'] {
    if (!isRecord(rawEntities)) {
      return this.getDefaultEntities();
    }
    const e = rawEntities as RawEntities;
    return {
      lines: toNumber(e.lines),
      circles: toNumber(e.circles),
      arcs: toNumber(e.arcs),
      polylines: toNumber(e.polylines),
      text: toNumber(e.text),
      dimensions: toNumber(e.dimensions),
      blocks: toNumber(e.blocks),
    };
  }
  
  private processDimensions(rawDimensions: unknown): { width: number; height: number; unit: string } {
    if (!isRecord(rawDimensions)) {
      return this.getDefaultDimensions();
    }
    const d = rawDimensions as RawDimensions;
    return {
      width: toNumber(d.width, 0),
      height: toNumber(d.height, 0),
      unit: toStringSafe(d.unit, 'mm'),
    };
  }
  
  private identifyRisks(result: RawResultShape): Array<{ description: string; level: 'low' | 'medium' | 'high'; solution: string }> {
    const risks: Array<{ description: string; level: 'low' | 'medium' | 'high'; solution: string }> = [];
    
    const e = result.entities;
    const entityCount = isRecord(e)
      ? toNumber((e as RawEntities).lines) +
        toNumber((e as RawEntities).circles) +
        toNumber((e as RawEntities).arcs) +
        toNumber((e as RawEntities).polylines)
      : 0;
    
    if (entityCount > 50000) {
      risks.push({
        description: '图纸包含大量实体，可能导致渲染性能问题',
        level: 'medium',
        solution: '考虑简化图纸或使用更高性能的硬件'
      });
    }
    
    if (isRecord(e) && toNumber((e as RawEntities).text) > 500) {
      risks.push({
        description: '图纸包含大量文本，确保重要注释不被忽略',
        level: 'low',
        solution: '仔细检查文本注释，尤其是技术规格和警告'
      });
    }
    
    if (Array.isArray(result.risks)) {
      for (const r of result.risks) {
        if (isRecord(r)) {
          risks.push({
            description: toStringSafe(r.description, '潜在风险'),
            level: (toStringSafe(r.level, 'low') as 'low' | 'medium' | 'high'),
            solution: toStringSafe(r.solution, '审查并处理')
          });
        }
      }
    }
    
    return risks;
  }
  
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
          '使用AutoCAD或DWG查看器打开此文件',
          '考虑转换为DXF格式以获得更好的兼容性',
          '查找文件关联的其他资源（如参照文件或外部引用）'
        ],
      },
    };
  }
  
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
  
  private getDefaultDimensions(): { width: number; height: number; unit: string } {
    return { width: 841, height: 594, unit: 'mm' };
  }
  
  private generateSummary(entities: CADAnalysisResult['entities'], dimensions: { width: number; height: number; unit: string }): string {
    const totalEntities = 
      (entities.lines || 0) + 
      (entities.circles || 0) + 
      (entities.arcs || 0) + 
      (entities.polylines || 0);
    
    return `这是一个DWG格式的AutoCAD图纸，包含约${totalEntities}个绘图实体。图纸尺寸约为${dimensions.width}x${dimensions.height}${dimensions.unit}。DWG是AutoCAD的原生格式，包含完整的绘图数据和属性。`;
  }
  
  private generateRecommendations(entities: CADAnalysisResult['entities']): string[] {
    const recommendations: string[] = [
      '使用AutoCAD或兼容软件查看完整内容',
      '检查图纸比例和测量单位是否正确',
    ];
    
    if ((entities.blocks || 0) > 10) {
      recommendations.push('注意图纸中包含多个块引用，可能表示标准组件或复杂结构');
    }
    
    if ((entities.dimensions || 0) > 0) {
      recommendations.push('图纸包含尺寸标注，确保解析正确');
    }
    
    return recommendations;
  }
} 