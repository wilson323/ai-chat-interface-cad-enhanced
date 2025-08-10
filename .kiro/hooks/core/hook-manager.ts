/**
 * 钩子管理器实现
 * 
 * 负责钩子的注册、调度和生命周期管理
 */

import {
  Hook,
  HookManager,
  HookContext,
  HookResult,
  HookEvent,
  HookStatus,
  HookConfiguration,
  HookError,
  HookErrorType
} from '../types/index.js';

/**
 * 钩子注册信息
 */
interface HookRegistration {
  /** 钩子实例 */
  hook: Hook;
  /** 钩子状态 */
  status: HookStatus;
  /** 钩子配置 */
  config: HookConfiguration;
  /** 注册时间 */
  registeredAt: Date;
  /** 最后执行时间 */
  lastExecutedAt?: Date;
  /** 执行次数 */
  executionCount: number;
  /** 成功次数 */
  successCount: number;
  /** 失败次数 */
  failureCount: number;
}

/**
 * 钩子管理器实现类
 */
export class HookManagerImpl implements HookManager {
  /** 钩子注册表 */
  private hooks: Map<string, HookRegistration> = new Map();
  
  /** 最大并发执行数 */
  private maxConcurrentHooks: number = 5;
  
  /** 当前执行中的钩子数量 */
  private runningHooksCount: number = 0;
  
  /** 执行队列 */
  private executionQueue: Array<{
    hookId: string;
    context: HookContext;
    resolve: (result: HookResult) => void;
    reject: (error: Error) => void;
  }> = [];

  /**
   * 构造函数
   * @param maxConcurrentHooks 最大并发执行数
   */
  constructor(maxConcurrentHooks: number = 5) {
    this.maxConcurrentHooks = maxConcurrentHooks;
    this.logInfo('钩子管理器初始化完成');
  }

  /**
   * 注册钩子
   * @param hook 钩子实例
   */
  public registerHook(hook: Hook): void {
    try {
      if (this.hooks.has(hook.id)) {
        throw new Error(`钩子已存在: ${hook.id}`);
      }

      // 创建默认配置
      const defaultConfig: HookConfiguration = {
        enabled: true,
        priority: 100,
        timeout: 30000,
        retryCount: 2,
        conditions: [],
        parameters: {}
      };

      const registration: HookRegistration = {
        hook,
        status: HookStatus.ENABLED,
        config: defaultConfig,
        registeredAt: new Date(),
        executionCount: 0,
        successCount: 0,
        failureCount: 0
      };

      this.hooks.set(hook.id, registration);
      this.logInfo(`钩子注册成功: ${hook.id} (${hook.name})`);

      // 初始化钩子
      if (hook.initialize) {
        hook.initialize(defaultConfig).catch(error => {
          this.logError(`钩子初始化失败: ${hook.id}`, error);
          this.setHookStatus(hook.id, HookStatus.ERROR);
        });
      }

    } catch (error) {
      this.logError(`钩子注册失败: ${hook.id}`, error);
      throw error;
    }
  }

  /**
   * 注销钩子
   * @param hookId 钩子ID
   */
  public unregisterHook(hookId: string): void {
    try {
      const registration = this.hooks.get(hookId);
      if (!registration) {
        throw new Error(`钩子不存在: ${hookId}`);
      }

      // 清理钩子
      if (registration.hook.cleanup) {
        registration.hook.cleanup().catch(error => {
          this.logError(`钩子清理失败: ${hookId}`, error);
        });
      }

      this.hooks.delete(hookId);
      this.logInfo(`钩子注销成功: ${hookId}`);

    } catch (error) {
      this.logError(`钩子注销失败: ${hookId}`, error);
      throw error;
    }
  }

  /**
   * 执行指定钩子
   * @param hookId 钩子ID
   * @param context 执行上下文
   * @returns 执行结果
   */
  public async executeHook(hookId: string, context: HookContext): Promise<HookResult> {
    const registration = this.hooks.get(hookId);
    if (!registration) {
      throw new Error(`钩子不存在: ${hookId}`);
    }

    if (registration.status !== HookStatus.ENABLED) {
      return {
        success: false,
        message: `钩子未启用: ${hookId}`,
        errors: [`钩子状态: ${registration.status}`],
        executionTime: 0,
        timestamp: new Date(),
        hookId
      };
    }

    // 检查并发限制
    if (this.runningHooksCount >= this.maxConcurrentHooks) {
      return new Promise((resolve, reject) => {
        this.executionQueue.push({ hookId, context, resolve, reject });
        this.logInfo(`钩子加入执行队列: ${hookId}`);
      });
    }

    return this.executeHookInternal(registration, context);
  }

