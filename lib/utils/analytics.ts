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

export const trackEvent = (event: string, params?: Record<string, any>) => {
  if (process.env.NODE_ENV === 'production') {
    fetch('https://analytics.example.com/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.ANALYTICS_KEY!
      },
      body: JSON.stringify({
        event,
        params,
        timestamp: Date.now()
      })
    }).catch(() => {/* 静默失败 */});
  }
}; 