import { ApiSecurityService } from './api-security-service';
import { MonitoringService } from './monitoring-service';
import { BatchProcessor } from '../batch/batch-processor';
import { getSyncManager } from '../sync/sync-manager';
import { ConversationTreeManager } from '../conversation/conversation-tree';

// 系统配置接口
export interface SystemConfig {
  // 服务配置
  services: {
    monitoring?: {
      enabled: boolean;
      collectInterval?: number;
      reportInterval?: number;
      enableUserTracking?: boolean;
      enablePerformanceMonitoring?: boolean;
      enableHealthChecks?: boolean;
    };
    security?: {
      enabled: boolean;
      auditEnabled?: boolean;
      ipBasedRateLimiting?: boolean;
      customRateLimits?: Array<{
        endpoint: string;
        limit: number;
        window: number;
      }>;
    };
    sync?: {
      enabled: boolean;
      autoBackup?: boolean;
      backupInterval?: number;
      syncInterval?: number;
      remoteEnabled?: boolean;
      remoteUrl?: string;
    };
    batch?: {
      enabled: boolean;
      maxConcurrentJobs?: number;
      maxConcurrentTasksPerJob?: number;
    };
  };
  
  // 功能标志
  features: {
    complexConversationTree?: boolean;
    enhancedMultimodal?: boolean;
    mobileOptimizations?: boolean;
    offlineSupport?: boolean;
    apiPermissions?: boolean;
    userBehaviorAnalytics?: boolean;
    advancedBatchProcessing?: boolean;
  };
  
  // 系统运行模式
  mode: 'development' | 'production' | 'test';
  
  // 调试选项
  debug?: {
    verbose?: boolean;
    logPerformance?: boolean;
    logApi?: boolean;
  };
}

// 默认系统配置
const DEFAULT_CONFIG: SystemConfig = {
  services: {
    monitoring: {
      enabled: true,
      collectInterval: 10000,
      reportInterval: 60000,
      enableUserTracking: true,
      enablePerformanceMonitoring: true,
      enableHealthChecks: true,
    },
    security: {
      enabled: true,
      auditEnabled: true,
      ipBasedRateLimiting: true,
    },
    sync: {
      enabled: true,
      autoBackup: true,
      backupInterval: 3600000, // 1小时
      syncInterval: 60000, // 1分钟
      remoteEnabled: false,
    },
    batch: {
      enabled: true,
      maxConcurrentJobs: 3,
      maxConcurrentTasksPerJob: 5,
    },
  },
  features: {
    complexConversationTree: true,
    enhancedMultimodal: true,
    mobileOptimizations: true,
    offlineSupport: true,
    apiPermissions: true,
    userBehaviorAnalytics: true,
    advancedBatchProcessing: true,
  },
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  debug: {
    verbose: process.env.NODE_ENV !== 'production',
    logPerformance: process.env.NODE_ENV !== 'production',
    logApi: process.env.NODE_ENV !== 'production',
  },
};

// 系统初始化服务单例
export class SystemInitializer {
  private static instance: SystemInitializer;
  private config: SystemConfig;
  private initialized = false;
  private services: {
    monitoring?: MonitoringService;
    security?: ApiSecurityService;
    sync?: ReturnType<typeof getSyncManager>;
    batch?: BatchProcessor;
    conversation?: ConversationTreeManager;
  } = {};
  
  private constructor(config: Partial<SystemConfig> = {}) {
    // 合并配置
    this.config = this.mergeConfig(DEFAULT_CONFIG, config);
  }
  
  /**
   * 获取SystemInitializer实例
   */
  public static getInstance(config?: Partial<SystemConfig>): SystemInitializer {
    if (!SystemInitializer.instance) {
      SystemInitializer.instance = new SystemInitializer(config);
    } else if (config) {
      // 更新配置但不重新初始化
      SystemInitializer.instance.updateConfig(config);
    }
    return SystemInitializer.instance;
  }
  
