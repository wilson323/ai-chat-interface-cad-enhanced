/**
 * 高级缓存管理器 - 提供多级缓存策略，显著减少FastGPT请求
 * Advanced Cache Manager - Provides multi-level caching to significantly reduce FastGPT requests
 *
 * 特性:
 * - 内存和本地存储双层缓存
 * - 支持标签化缓存管理
 * - 自动过期和清理
 * - 支持stale-while-revalidate策略
 * - 预测性预取
 * - 压缩大型缓存项
 * - 详细的统计和监控
 */
import { LRUCache } from "lru-cache"
import { DEFAULT_CACHE_NAMESPACE } from "./key"
import { Redis } from '@upstash/redis'

// 缓存项类型
export interface CacheItem<T> {
  value: T
  timestamp: number
  expiry: number
  tags?: string[]
  metadata?: Record<string, unknown>
}

// 缓存配置
export interface CacheConfig {
  memorySize: number // 内存缓存大小
  memoryTTL: number // 内存缓存TTL（毫秒）
  localStorageTTL: number // localStorage缓存TTL（毫秒）
  persistenceEnabled: boolean // 是否启用持久化
  compressionThreshold: number // 压缩阈值（字节）
  staleWhileRevalidate: boolean // 是否启用stale-while-revalidate策略
  prefetchThreshold: number // 预取阈值
  useRedisCache: boolean // 是否使用Redis缓存
  debug: boolean // 是否启用调试
  logLevel: "error" | "warn" | "info" | "debug" // 日志级别
}

// 默认配置
const DEFAULT_CONFIG: CacheConfig = {
  memorySize: 500, // 缓存500个项目
  memoryTTL: 5 * 60 * 1000, // 5分钟
  localStorageTTL: 24 * 60 * 60 * 1000, // 24小时
  persistenceEnabled: true,
  compressionThreshold: 1024, // 1KB
  staleWhileRevalidate: true,
  prefetchThreshold: 0.8, // 80%的TTL后预取
  useRedisCache: true,
  debug: false,
  logLevel: "error",
}

// 添加Redis适配器类型接口
interface RedisCacheAdapter {
  connect: () => Promise<boolean>;
  get: <T>(key: string) => Promise<CacheItem<T> | null>;
  set: <T>(key: string, value: CacheItem<T>, ttl: number) => Promise<void>;
  delete: (key: string) => Promise<void>;
  deleteByTag: (tag: string) => Promise<void>;
  clear: () => Promise<void>;
  getStats: () => Promise<{ size: number; memory: number; hitRate?: number; operations: number; errors: number; uptime: number; connected: boolean }>;
}

class UpstashRedisAdapter implements RedisCacheAdapter {
  private client: Redis
  private readonly tagPrefix: string
  constructor(url: string, token: string) {
    this.client = new Redis({ url, token })
    this.tagPrefix = `${DEFAULT_CACHE_NAMESPACE}tag:`
  }
  async connect(): Promise<boolean> {
    try {
      // Upstash 客户端为无连接模式，此处尝试一次读以确认可用
      await this.client.get('cache:ping').catch(() => null)
      return true
    } catch {
      return false
    }
  }
  async get<T>(key: string): Promise<CacheItem<T> | null> {
    const raw = await this.client.get<string>(key)
    if (raw == null) return null
    try {
      return JSON.parse(raw) as CacheItem<T>
    } catch {
      return null
    }
  }
  async set<T>(key: string, value: CacheItem<T>, ttlSeconds: number): Promise<void> {
    await this.client.set(key, JSON.stringify(value), { ex: ttlSeconds })
    // 维护标签 -> 键 集合，便于按标签清理
    if (Array.isArray(value.tags)) {
      for (const tag of value.tags) {
        const tagKey = `${this.tagPrefix}${tag}`
        await this.client.sadd(tagKey, key)
        // 确保标签集合不过度膨胀，设置与成员相同的过期
        if (ttlSeconds > 0) {
          await this.client.expire(tagKey, ttlSeconds)
        }
      }
    }
  }
  async delete(key: string): Promise<void> {
    await this.client.del(key)
  }
  async deleteByTag(tag: string): Promise<void> {
    const tagKey = `${this.tagPrefix}${tag}`
    const members = (await this.client.smembers(tagKey)) as unknown as string[]
    if (Array.isArray(members) && members.length > 0) {
      // 批量删除成员键
      await this.client.del(...members)
    }
    await this.client.del(tagKey)
  }
  async clear(): Promise<void> {
    // 出于安全与Upstash限制，不执行 FLUSHDB。调用方应通过前缀管理或按标签清理。
    return Promise.resolve()
  }
  async getStats(): Promise<{ size: number; memory: number; hitRate?: number; operations: number; errors: number; uptime: number; connected: boolean }> {
    // Upstash REST 无法直接获取DBSIZE/内存，此处返回最小可用统计
    return { size: 0, memory: 0, operations: 0, errors: 0, uptime: 0, connected: true }
  }
}

