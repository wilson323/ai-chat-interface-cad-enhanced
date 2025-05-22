// 完善的CAD分析类型定义
export interface CADAnalysisResult {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  url: string;
  originalFile?: File;
  
  // 实体信息
  entities: {
    lines: number;
    circles: number;
    arcs: number;
    polylines: number;
    text: number;
    dimensions: number;
    blocks: number;
    [key: string]: number;
  };
  
  // 图层信息
  layers: string[];
  
  // 尺寸信息
  dimensions: {
    width: number;
    height: number;
    unit: string;
  };
  
  // 元数据
  metadata: {
    author?: string;
    createdAt?: string;
    modifiedAt?: string;
    [key: string]: any;
  };
  
  // 设备信息
  devices?: {
    type?: string;
    count?: number;
    location?: string;
  }[];
  
  // 布线信息
  wiring?: {
    totalLength?: number;
    details?: {
      path?: string;
      source?: string;
      length?: number;
    }[];
  };
  
  // 风险项
  risks?: {
    description: string;
    level: string;
    solution?: string;
  }[];
  
  // AI分析结果
  aiInsights?: {
    summary?: string;
    recommendations?: string[];
  };
}

export interface CADUploadOptions {
  precision?: 'low' | 'standard' | 'high';
  userNotes?: string;
}

export interface CADProcessingHistoryItem {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  processedAt: string;
  result: CADAnalysisResult;
} 