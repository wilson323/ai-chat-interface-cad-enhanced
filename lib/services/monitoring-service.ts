import { BehaviorSubject, interval,Observable, Subject } from 'rxjs';
import { takeUntil, tap } from 'rxjs/operators';

// 系统性能指标接口
export interface SystemMetrics {
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
    cores: number;
  };
  network: {
    latency: number;
    requests: number;
    errors: number;
  };
  api: {
    callCount: number;
    avgResponseTime: number;
    errorRate: number;
  };
  timestamp: number;
}

// 用户行为指标接口
export interface UserMetrics {
  activeSessions: number;
  newUsers: number;
  pageViews: Record<string, number>;
  featureUsage: Record<string, number>;
  averageSessionDuration: number;
  bounceRate: number;
  timestamp: number;
}

// 健康状态接口
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: Record<string, {
    status: 'up' | 'down' | 'degraded';
    latency: number;
    lastChecked: number;
    message?: string;
  }>;
  dependencies: Record<string, {
    status: 'up' | 'down' | 'degraded';
    latency: number;
    lastChecked: number;
    message?: string;
  }>;
  timestamp: number;
}

// 监控配置
export interface MonitoringConfig {
  collectInterval: number;
  reportInterval: number;
  maxDataPoints: number;
  enableUserTracking: boolean;
  enablePerformanceMonitoring: boolean;
  enableHealthChecks: boolean;
  healthCheckInterval: number;
  apiEndpoint?: string;
}

// 默认配置
const DEFAULT_CONFIG: MonitoringConfig = {
  collectInterval: 10000,  // 10秒
  reportInterval: 60000,   // 1分钟
  maxDataPoints: 1000,
  enableUserTracking: true,
  enablePerformanceMonitoring: true,
  enableHealthChecks: true,
  healthCheckInterval: 30000,  // 30秒
};

// 监控事件类型
export type MonitoringEvent = 
  | { type: 'metrics:system', data: SystemMetrics }
  | { type: 'metrics:user', data: UserMetrics }
  | { type: 'health:status', data: HealthStatus }
  | { type: 'alert', level: 'info' | 'warning' | 'error' | 'critical', message: string, details?: any };

export class MonitoringService {
  private static instance: MonitoringService;
  private config: MonitoringConfig;
  private systemMetricsSubject = new BehaviorSubject<SystemMetrics | null>(null);
  private userMetricsSubject = new BehaviorSubject<UserMetrics | null>(null);
  private healthStatusSubject = new BehaviorSubject<HealthStatus | null>(null);
  private eventsSubject = new Subject<MonitoringEvent>();
  private destroyed$ = new Subject<void>();
  
  private systemMetricsHistory: SystemMetrics[] = [];
  private userMetricsHistory: UserMetrics[] = [];
  private healthStatusHistory: HealthStatus[] = [];
  
  private networkRequestsCount = 0;
  private networkErrorsCount = 0;
  private apiCallsCount = 0;
  private apiResponseTimes: number[] = [];
  private apiErrorsCount = 0;
  private pageViewsMap: Record<string, number> = {};
  private featureUsageMap: Record<string, number> = {};
  private sessionStartTimes: Record<string, number> = {};
  private sessionDurations: number[] = [];
  
  private metricsCollector: any;
  private healthChecker: any;
  private metricsReporter: any;
  
  private constructor(config: Partial<MonitoringConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    if (typeof window !== 'undefined') {
      // 初始化数据收集
      this.initDataCollection();
    }
  }
  
