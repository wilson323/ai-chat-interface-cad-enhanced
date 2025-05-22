// CAD解析引擎管理器
import { DXFParser } from './dxf-parser';
import { DWGParser } from './dwg-parser';
import { STEPParser } from './step-parser';
import { IGESParser } from './iges-parser';
import type { CADAnalysisResult } from '@/lib/types/cad';

export type ParserOptions = {
  precision: 'low' | 'standard' | 'high';
  extractLayers: boolean;
  extractMetadata: boolean;
  extractEntities: boolean;
  extractDimensions: boolean;
};

export async function parseCADFile(
  file: File | ArrayBuffer, 
  fileType: string, 
  options: Partial<ParserOptions> = {}
): Promise<CADAnalysisResult> {
  const defaultOptions: ParserOptions = {
    precision: 'standard',
    extractLayers: true,
    extractMetadata: true,
    extractEntities: true,
    extractDimensions: true,
    ...options
  };
  
  // 根据文件类型选择解析器
  const getParser = (type: string) => {
    switch (type.toLowerCase()) {
      case 'dxf': return new DXFParser();
      case 'dwg': return new DWGParser();
      case 'step':
      case 'stp': return new STEPParser();
      case 'iges':
      case 'igs': return new IGESParser();
      default: throw new Error(`不支持的文件类型: ${type}`);
    }
  };
  
  try {
    const parser = getParser(fileType);
    return await parser.parse(file, defaultOptions);
  } catch (error) {
    console.error('CAD解析失败:', error);
    throw new Error(`解析${fileType.toUpperCase()}文件失败: ${error instanceof Error ? error.message : String(error)}`);
  }
} 