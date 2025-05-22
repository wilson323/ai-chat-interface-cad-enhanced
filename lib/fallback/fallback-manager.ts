/**
 * 智能降级系统 - 在资源不可用时提供替代方案
 * Smart Fallback System - Provide alternatives when resources are unavailable
 */

// 降级配置
export interface FallbackConfig {
  enabled: boolean
  maxFallbackLevels: number
  fallbackStrategies: {
    api: boolean
    images: boolean
    fonts: boolean
    scripts: boolean
    styles: boolean
  }
  debug: boolean
  logLevel: "error" | "warn" | "info" | "debug"
}

// 降级项
interface FallbackItem<T> {
  id: string
  priority: number
  condition: () => boolean | Promise<boolean>
  fallback: () => T | Promise<T>
}

// 默认配置
const DEFAULT_CONFIG: FallbackConfig = {
  enabled: true,
  maxFallbackLevels: 3,
  fallbackStrategies: {
    api: true,
    images: true,
    fonts: true,
    scripts: true,
    styles: true,
  },
  debug: false,
  logLevel: "error",
}

export class FallbackManager {
  private config: FallbackConfig
  private fallbacks: Map<string, FallbackItem<any>[]> = new Map()
  private activeFallbacks: Map<string, string> = new Map()
  private fallbackCount = 0
  private successCount = 0
  private failureCount = 0

  constructor(config: Partial<FallbackConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }

    this.log("info", "FallbackManager initialized with config:", this.config)
  }

  /**
   * 注册降级策略
   * @param key 资源键
   * @param fallbacks 降级项
   */
  public register<T>(
    key: string,
    fallbacks: Array<{
      id: string
      priority: number
      condition: () => boolean | Promise<boolean>
      fallback: () => T | Promise<T>
    }>,
  ): void {
    if (!this.config.enabled) {
      return
    }

    // 按优先级排序（高优先级在前）
    const sortedFallbacks = [...fallbacks].sort((a, b) => b.priority - a.priority)

    this.fallbacks.set(key, sortedFallbacks)
    this.log("debug", `Registered ${sortedFallbacks.length} fallbacks for key: ${key}`)
  }

  /**
   * 执行带降级的操作
   * @param key 资源键
   * @param primaryOperation 主要操作
   * @returns 操作结果
   */
  public async execute<T>(key: string, primaryOperation: () => T | Promise<T>): Promise<T> {
    if (!this.config.enabled) {
      return primaryOperation()
    }

    try {
      // 尝试执行主要操作
      return await primaryOperation()
    } catch (primaryError) {
      this.log("warn", `Primary operation failed for key: ${key}`, primaryError)
      this.fallbackCount++

      // 获取降级策略
      const fallbacks = this.fallbacks.get(key) || []
      if (fallbacks.length === 0) {
        this.failureCount++
        throw primaryError
      }

      // 尝试每个降级策略
      for (let i = 0; i < Math.min(fallbacks.length, this.config.maxFallbackLevels); i++) {
        const fallback = fallbacks[i]

        try {
          // 检查条件
          const conditionResult = await fallback.condition()
          if (!conditionResult) {
            this.log("debug", `Fallback condition not met for ${key}:${fallback.id}`)
            continue
          }

          // 执行降级策略
          this.log("info", `Executing fallback ${i + 1}/${fallbacks.length} (${fallback.id}) for key: ${key}`)
          const result = await fallback.fallback()

          // 记录活动降级
          this.activeFallbacks.set(key, fallback.id)
          this.successCount++

          this.log("info", `Fallback successful for key: ${key} using strategy: ${fallback.id}`)
          return result
        } catch (fallbackError) {
          this.log("warn", `Fallback ${fallback.id} failed for key: ${key}`, fallbackError)
        }
      }

      // 所有降级策略都失败
      this.failureCount++
      this.log("error", `All fallbacks failed for key: ${key}`)
      throw new Error(`Operation failed and all fallbacks exhausted for key: ${key}`)
    }
  }

  /**
   * 获取活动降级
   * @param key 资源键
   * @returns 活动降级ID
   */
  public getActiveFallback(key: string): string | null {
    return this.activeFallbacks.get(key) || null
  }

  /**
   * 重置活动降级
   * @param key 资源键（如果不提供，重置所有）
   */
  public resetFallback(key?: string): void {
    if (key) {
      this.activeFallbacks.delete(key)
    } else {
      this.activeFallbacks.clear()
    }
  }

  /**
   * 获取统计信息
   */
  public getStats(): {
    registeredKeys: number
    totalFallbacks: number
    activeFallbacks: number
    fallbackCount: number
    successCount: number
    failureCount: number
    successRate: number
  } {
    return {
      registeredKeys: this.fallbacks.size,
      totalFallbacks: Array.from(this.fallbacks.values()).reduce((total, items) => total + items.length, 0),
      activeFallbacks: this.activeFallbacks.size,
      fallbackCount: this.fallbackCount,
      successCount: this.successCount,
      failureCount: this.failureCount,
      successRate: this.fallbackCount > 0 ? this.successCount / this.fallbackCount : 1,
    }
  }

  /**
   * 记录日志
   * @param level 日志级别
   * @param message 日志消息
   * @param data 附加数据
   */
  private log(level: "error" | "warn" | "info" | "debug", message: string, data?: any): void {
    // 根据配置的日志级别过滤日志
    const levelPriority = { error: 0, warn: 1, info: 2, debug: 3 }
    if (levelPriority[level] > levelPriority[this.config.logLevel]) {
      return
    }

    // 只有在调试模式下或错误日志才输出
    if (this.config.debug || level === "error") {
      const timestamp = new Date().toISOString()
      const formattedMessage = `[${timestamp}] [FallbackManager] [${level.toUpperCase()}] ${message}`

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
let fallbackManagerInstance: FallbackManager | null = null

export function getFallbackManager(config?: Partial<FallbackConfig>): FallbackManager {
  if (!fallbackManagerInstance) {
    fallbackManagerInstance = new FallbackManager(config)
  } else if (config) {
    // 如果提供了新配置，创建新实例
    fallbackManagerInstance = new FallbackManager(config)
  }

  return fallbackManagerInstance
}
