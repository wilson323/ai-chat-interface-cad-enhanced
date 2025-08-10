/**
 * Kiro Hooks 系统核心类型定义
 * 
 * 这个文件定义了钩子系统中使用的所有核心类型和接口
 */

// ============================================================================
// 钩子事件类型
// ============================================================================

/**
 * 钩子事件类型枚举
 */
export type HookEvent = 
  | 'file.edit'           // 文件编辑事件
  | 'file.save'           // 文件保存事件
  | 'git.beforeCommit'    // Git 提交前事件
  | 'git.afterCommit'     // Git 提交后事件
  | 'work.start'          // 工作开始事件
  | 'work.progress'       // 工作进行中事件
  | 'work.complete';      // 工作完成事件

/**
 * 钩子触发条件
 */
export interface HookCondition {
  /** 条件类型 */
  type: 'file-pattern' | 'file-size' | 'user-role' | 'time-range' | 'custom';
  /** 条件值 */
  value: string | number | boolean | object;
  /** 条件操作符 */
  operator?: 'equals' | 'contains' | 'matches' | 'greater' | 'less';
}

/**
 * 钩子触发器配置
 */
export interface HookTrigger {
  /** 触发事件 */
  event: HookEvent;
  /** 文件匹配模式 */
  patterns: string[];
  /** 触发条件 */
  conditions?: HookCondition[];
}

// ============================================================================
// 钩子上下文和结果
// ============================================================================

/**
 * 钩子执行上下文
 */
export interface HookContext {
  /** 触发事件 */
  event: HookEvent;
  /** 相关文件列表 */
  files: string[];
  /** 元数据 */
  metadata: Record<string, any>;
  /** 时间戳 */
  timestamp: Date;
  /** 用户ID（可选） */
  userId?: string;
  /** 会话ID（可选） */
  sessionId?: string;
  /** 工作目录 */
  workingDirectory?: string;
  /** Git 信息 */
  gitInfo?: {
    branch: string;
    commit?: string;
    author?: string;
  };
}

/**
 * 钩子执行结果
 */
export interface HookResult {
  /** 执行是否成功 */
  success: boolean;
  /** 结果消息 */
  message: string;
  /** 结果数据 */
  data?: any;
  /** 错误信息列表 */
  errors?: string[];
  /** 警告信息列表 */
  warnings?: string[];
  /** 执行时间（毫秒） */
  executionTime: number;
  /** 时间戳 */
  timestamp: Date;
  /** 钩子ID */
  hookId?: string;
  /** 是否可重试 */
  retryable?: boolean;
}

// ============================================================================
// 钩子状态和配置
// ============================================================================

/**
 * 钩子状态枚举
 */
export enum HookStatus {
  ENABLED = 'enabled',
  DISABLED = 'disabled',
  RUNNING = 'running',
  ERROR = 'error',
  SUSPENDED = 'suspended'
}

/**
 * 钩子配置
 */
export interface HookConfiguration {
  /** 是否启用 */
  enabled: boolean;
  /** 优先级（数字越小优先级越高） */
  priority: number;
  /** 超时时间（毫秒） */
  timeout: number;
  /** 重试次数 */
  retryCount: number;
  /** 触发条件 */
  conditions: HookCondition[];
  /** 自定义参数 */
  parameters: Record<string, any>;
}

// ============================================================================
// MCP 工具相关类型
// ============================================================================

/**
 * MCP 工具状态
 */
export interface MCPToolsStatus {
  /** Serena 工具状态 */
  serena: boolean;
  /** Mentor 工具状态 */
  mentor: boolean;
  /** Memory 工具状态 */
  memory: boolean;
  /** Sequential Thinking 工具状态 */
  sequentialThinking: boolean;
  /** Context7 工具状态 */
  context7: boolean;
  /** Task Manager 工具状态 */
  taskManager: boolean;
}

/**
 * MCP 工具调用结果
 */
export interface MCPToolResult {
  /** 工具名称 */
  toolName: string;
  /** 调用是否成功 */
  success: boolean;
  /** 结果数据 */
  data?: any;
  /** 错误信息 */
  error?: string;
  /** 执行时间 */
  executionTime: number;
}

// ============================================================================
// 质量检查相关类型
// ============================================================================

/**
 * 合规检查结果
 */
export interface ComplianceResult {
  /** 检查是否通过 */
  passed: boolean;
  /** 质量评分（0-100） */
  score: number;
  /** 问题列表 */
  issues: ComplianceIssue[];
  /** 改进建议 */
  recommendations: string[];
  /** 检查类型 */
  checkType: string;
  /** 检查时间 */
  timestamp: Date;
}

/**
 * 合规问题
 */
export interface ComplianceIssue {
  /** 严重程度 */
  severity: 'critical' | 'high' | 'medium' | 'low';
  /** 问题分类 */
  category: string;
  /** 问题描述 */
  description: string;
  /** 相关文件 */
  file?: string;
  /** 行号 */
  line?: number;
  /** 修复建议 */
  suggestion?: string;
  /** 规则ID */
  ruleId?: string;
}

/**
 * 质量度量指标
 */
