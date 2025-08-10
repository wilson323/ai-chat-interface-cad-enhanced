/**
 * 钩子基类实现
 * 
 * 提供所有钩子的通用功能和接口实现
 */

import {
  Hook,
  HookContext,
  HookResult,
  HookTrigger,
  HookConfiguration,
  HookError,
  HookErrorType,
  MCPToolResult
} from '../types/index.js';

/**
 * 钩子基类
 * 
 * 所有具体钩子都应该继承这个基类
 */
export abstract class BaseHook implements Hook {
  /** 钩子唯一标识符 */
  public abstract readonly id: string;
  
  /** 钩子名称 */
  public abstract readonly name: string;
  
  /** 钩子描述 */
  public abstract readonly description: string;
  
  /** 触发器配置 */
  public abstract readonly triggers: HookTrigger[];
  
  /** 钩子版本 */
  public readonly version: string = '1.0.0';
  
  /** 钩子作者 */
  public readonly author: string = 'Kiro Hooks System';
  
  /** 钩子配置 */
  protected config?: HookConfiguration;
  
  /** 执行开始时间 */
  private executionStartTime: number = 0;

  /**
   * 构造函数
   * @param config 钩子配置
   */
  constructor(config?: HookConfiguration) {
    this.config = config;
  }

  /**
   * 执行钩子（抽象方法，子类必须实现）
   * @param context 执行上下文
   * @returns 执行结果
   */
  public abstract execute(context: HookContext): Promise<HookResult>;

  /**
   * 验证钩子配置
   * @param config 配置对象
   * @returns 验证结果
   */
  public validateConfig(config: HookConfiguration): boolean {
    try {
      // 基础配置验证
      if (typeof config.enabled !== 'boolean') {
        throw new Error('enabled 必须是布尔值');
      }
      
      if (typeof config.priority !== 'number' || config.priority < 0) {
        throw new Error('priority 必须是非负数');
      }
      
      if (typeof config.timeout !== 'number' || config.timeout <= 0) {
        throw new Error('timeout 必须是正数');
      }
      
      if (typeof config.retryCount !== 'number' || config.retryCount < 0) {
        throw new Error('retryCount 必须是非负数');
      }
      
      // 条件验证
      if (config.conditions && !Array.isArray(config.conditions)) {
        throw new Error('conditions 必须是数组');
      }
      
      // 参数验证
      if (config.parameters && typeof config.parameters !== 'object') {
        throw new Error('parameters 必须是对象');
      }
      
      return true;
    } catch (error) {
      this.logError(`配置验证失败: ${error.message}`);
      return false;
    }
  }

  /**
   * 钩子初始化
   * @param config 配置对象
   */
  public async initialize(config: HookConfiguration): Promise<void> {
    this.logInfo(`初始化钩子: ${this.name}`);
    
    if (!this.validateConfig(config)) {
      throw this.createError(
        HookErrorType.CONFIGURATION_ERROR,
        '钩子配置验证失败'
      );
    }
    
    this.config = config;
    this.logInfo(`钩子初始化完成: ${this.name}`);
  }

  /**
   * 钩子清理
   */
  public async cleanup(): Promise<void> {
    this.logInfo(`清理钩子: ${this.name}`);
    // 子类可以重写此方法进行特定的清理操作
  }

  // ============================================================================
  // 受保护的工具方法
  // ============================================================================

  /**
   * 验证执行上下文
   * @param context 执行上下文
   * @returns 验证结果
   */
  protected validateContext(context: HookContext): boolean {
    try {
      if (!context) {
        throw new Error('上下文不能为空');
      }
      
      if (!context.event) {
        throw new Error('事件类型不能为空');
      }
      
      if (!Array.isArray(context.files)) {
        throw new Error('文件列表必须是数组');
      }
      
      if (!context.timestamp || !(context.timestamp instanceof Date)) {
        throw new Error('时间戳必须是有效的 Date 对象');
      }
      
      return true;
    } catch (error) {
      this.logError(`上下文验证失败: ${error.message}`);
      return false;
    }
  }

  /**
   * 开始执行计时
   */
  protected startExecution(): void {
    this.executionStartTime = Date.now();
    this.logDebug(`开始执行钩子: ${this.name}`);
  }

  /**
   * 结束执行计时
   * @returns 执行时间（毫秒）
   */
  protected endExecution(): number {
    const executionTime = Date.now() - this.executionStartTime;
    this.logDebug(`钩子执行完成: ${this.name}, 耗时: ${executionTime}ms`);
    return executionTime;
  }

  /**
   * 创建成功结果
   * @param message 成功消息
   * @param data 结果数据
   * @returns 钩子结果
   */
  protected createSuccessResult(message: string, data?: unknown): HookResult {
    return {
      success: true,
      message,
      data,
      executionTime: this.endExecution(),
      timestamp: new Date(),
      hookId: this.id
    };
  }

  /**
   * 创建失败结果
   * @param message 失败消息
   * @param errors 错误列表
   * @param data 结果数据
   * @returns 钩子结果
   */
  protected createFailureResult(
    message: string,
    errors?: string[],
    data?: unknown
  ): HookResult {
    return {
      success: false,
      message,
      errors: errors || [message],
      data,
      executionTime: this.endExecution(),
      timestamp: new Date(),
      hookId: this.id,
      retryable: true
    };
  }

