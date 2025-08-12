/**
 * Redis缓存适配器 - 提供分布式缓存支持
 * Redis Cache Adapter - Provides distributed caching support
 *
 * 特性:
 * - 自动重连机制
 * - 批量操作优化
 * - 错误处理和重试
 * - 详细的统计和监控
 * - 支持标签化缓存管理
 */
import { Redis } from "@upstash/redis"

import type { CacheItem } from "./cache-manager"

// Redis缓存配置
export interface RedisCacheConfig {
  url: string
  token: string
  prefix: string
  ttl: number
  compressionThreshold: number
  maxRetries: number
  retryDelay: number
  connectionTimeout: number
  operationTimeout: number
  debug: boolean
  logLevel: "error" | "warn" | "info" | "debug"
}

// 默认配置
const DEFAULT_CONFIG: RedisCacheConfig = {
  url: process.env.UPSTASH_REDIS_REST_URL ?? "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN ?? "",
  prefix: (process.env.CACHE_KEY_PREFIX ?? 'acx:') + 'cache:',
  ttl: 24 * 60 * 60, // 24小时（秒）
  compressionThreshold: 1024, // 1KB
  maxRetries: 3,
  retryDelay: 1000, // 1秒
  connectionTimeout: 5000, // 5秒
  operationTimeout: 3000, // 3秒
  debug: false,
  logLevel: "error",
}

export class RedisCacheAdapter {
  private redis: Redis | null
  private config: RedisCacheConfig
  private isConnected = false
  private connectionPromise: Promise<boolean> | null = null
  private reconnectAttempts = 0
  private lastReconnectTime = 0
  private operationCount = 0
  private errorCount = 0
  private hitCount = 0
  private missCount = 0
  private startTime = Date.now()
  private disabled = false

  constructor(config: Partial<RedisCacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }

    const hasUrl = typeof this.config.url === 'string' && this.config.url.trim().length > 0
    const hasToken = typeof this.config.token === 'string' && this.config.token.trim().length > 0
    this.disabled = !(hasUrl && hasToken)

    // 仅在配置完整时创建Redis客户端
    this.redis = this.disabled
      ? null
      : new Redis({
          url: this.config.url,
          token: this.config.token,
          retry: {
            retries: this.config.maxRetries,
            backoff: (retryCount) =>
              Math.min(
                Math.pow(2, retryCount) * this.config.retryDelay,
                30000,
              ),
          },
        })

