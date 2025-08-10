/**
 * CAD分析器相关类型定义
 */

export type CADFileType = 
  | 'dxf' | 'dwg'                      // AutoCAD
  | 'step' | 'stp'                     // STEP
  | 'iges' | 'igs'                     // IGES
  | 'stl' | 'obj' | 'gltf' | 'glb'     // 3D模型
  | 'ifc'                              // BIM (建筑信息模型)
  | 'fbx'                              // Autodesk FBX
  | 'skp'                              // SketchUp
  | '3ds'                              // 3D Studio
  | 'sat' | 'sab'                      // ACIS
  | 'x_t' | 'x_b' | 'xmt_txt' | 'xmt_bin' // Parasolid
  | 'jt'                               // JT Open
  | 'dwf' | 'dwfx'                     // Design Web Format
  | 'dae'                              // Collada
  | 'ply'                              // Polygon File Format
  | 'off';                             // Object File Format

export type CADComponentType = 'solid' | 'mesh' | 'surface' | 'drawing' | 'assembly';

export type CADAnalysisType = 'standard' | 'detailed' | 'professional' | 'measurement';

/**
 * CAD组件定义
 */
export interface CADComponent {
  id: string;
  name: string;
  type: CADComponentType;
  visible: boolean;
  position: [number, number, number]; // [x, y, z]
  rotation?: [number, number, number]; // [rx, ry, rz] 欧拉角
  scale?: [number, number, number]; // [sx, sy, sz]
  material?: string;
  color?: string;
  parentId?: string; // 父组件ID，用于装配体结构
  metadata?: Record<string, any>;
  parameters?: Record<string, any>; // 组件参数
  dimensions?: Record<string, any>; // 尺寸信息
}

/**
 * CAD材质定义
 */
export interface CADMaterial {
  name: string;
  color: string;
  texture?: string;
  density?: number; // 密度 (g/cm³)
  properties?: Record<string, string>; // 其他属性
}

/**
 * 实体类型数量映射
 */
export type CADEntityMap = Record<string, number>;

/**
 * CAD测量结果
 */
export interface CADMeasurement {
  id: string;
  type: 'distance' | 'angle' | 'radius' | 'diameter' | 'area' | 'volume';
  value: number;
  unit: string;
  points?: Array<[number, number, number]>; // 测量点
  components?: string[]; // 相关组件ID
  label?: string; // 测量标签
  color?: string; // 测量显示颜色
}

/**
 * CAD分析结果
 */
export interface CADAnalysisResult {
  // 基本文件信息
  fileId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileHash?: string;
  thumbnail?: string;
  // 兼容历史字段
  id?: string; // 某些解析器使用的局部标识
  url?: string; // 旧实现中的模型URL
  modelUrl?: string; // 标准模型URL 字段
  originalFile?: File; // 源文件引用

  // 模型尺寸信息
  dimensions: {
    width: number;
    height: number;
    depth?: number;
    unit: string;
  };

  // 实体统计
  entities: Record<string, number>;

  // 实体详情
  entityDetails?: EntityDetail[];

  // 图层信息（兼容 string[] 与 LayerInfo[]）
  layers: Array<LayerInfo | string>;

  // 元数据（放宽为任意记录）
  metadata?: Record<string, any>;

  // 组件/材料/测量等（供高级解析与报告使用）
  components?: CADComponent[];
  materials?: CADMaterial[];
  measurements?: CADMeasurement[];

  // 高级计算结果（可选）
  massProperties?: Record<string, number>;
  features?: any;
  topology?: any;
  assemblyStructure?: any;

  // AI分析摘要（轻量）
  aiSummary?: string;
  aiRecommendations?: string[];
  aiInsights?: { summary: string; recommendations: string[] };

  // 其它分析数据
  devices?: any[];
  wiring?: { totalLength: number; details: any[] };
  risks?: any[];

  // 分析过程
  analysisTime?: string; // ISO时间戳
  processingTimeMs?: number;

  // 检测到的问题
  issues?: IssueInfo[];

  // 历史分析记录
  previousAnalyses?: PreviousAnalysis[];
}

/**
 * CAD分析请求
 */
export interface CADAnalysisRequest {
  file: File;
  analysisType: CADAnalysisType;
  options?: {
    extractMeasurements?: boolean;
    extractTopology?: boolean;
    extractFeatures?: boolean;
    calculateMassProperties?: boolean;
    detailLevel?: 'low' | 'standard' | 'high';
    generateThumbnail?: boolean;
    generateReport?: boolean;
    [key: string]: any;
  };
}

/**
 * 分析进度
 */
export interface CADAnalysisProgress {
  percentage: number;
  stage: string;
  details?: string;
  error?: string;
  upload?: number;
  analysis?: number;
}

/**
 * CAD分析会话
 */
