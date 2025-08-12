// 添加关键操作监控
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    gtag?: (...args: any[]) => void;
  }
}

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
    window.gtag('event', 'cad_analysis', params as unknown as Record<string, unknown>);
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