export interface QualityMetrics {
  /** 代码质量评分 */
  codeQualityScore: number;
  /** 测试覆盖率 */
  testCoverageRate: number;
  /** 架构健康指数 */
  architectureHealthIndex: number;
  /** 性能回归指数 */
  performanceRegression: number;
  /** 安全漏洞数量 */
  securityVulnerabilities: number;
  /** 技术债务评分 */
  technicalDebtScore: number;
  /** 度量时间 */
  timestamp: Date;
}

// ============================================================================
// 错误处理相关类型
// ============================================================================

/**
 * 钩子错误类型
 */
export enum HookErrorType {
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  MCP_TOOL_UNAVAILABLE = 'MCP_TOOL_UNAVAILABLE',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  NETWORK_ERROR = 'NETWORK_ERROR'
}

/**
 * 钩子错误信息
 */
export interface HookError extends Error {
  /** 错误类型 */
  type: HookErrorType;
  /** 错误代码 */
  code?: string;
  /** 相关钩子ID */
  hookId?: string;
  /** 错误上下文 */
  context?: HookContext;
  /** 是否可重试 */
  retryable: boolean;
  /** 建议的修复操作 */
  suggestedAction?: string;
}

// ============================================================================
// 钩子接口定义
// ============================================================================

/**
 * 钩子基础接口
 */
export interface Hook {
  /** 钩子唯一标识符 */
  readonly id: string;
  /** 钩子名称 */
  readonly name: string;
  /** 钩子描述 */
  readonly description: string;
  /** 触发器配置 */
  readonly triggers: HookTrigger[];
  /** 钩子版本 */
  readonly version: string;
  /** 钩子作者 */
  readonly author?: string;
  
  /**
   * 执行钩子
   * @param context 执行上下文
   * @returns 执行结果
   */
  execute(context: HookContext): Promise<HookResult>;
  
  /**
   * 验证钩子配置
   * @param config 配置对象
   * @returns 验证结果
   */
  validateConfig?(config: HookConfiguration): boolean;
  
  /**
   * 钩子初始化
   * @param config 配置对象
   */
  initialize?(config: HookConfiguration): Promise<void>;
  
  /**
   * 钩子清理
   */
  cleanup?(): Promise<void>;
}

/**
 * 钩子管理器接口
 */
export interface HookManager {
  /**
   * 注册钩子
   * @param hook 钩子实例
   */
  registerHook(hook: Hook): void;
  
  /**
   * 注销钩子
   * @param hookId 钩子ID
   */
  unregisterHook(hookId: string): void;
  
  /**
   * 执行指定钩子
   * @param hookId 钩子ID
   * @param context 执行上下文
   */
  executeHook(hookId: string, context: HookContext): Promise<HookResult>;
  
  /**
   * 执行事件相关的所有钩子
   * @param event 事件类型
   * @param context 执行上下文
   */
  executeHooksForEvent(event: HookEvent, context: HookContext): Promise<HookResult[]>;
  
  /**
   * 获取所有钩子列表
   */
  listHooks(): Hook[];
  
  /**
   * 获取钩子状态
   * @param hookId 钩子ID
   */
  getHookStatus(hookId: string): HookStatus;
  
  /**
   * 启用钩子
   * @param hookId 钩子ID
   */
  enableHook(hookId: string): void;
  
  /**
   * 禁用钩子
   * @param hookId 钩子ID
   */
  disableHook(hookId: string): void;
}

// ============================================================================
// 配置相关类型
// ============================================================================

/**
 * 质量标准配置
 */
export interface QualityStandards {
  /** 代码质量标准 */
  codeQuality: {
    /** 最低评分 */
    minimumScore: number;
    /** 严格模式 */
    strictMode: boolean;
    /** 禁止使用 any 类型 */
    noAnyType: boolean;
  };
  /** 测试覆盖率标准 */
  testCoverage: {
    /** 单元测试覆盖率 */
    unitTests: number;
    /** 集成测试覆盖率 */
    integrationTests: number;
    /** 关键路径覆盖率 */
    criticalPaths: number;
  };
  /** 性能标准 */
  performance: {
    /** API 响应时间（毫秒） */
    apiResponseTime: number;
    /** 页面加载时间（毫秒） */
    pageLoadTime: number;
    /** 资源利用率 */
    resourceUtilization: {
      /** 内存使用率（%） */
      memory: number;
      /** CPU 使用率（%） */
      cpu: number;
    };
  };
  /** 安全标准 */
  security: {
    /** 允许的漏洞数量 */
    allowedVulnerabilities: {
      /** 严重漏洞 */
      critical: number;
      /** 高危漏洞 */
      high: number;
      /** 中危漏洞 */
      medium: number;
    };
  };
}

/**
 * 钩子系统配置
 */
export interface HookSystemConfig {
  /** 钩子配置映射 */
  hooks: Record<string, HookConfiguration>;
  /** 质量标准 */
  qualityStandards: QualityStandards;
  /** 全局设置 */
  global: {
    /** 默认超时时间 */
    defaultTimeout: number;
    /** 最大并发执行数 */
    maxConcurrentHooks: number;
    /** 日志级别 */
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    /** 是否启用性能监控 */
    enablePerformanceMonitoring: boolean;
  };
  /** MCP 工具配置 */
  mcpTools: {
    /** 连接超时时间 */
    connectionTimeout: number;
    /** 重试次数 */
    retryCount: number;
    /** 健康检查间隔 */
    healthCheckInterval: number;
  };
}