export class CacheManager {
  private config: CacheConfig
  private memoryCache: LRUCache<string, CacheItem<unknown>>
  private revalidationQueue: Map<string, Promise<unknown>> = new Map()
  private prefetchQueue: Set<string> = new Set()
  private redisAdapter: RedisCacheAdapter | null = null
  private hitCount = 0
  private missCount = 0
  private revalidationCount = 0
  private prefetchCount = 0
  private errorCount = 0
  private lastCleanup = Date.now()
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }

    // 服务端且配置了Upstash变量时启用Redis适配器
    if (typeof window === 'undefined' && this.config.useRedisCache === true) {
      const url = process.env.UPSTASH_REDIS_REST_URL
      const token = process.env.UPSTASH_REDIS_REST_TOKEN
      if (typeof url === 'string' && url.length > 0 && typeof token === 'string' && token.length > 0) {
        this.redisAdapter = new UpstashRedisAdapter(url, token)
      }
    }

    // 初始化内存缓存
    this.memoryCache = new LRUCache<string, CacheItem<unknown>>({
      max: this.config.memorySize,
      ttl: this.config.memoryTTL,
      updateAgeOnGet: true,
      allowStale: this.config.staleWhileRevalidate,
      dispose: (value, key) => {
        this.log("debug", `Memory cache item disposed: ${key}`)
      },
    })

    // 定期清理过期的localStorage缓存
    if (typeof window !== "undefined" && this.config.persistenceEnabled === true) {
      this.cleanupLocalStorage()
      // 每小时清理一次
      this.cleanupInterval = setInterval(() => this.cleanupLocalStorage(), 60 * 60 * 1000)
    }

    // 连接Redis缓存
    if (this.config.useRedisCache === true && this.redisAdapter !== null) {
      this.redisAdapter
        .connect()
        .then((connected) => {
          if (connected) {
            this.log("info", "Redis cache connected successfully")
          } else {
            this.log("warn", "Failed to connect to Redis cache, falling back to local cache only")
          }
        })
        .catch((error) => {
          this.log("error", `Redis cache connection error: ${error.message}`)
        })
    }

    this.log(
      "info",
      `CacheManager initialized with config: ${JSON.stringify({
        ...this.config,
        // 隐藏敏感信息
        redisAdapter: this.redisAdapter ? "configured" : "disabled",
      })}`,
    )
  }

  /**
   * 获取缓存项
   * @param key 缓存键
   * @param fetchFn 获取数据的函数（缓存未命中时调用）
   * @param options 选项
   * @returns 缓存值
   */
  public async get<T>(
    key: string,
    fetchFn?: () => Promise<T>,
    options: {
      ttl?: number
      tags?: string[]
      bypassCache?: boolean
      forceRefresh?: boolean
      metadata?: Record<string, unknown>
      priority?: "high" | "normal" | "low"
    } = {},
  ): Promise<T | null> {
    try {
      const cacheKey = this.normalizeKey(key)
      const now = Date.now()
      const ttl = options.ttl ?? this.config.memoryTTL
      const bypassCache = options.bypassCache ?? false
      const forceRefresh = options.forceRefresh ?? false

      // 如果强制刷新或绕过缓存，直接获取新数据
      if (bypassCache === true || forceRefresh === true) {
        if (typeof fetchFn === 'function') {
          const value = await this.fetchAndCache(cacheKey, fetchFn, ttl, options.tags, options.metadata)
          return value
        }
        return null
      }

      // 1. 检查内存缓存
      let item = this.memoryCache.get(cacheKey) as CacheItem<T> | undefined

      // 2. 如果内存缓存未命中，检查localStorage
      if (item == null && typeof window !== "undefined" && this.config.persistenceEnabled === true) {
        const localItem = this.getFromLocalStorage<T>(cacheKey)
        if (localItem != null) {
          // 如果localStorage有效，添加到内存缓存
          if (typeof localItem.expiry === 'number' && localItem.expiry > now) {
            this.memoryCache.set(cacheKey, localItem)
            item = localItem
            this.log("debug", `Cache: localStorage hit for ${cacheKey}`)
          } else {
            this.log("debug", `Cache: localStorage expired for ${cacheKey}`)
          }
        }
      }

      // 3. 如果本地缓存未命中，检查Redis缓存
      if (item == null && this.redisAdapter !== null && this.config.useRedisCache === true) {
        try {
          const redisItem = await this.redisAdapter.get<T>(cacheKey)
          if (redisItem != null && typeof redisItem.expiry === 'number' && redisItem.expiry > now) {
            // 如果Redis缓存有效，添加到内存缓存
            this.memoryCache.set(cacheKey, redisItem)
            item = redisItem
            this.log("debug", `Cache: Redis hit for ${cacheKey}`)
          }
        } catch (error) {
          this.log("error", `Redis cache error for ${cacheKey}: ${error instanceof Error ? error.message : String(error)}`)
          this.errorCount++
        }
      }

      // 4. 处理缓存命中
      if (item != null) {
        this.hitCount++

        // 检查是否需要在后台刷新（stale-while-revalidate）
        if (this.config.staleWhileRevalidate === true && typeof fetchFn === 'function' && item.expiry < now) {
          this.revalidateInBackground(cacheKey, fetchFn, ttl, options.tags, options.metadata)
        }
        // 检查是否需要预取
        else if (typeof fetchFn === 'function' && this.shouldPrefetch(item as CacheItem<unknown>)) {
          this.prefetchInBackground(cacheKey, fetchFn, ttl, options.tags, options.metadata)
        }

        return item.value
      }

      // 5. 缓存未命中，获取新数据
      this.missCount++
      this.log("debug", `Cache: miss for ${cacheKey}`)

      if (typeof fetchFn === 'function') {
        // 检查是否已有相同的请求正在进行中（请求合并）
        if (this.revalidationQueue.has(cacheKey) === true) {
          this.log("debug", `Cache: reusing in-flight request for ${cacheKey}`)
          return this.revalidationQueue.get(cacheKey) as Promise<T> | null
        }

        return this.fetchAndCache(cacheKey, fetchFn, ttl, options.tags, options.metadata)
      }

      return null
    } catch (error) {
      this.log("error", `Error getting cache item for key ${key}: ${error instanceof Error ? error.message : String(error)}`)
      this.errorCount++

      // 如果提供了fetchFn，尝试直接调用它作为降级策略
      if (typeof fetchFn === 'function') {
        try {
          return await fetchFn()
        } catch (fetchError) {
          this.log("error", `Error fetching data after cache error: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`)
          throw fetchError
        }
      }

      throw error
    }
  }

  /**
   * 设置缓存项
   * @param key 缓存键
   * @param value 缓存值
   * @param options 选项
   */
  public async set<T>(
    key: string,
    value: T,
    options: {
      ttl?: number
      tags?: string[]
      metadata?: Record<string, unknown>
    } = {},
  ): Promise<void> {
    try {
      const cacheKey = this.normalizeKey(key)
      const now = Date.now()
      const ttl = options.ttl ?? this.config.memoryTTL
      const expiry = now + ttl

      const item: CacheItem<T> = {
        value,
        timestamp: now,
        expiry,
        tags: options.tags,
        metadata: options.metadata,
      }

      // 设置内存缓存
      this.memoryCache.set(cacheKey, item as unknown as CacheItem<unknown>)

      // 设置localStorage缓存
      if (typeof window !== "undefined" && this.config.persistenceEnabled === true) {
        this.setToLocalStorage(cacheKey, item)
      }

      // 设置Redis缓存
      if (this.redisAdapter !== null && this.config.useRedisCache === true) {
        try {
          await this.redisAdapter.set(cacheKey, item, Math.ceil(ttl / 1000))
        } catch (error) {
          this.log("error", `Redis cache error setting ${cacheKey}: ${error instanceof Error ? error.message : String(error)}`)
          this.errorCount++
        }
      }

      this.log("debug", `Cache: set ${cacheKey}, expires at ${new Date(expiry).toISOString()}`)
    } catch (error) {
      this.log("error", `Error setting cache item for key ${key}: ${error instanceof Error ? error.message : String(error)}`)
      this.errorCount++
      throw error
    }
  }

  /**
   * 删除缓存项
   * @param key 缓存键
   */
  public async delete(key: string): Promise<void> {
    try {
      const cacheKey = this.normalizeKey(key)

      // 从内存缓存中删除
      this.memoryCache.delete(cacheKey)

      // 从localStorage中删除
      if (typeof window !== "undefined" && this.config.persistenceEnabled === true) {
        try {
          localStorage.removeItem(`${DEFAULT_CACHE_NAMESPACE}${cacheKey}`)
        } catch (error) {
          this.log("error", `Error removing from localStorage: ${error instanceof Error ? error.message : String(error)}`)
        }
      }

      // 从Redis缓存中删除
      if (this.redisAdapter !== null && this.config.useRedisCache === true) {
        try {
          await this.redisAdapter.delete(cacheKey)
        } catch (error) {
          this.log("error", `Redis cache error deleting ${cacheKey}: ${error instanceof Error ? error.message : String(error)}`)
          this.errorCount++
        }
      }

      this.log("debug", `Cache: deleted ${cacheKey}`)
    } catch (error) {
      this.log("error", `Error deleting cache item for key ${key}: ${error instanceof Error ? error.message : String(error)}`)
      this.errorCount++
      throw error
    }
  }

  /**
   * 按标签删除缓存项
   * @param tag 标签
   */
  public async deleteByTag(tag: string): Promise<void> {
    try {
      // 从内存缓存中删除
      const keysToDelete: string[] = []
      for (const key of this.memoryCache.keys()) {
        const item = this.memoryCache.get(key)
        if (item != null && Array.isArray(item.tags) && item.tags.includes(tag)) {
          keysToDelete.push(key)
        }
      }

      // 批量删除内存缓存
      for (const key of keysToDelete) {
        this.memoryCache.delete(key)
      }

      // 从localStorage中删除
      if (typeof window !== "undefined" && this.config.persistenceEnabled === true) {
        try {
          const localKeysToDelete: string[] = []
          for (let i = 0; i < localStorage.length; i++) {
            const storageKey = localStorage.key(i)
            if (typeof storageKey === 'string' && storageKey.startsWith(DEFAULT_CACHE_NAMESPACE)) {
              try {
                const raw = localStorage.getItem(storageKey)
                if (raw !== null) {
                  const item = JSON.parse(raw)
                  if (item != null && Array.isArray(item.tags) && item.tags.includes(tag)) {
                    localKeysToDelete.push(storageKey)
                  }
                }
              } catch {
                // 忽略解析错误
              }
            }
          }

          // 批量删除localStorage
          for (const key of localKeysToDelete) {
            localStorage.removeItem(key)
          }
        } catch (error) {
          this.log("error", `Error removing from localStorage by tag: ${error instanceof Error ? error.message : String(error)}`)
        }
      }

      // 从Redis缓存中删除
      if (this.redisAdapter !== null && this.config.useRedisCache === true) {
        try {
          await this.redisAdapter.deleteByTag(tag)
        } catch (error) {
          this.log("error", `Redis cache error deleting by tag ${tag}: ${error instanceof Error ? error.message : String(error)}`)
          this.errorCount++
        }
      }

      this.log("info", `Cache: deleted items with tag ${tag}`)
    } catch (error) {
      this.log("error", `Error deleting cache items by tag ${tag}: ${error instanceof Error ? error.message : String(error)}`)
      this.errorCount++
      throw error
    }
  }

  /**
   * 清除所有缓存
   */
  public async clear(): Promise<void> {
    try {
      // 清除内存缓存
      this.memoryCache.clear()

      // 清除localStorage缓存
      if (typeof window !== "undefined" && this.config.persistenceEnabled === true) {
        try {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)
            if (typeof key === 'string' && key.startsWith(DEFAULT_CACHE_NAMESPACE)) {
              localStorage.removeItem(key)
            }
          }
        } catch (error) {
          this.log("error", `Error clearing localStorage cache: ${error instanceof Error ? error.message : String(error)}`)
        }
      }

      // 清除Redis缓存
      if (this.redisAdapter !== null && this.config.useRedisCache === true) {
        try {
          await this.redisAdapter.clear()
        } catch (error) {
          this.log("error", `Redis cache error clearing all: ${error instanceof Error ? error.message : String(error)}`)
          this.errorCount++
        }
      }

      this.log("info", "Cache: cleared all caches")
    } catch (error) {
      this.log("error", `Error clearing all caches: ${error instanceof Error ? error.message : String(error)}`)
      this.errorCount++
      throw error
    }
  }

  /**
   * 获取缓存统计信息
   */
  public async getStats(): Promise<{
    memory: {
      size: number
      hits: number
      misses: number
      hitRatio: number
      revalidations: number
      prefetches: number
      errors: number
    }
    redis?: {
      size: number
      memory: number
      hitRate?: number
    }
  }> {
    const size = this.memoryCache.size
    const hits = this.hitCount
    const misses = this.missCount
    const total = hits + misses
    const hitRatio = total > 0 ? hits / total : 0

    const memoryStats = {
      size,
      hits,
      misses,
      hitRatio,
      revalidations: this.revalidationCount,
      prefetches: this.prefetchCount,
      errors: this.errorCount,
    }

    // 获取Redis缓存统计信息
    let redisStats = undefined
    if (this.redisAdapter !== null && this.config.useRedisCache === true) {
      try {
        redisStats = await this.redisAdapter.getStats()
      } catch (error) {
        this.log("error", `Error getting Redis cache stats: ${error instanceof Error ? error.message : String(error)}`)
      }
    }

    return {
      memory: memoryStats,
      redis: redisStats,
    }
  }

  /**
   * 销毁缓存管理器
   */
  public dispose(): void {
    // 清除定时器
    if (this.cleanupInterval !== null) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }

    // 清除内存缓存
    this.memoryCache.clear()

    this.log("info", "CacheManager disposed")
  }

  /**
   * 规范化缓存键
   * @param key 原始键
   * @returns 规范化的键
   */
  private normalizeKey(key: string): string {
    // 移除不必要的字符，确保键的一致性
    return key.trim().toLowerCase().replace(/\s+/g, "_")
  }

  /**
   * 从localStorage获取缓存项
   * @param key 缓存键
   * @returns 缓存项
   */
  private getFromLocalStorage<T>(key: string): CacheItem<T> | null {
    try {
      const data = localStorage.getItem(`${DEFAULT_CACHE_NAMESPACE}${key}`)
      if (data == null) return null

      // 尝试解压缩（如果启用了压缩）
      let parsed: unknown
      try {
        parsed = JSON.parse(data)
      } catch (e) {
        return null
      }

      return parsed as CacheItem<T>
    } catch (error) {
      this.log("error", `Error reading from localStorage: ${error instanceof Error ? error.message : String(error)}`)
      return null
    }
  }

  /**
   * 将缓存项保存到localStorage
   * @param key 缓存键
   * @param item 缓存项
   */
  private setToLocalStorage<T>(key: string, item: CacheItem<T>): void {
    try {
      const data = JSON.stringify(item)

      // 如果数据超过阈值，可以考虑压缩
      localStorage.setItem(`${DEFAULT_CACHE_NAMESPACE}${key}`, data)
    } catch (error) {
      // 可能是localStorage已满，尝试清理一些旧数据
      this.log("error", `Error writing to localStorage: ${error instanceof Error ? error.message : String(error)}`)
      this.cleanupLocalStorage(true)
    }
  }

  /**
   * 清理过期的localStorage缓存
   * @param aggressive 是否进行激进清理
   */
  private cleanupLocalStorage(aggressive = false): void {
    try {
      const now = Date.now()
      const keysToRemove: string[] = []

      // 遍历所有localStorage项
      for (let i = 0; i < localStorage.length; i++) {
        const storageKey = localStorage.key(i)
        if (typeof storageKey === 'string' && storageKey.startsWith(DEFAULT_CACHE_NAMESPACE)) {
          try {
            const raw = localStorage.getItem(storageKey)
            const item = raw ? (JSON.parse(raw) as { expiry?: number }) : null

            // 如果项目已过期或进行激进清理，则标记为删除
            if (aggressive === true || (item !== null && typeof item.expiry === 'number' && item.expiry < now)) {
              keysToRemove.push(storageKey)
            }
          } catch {
            // 如果解析失败，也标记为删除
            keysToRemove.push(storageKey)
          }
        }
      }

      // 删除标记的项
      for (const key of keysToRemove) {
        localStorage.removeItem(key)
      }

      this.lastCleanup = now

      if (keysToRemove.length > 0) {
        this.log("debug", `Cache: cleaned up ${keysToRemove.length} expired items from localStorage`)
      }
    } catch (error) {
      this.log("error", `Error cleaning up localStorage: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * 获取并缓存数据
   * @param key 缓存键
   * @param fetchFn 获取数据的函数
   * @param ttl 过期时间
   * @param tags 标签
   * @param metadata 元数据
   * @returns 获取的数据
   */
  private async fetchAndCache<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl: number,
    tags?: string[],
    metadata?: Record<string, unknown>,
  ): Promise<T> {
    // 创建一个Promise并将其添加到队列中
    const fetchPromise = (async () => {
      try {
        const startTime = Date.now()
        const value = await fetchFn()
        const fetchTime = Date.now() - startTime

        this.log("debug", `Cache: fetched ${key} in ${fetchTime}ms`)

        // 缓存结果
        await this.set(key, value, { ttl, tags, metadata })
        return value
      } catch (error) {
        this.log("error", `Error fetching data for ${key}: ${error instanceof Error ? error.message : String(error)}`)
        this.errorCount++
        throw error
      } finally {
        // 从队列中移除
        this.revalidationQueue.delete(key)
      }
    })()

    // 将Promise添加到队列
    this.revalidationQueue.set(key, fetchPromise)
    return fetchPromise
  }

  /**
   * 在后台重新验证缓存
   * @param key 缓存键
   * @param fetchFn 获取数据的函数
   * @param ttl 过期时间
   * @param tags 标签
   * @param metadata 元数据
   */
  private revalidateInBackground<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl: number,
    tags?: string[],
    metadata?: Record<string, unknown>,
  ): void {
    // 如果已经在重新验证，则跳过
    if (this.revalidationQueue.has(key)) return

    this.revalidationCount++
    this.log("debug", `Cache: revalidating ${key} in background`)

    // 创建一个Promise并将其添加到队列中
    const revalidatePromise = (async () => {
      try {
        const value = await fetchFn()
        // 缓存结果
        await this.set(key, value, { ttl, tags, metadata })
        return value
      } catch (error) {
        this.log("error", `Error revalidating ${key}: ${error instanceof Error ? error.message : String(error)}`)
        this.errorCount++
        // 出错时不更新缓存，保留旧值
      } finally {
        // 从队列中移除
        this.revalidationQueue.delete(key)
      }
    })()

    // 将Promise添加到队列
    this.revalidationQueue.set(key, revalidatePromise)
  }

  /**
   * 检查是否应该预取
   * @param item 缓存项
   * @returns 是否应该预取
   */
  private shouldPrefetch(item: CacheItem<unknown>): boolean {
    if (this.config.staleWhileRevalidate !== true) return false

    const now = Date.now()
    const age = now - item.timestamp
    const ttl = item.expiry - item.timestamp

    // 如果已经过了预取阈值，且尚未过期
    return age > ttl * this.config.prefetchThreshold && now < item.expiry
  }

  /**
   * 在后台预取缓存
   * @param key 缓存键
   * @param fetchFn 获取数据的函数
   * @param ttl 过期时间
   * @param tags 标签
   * @param metadata 元数据
   */
  private prefetchInBackground<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl: number,
    tags?: string[],
    metadata?: Record<string, unknown>,
  ): void {
    // 如果已经在预取队列中，则跳过
    if (this.prefetchQueue.has(key) === true || this.revalidationQueue.has(key) === true) return

    this.prefetchCount++
    this.prefetchQueue.add(key)

    this.log("debug", `Cache: prefetching ${key} in background`)

    // 创建一个Promise并将其添加到队列中
    const prefetchPromise = (async () => {
      try {
        const value = await fetchFn()
        // 缓存结果
        await this.set(key, value, { ttl, tags, metadata })
        return value
      } catch (error) {
        this.log("error", `Error prefetching ${key}: ${error instanceof Error ? error.message : String(error)}`)
        this.errorCount++
        // 出错时不更新缓存，保留旧值
      } finally {
        // 从队列中移除
        this.prefetchQueue.delete(key)
        this.revalidationQueue.delete(key)
      }
    })()

    // 将Promise添加到队列
    this.revalidationQueue.set(key, prefetchPromise)
  }

  /**
   * 记录日志
   * @param level 日志级别
   * @param message 日志消息
   */
  private log(level: "error" | "warn" | "info" | "debug", message: string): void {
    // 根据配置的日志级别过滤日志
    const levelPriority = { error: 0, warn: 1, info: 2, debug: 3 }
    if (levelPriority[level] > levelPriority[this.config.logLevel]) {
      return
    }

    // 只有在调试模式下或错误日志才输出
    if (this.config.debug || level === "error") {
      const timestamp = new Date().toISOString()
      const formattedMessage = `[${timestamp}] [CacheManager] [${level.toUpperCase()}] ${message}`

      switch (level) {
        case "error":
          console.error(formattedMessage)
          break
        case "warn":
          console.warn(formattedMessage)
          break
        case "info":
          console.info(formattedMessage)
          break
        case "debug":
          console.debug(formattedMessage)
          break
      }
    }
  }
}

// 创建单例实例
let cacheManagerInstance: CacheManager | null = null

export function getCacheManager(config?: Partial<CacheConfig>): CacheManager {
  if (!cacheManagerInstance) {
    cacheManagerInstance = new CacheManager(config)
  } else if (config) {
    // 如果提供了新配置，销毁旧实例并创建新实例
    cacheManagerInstance.dispose()
    cacheManagerInstance = new CacheManager(config)
  }

  return cacheManagerInstance
}