    this.log("info", "RedisCacheAdapter initialized with config:", {
      ...this.config,
      token: "***",
      disabled: this.disabled,
    })
  }

  /**
   * 连接到Redis
   * @returns 是否连接成功
   */
  public async connect(): Promise<boolean> {
    if (this.disabled) {
      this.log("warn", "Redis disabled due to missing url/token")
      this.isConnected = false
      return false
    }
    if (this.isConnected) {
      return true
    }
    if (this.connectionPromise) {
      return this.connectionPromise
    }
    this.connectionPromise = (async () => {
      try {
        const timeoutPromise = new Promise<boolean>((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Connection timeout after ${this.config.connectionTimeout}ms`))
          }, this.config.connectionTimeout)
        })
        const connectPromise = (this.redis as Redis).ping().then(() => true)
        const connected = await Promise.race([connectPromise, timeoutPromise])
        this.isConnected = connected
        this.reconnectAttempts = 0
        this.log("info", "Connected to Redis")
        return true
      } catch (error) {
        this.log("error", `Failed to connect to Redis: ${error instanceof Error ? error.message : String(error)}`)
        this.isConnected = false
        this.errorCount++
        if (this.shouldRetryConnection()) {
          this.log(
            "info",
            `Will retry connection in ${this.getReconnectDelay()}ms (attempt ${this.reconnectAttempts + 1})`,
          )
          this.scheduleReconnect()
        }
        return false
      } finally {
        this.connectionPromise = null
      }
    })()
    return this.connectionPromise
  }

  /**
   * 获取缓存项
   * @param key 缓存键
   * @returns 缓存项
   */
  public async get<T>(key: string): Promise<CacheItem<T> | null> {
    try {
      if (this.disabled) {
        return null
      }
      if (!(await this.connect())) {
        return null
      }
      this.operationCount++
      const fullKey = this.getFullKey(key)
      const timeoutPromise = new Promise<null>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Operation timeout after ${this.config.operationTimeout}ms`))
        }, this.config.operationTimeout)
      })
      const getPromise = (this.redis as Redis).get(fullKey).then((data) => {
        if (!data) {
          this.missCount++
          return null
        }
        const item = typeof data === "string" ? JSON.parse(data) : data
        this.hitCount++
        this.log("debug", `Got item for key ${key}`)
        return item as CacheItem<T>
      })
      return await Promise.race([getPromise, timeoutPromise])
    } catch (error) {
      this.log("error", `Error getting item for key ${key}: ${error instanceof Error ? error.message : String(error)}`)
      this.errorCount++
      if (this.isConnectionError(error)) {
        this.isConnected = false
        this.scheduleReconnect()
      }
      return null
    }
  }

  /**
   * 设置缓存项
   * @param key 缓存键
   * @param item 缓存项
   * @param ttl 过期时间（秒）
   * @returns 是否成功
   */
  public async set<T>(key: string, item: CacheItem<T>, ttl?: number): Promise<boolean> {
    try {
      if (this.disabled) {
        return false
      }
      if (!(await this.connect())) {
        return false
      }
      this.operationCount++
      const fullKey = this.getFullKey(key)
      const effectiveTTL = ttl || this.config.ttl
      const data = JSON.stringify(item)
      const timeoutPromise = new Promise<boolean>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Operation timeout after ${this.config.operationTimeout}ms`))
        }, this.config.operationTimeout)
      })
      const setPromise = (async () => {
        await (this.redis as Redis).set(fullKey, data, { ex: effectiveTTL })
        if (item.tags && item.tags.length > 0) {
          await this.updateTagIndices(key, item.tags)
        }
        this.log("debug", `Set item for key ${key} with TTL ${effectiveTTL}s`)
        return true
      })()
      return await Promise.race([setPromise, timeoutPromise])
    } catch (error) {
      this.log("error", `Error setting item for key ${key}: ${error instanceof Error ? error.message : String(error)}`)
      this.errorCount++
      if (this.isConnectionError(error)) {
        this.isConnected = false
        this.scheduleReconnect()
      }
      return false
    }
  }

  /**
   * 删除缓存项
   * @param key 缓存键
   * @returns 是否成功
   */
  public async delete(key: string): Promise<boolean> {
    try {
      if (this.disabled) {
        return false
      }
      if (!(await this.connect())) {
        return false
      }
      this.operationCount++
      const fullKey = this.getFullKey(key)
      const timeoutPromise = new Promise<boolean>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Operation timeout after ${this.config.operationTimeout}ms`))
        }, this.config.operationTimeout)
      })
      const deletePromise = (async () => {
        await (this.redis as Redis).del(fullKey)
        this.log("debug", `Deleted item for key ${key}`)
        return true
      })()
      return await Promise.race([deletePromise, timeoutPromise])
    } catch (error) {
      this.log("error", `Error deleting item for key ${key}: ${error instanceof Error ? error.message : String(error)}`)
      this.errorCount++
      if (this.isConnectionError(error)) {
        this.isConnected = false
        this.scheduleReconnect()
      }
      return false
    }
  }

  /**
   * 按标签删除缓存项
   * @param tag 标签
   * @returns 删除的项数
   */
  public async deleteByTag(tag: string): Promise<number> {
    try {
      if (this.disabled) {
        return 0
      }
      if (!(await this.connect())) {
        return 0
      }
      this.operationCount++
      const timeoutPromise = new Promise<number>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Operation timeout after ${this.config.operationTimeout}ms`))
        }, this.config.operationTimeout)
      })
      const deleteByTagPromise = (async () => {
        const tagIndexKey = this.getTagIndexKey(tag)
        const keys = await (this.redis as Redis).smembers(tagIndexKey)
        if (!keys || keys.length === 0) {
          return 0
        }
        const fullKeys = keys.map((key) => this.getFullKey(key))
        if (fullKeys.length > 0) {
          await (this.redis as Redis).del(...fullKeys)
        }
        await (this.redis as Redis).del(tagIndexKey)
        this.log("info", `Deleted ${keys.length} items with tag ${tag}`)
        return keys.length
      })()
      return await Promise.race([deleteByTagPromise, timeoutPromise])
    } catch (error) {
      this.log("error", `Error deleting items with tag ${tag}: ${error instanceof Error ? error.message : String(error)}`)
      this.errorCount++
      if (this.isConnectionError(error)) {
        this.isConnected = false
        this.scheduleReconnect()
      }
      return 0
    }
  }

  /**
   * 清除所有缓存
   * @returns 是否成功
   */
  public async clear(): Promise<boolean> {
    try {
      if (this.disabled) {
        return true
      }
      if (!(await this.connect())) {
        return false
      }
      this.operationCount++
      const timeoutPromise = new Promise<boolean>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Operation timeout after ${this.config.operationTimeout * 2}ms`))
        }, this.config.operationTimeout * 2)
      })
      const clearPromise = (async () => {
        const keys = await (this.redis as Redis).keys(`${this.config.prefix}*`)
        if (!keys || keys.length === 0) {
          return true
        }
        const batchSize = 100
        for (let i = 0; i < keys.length; i += batchSize) {
          const batch = keys.slice(i, i + batchSize)
          await (this.redis as Redis).del(...batch)
        }
        this.log("info", `Cleared all ${keys.length} items`)
        return true
      })()
      return await Promise.race([clearPromise, timeoutPromise])
    } catch (error) {
      this.log("error", `Error clearing cache: ${error instanceof Error ? error.message : String(error)}`)
      this.errorCount++
      if (this.isConnectionError(error)) {
        this.isConnected = false
        this.scheduleReconnect()
      }
      return false
    }
  }

  /**
   * 获取缓存统计信息
   * @returns 统计信息
   */
  public async getStats(): Promise<{
    size: number
    memory: number
    hitRate?: number
    operations: number
    errors: number
    uptime: number
    connected: boolean
  }> {
    try {
      if (this.disabled) {
        return {
          size: 0,
          memory: 0,
          operations: this.operationCount,
          errors: this.errorCount,
          uptime: Date.now() - this.startTime,
          connected: false,
        }
      }
      if (!this.isConnected) {
        return {
          size: 0,
          memory: 0,
          operations: this.operationCount,
          errors: this.errorCount,
          uptime: Date.now() - this.startTime,
          connected: false,
        }
      }
      this.operationCount++
      const keys = await (this.redis as Redis).keys(`${this.config.prefix}*`)
      const size = keys ? keys.length : 0
      let memory = 0
      try {
        const redisClient = this.redis as unknown as { info?: (section?: string) => Promise<string> }
        if (typeof redisClient.info === "function") {
          const info: string = await redisClient.info("memory")
          const memoryMatch = typeof info === "string" ? info.match(/used_memory:(\d+)/) : null
          memory = memoryMatch ? Number.parseInt(memoryMatch[1], 10) : 0
        }
      } catch {}
      const total = this.hitCount + this.missCount
      const hitRate = total > 0 ? this.hitCount / total : undefined
      return {
        size,
        memory,
        hitRate,
        operations: this.operationCount,
        errors: this.errorCount,
        uptime: Date.now() - this.startTime,
        connected: this.isConnected,
      }
    } catch (error) {
      this.log("error", `Error getting stats: ${error instanceof Error ? error.message : String(error)}`)
      this.errorCount++
      if (this.isConnectionError(error)) {
        this.isConnected = false
        this.scheduleReconnect()
      }
      return {
        size: 0,
        memory: 0,
        operations: this.operationCount,
        errors: this.errorCount,
        uptime: Date.now() - this.startTime,
        connected: false,
      }
    }
  }

  /**
   * 获取完整键名
   * @param key 缓存键
   * @returns 完整键名
   */
  private getFullKey(key: string): string {
    // 支持历史 prefix 兼容，若调用方传 scope:key 则不重复拼接
    if (key.includes(':')) return `${this.config.prefix}${key}`
    return `${this.config.prefix}${key}`
  }

  /**
   * 获取标签索引键名
   * @param tag 标签
   * @returns 标签索引键名
   */
  private getTagIndexKey(tag: string): string {
    return `${this.config.prefix}tag:${tag}`
  }

  /**
   * 更新标签索引
   * @param key 缓存键
   * @param tags 标签
   */
  private async updateTagIndices(key: string, tags: string[]): Promise<void> {
    try {
      // 为每个标签添加键
      for (const tag of tags) {
        const tagIndexKey = this.getTagIndexKey(tag)
        await (this.redis as Redis).sadd(tagIndexKey, key)
      }
    } catch (error) {
      this.log("error", `Error updating tag indices for key ${key}: ${error instanceof Error ? error.message : String(error)}`)
      throw error
    }
  }

  /**
   * 判断是否应该重试连接
   * @returns 是否应该重试连接
   */
  private shouldRetryConnection(): boolean {
    // 如果超过最大重试次数，不再重试
    if (this.reconnectAttempts >= this.config.maxRetries) {
      return false
    }

    // 如果距离上次重连时间太短，不再重试
    const now = Date.now()
    if (now - this.lastReconnectTime < this.getReconnectDelay()) {
      return false
    }

    return true
  }

  /**
   * 获取重连延迟时间
   * @returns 延迟时间（毫秒）
   */
  private getReconnectDelay(): number {
    // 指数退避策略
    return Math.min(
      Math.pow(2, this.reconnectAttempts) * this.config.retryDelay,
      30000, // 最大30秒
    )
  }

  /**
   * 安排重新连接
   */
  private scheduleReconnect(): void {
    if (!this.shouldRetryConnection()) {
      return
    }

    this.reconnectAttempts++
    this.lastReconnectTime = Date.now()

    const delay = this.getReconnectDelay()

    setTimeout(() => {
      this.log("info", `Attempting to reconnect to Redis (attempt ${this.reconnectAttempts})`)
      this.connect().catch((error) => {
        this.log("error", `Reconnection attempt failed: ${error.message}`)
      })
    }, delay)
  }

  /**
   * 判断是否为连接错误
   * @param error 错误
   * @returns 是否为连接错误
   */
  private isConnectionError(error: unknown): boolean {
    if (error == null) return false

    let errorMessage = ""
    if (typeof error === "object" && "message" in (error as Record<string, unknown>)) {
      const maybeMessage = (error as Record<string, unknown>).message
      errorMessage = typeof maybeMessage === "string" ? maybeMessage : String(maybeMessage)
    } else {
      errorMessage = String(error)
    }

    return (
      errorMessage.includes("connection") ||
      errorMessage.includes("network") ||
      errorMessage.includes("timeout") ||
      errorMessage.includes("ECONNREFUSED") ||
      errorMessage.includes("ECONNRESET")
    )
  }

  /**
   * 记录日志
   * @param level 日志级别
   * @param message 日志消息
   * @param data 附加数据
   */
  private log(level: "error" | "warn" | "info" | "debug", message: string, data?: unknown): void {
    // 根据配置的日志级别过滤日志
    const levelPriority = { error: 0, warn: 1, info: 2, debug: 3 }
    if (levelPriority[level] > levelPriority[this.config.logLevel]) {
      return
    }

    // 只有在调试模式下或错误日志才输出
    if (this.config.debug || level === "error") {
      const timestamp = new Date().toISOString()
      const formattedMessage = `[${timestamp}] [RedisCacheAdapter] [${level.toUpperCase()}] ${message}`

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
let redisCacheAdapterInstance: RedisCacheAdapter | null = null

export function getRedisCacheAdapter(config?: Partial<RedisCacheConfig>): RedisCacheAdapter {
  if (!redisCacheAdapterInstance) {
    redisCacheAdapterInstance = new RedisCacheAdapter(config)
  } else if (config) {
    // 如果提供了新配置，重新创建实例
    redisCacheAdapterInstance = new RedisCacheAdapter(config)
  }

  return redisCacheAdapterInstance
}