  /**
   * 更新系统配置
   */
  public updateConfig(config: Partial<SystemConfig>): void {
    this.config = this.mergeConfig(this.config, config);
    
    // 如果已初始化，则更新服务配置
    if (this.initialized) {
      this.updateServicesConfig();
    }
  }
  
  /**
   * 初始化系统服务
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      console.warn('System already initialized. Call reset() before re-initializing.');
      return;
    }
    
    console.log(`Initializing system in ${this.config.mode} mode...`);
    
    try {
      // 按依赖顺序初始化服务
      
      // 1. 初始化监控服务（优先，以便记录其他服务的初始化）
      if (this.config.services.monitoring?.enabled) {
        this.services.monitoring = MonitoringService.getInstance({
          collectInterval: this.config.services.monitoring.collectInterval,
          reportInterval: this.config.services.monitoring.reportInterval,
          enableUserTracking: this.config.services.monitoring.enableUserTracking,
          enablePerformanceMonitoring: this.config.services.monitoring.enablePerformanceMonitoring,
          enableHealthChecks: this.config.services.monitoring.enableHealthChecks,
        });
        console.log('Monitoring service initialized');
      }
      
      // 2. 初始化安全服务
      if (this.config.services.security?.enabled) {
        this.services.security = ApiSecurityService.getInstance({
          auditEnabled: this.config.services.security.auditEnabled,
          ipBasedRateLimiting: this.config.services.security.ipBasedRateLimiting,
          // 添加自定义速率限制配置
          ...(this.config.services.security.customRateLimits && {
            rateLimits: this.config.services.security.customRateLimits.map(rl => ({
              endpoint: rl.endpoint,
              limit: rl.limit,
              window: rl.window,
            })),
          }),
        });
        console.log('Security service initialized');
      }
      
      // 3. 初始化同步服务
      if (this.config.services.sync?.enabled) {
        this.services.sync = getSyncManager({}, {
          autoBackup: this.config.services.sync.autoBackup,
          backupInterval: this.config.services.sync.backupInterval,
          syncInterval: this.config.services.sync.syncInterval,
          remoteEnabled: this.config.services.sync.remoteEnabled,
          remoteUrl: this.config.services.sync.remoteUrl,
        });
        console.log('Sync service initialized');
      }
      
      // 4. 初始化批处理服务
      if (this.config.services.batch?.enabled) {
        this.services.batch = BatchProcessor.getInstance({
          maxConcurrentJobs: this.config.services.batch.maxConcurrentJobs,
          maxConcurrentTasksPerJob: this.config.services.batch.maxConcurrentTasksPerJob,
        });
        console.log('Batch processor initialized');
      }
      
      // 5. 初始化对话树管理器
      this.services.conversation = ConversationTreeManager.getInstance();
      console.log('Conversation tree manager initialized');
      
      // 标记为已初始化
      this.initialized = true;
      console.log('System initialization completed successfully');
      
      // 记录系统启动事件
      if (this.services.monitoring) {
        this.services.monitoring.emitAlert('info', 'System initialized successfully', {
          mode: this.config.mode,
          features: this.config.features,
        });
      }
    } catch (error) {
      console.error('System initialization failed:', error);
      
      // 记录初始化失败事件
      if (this.services.monitoring) {
        this.services.monitoring.emitAlert('error', 'System initialization failed', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
      
      // 重新抛出错误
      throw error;
    }
  }
  
  /**
   * 获取系统配置
   */
  public getConfig(): SystemConfig {
    return { ...this.config };
  }
  
  /**
   * 获取已初始化的服务
   */
  public getServices(): typeof this.services {
    if (!this.initialized) {
      console.warn('System not initialized. Call initialize() first.');
    }
    return { ...this.services };
  }
  
