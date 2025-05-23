/**
 * CAD分析器指标收集工具
 * 用于记录和跟踪CAD分析相关的性能和使用指标
 */

type MetricValue = number;
type MetricUnit = 'ms' | 'bytes' | 'count' | 'percentage';
type MetricTags = Record<string, string>;

interface Metric {
  name: string;
  value: MetricValue;
  unit: MetricUnit;
  timestamp: number;
  tags?: MetricTags;
}

class CADMetrics {
  private static instance: CADMetrics;
  private metrics: Metric[] = [];
  private maxStoredMetrics = 1000;
  
  // 单例模式
  public static getInstance(): CADMetrics {
    if (!CADMetrics.instance) {
      CADMetrics.instance = new CADMetrics();
    }
    return CADMetrics.instance;
  }
  
  private constructor() {
    // 私有构造函数，防止直接实例化
  }
  
  /**
   * 记录一个指标
   * @param name 指标名称
   * @param value 指标值
   * @param unit 指标单位
   * @param tags 可选的标签/维度
   */
  public record(
    name: string, 
    value: MetricValue, 
    unit: MetricUnit, 
    tags?: MetricTags
  ): void {
    // 创建指标对象
    const metric: Metric = {
      name,
      value,
      unit,
      timestamp: Date.now(),
      tags
    };
    
    // 添加到指标集合
    this.metrics.push(metric);
    
    // 如果超过最大存储数量，移除最早的
    if (this.metrics.length > this.maxStoredMetrics) {
      this.metrics.shift();
    }
    
    // 在开发环境中打印指标
    if (process.env.NODE_ENV === 'development') {
      console.log(`[CADMetrics] ${name}: ${value} ${unit}`, tags);
    }
    
    // 在实际项目中，这里可以添加指标上报到监控系统的逻辑
    // 例如发送到Prometheus、Datadog、CloudWatch等
    this.reportToMonitoringSystem(metric);
  }
  
  /**
   * 获取最近的指标
   * @param name 指标名称
   * @param limit 最大返回数量
   */
  public getRecentMetrics(name: string, limit: number = 10): Metric[] {
    return this.metrics
      .filter(m => m.name === name)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }
  
  /**
   * 获取指标的统计信息
   * @param name 指标名称
   */
  public getStatistics(name: string): { avg: number; min: number; max: number; count: number } {
    const values = this.metrics
      .filter(m => m.name === name)
      .map(m => m.value);
    
    if (values.length === 0) {
      return { avg: 0, min: 0, max: 0, count: 0 };
    }
    
    return {
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      count: values.length
    };
  }
  
  /**
   * 清除指标数据
   */
  public clear(): void {
    this.metrics = [];
  }
  
  /**
   * 上报到监控系统
   * 实际项目中，这里应该实现与监控系统的集成
   */
  private reportToMonitoringSystem(metric: Metric): void {
    // 在实际项目中，这里应该实现发送指标到监控系统的逻辑
    // 例如:
    // - 使用fetch或axios发送到API端点
    // - 使用SDK上报到监控系统
    // - 写入到本地日志文件
  }
}

// 导出单例实例
export const cadMetrics = CADMetrics.getInstance(); 