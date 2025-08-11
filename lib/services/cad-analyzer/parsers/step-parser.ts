// STEP专用解析器
import type { CADAnalysisResult } from '@/lib/types/cad';
import type { ParserOptions } from './index';

interface StepEntities {
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
  [key: string]: number | undefined;
}

interface StepDimensions { width: number; height: number; depth: number; unit: string }

interface StepResultShape {
  entities?: StepEntities;
  assemblies?: string[];
  dimensions?: Partial<StepDimensions> & Record<string, unknown>;
  metadata?: Record<string, unknown>;
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

export class STEPParser {
  async parse(fileData: File | ArrayBuffer, options: ParserOptions): Promise<CADAnalysisResult> {
    const buffer = fileData instanceof File 
      ? await fileData.arrayBuffer()
      : fileData;
    
    const fileName = fileData instanceof File ? fileData.name : 'unknown.step';
    const id = Date.now().toString();
    
    try {
      const formData = new FormData();
      const file = fileData instanceof File 
        ? fileData 
        : new File([buffer], fileName, { type: 'application/step' });
      
      formData.append('file', file);
      formData.append('precision', options.precision);
      
      const response = await fetch('/api/cad/step-parse', { method: 'POST', body: formData });
      if (response.ok !== true) {
        throw new Error(`STEP解析服务返回错误: ${response.status}`);
      }
      
      const resultJson = (await response.json()) as unknown;
      const result: StepResultShape = isRecord(resultJson) ? (resultJson as StepResultShape) : {};
      
      const entities = this.processEntities(result.entities);
      const assemblies = Array.isArray(result.assemblies) ? result.assemblies : ['默认'];
      const dims = this.processDimensions(result.dimensions);
      
      return {
        fileId: id,
        id,
        fileName,
        fileType: 'step',
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
          summary: this.generateSummary(entities, assemblies, dims),
          recommendations: this.generateRecommendations(entities),
        },
      };
    } catch (error) {
      console.error('STEP解析失败:', error);
      return this.createFallbackResult(fileData, buffer, id, fileName);
    }
  }
  
  private processEntities(raw: unknown): CADAnalysisResult['entities'] {
    if (!isRecord(raw)) {
      return this.getDefaultEntities();
    }
    const e = raw as StepEntities;
    return {
      lines: toNumber(e.edges),
      circles: toNumber(e.circles),
      arcs: toNumber(e.arcs),
      polylines: toNumber(e.polylines),
      text: toNumber(e.text),
      dimensions: toNumber(e.dimensions),
      blocks: toNumber(e.solids),
      faces: toNumber(e.faces),
      edges: toNumber(e.edges),
      vertices: toNumber(e.vertices),
      shells: toNumber(e.shells),
      solids: toNumber(e.solids),
    } as CADAnalysisResult['entities'];
  }
  
  private processDimensions(raw: unknown): StepDimensions {
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
  
  private identifyRisks(result: StepResultShape): Array<{ description: string; level: 'low' | 'medium' | 'high'; solution: string }> {
    const risks: Array<{ description: string; level: 'low' | 'medium' | 'high'; solution: string }> = [];
    const e = result.entities;
    const entityCount = isRecord(e)
      ? toNumber((e as StepEntities).faces) + toNumber((e as StepEntities).edges) + toNumber((e as StepEntities).vertices)
      : 0;
    if (entityCount > 10000) {
      risks.push({ description: '模型非常复杂，可能影响渲染性能', level: 'medium', solution: '考虑简化模型或使用更高性能的硬件' });
    }
    const d = result.dimensions;
    if (isRecord(d)) {
      const maxDimension = Math.max(toNumber(d.width), toNumber(d.height), toNumber(d.depth));
      if (maxDimension > 5000) {
        risks.push({ description: '模型尺寸异常大，可能不符合实际设计标准', level: 'low', solution: '检查模型比例单位是否正确' });
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
      wiring: { totalLength: 0, details: [] },
      risks: [{ description: '无法解析STEP文件，需要专业CAD软件支持', level: 'medium', solution: '使用专业3D CAD软件查看或转换为其他格式' }],
      originalFile: fileData instanceof File ? fileData : undefined,
      aiInsights: {
        summary: '这是一个STEP格式的3D CAD模型文件。STEP是产品数据交换的国际标准格式，广泛用于机械设计领域。',
        recommendations: [
          '使用专业CAD软件如Solidworks、Fusion 360或FreeCAD查看',
          '可以转换为STL格式以便于Web端预览',
          'STEP文件通常包含完整的产品制造信息(PMI)'
        ],
      },
    };
  }
  
  private getDefaultEntities(): CADAnalysisResult['entities'] {
    return { lines: 0, circles: 0, arcs: 0, polylines: 0, text: 0, dimensions: 0, blocks: 0, faces: 0, edges: 0, vertices: 0, shells: 0, solids: 0 };
  }
  
  private getDefaultDimensions(): StepDimensions { return { width: 100, height: 100, depth: 100, unit: 'mm' }; }
  
  private generateSummary(entities: CADAnalysisResult['entities'], assemblies: string[], dimensions: StepDimensions): string {
    const solidCount = toNumber(entities.solids, 0);
    return `这是一个STEP格式的3D模型，包含${solidCount}个实体对象，${assemblies.length}个装配体。模型尺寸约为${dimensions.width}x${dimensions.height}x${dimensions.depth}${dimensions.unit}。`;
  }
  
  private generateRecommendations(entities: CADAnalysisResult['entities']): string[] {
    const recommendations: string[] = [
      '使用专业CAD软件如Solidworks、Fusion 360或FreeCAD获取完整信息',
      'STEP文件通常用于机械零件设计，包含完整的几何和拓扑信息'
    ];
    if (toNumber(entities.faces, 0) > 1000) {
      recommendations.push('模型较复杂，可能需要较高性能设备进行渲染');
    }
    return recommendations;
  }
} 