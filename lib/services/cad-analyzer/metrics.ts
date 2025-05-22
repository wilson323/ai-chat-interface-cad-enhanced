// CAD解析监控和指标收集
type CADMetricName = 
  | 'parse_duration'
  | 'file_size'
  | 'entity_count'
  | 'complexity_score'
  | 'error_count';

interface CADMetric {
  name: CADMetricName;
  value: number;
  unit?: string;
  timestamp: number;
  metadata?: Record<string, string>;
}

class CADMetricsCollector {
  private metrics: CADMetric[] = [];
  private sessionId: string;
  private static instance: CADMetricsCollector;
  
  private constructor() {
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
  
  static getInstance(): CADMetricsCollector {
    if (!CADMetricsCollector.instance) {
      CADMetricsCollector.instance = new CADMetricsCollector();
    }
    return CADMetricsCollector.instance;
  }
  
  // 记录指标
  record(name: CADMetricName, value: number, unit?: string, metadata?: Record<string, string>): void {
    this.metrics.push({
      name,
      value,
      unit,
      timestamp: Date.now(),
      metadata: {
        sessionId: this.sessionId,
        ...metadata
      }
    });
    
    // 如果在客户端环境，同时记录到控制台
    if (typeof window !== 'undefined') {
      console.info(`[CAD Metrics] ${name}: ${value}${unit ? unit : ''}`);
    }
    
    // 如果积累了很多指标，考虑发送到服务器
    if (this.metrics.length >= 20) {
      this.flush();
    }
  }
  
  // 计算文件复杂度分数
  calculateComplexityScore(entities: Record<string, number>, layers: string[]): number {
    const entityCount = Object.values(entities).reduce((sum, count) => sum + count, 0);
    const layerCount = layers.length;
    
    // 复杂度计算公式: 基于实体数、图层数和不同实体类型的权重
    let complexityScore = (entityCount * 0.6) + (layerCount * 50) + (Object.keys(entities).length * 100);
    
    // 对特定类型实体增加权重
    if ('polylines' in entities) complexityScore += entities.polylines * 1.5;
    if ('text' in entities) complexityScore += entities.text * 0.8;
    if ('dimensions' in entities) complexityScore += entities.dimensions * 2;
    
    return Math.round(complexityScore);
  }
  
  // 将指标发送到服务器
  async flush(): Promise<void> {
    if (this.metrics.length === 0) return;
    
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
      try {
        const metricsToSend = [...this.metrics];
        this.metrics = [];
        
        await fetch('/api/cad/metrics', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            metrics: metricsToSend,
            timestamp: Date.now(),
            sessionId: this.sessionId
          })
        });
      } catch (error) {
        console.error('Failed to send metrics:', error);
        // 将失败的指标放回队列
        this.metrics = [...this.metrics];
      }
    } else {
      // 在非生产环境，只清除指标
      this.metrics = [];
    }
  }
  
  // 获取当前会话中收集的所有指标
  getMetrics(): CADMetric[] {
    return [...this.metrics];
  }
}

export const cadMetrics = CADMetricsCollector.getInstance(); 