  /**
   * 创建钩子错误
   * @param type 错误类型
   * @param message 错误消息
   * @param context 执行上下文
   * @returns 钩子错误
   */
  protected createError(
    type: HookErrorType,
    message: string,
    context?: HookContext
  ): HookError {
    const error = new Error(message) as HookError;
    error.type = type;
    error.hookId = this.id;
    error.context = context;
    error.retryable = this.isRetryableError(type);
    error.suggestedAction = this.getSuggestedAction(type);
    
    return error;
  }

  /**
   * 判断错误是否可重试
   * @param type 错误类型
   * @returns 是否可重试
   */
  private isRetryableError(type: HookErrorType): boolean {
    const retryableErrors = [
      HookErrorType.MCP_TOOL_UNAVAILABLE,
      HookErrorType.TIMEOUT_ERROR,
      HookErrorType.NETWORK_ERROR
    ];
    
    return retryableErrors.includes(type);
  }

  /**
   * 获取错误的建议修复操作
   * @param type 错误类型
   * @returns 建议操作
   */
  private getSuggestedAction(type: HookErrorType): string {
    const suggestions: Record<HookErrorType, string> = {
      [HookErrorType.CONFIGURATION_ERROR]: '请检查钩子配置文件',
      [HookErrorType.MCP_TOOL_UNAVAILABLE]: '请检查 MCP 工具连接状态',
      [HookErrorType.VALIDATION_FAILED]: '请修复验证失败的问题',
      [HookErrorType.TIMEOUT_ERROR]: '请增加超时时间或优化执行逻辑',
      [HookErrorType.SYSTEM_ERROR]: '请检查系统状态和日志',
      [HookErrorType.PERMISSION_DENIED]: '请检查文件和目录权限',
      [HookErrorType.FILE_NOT_FOUND]: '请确认文件路径是否正确',
      [HookErrorType.NETWORK_ERROR]: '请检查网络连接状态'
    };
    
    return suggestions[type] || '请查看详细错误信息';
  }

  /**
   * 处理错误
   * @param error 错误对象
   * @param context 执行上下文
   * @returns 钩子结果
   */
  protected handleError(error: Error, context?: HookContext): HookResult {
    this.logError(`钩子执行出错: ${error.message}`, error);
    
    const hookError = error as HookError;
    const errorType = hookError.type || HookErrorType.SYSTEM_ERROR;
    
    return {
      success: false,
      message: `钩子执行失败: ${error.message}`,
      errors: [error.message],
      data: {
        errorType,
        suggestedAction: hookError.suggestedAction || this.getSuggestedAction(errorType),
        retryable: hookError.retryable !== false
      },
      executionTime: this.endExecution(),
      timestamp: new Date(),
      hookId: this.id,
      retryable: hookError.retryable !== false
    };
  }

  /**
   * 执行 MCP 工具调用（模拟实现）
   * @param toolName 工具名称
   * @param method 方法名
   * @param params 参数
   * @returns 调用结果
   */
  protected async callMCPTool(
    toolName: string,
    method: string,
    params?: Record<string, unknown>
  ): Promise<MCPToolResult> {
    const startTime = Date.now();
    
    try {
      this.logDebug(`调用 MCP 工具: ${toolName}.${method}`);
      
      // TODO: 实际的 MCP 工具调用逻辑
      // 这里先返回模拟结果
      await this.delay(100); // 模拟网络延迟
      
      const result: MCPToolResult = {
        toolName,
        success: true,
        data: { method, params, result: 'success' },
        executionTime: Date.now() - startTime
      };
      
      this.logDebug(`MCP 工具调用成功: ${toolName}.${method}`);
      return result;
      
    } catch (error) {
      const result: MCPToolResult = {
        toolName,
        success: false,
        error: error.message,
        executionTime: Date.now() - startTime
      };
      
      this.logError(`MCP 工具调用失败: ${toolName}.${method}`, error);
      return result;
    }
  }

  /**
   * 延迟执行
   * @param ms 延迟毫秒数
   */
  protected delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ============================================================================
  // 日志记录方法
  // ============================================================================

  /**
   * 记录调试日志
   * @param message 日志消息
   * @param data 附加数据
   */
  protected logDebug(message: string, data?: unknown): void {
    console.debug(`[${this.id}] DEBUG: ${message}`, data || '');
  }

  /**
   * 记录信息日志
   * @param message 日志消息
   * @param data 附加数据
   */
  protected logInfo(message: string, data?: unknown): void {
    console.info(`[${this.id}] INFO: ${message}`, data || '');
  }

  /**
   * 记录警告日志
   * @param message 日志消息
   * @param data 附加数据
   */
  protected logWarn(message: string, data?: unknown): void {
    console.warn(`[${this.id}] WARN: ${message}`, data || '');
  }

  /**
   * 记录错误日志
   * @param message 日志消息
   * @param error 错误对象
   */
  protected logError(message: string, error?: Error): void {
    console.error(`[${this.id}] ERROR: ${message}`, error || '');
  }

  /**
   * 记录执行日志
   * @param result 执行结果
   */
  protected logExecution(result: HookResult): void {
    const level = result.success ? 'INFO' : 'ERROR';
    const message = `钩子执行${result.success ? '成功' : '失败'}: ${result.message}`;
    
    if (result.success) {
      this.logInfo(message, {
        executionTime: result.executionTime,
        warnings: result.warnings
      });
    } else {
      this.logError(message, {
        errors: result.errors,
        executionTime: result.executionTime
      } as any);
    }
  }
}