// IGES专用解析器
import type { CADAnalysisResult } from '@/lib/types/cad';

import type { ParserOptions } from './index';

interface IgesEntities {
  lines?: number;
  circles?: number;
  arcs?: number;
  polylines?: number;
  text?: number;
  dimensions?: number;
  blocks?: number;
  faces?: number;
  edges?: number;
  vertices?: number;
  shells?: number;
  solids?: number;
  surfaces?: number;
  curves?: number;
  points?: number;
  [key: string]: number | undefined;
}

interface IgesDimensions { width: number; height: number; depth: number; unit: string }

interface IgesResultShape {
  entities?: IgesEntities;
  assemblies?: string[];
  dimensions?: Partial<IgesDimensions> & Record<string, unknown>;
  metadata?: Record<string, unknown>;
  warnings?: Array<{ message?: string; level?: 'low' | 'medium' | 'high'; solution?: string }>;
  risks?: Array<{ description?: string; level?: 'low' | 'medium' | 'high'; solution?: string }>;
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

export class IGESParser {
  async parse(fileData: File | ArrayBuffer, options: ParserOptions): Promise<CADAnalysisResult> {
    const buffer = fileData instanceof File 
      ? await fileData.arrayBuffer()
      : fileData;
    
    const fileName = fileData instanceof File ? fileData.name : 'unknown.iges';
    const id = Date.now().toString();
    
    try {
      const formData = new FormData();
      const file = fileData instanceof File 
        ? fileData 
        : new File([buffer], fileName, { type: 'application/iges' });
      
      formData.append('file', file);
      formData.append('precision', options.precision);
      
      const response = await fetch('/api/cad/iges-parse', { method: 'POST', body: formData });
      if (response.ok !== true) {
        throw new Error(`IGES解析服务返回错误: ${response.status}`);
      }
      
      const resultJson = (await response.json()) as unknown;
      const result: IgesResultShape = isRecord(resultJson) ? (resultJson as IgesResultShape) : {};
      
      const entities = this.processEntities(result.entities);
      const assemblies = Array.isArray(result.assemblies) ? result.assemblies : ['默认'];
      const dims = this.processDimensions(result.dimensions);
      
      return {
        fileId: id,
        id,
        fileName,
        fileType: 'iges',
        fileSize: buffer.byteLength,
        url: fileData instanceof File ? URL.createObjectURL(fileData) : '',
        entities,
        layers: assemblies,
        dimensions: dims,
        metadata: {
          author: toStringSafe(result.metadata?.author, '未知'),
          createdAt: toStringSafe(result.metadata?.createdAt, new Date().toISOString()),
          modifiedAt: isRecord(result.metadata) ? toStringSafe(result.metadata.modifiedAt) : undefined,
          software: toStringSafe(result.metadata?.software, '未知'),
          version: toStringSafe(result.metadata?.version, '未知'),
        },
        devices: [],
        wiring: { totalLength: 0, details: [] },
        risks: this.identifyRisks(result),
        originalFile: fileData instanceof File ? fileData : undefined,
        aiInsights: {
          summary: this.generateSummary(entities, dims),
          recommendations: this.generateRecommendations(entities),
        },
      };
    } catch (error) {
      console.error('IGES解析失败:', error);
      return this.createFallbackResult(fileData, buffer, id, fileName);
    }
  }
  
  private processEntities(raw: unknown): CADAnalysisResult['entities'] {
    if (!isRecord(raw)) {
      return this.getDefaultEntities();
    }
    const e = raw as IgesEntities;
    return {
      lines: toNumber(e.lines ?? e.edges),
      circles: toNumber(e.circles),
      arcs: toNumber(e.arcs),
      polylines: toNumber(e.polylines),
      text: toNumber(e.text),
      dimensions: toNumber(e.dimensions),
      blocks: toNumber(e.blocks),
      faces: toNumber(e.faces),
      edges: toNumber(e.edges),
      vertices: toNumber(e.vertices),
      shells: toNumber(e.shells),
      solids: toNumber(e.solids),
      surfaces: toNumber(e.surfaces),
      curves: toNumber(e.curves),
      points: toNumber(e.points),
    } as CADAnalysisResult['entities'];
  }
  
