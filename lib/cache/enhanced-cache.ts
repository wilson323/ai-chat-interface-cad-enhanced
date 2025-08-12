/**
 * 增强缓存系统
 * 支持多级缓存、压缩、统计和标签管理
 */
import { createHash } from 'crypto'
import { LRUCache } from 'lru-cache'
import { promisify } from 'util'
import { gunzip, gzip } from 'zlib'

// 压缩和解压缩函数
const gzipAsync = promisify(gzip)
const gunzipAsync = promisify(gunzip)

export interface CacheOptions {
  maxSize?: number
  ttl?: number
  enableCompression?: boolean
  enableStatistics?: boolean
  redisUrl?: string
}

export interface CacheEntry<T = unknown> {
  value: T
  timestamp: number
  ttl?: number
  tags?: string[]
  compressed?: boolean
  size?: number
}

export interface CacheStatistics {
  hits: number
  misses: number
  sets: number
  deletes: number
  hitRate: number
  totalSize: number
  entryCount: number
}

type RedisLike = {
  getBuffer: (key: string) => Promise<Buffer | null>
  setex: (key: string, seconds: number, value: string) => Promise<unknown>
  del: (key: string) => Promise<unknown>
  flushdb: () => Promise<unknown>
  on: (event: 'error', handler: (err: Error) => void) => void
};

export class EnhancedCache<T = unknown> {
  private lruCache: LRUCache<string, CacheEntry<T>>
  private redisClient: RedisLike | null = null
  private statistics: CacheStatistics
  private options: Required<CacheOptions>
  private tagMap: Map<string, Set<string>> = new Map()

  constructor(options: CacheOptions = {}) {
    this.options = {
      maxSize: options.maxSize ?? 50 * 1024 * 1024, // 50MB
      ttl: options.ttl ?? 60 * 60 * 1000, // 1小时
      enableCompression: options.enableCompression ?? true,
      enableStatistics: options.enableStatistics ?? true,
      redisUrl: options.redisUrl ?? process.env.REDIS_URL ?? ''
    }

    this.lruCache = new LRUCache<string, CacheEntry<T>>({
      max: 1000,
      maxSize: this.options.maxSize,
      sizeCalculation: (entry: CacheEntry<T>) => {
        return entry.size ?? JSON.stringify(entry.value).length
      },
      dispose: (value: CacheEntry<T>, key: string) => {
        this.updateTagMap(key, value.tags, 'delete')
      }
    })

    this.statistics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      hitRate: 0,
      totalSize: 0,
      entryCount: 0
    }