  /**
   * 执行事件相关的所有钩子
   * @param event 事件类型
   * @param context 执行上下文
   * @returns 执行结果列表
   */
  public async executeHooksForEvent(
    event: HookEvent,
    context: HookContext
  ): Promise<HookResult[]> {
    // 找到匹配的钩子
    const matchingHooks = this.findHooksForEvent(event, context);
    
    if (matchingHooks.length === 0) {
      this.logInfo(`没有找到匹配的钩子: ${event}`);
      return [];
    }

    // 按优先级排序
    matchingHooks.sort((a, b) => a.config.priority - b.config.priority);

    this.logInfo(`找到 ${matchingHooks.length} 个匹配的钩子: ${event}`);

    // 并发执行钩子
    const results = await Promise.allSettled(
      matchingHooks.map(registration => 
        this.executeHookInternal(registration, context)
      )
    );

    // 处理结果
    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        const hookId = matchingHooks[index].hook.id;
        this.logError(`钩子执行异常: ${hookId}`, result.reason);
        
        return {
          success: false,
          message: `钩子执行异常: ${result.reason.message}`,
          errors: [result.reason.message],
          executionTime: 0,
          timestamp: new Date(),
          hookId
        };
      }
    });
  }

  /**
   * 获取所有钩子列表
   * @returns 钩子列表
   */
  public listHooks(): Hook[] {
    return Array.from(this.hooks.values()).map(reg => reg.hook);
  }

  /**
   * 获取钩子状态
   * @param hookId 钩子ID
   * @returns 钩子状态
   */
  public getHookStatus(hookId: string): HookStatus {
    const registration = this.hooks.get(hookId);
    if (!registration) {
      throw new Error(`钩子不存在: ${hookId}`);
    }
    return registration.status;
  }

  /**
   * 启用钩子
   * @param hookId 钩子ID
   */
  public enableHook(hookId: string): void {
    this.setHookStatus(hookId, HookStatus.ENABLED);
    this.logInfo(`钩子已启用: ${hookId}`);
  }

  /**
   * 禁用钩子
   * @param hookId 钩子ID
   */
  public disableHook(hookId: string): void {
    this.setHookStatus(hookId, HookStatus.DISABLED);
    this.logInfo(`钩子已禁用: ${hookId}`);
  }

  /**
   * 获取钩子统计信息
   * @param hookId 钩子ID
   * @returns 统计信息
   */
  public getHookStats(hookId: string): {
    executionCount: number;
    successCount: number;
    failureCount: number;
    successRate: number;
    lastExecutedAt?: Date;
  } {
    const registration = this.hooks.get(hookId);
    if (!registration) {
      throw new Error(`钩子不存在: ${hookId}`);
    }

    const successRate = registration.executionCount > 0 
      ? (registration.successCount / registration.executionCount) * 100 
      : 0;

    return {
      executionCount: registration.executionCount,
      successCount: registration.successCount,
      failureCount: registration.failureCount,
      successRate: Math.round(successRate * 100) / 100,
      lastExecutedAt: registration.lastExecutedAt
    };
  }

  // ============================================================================
  // 私有方法
  // ============================================================================

  /**
   * 内部钩子执行方法
   * @param registration 钩子注册信息
   * @param context 执行上下文
   * @returns 执行结果
   */
  private async executeHookInternal(
    registration: HookRegistration,
    context: HookContext
  ): Promise<HookResult> {
    const { hook, config } = registration;
    const startTime = Date.now();

    // 更新状态
    this.setHookStatus(hook.id, HookStatus.RUNNING);
    this.runningHooksCount++;

    try {
      this.logInfo(`开始执行钩子: ${hook.id}`);

      // 执行钩子（带超时控制）
      const result = await this.executeWithTimeout(
        hook.execute(context),
        config.timeout
      );

      // 更新统计信息
      registration.executionCount++;
      registration.lastExecutedAt = new Date();
      
      if (result.success) {
        registration.successCount++;
        this.logInfo(`钩子执行成功: ${hook.id}, 耗时: ${Date.now() - startTime}ms`);
      } else {
        registration.failureCount++;
        this.logWarn(`钩子执行失败: ${hook.id}, 原因: ${result.message}`);
      }

      return result;

    } catch (error) {
      // 更新统计信息
      registration.executionCount++;
      registration.failureCount++;
      registration.lastExecutedAt = new Date();

      this.logError(`钩子执行异常: ${hook.id}`, error);

      return {
        success: false,
        message: `钩子执行异常: ${error.message}`,
        errors: [error.message],
        executionTime: Date.now() - startTime,
        timestamp: new Date(),
        hookId: hook.id,
        retryable: true
      };

    } finally {
      // 恢复状态
      this.setHookStatus(hook.id, HookStatus.ENABLED);
      this.runningHooksCount--;

      // 处理队列中的下一个任务
      this.processExecutionQueue();
    }
  }

  /**
   * 带超时的执行
   * @param promise 执行 Promise
   * @param timeout 超时时间
   * @returns 执行结果
   */
  private async executeWithTimeout<T>(
    promise: Promise<T>,
    timeout: number
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`钩子执行超时: ${timeout}ms`));
        }, timeout);
      })
    ]);
  }

  /**
   * 查找匹配事件的钩子
   * @param event 事件类型
   * @param context 执行上下文
   * @returns 匹配的钩子注册信息列表
   */
  private findHooksForEvent(
    event: HookEvent,
    context: HookContext
  ): HookRegistration[] {
    const matchingHooks: HookRegistration[] = [];

    for (const registration of this.hooks.values()) {
      if (registration.status !== HookStatus.ENABLED) {
        continue;
      }

      // 检查触发器
      const isMatching = registration.hook.triggers.some(trigger => {
        if (trigger.event !== event) {
          return false;
        }

        // 检查文件模式匹配
        if (trigger.patterns && trigger.patterns.length > 0) {
          const hasMatchingFile = context.files.some(file =>
            trigger.patterns.some(pattern => this.matchPattern(file, pattern))
          );
          if (!hasMatchingFile) {
            return false;
          }
        }

        // 检查其他条件
        if (trigger.conditions && trigger.conditions.length > 0) {
          const conditionsMet = trigger.conditions.every(condition =>
            this.evaluateCondition(condition, context)
          );
          if (!conditionsMet) {
            return false;
          }
        }

        return true;
      });

      if (isMatching) {
        matchingHooks.push(registration);
      }
    }

    return matchingHooks;
  }

  /**
   * 模式匹配
   * @param text 文本
   * @param pattern 模式
   * @returns 是否匹配
   */
  private matchPattern(text: string, pattern: string): boolean {
    // 简单的 glob 模式匹配实现
    const regexPattern = pattern
      .replace(/\*\*/g, '.*')  // ** 匹配任意字符
      .replace(/\*/g, '[^/]*') // * 匹配除 / 外的任意字符
      .replace(/\?/g, '.');    // ? 匹配单个字符

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(text);
  }

  /**
   * 评估条件
   * @param condition 条件
   * @param context 上下文
   * @returns 条件是否满足
   */
  private evaluateCondition(condition: any, context: HookContext): boolean {
    // TODO: 实现具体的条件评估逻辑
    return true;
  }

  /**
   * 设置钩子状态
   * @param hookId 钩子ID
   * @param status 状态
   */
  private setHookStatus(hookId: string, status: HookStatus): void {
    const registration = this.hooks.get(hookId);
    if (registration) {
      registration.status = status;
    }
  }

  /**
   * 处理执行队列
   */
  private processExecutionQueue(): void {
    if (this.executionQueue.length === 0 || 
        this.runningHooksCount >= this.maxConcurrentHooks) {
      return;
    }

    const next = this.executionQueue.shift();
    if (next) {
      this.executeHook(next.hookId, next.context)
        .then(next.resolve)
        .catch(next.reject);
    }
  }

  // ============================================================================
  // 日志记录方法
  // ============================================================================

  private logInfo(message: string, data?: any): void {
    console.info(`[HookManager] INFO: ${message}`, data || '');
  }

  private logWarn(message: string, data?: any): void {
    console.warn(`[HookManager] WARN: ${message}`, data || '');
  }

  private logError(message: string, error?: Error): void {
    console.error(`[HookManager] ERROR: ${message}`, error || '');
  }
}

// 导出单例实例
export const hookManager = new HookManagerImpl();