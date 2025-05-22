// 添加关键操作监控
export function trackCADAnalysis(params: {
  fileType: string;
  fileSize: number;
  processingTime: number;
  success: boolean;
  errorCode?: string;
}) {
  // 发送到分析服务
  console.info('CAD分析完成', params);
  
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'cad_analysis', params);
  }
} 