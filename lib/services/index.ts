// 核心服务导出文件

// AG-UI 协议
export * from '../protocol/ag-ui-client';

// 对话树管理
export * from '../conversation/conversation-tree';

// 数据同步与备份
export { SyncManager, getSyncManager } from '../sync/sync-manager';

// 系统监控与指标
export { MonitoringService } from './monitoring-service';

// API权限与安全
export { ApiSecurityService } from './api-security-service';

// 批处理服务
export { BatchProcessor } from '../batch/batch-processor';

// 移动端优化
export { useMobileOptimization } from '../hooks/useMobileOptimization';

// 服务初始化助手
export function initializeServices(config: {
  syncConfig?: any;
  monitoringConfig?: any;
  securityConfig?: any;
  batchConfig?: any;
}) {
  // 初始化同步管理器
  const syncManager = getSyncManager(config.syncConfig);
  
  // 初始化监控服务
  const monitoringService = MonitoringService.getInstance(config.monitoringConfig);
  
  // 初始化API安全服务
  const apiSecurityService = ApiSecurityService.getInstance(config.securityConfig);
  
  // 初始化批处理服务
  const batchProcessor = BatchProcessor.getInstance(config.batchConfig);
  
  return {
    syncManager,
    monitoringService,
    apiSecurityService,
    batchProcessor
  };
} 