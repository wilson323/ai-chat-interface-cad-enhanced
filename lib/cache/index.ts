import { getCacheManager } from './cache-manager'
import { buildFullCacheKey } from './key'

export type CacheOptions = {
  ttl: number
  storage?: 'local' | 'session' | 'memory'
}

export function useCache<T>(prefix: string, options: CacheOptions) {
  const manager = getCacheManager()
  const ttl = options.ttl

  const keyWithPrefix = (key: string) => buildFullCacheKey(prefix, key)

  const getCache = async (key: string): Promise<T | null> => {
    return (await manager.get<T>(keyWithPrefix(key))) as T | null
  }

  const setCache = async (key: string, value: T): Promise<void> => {
    await manager.set<T>(keyWithPrefix(key), value, { ttl })
  }

  const clearCache = async (key?: string): Promise<void> => {
    if (typeof key === 'string' && key.length > 0) {
      await manager.delete(keyWithPrefix(key))
    } else {
      await manager.clear()
    }
  }

  return { getCache, setCache, clearCache }
} 