/**
 * CAD解析器配置
 */

/**
 * 支持的CAD文件类型定义
 */
export const CAD_FILE_TYPES = {
  '2d': [
    { extension: 'dxf', description: 'AutoCAD DXF', mimeType: 'application/dxf' },
    { extension: 'dwg', description: 'AutoCAD DWG', mimeType: 'application/acad' },
    { extension: 'pdf', description: 'PDF Document', mimeType: 'application/pdf' },
    { extension: 'svg', description: 'Scalable Vector Graphics', mimeType: 'image/svg+xml' }
  ],
  '3d': [
    { extension: 'step', description: 'STEP 3D Model', mimeType: 'application/step' },
    { extension: 'stp', description: 'STEP 3D Model', mimeType: 'application/step' },
    { extension: 'iges', description: 'IGES 3D Model', mimeType: 'application/iges' },
    { extension: 'igs', description: 'IGES 3D Model', mimeType: 'application/iges' },
    { extension: 'stl', description: 'STL 3D Model', mimeType: 'model/stl' },
    { extension: 'obj', description: 'Wavefront OBJ', mimeType: 'model/obj' },
    { extension: 'gltf', description: 'GL Transmission Format', mimeType: 'model/gltf+json' },
    { extension: 'glb', description: 'GL Transmission Format Binary', mimeType: 'model/gltf-binary' }
  ]
};

/**
 * 解析器配置
 */
export const PARSER_CONFIG = {
  // 精度设置
  precisionSettings: {
    'low': { tolerance: 0.1, simplifyMesh: true, maxEntityCount: 50000 },
    'standard': { tolerance: 0.01, simplifyMesh: true, maxEntityCount: 100000 },
    'high': { tolerance: 0.001, simplifyMesh: false, maxEntityCount: 500000 }
  },
  
  // 默认转换设置
  conversion: {
    defaultTargetFormat: 'gltf',
    preserveColors: true,
    preserveStructure: true,
    optimize: true
  },
  
  // 缓存设置
  cache: {
    enabled: true,
    ttl: 24 * 60 * 60 * 1000, // 24小时
    maxEntries: 100
  }
};

/**
 * 分析器配置
 */
export const ANALYZER_CONFIG = {
  // 分析类型
  analysisTypes: [
    { id: 'standard', label: '标准分析', description: '基本的CAD文件分析' },
    { id: 'detailed', label: '详细分析', description: '包含更多细节的分析' },
    { id: 'professional', label: '专业分析', description: '包含AI增强的全面分析' },
    { id: 'measurement', label: '测量分析', description: '专注于尺寸和测量的分析' }
  ],
  
  // 分析参数
  parameters: {
    extractMeasurements: true,
    extractTopology: true,
    extractFeatures: true,
    calculateMassProperties: true,
    extractDimensions: true,
    detailLevel: 'standard',
    generateThumbnail: true,
    generateReport: false
  },
  
  // AI分析配置
  aiAnalysis: {
    enabled: true,
    detailLevel: 'standard',
    includeVisualAnalysis: true,
    modelType: 'general'
  },
  
  // 服务限制
  limits: {
    maxFileSize: 50 * 1024 * 1024, // 50MB
    maxSessionsPerUser: 5,
    processingTimeoutMs: 120000, // 2分钟
    rateLimit: {
      requestsPerMinute: 10,
      burstRequests: 20
    }
  }
};

/**
 * 清理配置
 */
export const CLEANUP_CONFIG = {
  // 临时文件存储目录
  tempDirs: [
    'tmp/cad-thumbnails',
    'tmp/cad-uploads',
    'tmp/cad-reports',
    'tmp/cad-analysis',
    'public/temp'
  ],
  
  // 定期清理设置
  scheduledCleanup: {
    enabled: true,
    interval: 24 * 60 * 60 * 1000, // 24小时
    maxFileAge: 24 * 60 * 60 * 1000, // 24小时
    includeSubdirs: true,
    dryRun: false
  }
}; 