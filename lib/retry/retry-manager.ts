/**
 * 智能重试系统 - 处理临时性故障和网络问题
 * Smart Retry System - Handle temporary failures and network issues
 */

// 错误类型守卫
interface RetryableErrorShape {
  status?: number
  code?: string
  message?: string
}

function isRetryableErrorShape(error: unknown): error is RetryableErrorShape {
  if (typeof error !== 'object' || error === null) return false
  const e = error as Record<string, unknown>
  return (
    (typeof e.status === 'number' || typeof e.status === 'undefined') &&
    (typeof e.code === 'string' || typeof e.code === 'undefined') &&
    (typeof e.message === 'string' || typeof e.message === 'undefined')
  )
}

// 重试配置
export interface RetryConfig {
  enabled: boolean
  maxRetries: number
  initialDelay: number
  maxDelay: number
  backoffFactor: number
  retryableStatusCodes: number[]
  retryableErrors: string[]
  retryCondition?: (error: unknown) => boolean
  onRetry?: (error: unknown, retryCount: number, delay: number) => void
  debug: boolean
  logLevel: "error" | "warn" | "info" | "debug"
}

// 默认配置
const DEFAULT_CONFIG: RetryConfig = {
  enabled: true,
  maxRetries: 3,
  initialDelay: 300, // 300毫秒
  maxDelay: 10000, // 10秒
  backoffFactor: 2,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  retryableErrors: ["ECONNRESET", "ETIMEDOUT", "ECONNREFUSED", "NETWORK_ERROR"],
  debug: false,
  logLevel: "error",
}

export class RetryManager {
  private config: RetryConfig
  private retryCount = 0
  private successCount = 0
  private failureCount = 0

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }

    this.log("info", "RetryManager initialized with config:", this.config)
  }

  /**
   * 执行可重试操作
   * @param operation 操作函数
   * @param options 重试选项
   * @returns 操作结果
   */
  public async execute<T>(operation: () => Promise<T>, options: Partial<RetryConfig> = {}): Promise<T> {
    if (this.config.enabled !== true) {
      return operation()
    }

    // 合并配置
    const config = { ...this.config, ...options }
    let retries = 0
    let lastError: unknown

    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        const result = await operation()
        this.successCount++
        return result
      } catch (error) {
        lastError = error
        this.retryCount++

        // 检查是否应该重试
        if (!this.shouldRetry(error, retries, config)) {
          this.failureCount++
          throw error
        }

        // 计算延迟时间
        const delay = this.calculateDelay(retries, config)

        // 调用重试回调
        if (typeof config.onRetry === 'function') {
          config.onRetry(error, retries + 1, delay)
        }

        this.log(
          "info",
          `Retrying operation (${retries + 1}/${config.maxRetries}) after ${delay}ms due to error:`,
          error,
        )

        // 等待延迟时间
        await new Promise((resolve) => setTimeout(resolve, delay))

        // 增加重试次数
        retries++
      }
    }
  }

  /**
   * 获取统计信息
   */
  public getStats(): {
    retryCount: number
    successCount: number
    failureCount: number
    retryRate: number
  } {
    const totalAttempts = this.successCount + this.failureCount
    return {
      retryCount: this.retryCount,
      successCount: this.successCount,
      failureCount: this.failureCount,
      retryRate: totalAttempts > 0 ? this.retryCount / totalAttempts : 0,
    }
  }

  /**
   * 重置统计信息
   */
  public resetStats(): void {
    this.retryCount = 0
    this.successCount = 0
    this.failureCount = 0
  }

  /**
   * 检查是否应该重试
   * @param error 错误
   * @param retries 当前重试次数
   * @param config 配置
   * @returns 是否应该重试
   */
  private shouldRetry(error: unknown, retries: number, config: RetryConfig): boolean {
    // 如果已达到最大重试次数，不再重试
    if (retries >= config.maxRetries) {
      return false
    }

    // 如果提供了自定义重试条件，使用它
    if (typeof config.retryCondition === 'function') {
      return config.retryCondition(error)
    }

    if (isRetryableErrorShape(error)) {
      // 检查HTTP状态码
      if (typeof error.status === 'number' && config.retryableStatusCodes.includes(error.status)) {
        return true
      }

      // 检查错误代码
      if (typeof error.code === 'string' && config.retryableErrors.includes(error.code)) {
        return true
      }

      // 检查网络错误
      if (typeof error.message === 'string' && config.retryableErrors.some((e) => error.message!.includes(e))) {
        return true
      }
    }

    return false
  }

  /**
   * 计算延迟时间
   * @param retries 当前重试次数
   * @param config 配置
   * @returns 延迟时间（毫秒）
   */
  private calculateDelay(retries: number, config: RetryConfig): number {
    // 指数退避策略
    const delay = config.initialDelay * Math.pow(config.backoffFactor, retries)

    // 添加随机抖动（±20%）以避免雷鸣群效应
    const jitter = delay * 0.2 * (Math.random() * 2 - 1)

    // 确保不超过最大延迟
    return Math.min(config.maxDelay, delay + jitter)
  }

  /**
   * 记录日志
   * @param level 日志级别
   * @param message 日志消息
   * @param data 附加数据
   */
  private log(level: "error" | "warn" | "info" | "debug", message: string, data?: unknown): void {
    // 根据配置的日志级别过滤日志
    const levelPriority = { error: 0, warn: 1, info: 2, debug: 3 } as const
    if (levelPriority[level] > levelPriority[this.config.logLevel]) {
      return
    }

    // 只有在调试模式下或错误日志才输出
    if (this.config.debug || level === "error") {
      const timestamp = new Date().toISOString()
      const formattedMessage = `[${timestamp}] [RetryManager] [${level.toUpperCase()}] ${message}`

      switch (level) {
        case "error":
          console.error(formattedMessage, data)
          break
        case "warn":
          console.warn(formattedMessage, data)
          break
        case "info":
          console.info(formattedMessage, data)
          break
        case "debug":
          console.debug(formattedMessage, data)
          break
      }
    }
  }
}

// 创建单例实例
let retryManagerInstance: RetryManager | null = null

export function getRetryManager(config?: Partial<RetryConfig>): RetryManager {
  if (!retryManagerInstance) {
    retryManagerInstance = new RetryManager(config)
  } else if (config) {
    // 如果提供了新配置，创建新实例
    retryManagerInstance = new RetryManager(config)
  }

  return retryManagerInstance
}