    this.initializeRedis()
  }

  private async initializeRedis() {
    if (this.options.redisUrl) {
      try {
        // 动态导入Redis客户端
        const Redis = await import('ioredis').then(m => m.default)
        this.redisClient = new Redis(this.options.redisUrl)
        
        this.redisClient.on('error', (err: Error) => {
          console.warn('Redis connection error:', err.message)
          this.redisClient = null
        })
      } catch (error) {
        console.warn('Failed to initialize Redis:', error)
      }
    }
  }

  private generateKey(key: string): string {
    return createHash('md5').update(key).digest('hex')
  }

  private async compress(data: unknown): Promise<Buffer> {
    if (!this.options.enableCompression) {
      return Buffer.from(JSON.stringify(data))
    }
    
    const jsonString = JSON.stringify(data)
    const buffer = Buffer.from(jsonString)
    return await gzipAsync(buffer)
  }

  private async decompress(buffer: Buffer, compressed: boolean = true): Promise<unknown> {
    if (!compressed || !this.options.enableCompression) {
      return JSON.parse(buffer.toString())
    }
    
    const decompressed = await gunzipAsync(buffer)
    return JSON.parse(decompressed.toString())
  }

  private updateStatistics(operation: 'hit' | 'miss' | 'set' | 'delete') {
    if (!this.options.enableStatistics) return

    this.statistics[operation === 'hit' ? 'hits' : operation === 'miss' ? 'misses' : operation === 'set' ? 'sets' : 'deletes']++
    
    const total = this.statistics.hits + this.statistics.misses
    this.statistics.hitRate = total > 0 ? this.statistics.hits / total : 0
    this.statistics.entryCount = this.lruCache.size
    this.statistics.totalSize = this.lruCache.calculatedSize ?? 0
  }

  private updateTagMap(key: string, tags?: string[], operation: 'add' | 'delete' = 'add') {
    if (tags == null || tags.length === 0) return

    tags.forEach(tag => {
      if (operation === 'add') {
        if (!this.tagMap.has(tag)) {
          this.tagMap.set(tag, new Set())
        }
        this.tagMap.get(tag)!.add(key)
      } else {
        const tagSet = this.tagMap.get(tag)
        if (tagSet) {
          tagSet.delete(key)
          if (tagSet.size === 0) {
            this.tagMap.delete(tag)
          }
        }
      }
    })
  }

  async get(key: string): Promise<T | null> {
    const hashedKey = this.generateKey(key)
    
    // 首先检查本地缓存
    const localEntry = this.lruCache.get(hashedKey)
    const ttlMs = localEntry?.ttl
    if (localEntry && (ttlMs == null || Date.now() - localEntry.timestamp < ttlMs)) {
      this.updateStatistics('hit')
      return localEntry.value
    }

    // 检查Redis缓存
    if (this.redisClient !== null) {
      try {
        const redisData = await this.redisClient.getBuffer(hashedKey)
        if (redisData) {
          const entry: CacheEntry<T> = JSON.parse(redisData.toString())
          const entryTtl = entry.ttl
          if (entryTtl == null || Date.now() - entry.timestamp < entryTtl) {
            // 将Redis数据同步到本地缓存
            this.lruCache.set(hashedKey, entry)
            this.updateTagMap(hashedKey, entry.tags, 'add')
            this.updateStatistics('hit')
            return entry.value
          }
        }
      } catch (error) {
        console.warn('Redis get error:', error)
      }
    }

    this.updateStatistics('miss')
    return null
  }

  async set(key: string, value: T, options: { ttl?: number; tags?: string[] } = {}): Promise<void> {
    const hashedKey = this.generateKey(key)
    const ttl = options.ttl ?? this.options.ttl
    const compressed = await this.compress(value)
    
    const entry: CacheEntry<T> = {
      value,
      timestamp: Date.now(),
      ttl,
      tags: options.tags,
      compressed: this.options.enableCompression,
      size: compressed.length
    }

    // 设置本地缓存
    this.lruCache.set(hashedKey, entry)
    this.updateTagMap(hashedKey, options.tags, 'add')

    // 设置Redis缓存
    if (this.redisClient !== null) {
      try {
        const redisEntry = { ...entry, value: compressed.toString('base64') }
        await this.redisClient.setex(hashedKey, Math.ceil((ttl ?? 0) / 1000), JSON.stringify(redisEntry))
      } catch (error) {
        console.warn('Redis set error:', error)
      }
    }

    this.updateStatistics('set')
  }

  async delete(key: string): Promise<boolean> {
    const hashedKey = this.generateKey(key)
    
    const entry = this.lruCache.get(hashedKey)
    if (entry) {
      this.updateTagMap(hashedKey, entry.tags, 'delete')
    }
    
    const localDeleted = this.lruCache.delete(hashedKey)
    
    if (this.redisClient !== null) {
      try {
        await this.redisClient.del(hashedKey)
      } catch (error) {
        console.warn('Redis delete error:', error)
      }
    }

    if (localDeleted) {
      this.updateStatistics('delete')
    }
    
    return localDeleted
  }

  async invalidateByTag(tag: string): Promise<number> {
    const keys = this.tagMap.get(tag)
    if (!keys) return 0

    let deletedCount = 0
    for (const key of keys) {
      if (await this.delete(key)) {
        deletedCount++
      }
    }

    return deletedCount
  }

  async clear(): Promise<void> {
    this.lruCache.clear()
    this.tagMap.clear()
    
    if (this.redisClient !== null) {
      try {
        await this.redisClient.flushdb()
      } catch (error) {
        console.warn('Redis clear error:', error)
      }
    }
  }

  getStatistics(): CacheStatistics {
    return { ...this.statistics }
  }

  async warmup(entries: Array<{ key: string; value: T; options?: { ttl?: number; tags?: string[] } }>): Promise<void> {
    const promises = entries.map(({ key, value, options }) => 
      this.set(key, value, options)
    )
    await Promise.all(promises)
  }

  async cleanup(): Promise<number> {
    let cleanedCount = 0
    const now = Date.now()
    
    for (const [key, entry] of this.lruCache.entries()) {
      if (typeof entry.ttl === 'number' && now - entry.timestamp > entry.ttl) {
        this.lruCache.delete(key)
        cleanedCount++
      }
    }
    
    return cleanedCount
  }
}

// 预配置的缓存实例
export const defaultCache = new EnhancedCache({
  maxSize: 50 * 1024 * 1024, // 50MB
  ttl: 60 * 60 * 1000, // 1小时
  enableCompression: true,
  enableStatistics: true
})

export const cadCache = new EnhancedCache({
  maxSize: 100 * 1024 * 1024, // 100MB for CAD files
  ttl: 24 * 60 * 60 * 1000, // 24小时
  enableCompression: true,
  enableStatistics: true
})

export const sessionCache = new EnhancedCache({
  maxSize: 10 * 1024 * 1024, // 10MB
  ttl: 30 * 60 * 1000, // 30分钟
  enableCompression: false, // 会话数据通常较小，不需要压缩
  enableStatistics: true
}) 