export interface CADAnalysisSession {
  sessionId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  analysisType: CADAnalysisType;
  startTime: string;
  endTime?: string;
  progress: CADAnalysisProgress;
  result?: CADAnalysisResult;
  error?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

/**
 * CAD分析报告
 */
export interface CADAnalysisReport {
  reportId: string;
  sessionId: string;
  fileId: string;
  fileName: string;
  generationDate: string;
  reportType: 'summary' | 'detailed' | 'measurement' | 'professional';
  format: 'html' | 'pdf' | 'json';
  url?: string;
  content?: any;
}

/**
 * CAD分析器配置
 */
export interface CADAnalyzerConfig {
  supportedFileTypes: CADFileType[];
  maxFileSize: number; // 字节
  defaultAnalysisType: CADAnalysisType;
  defaultOptions: {
    extractMeasurements: boolean;
    extractTopology: boolean;
    extractFeatures: boolean;
    calculateMassProperties: boolean;
    detailLevel: 'low' | 'standard' | 'high';
    generateThumbnail: boolean;
    generateReport: boolean;
  };
  analysisTimeoutMs: number;
  enabledFeatures: {
    aiAnalysis: boolean;
    materialAnalysis: boolean;
    optimizationSuggestions: boolean;
    validation: boolean;
    collaboration: boolean;
    realTimePreview: boolean;
  };
}

/**
 * CAD分析器状态
 */
export interface CADAnalyzerStatus {
  isReady: boolean;
  activeSessions: number;
  queuedSessions: number;
  totalProcessed: number;
  avgProcessingTime: number; // 毫秒
  lastError?: string;
  lastProcessed?: string;
  memoryUsage?: number; // 字节
}

/**
 * AI多模态分析结果类型
 */
export interface AIMultimodalAnalysisResult {
  summary: string;
  observations: string[];
  recommendations?: string[];
  issues?: {
    title: string;
    description: string;
    severity: string;
    solution?: string;
  }[];
  components?: {
    name: string;
    description: string;
    count: number;
  }[];
  materialEstimation?: {
    material: string;
    amount: number;
    unit: string;
  }[];
  manufacturingDifficulty?: {
    level: string;
    explanation: string;
  };
  analysisVersion: string;
  analysisTimestamp: string;
  // 扩展字段（报告模板引用，均为可选）
  categorySpecificInsights?: string;
  confidenceScore?: number;
  visualAnalysis?: {
    detectedComponents: Array<{ type: string; count: number; location?: string; confidence: number }>;
  };
  technicalAnalysis?: {
    technicalIssues: Array<{ category: string; description: string; impact?: string; severity: string }>;
  };
  optimizationSuggestions?: {
    designImprovements: Array<{ area: string; suggestion: string; benefit?: string; implementationDifficulty?: string }>;
  };
}

/**
 * CAD解析选项
 */
export interface CADParserOptions {
  precision: 'low' | 'standard' | 'high';
  extractLayers?: boolean;
  extractMetadata?: boolean;
  extractMaterials?: boolean;
  extractDimensions?: boolean;
  // 兼容扩展选项（高级解析）
  extractTopology?: boolean;
  extractFeatures?: boolean;
  calculateMassProperties?: boolean;
  extractAssemblyStructure?: boolean;
  extractAnnotations?: boolean;
  optimizeMesh?: boolean;
  extractMeasurements?: boolean;
}

/**
 * CAD查看器配置
 */
export interface CADViewerConfig {
  showGrid?: boolean;
  showAxes?: boolean;
  backgroundColor?: string;
  materialColor?: string;
  enableOrbitControls?: boolean;
  enableZoom?: boolean;
  enablePan?: boolean;
  enableRotation?: boolean;
  showWireframe?: boolean;
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

// 实体详情
export interface EntityDetail {
  id: string;
  type: string;
  position?: {
    x: number;
    y: number;
    z?: number;
  };
  properties?: Record<string, any>;
  color?: string;
  layerId?: string;
}

// 图层信息
export interface LayerInfo {
  id?: string;
  name: string;
  color?: string;
  visible?: boolean;
  locked?: boolean;
  entityCount?: number;
}

// 问题信息
export interface IssueInfo {
  id?: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  location?: {
    entity?: string;
    position?: {
      x: number;
      y: number;
      z?: number;
    };
  };
  solution?: string;
}

// 历史分析
export interface PreviousAnalysis {
  id: string;
  version: number;
  timestamp: string;
  changeDescription?: string;
}

// CAD文件上传请求
export interface CADUploadRequest {
  file: File;
  analysisOptions?: AnalysisOptions;
}

// CAD文件上传响应
export interface CADUploadResponse {
  fileId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadTimestamp: string;
  status: 'uploaded' | 'processing' | 'failed';
  error?: string;
}

// 分析选项
export interface AnalysisOptions {
  enableAI?: boolean;
  generateThumbnail?: boolean;
  generateReport?: boolean;
  reportFormat?: 'html' | 'pdf' | 'json';
  detailed?: boolean;
  includeEntities?: boolean;
  includeMetadata?: boolean;
}

// 分析状态
export interface AnalysisStatus {
  fileId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  stage?: string;
  error?: string;
  startTime?: string;
  endTime?: string;
  estimatedTimeRemaining?: number;
}

// 生成缩略图请求
export interface GenerateThumbnailRequest {
  fileId?: string;
  file?: File;
  mode?: '2d' | '3d' | 'auto';
  width?: number;
  height?: number;
  quality?: number;
}

// 生成缩略图响应
export interface GenerateThumbnailResponse {
  thumbnail: string; // Base64编码的图片
  fileType: string;
  mode: '2d' | '3d';
  width: number;
  height: number;
}

// 生成报告请求
export interface GenerateReportRequest {
  fileId: string;
  format: 'html' | 'pdf' | 'json';
  includeAIAnalysis?: boolean;
  includeThumbnail?: boolean;
  theme?: 'light' | 'dark';
  language?: string;
  sections?: string[];
  shared?: boolean;
}

// 生成报告响应
export interface GenerateReportResponse {
  reportUrl: string;
  format: 'html' | 'pdf' | 'json';
  fileName: string;
  fileSize: number;
  expiryTime?: string;
}

// 文件清理请求
export interface CleanupRequest {
  maxAgeHours?: number;
  dryRun?: boolean;
  specificDir?: string;
  includeSubdirs?: boolean;
}

// 文件清理响应
export interface CleanupResponse {
  success: boolean;
  totalFiles: number;
  deletedFiles: number;
  byDirectory: Record<string, { total: number, deleted: number }>;
  errors: string[];
  dryRun: boolean;
  executionTimeMs: number;
}

// 分享分析结果
export interface ShareAnalysisRequest {
  fileId: string;
  expiryTime?: string; // ISO时间戳
  accessControl?: {
    password?: string;
    emailDomains?: string[];
    maxViews?: number;
  };
}

// 分享分析结果响应
export interface ShareAnalysisResponse {
  shareId: string;
  shareUrl: string;
  expiryTime?: string;
  createdAt: string;
}

/**
 * CAD截面分析配置
 */
export interface CADSectionAnalysisConfig {
  enabled: boolean;
  plane: 'xy' | 'xz' | 'yz' | 'custom';
  customPosition?: [number, number, number];
  customNormal?: [number, number, number];
  showIntersection: boolean;
  clipModel: boolean;
}

/**
 * 高级渲染设置
 */
export interface AdvancedRenderingOptions {
  shadows: boolean;
  ambientOcclusion: boolean;
  reflections: boolean;
  antialiasing: boolean;
  textureQuality: 'low' | 'medium' | 'high';
  performance: 'low' | 'balanced' | 'high';
  wireframeMode: 'none' | 'overlay' | 'only';
  edgeHighlight: boolean;
}

/**
 * CAD专业领域分析结果
 */
export interface DomainSpecificAnalysis {
  domain: 'mechanical' | 'architectural' | 'electrical' | 'plumbing';
  insights: {
    title: string;
    description: string;
    confidence: number;
    reference?: string;
  }[];
  standards: {
    name: string;
    compliance: 'compliant' | 'non-compliant' | 'warning' | 'not-applicable';
    details: string;
  }[];
  metrics: Record<string, number | string>;
  expertRecommendations: string[];
}

/**
 * CAD文件格式详细信息
 */
export interface CADFormatInfo {
  formatName: string;
  version: string;
  vendor: string;
  capabilities: string[];
  limitations: string[];
  compatibleWith: string[];
}

/**
 * BIM特定数据结构
 */
export interface BIMData {
  ifcType?: string;
  ifcGuid?: string;
  propertySetNames?: string[];
  propertySets?: Record<string, Record<string, any>>;
  childRelations?: {
    type: string;
    relatedElements: string[];
  }[];
  spatialStructure?: {
    site?: string;
    building?: string;
    storey?: string;
    space?: string;
  };
}

/**
 * CAD批量处理请求
 */
export interface CADBatchProcessRequest {
  files: File[];
  commonOptions: AnalysisOptions;
  fileSpecificOptions?: Record<string, Partial<AnalysisOptions>>;
  outputFormat: 'json' | 'csv' | 'excel' | 'pdf';
  notification?: {
    email?: string;
    webhook?: string;
  };
}

/**
 * CAD模型优化选项
 */
export interface CADModelOptimizationOptions {
  decimatePercent?: number;
  simplifyGeometry: boolean;
  removeTinyFeatures: boolean;
  mergeSimilarMaterials: boolean;
  compressTextures: boolean;
  level: 'none' | 'minimal' | 'moderate' | 'aggressive';
}

/**
 * IFC特定分析选项
 */
export interface IFCAnalysisOptions {
  extractSpaces: boolean;
  calculateQuantities: boolean;
  validateAgainstSchema: boolean;
  extractPropertySets: boolean;
  includeSpatialHierarchy: boolean;
}

/**
 * CAD协作信息
 */
export interface CADCollaborationInfo {
  sharedBy: string;
  sharedAt: string;
  collaborators: {
    id: string;
    name: string;
    role: string;
    lastActive?: string;
  }[];
  comments: {
    id: string;
    authorId: string;
    createdAt: string;
    text: string;
    position?: [number, number, number];
    resolved: boolean;
  }[];
  version: number;
  previousVersions: {
    version: number;
    createdAt: string;
    createdBy: string;
    changeDescription: string;
  }[];
} 