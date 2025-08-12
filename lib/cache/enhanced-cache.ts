import { getCacheManager } from './cache-manager'
import { buildFullCacheKey } from './key'

export class EnhancedCache<T = unknown> {
  private readonly scope: string
  private readonly ttl: number
  constructor(options: { scope?: string; ttl?: number } = {}) {
    this.scope = options.scope ?? 'enhanced'
    this.ttl = options.ttl ?? 60 * 60 * 1000
  }
  async get(key: string): Promise<T | null> {
    const manager = getCacheManager()
    return (await manager.get<T>(buildFullCacheKey(this.scope, key))) as T | null
  }
  async set(key: string, value: T, options: { ttl?: number; tags?: string[] } = {}): Promise<void> {
    const manager = getCacheManager()
    const ttl = options.ttl ?? this.ttl
    await manager.set<T>(buildFullCacheKey(this.scope, key), value, { ttl, tags: options.tags })
  }
  async delete(key: string): Promise<boolean> {
    const manager = getCacheManager()
    await manager.delete(buildFullCacheKey(this.scope, key))
    return true
  }
  async invalidateByTag(tag: string): Promise<number> {
    const manager = getCacheManager()
    await manager.deleteByTag(tag)
    return 0
  }
  async clear(): Promise<void> {
    const manager = getCacheManager()
    await manager.clear()
  }
}

export const defaultCache = new EnhancedCache({ scope: 'default', ttl: 60 * 60 * 1000 })
export const cadCache = new EnhancedCache({ scope: 'cad', ttl: 24 * 60 * 60 * 1000 })
export const sessionCache = new EnhancedCache({ scope: 'session', ttl: 30 * 60 * 1000 }) 