  private processDimensions(raw: unknown): IgesDimensions {
    if (!isRecord(raw)) {
      return this.getDefaultDimensions();
    }
    return {
      width: toNumber(raw.width ?? raw.x, 100),
      height: toNumber(raw.height ?? raw.y, 100),
      depth: toNumber(raw.depth ?? raw.z, 100),
      unit: toStringSafe(raw.unit, 'mm'),
    };
  }
  
  private identifyRisks(result: IgesResultShape): Array<{ description: string; level: 'low' | 'medium' | 'high'; solution: string }> {
    const risks: Array<{ description: string; level: 'low' | 'medium' | 'high'; solution: string }> = [];
    const warnings = Array.isArray(result.warnings) ? result.warnings : [];
    for (const warning of warnings) {
      risks.push({
        description: toStringSafe(warning.message, '解析发现兼容性问题'),
        level: warning.level ?? 'medium',
        solution: toStringSafe(warning.solution, '考虑使用更现代的3D格式如STEP'),
      });
    }
    const e = result.entities;
    const entityCount = isRecord(e)
      ? toNumber((e as IgesEntities).surfaces) + toNumber((e as IgesEntities).curves) + toNumber((e as IgesEntities).points)
      : 0;
    if (entityCount > 10000) {
      risks.push({ description: '模型非常复杂，可能影响渲染性能', level: 'medium', solution: '考虑简化模型或使用更高性能的硬件' });
    }
    risks.push({ description: 'IGES是一种较老的格式，可能存在兼容性问题', level: 'low', solution: '建议转换为STEP或其他现代3D格式' });
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
      wiring: { totalLength: 0, details: [] },
      risks: [{ description: '无法解析IGES文件，需要专业CAD软件支持', level: 'medium', solution: '使用专业3D CAD软件查看或转换为STEP格式' }],
      originalFile: fileData instanceof File ? fileData : undefined,
      aiInsights: {
        summary: '这是一个IGES格式的3D模型文件。IGES是较早的产品数据交换标准，仍在一些领域使用。',
        recommendations: [
          '使用专业CAD软件如Solidworks、Fusion 360或FreeCAD查看',
          '推荐转换为STEP格式以获得更好的兼容性',
          'IGES文件可能缺少某些高级特性，如参数化设计信息'
        ],
      },
    };
  }
  
  private getDefaultEntities(): CADAnalysisResult['entities'] {
    return { lines: 0, circles: 0, arcs: 0, polylines: 0, text: 0, dimensions: 0, blocks: 0, faces: 0, edges: 0, vertices: 0, shells: 0, solids: 0, surfaces: 0, curves: 0, points: 0 };
  }
  
  private getDefaultDimensions(): IgesDimensions { return { width: 100, height: 100, depth: 100, unit: 'mm' }; }
  
  private generateSummary(entities: CADAnalysisResult['entities'], dimensions: IgesDimensions): string {
    const surfaceCount = toNumber(entities.surfaces, 0);
    const curveCount = toNumber(entities.curves, 0);
    return `这是一个IGES格式的3D模型，包含${surfaceCount}个曲面和${curveCount}条曲线。模型尺寸约为${dimensions.width}x${dimensions.height}x${dimensions.depth}${dimensions.unit}。IGES是较早的3D交换格式，主要用于曲面建模。`;
  }
  
  private generateRecommendations(entities: CADAnalysisResult['entities']): string[] {
    const recommendations: string[] = [
      '考虑将IGES转换为STEP格式以获得更好的兼容性',
      '使用专业CAD软件如Solidworks、Catia或NX获取完整信息',
      'IGES主要用于曲面信息交换，可能缺少完整的参数化历史'
    ];
    if (toNumber(entities.surfaces, 0) > 1000) {
      recommendations.push('模型包含大量曲面，建议使用高性能设备进行渲染');
    }
    return recommendations;
  }
} 