  public static getInstance(config?: Partial<MonitoringConfig>): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService(config);
    } else if (config) {
      // 更新配置
      MonitoringService.instance.updateConfig(config);
    }
    return MonitoringService.instance;
  }
  
  // 更新配置
  public updateConfig(config: Partial<MonitoringConfig>): void {
    const prevConfig = { ...this.config };
    this.config = { ...this.config, ...config };
    
    // 如果关键配置项发生变化，重新初始化
    if (
      prevConfig.collectInterval !== this.config.collectInterval ||
      prevConfig.healthCheckInterval !== this.config.healthCheckInterval ||
      prevConfig.enablePerformanceMonitoring !== this.config.enablePerformanceMonitoring ||
      prevConfig.enableUserTracking !== this.config.enableUserTracking ||
      prevConfig.enableHealthChecks !== this.config.enableHealthChecks
    ) {
      this.stopMonitoring();
      this.initDataCollection();
    }
  }
  
  // 获取系统指标
  public getSystemMetrics(): Observable<SystemMetrics | null> {
    return this.systemMetricsSubject.asObservable();
  }
  
  // 获取用户指标
  public getUserMetrics(): Observable<UserMetrics | null> {
    return this.userMetricsSubject.asObservable();
  }
  
  // 获取健康状态
  public getHealthStatus(): Observable<HealthStatus | null> {
    return this.healthStatusSubject.asObservable();
  }
  
  // 获取所有监控事件
  public getEvents(): Observable<MonitoringEvent> {
    return this.eventsSubject.asObservable();
  }
  
  // 获取系统指标历史
  public getSystemMetricsHistory(): SystemMetrics[] {
    return [...this.systemMetricsHistory];
  }
  
  // 获取用户指标历史
  public getUserMetricsHistory(): UserMetrics[] {
    return [...this.userMetricsHistory];
  }
  
  // 获取健康状态历史
  public getHealthStatusHistory(): HealthStatus[] {
    return [...this.healthStatusHistory];
  }
  
  // 记录网络请求
  public trackNetworkRequest(success: boolean, latency: number): void {
    this.networkRequestsCount++;
    if (!success) {
      this.networkErrorsCount++;
    }
  }
  
  // 记录API调用
  public trackApiCall(endpoint: string, responseTime: number, success: boolean): void {
    this.apiCallsCount++;
    this.apiResponseTimes.push(responseTime);
    
    // 限制数组大小
    if (this.apiResponseTimes.length > 1000) {
      this.apiResponseTimes.shift();
    }
    
    if (!success) {
      this.apiErrorsCount++;
    }
  }
  
  // 记录页面访问
  public trackPageView(path: string): void {
    if (!this.config.enableUserTracking) return;
    
    this.pageViewsMap[path] = (this.pageViewsMap[path] || 0) + 1;
  }
  
  // 记录功能使用
  public trackFeatureUsage(featureName: string): void {
    if (!this.config.enableUserTracking) return;
    
    this.featureUsageMap[featureName] = (this.featureUsageMap[featureName] || 0) + 1;
  }
  
  // 记录会话开始
  public trackSessionStart(sessionId: string): void {
    if (!this.config.enableUserTracking) return;
    
    this.sessionStartTimes[sessionId] = Date.now();
  }
  
  // 记录会话结束
  public trackSessionEnd(sessionId: string): void {
    if (!this.config.enableUserTracking || !this.sessionStartTimes[sessionId]) return;
    
    const duration = Date.now() - this.sessionStartTimes[sessionId];
    this.sessionDurations.push(duration);
    
    // 限制数组大小
    if (this.sessionDurations.length > 1000) {
      this.sessionDurations.shift();
    }
    
    // 清理会话数据
    delete this.sessionStartTimes[sessionId];
  }
  
  // 发出告警
  public emitAlert(level: 'info' | 'warning' | 'error' | 'critical', message: string, details?: any): void {
    const alertEvent: MonitoringEvent = {
      type: 'alert',
      level,
      message,
      details
    };
    
    this.eventsSubject.next(alertEvent);
    
    // 记录到控制台
    switch (level) {
      case 'info':
        console.info(`[监控] ${message}`, details);
        break;
      case 'warning':
        console.warn(`[监控] ${message}`, details);
        break;
      case 'error':
      case 'critical':
        console.error(`[监控] ${message}`, details);
        break;
    }
  }
  
  // 停止监控
  public stopMonitoring(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
    this.destroyed$ = new Subject<void>();
    
    // 清理定时器
    if (this.metricsCollector) {
      clearInterval(this.metricsCollector);
      this.metricsCollector = null;
    }
    
    if (this.healthChecker) {
      clearInterval(this.healthChecker);
      this.healthChecker = null;
    }
    
    if (this.metricsReporter) {
      clearInterval(this.metricsReporter);
      this.metricsReporter = null;
    }
  }
  
  // 重置所有数据
  public resetData(): void {
    this.systemMetricsHistory = [];
    this.userMetricsHistory = [];
    this.healthStatusHistory = [];
    this.networkRequestsCount = 0;
    this.networkErrorsCount = 0;
    this.apiCallsCount = 0;
    this.apiResponseTimes = [];
    this.apiErrorsCount = 0;
    this.pageViewsMap = {};
    this.featureUsageMap = {};
    this.sessionStartTimes = {};
    this.sessionDurations = [];
    
    this.systemMetricsSubject.next(null);
    this.userMetricsSubject.next(null);
    this.healthStatusSubject.next(null);
  }
  
  // 销毁服务
  public destroy(): void {
    this.stopMonitoring();
    this.resetData();
    this.eventsSubject.complete();
    this.systemMetricsSubject.complete();
    this.userMetricsSubject.complete();
    this.healthStatusSubject.complete();
  }
  
  // 初始化数据收集
  private initDataCollection(): void {
    // 重置事件流
    this.destroyed$.next();
    this.destroyed$ = new Subject<void>();
    
    // 收集系统指标
    if (this.config.enablePerformanceMonitoring) {
      this.startSystemMetricsCollection();
    }
    
    // 收集用户指标
    if (this.config.enableUserTracking) {
      this.startUserMetricsCollection();
    }
    
    // 健康检查
    if (this.config.enableHealthChecks) {
      this.startHealthChecks();
    }
    
    // 定期向服务器报告指标
    if (this.config.apiEndpoint) {
      this.startMetricsReporting();
    }
  }
  
  // 开始系统指标收集
  private startSystemMetricsCollection(): void {
    if (this.metricsCollector) {
      clearInterval(this.metricsCollector);
    }
    
    this.metricsCollector = setInterval(() => {
      this.collectSystemMetrics();
    }, this.config.collectInterval);
  }
  
  // 开始用户指标收集
  private startUserMetricsCollection(): void {
    // 在系统指标收集器中一并收集用户指标
  }
  
  // 开始健康检查
  private startHealthChecks(): void {
    if (this.healthChecker) {
      clearInterval(this.healthChecker);
    }
    
    this.healthChecker = setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckInterval);
  }
  
  // 开始指标报告
  private startMetricsReporting(): void {
    if (this.metricsReporter) {
      clearInterval(this.metricsReporter);
    }
    
    this.metricsReporter = setInterval(() => {
      this.reportMetricsToServer();
    }, this.config.reportInterval);
  }
  
  // 收集系统指标
  private collectSystemMetrics(): void {
    // 在浏览器环境中收集性能指标
    if (typeof window === 'undefined') return;
    
    // 内存使用情况（如果可用）
    let memoryUsage = { used: 0, total: 0, percentage: 0 };
    if (window.performance && (performance as any).memory) {
      const memory = (performance as any).memory;
      memoryUsage = {
        used: memory.usedJSHeapSize,
        total: memory.jsHeapSizeLimit,
        percentage: memory.usedJSHeapSize / memory.jsHeapSizeLimit * 100
      };
    }
    
    // 获取平均API响应时间
    const avgResponseTime = this.apiResponseTimes.length > 0
      ? this.apiResponseTimes.reduce((sum, time) => sum + time, 0) / this.apiResponseTimes.length
      : 0;
    
    // 错误率
    const errorRate = this.apiCallsCount > 0
      ? (this.apiErrorsCount / this.apiCallsCount) * 100
      : 0;
    
    // 创建系统指标对象
    const metrics: SystemMetrics = {
      memory: memoryUsage,
      cpu: {
        usage: this.estimateCpuUsage(),
        cores: navigator.hardwareConcurrency || 1
      },
      network: {
        latency: this.estimateNetworkLatency(),
        requests: this.networkRequestsCount,
        errors: this.networkErrorsCount
      },
      api: {
        callCount: this.apiCallsCount,
        avgResponseTime,
        errorRate
      },
      timestamp: Date.now()
    };
    
    // 更新历史记录
    this.systemMetricsHistory.push(metrics);
    if (this.systemMetricsHistory.length > this.config.maxDataPoints) {
      this.systemMetricsHistory.shift();
    }
    
    // 通知订阅者
    this.systemMetricsSubject.next(metrics);
    
    // 发出事件
    this.eventsSubject.next({
      type: 'metrics:system',
      data: metrics
    });
    
    // 同时收集用户指标
    if (this.config.enableUserTracking) {
      this.collectUserMetrics();
    }
  }
  
  // 收集用户指标
  private collectUserMetrics(): void {
    // 计算平均会话时长
    const avgSessionDuration = this.sessionDurations.length > 0
      ? this.sessionDurations.reduce((sum, duration) => sum + duration, 0) / this.sessionDurations.length
      : 0;
    
    // 创建用户指标对象
    const metrics: UserMetrics = {
      activeSessions: Object.keys(this.sessionStartTimes).length,
      newUsers: 0, // 需要后端数据
      pageViews: { ...this.pageViewsMap },
      featureUsage: { ...this.featureUsageMap },
      averageSessionDuration: avgSessionDuration,
      bounceRate: 0, // 需要后端数据
      timestamp: Date.now()
    };
    
    // 更新历史记录
    this.userMetricsHistory.push(metrics);
    if (this.userMetricsHistory.length > this.config.maxDataPoints) {
      this.userMetricsHistory.shift();
    }
    
    // 通知订阅者
    this.userMetricsSubject.next(metrics);
    
    // 发出事件
    this.eventsSubject.next({
      type: 'metrics:user',
      data: metrics
    });
  }
  
  // 执行健康检查
  private async performHealthCheck(): Promise<void> {
    // 检查各服务状态
    const services: HealthStatus['services'] = {};
    
    // 检查API服务
    try {
      const startTime = Date.now();
      const response = await fetch('/api/health', {
        method: 'GET',
        headers: { 'Cache-Control': 'no-cache' }
      });
      const latency = Date.now() - startTime;
      
      services['api'] = {
        status: response.ok ? 'up' : 'degraded',
        latency,
        lastChecked: Date.now(),
        message: response.ok ? undefined : await response.text()
      };
    } catch (error) {
      services['api'] = {
        status: 'down',
        latency: 0,
        lastChecked: Date.now(),
        message: error instanceof Error ? error.message : String(error)
      };
    }
    
    // 检查依赖服务
    const dependencies: HealthStatus['dependencies'] = {};
    
    // 创建健康状态对象
    const status: HealthStatus = {
      status: this.determineOverallStatus(services, dependencies),
      services,
      dependencies,
      timestamp: Date.now()
    };
    
    // 更新历史记录
    this.healthStatusHistory.push(status);
    if (this.healthStatusHistory.length > this.config.maxDataPoints) {
      this.healthStatusHistory.shift();
    }
    
    // 通知订阅者
    this.healthStatusSubject.next(status);
    
    // 发出事件
    this.eventsSubject.next({
      type: 'health:status',
      data: status
    });
    
    // 如果状态不健康，发出告警
    if (status.status === 'unhealthy') {
      this.emitAlert('error', '系统状态不健康', status);
    } else if (status.status === 'degraded') {
      this.emitAlert('warning', '系统状态降级', status);
    }
  }
  
  // 报告指标到服务器
  private async reportMetricsToServer(): Promise<void> {
    if (!this.config.apiEndpoint) return;
    
    const systemMetrics = this.systemMetricsSubject.getValue();
    const userMetrics = this.userMetricsSubject.getValue();
    const healthStatus = this.healthStatusSubject.getValue();
    
    try {
      await fetch(this.config.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          system: systemMetrics,
          user: userMetrics,
          health: healthStatus,
          timestamp: Date.now()
        })
      });
    } catch (error) {
      console.error('报告指标失败:', error);
    }
  }
  
  // 估算CPU使用率
  private estimateCpuUsage(): number {
    // 在浏览器中无法直接获取CPU使用率，返回一个估计值
    return Math.random() * 30 + 10; // 10-40%，模拟值
  }
  
  // 估算网络延迟
  private estimateNetworkLatency(): number {
    // 返回一个估计值，实际应用中可以使用真实测量
    return Math.random() * 100 + 50; // 50-150ms，模拟值
  }
  
  // 确定整体健康状态
  private determineOverallStatus(
    services: HealthStatus['services'],
    dependencies: HealthStatus['dependencies']
  ): HealthStatus['status'] {
    // 检查是否有任何服务或依赖处于宕机状态
    const hasDownServices = Object.values(services).some(s => s.status === 'down');
    const hasDownDependencies = Object.values(dependencies).some(d => d.status === 'down');
    
    if (hasDownServices || hasDownDependencies) {
      return 'unhealthy';
    }
    
    // 检查是否有任何服务或依赖处于降级状态
    const hasDegradedServices = Object.values(services).some(s => s.status === 'degraded');
    const hasDegradedDependencies = Object.values(dependencies).some(d => d.status === 'degraded');
    
    if (hasDegradedServices || hasDegradedDependencies) {
      return 'degraded';
    }
    
    return 'healthy';
  }
} 