  /**
   * 重置系统（主要用于测试）
   */
  public async reset(): Promise<void> {
    if (!this.initialized) {
      return;
    }
    
    console.log('Resetting system...');
    
    // 按依赖倒序关闭服务
    
    // 批处理服务
    if (this.services.batch) {
      this.services.batch.stop();
    }
    
    // 同步服务
    if (this.services.sync) {
      this.services.sync.dispose();
    }
    
    // 监控服务
    if (this.services.monitoring) {
      this.services.monitoring.destroy();
    }
    
    // 清空服务引用
    this.services = {};
    
    // 标记为未初始化
    this.initialized = false;
    
    console.log('System reset completed');
  }
  
  /**
   * 检查系统是否已初始化
   */
  public isInitialized(): boolean {
    return this.initialized;
  }
  
  /**
   * 更新服务配置
   */
  private updateServicesConfig(): void {
    // 更新监控服务配置
    if (this.services.monitoring && this.config.services.monitoring) {
      this.services.monitoring.updateConfig({
        collectInterval: this.config.services.monitoring.collectInterval,
        reportInterval: this.config.services.monitoring.reportInterval,
        enableUserTracking: this.config.services.monitoring.enableUserTracking,
        enablePerformanceMonitoring: this.config.services.monitoring.enablePerformanceMonitoring,
        enableHealthChecks: this.config.services.monitoring.enableHealthChecks,
      });
    }
    
    // 更新安全服务配置
    if (this.services.security && this.config.services.security) {
      this.services.security.updateConfig({
        auditEnabled: this.config.services.security.auditEnabled,
        ipBasedRateLimiting: this.config.services.security.ipBasedRateLimiting,
      });
    }
    
    // 更新同步服务配置
    if (this.services.sync && this.config.services.sync) {
      this.services.sync.updateOptions({
        autoBackup: this.config.services.sync.autoBackup,
        backupInterval: this.config.services.sync.backupInterval,
        syncInterval: this.config.services.sync.syncInterval,
        remoteEnabled: this.config.services.sync.remoteEnabled,
        remoteUrl: this.config.services.sync.remoteUrl,
      });
    }
    
    // 更新批处理服务配置
    if (this.services.batch && this.config.services.batch) {
      this.services.batch.updateConfig({
        maxConcurrentJobs: this.config.services.batch.maxConcurrentJobs,
        maxConcurrentTasksPerJob: this.config.services.batch.maxConcurrentTasksPerJob,
      });
    }
  }
  
  /**
   * 合并配置
   */
  private mergeConfig(base: SystemConfig, override: Partial<SystemConfig>): SystemConfig {
    // 使用深度合并策略
    return {
      services: {
        monitoring: {
          ...base.services.monitoring,
          ...override.services?.monitoring,
          enabled: (override.services?.monitoring?.enabled ?? base.services?.monitoring?.enabled ?? false) as boolean,
        },
        security: {
          ...base.services.security,
          ...override.services?.security,
          enabled: (override.services?.security?.enabled ?? base.services?.security?.enabled ?? false) as boolean,
        },
        sync: {
          ...base.services.sync,
          ...override.services?.sync,
          enabled: (override.services?.sync?.enabled ?? base.services?.sync?.enabled ?? false) as boolean,
        },
        batch: {
          ...base.services.batch,
          ...override.services?.batch,
          enabled: (override.services?.batch?.enabled ?? base.services?.batch?.enabled ?? false) as boolean,
        },
      },
      features: {
        ...base.features,
        ...override.features,
      },
      mode: override.mode || base.mode,
      debug: {
        ...base.debug,
        ...override.debug,
      },
    };
  }
}

// 创建和导出单例实例
let systemInitializer: SystemInitializer | null = null;

export function getSystemInitializer(config?: Partial<SystemConfig>): SystemInitializer {
  if (!systemInitializer) {
    systemInitializer = SystemInitializer.getInstance(config);
  } else if (config) {
    systemInitializer.updateConfig(config);
  }
  return systemInitializer;
} 