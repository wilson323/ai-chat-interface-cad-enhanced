// 添加关键操作监控
// 使用 lib/types/global.d.ts 中的 Window.gtag 类型声明

export function trackCADAnalysis(params: {
  fileType: string;
  fileSize: number;
  processingTime: number;
  success: boolean;
  errorCode?: string;
}) {
  // 发送到分析服务
  console.info('CAD分析完成', params);
  
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    const gtag = window.gtag as ((command: string, ...args: Array<unknown>) => void);
    gtag('event', 'cad_analysis', params as Record<string, unknown>);
  }
}

export const trackEvent = (event: string, params?: Record<string, unknown>) => {
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