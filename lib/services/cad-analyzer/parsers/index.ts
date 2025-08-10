// CAD解析器集合
import { DXFParser } from './dxf-parser';
import { DWGParser } from './dwg-parser';
import { STEPParser } from './step-parser';
import { IGESParser } from './iges-parser';
import type { CADAnalysisResult } from '@/lib/types/cad';

export interface ParserOptions {
  precision: 'low' | 'standard' | 'high';
  extractLayers?: boolean;
  extractMetadata?: boolean;
  extractMaterials?: boolean;
  extractDimensions?: boolean;
  extractTopology?: boolean;
  extractFeatures?: boolean;
  calculateMassProperties?: boolean;
  extractAssemblyStructure?: boolean;
  extractAnnotations?: boolean;
  optimizeMesh?: boolean;
  extractMeasurements?: boolean;
}

/**
 * 解析CAD文件
 * @param file 文件或ArrayBuffer
 * @param fileType 文件类型
 * @param options 解析选项
 */
export async function parseCADFile(
  file: File | ArrayBuffer,
  fileType: string,
  options: ParserOptions
): Promise<CADAnalysisResult> {
  // 标准化文件类型
  const type = fileType.toLowerCase();
  
  // 根据文件类型选择解析器
  switch (type) {
    case 'dxf':
      const dxfParser = new DXFParser();
      return dxfParser.parse(file, options);
      
    case 'dwg':
      const dwgParser = new DWGParser();
      return dwgParser.parse(file, options);
      
    case 'step':
    case 'stp':
      const stepParser = new STEPParser();
      return stepParser.parse(file, options);
      
    case 'iges':
    case 'igs':
      const igesParser = new IGESParser();
      return igesParser.parse(file, options);
      
    default:
      throw new Error(`不支持的文件类型: ${fileType}`);
  }
}

/**
 * 获取支持的文件类型
 */
export function getSupportedFileTypes(): string[] {
  return ['dxf', 'dwg', 'step', 'stp', 'iges', 'igs'];
}

/**
 * 默认解析选项
 */
export const DEFAULT_PARSER_OPTIONS: ParserOptions = {
  precision: 'standard',
  extractLayers: true,
  extractMetadata: true,
  extractMaterials: false,
  extractDimensions: true
}; 