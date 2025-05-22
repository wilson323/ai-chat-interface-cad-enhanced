// 缓存功能
type CacheOptions = {
  ttl: number; // 过期时间（毫秒）
  storage?: 'local' | 'session' | 'memory';
};

type CacheItem<T> = {
  value: T;
  expires: number;
};

const memoryCache = new Map<string, any>();

export function useCache<T>(prefix: string, options: CacheOptions) {
  const { ttl, storage = 'local' } = options;
  
  const getStorageType = () => {
    if (storage === 'local' && typeof window !== 'undefined') {
      return window.localStorage;
    } else if (storage === 'session' && typeof window !== 'undefined') {
      return window.sessionStorage;
    }
    return null;
  };
  
  // 获取缓存
  const getCache = async (key: string): Promise<T | null> => {
    const cacheKey = `${prefix}:${key}`;
    
    try {
      // 内存缓存
      if (storage === 'memory') {
        const cached = memoryCache.get(cacheKey) as CacheItem<T> | undefined;
        if (cached && cached.expires > Date.now()) {
          return cached.value;
        }
        return null;
      }
      
      // 浏览器存储
      const storageObj = getStorageType();
      if (!storageObj) return null;
      
      const cachedItem = storageObj.getItem(cacheKey);
      if (!cachedItem) return null;
      
      const cached = JSON.parse(cachedItem) as CacheItem<T>;
      if (cached.expires > Date.now()) {
        return cached.value;
      }
      
      // 清除过期缓存
      storageObj.removeItem(cacheKey);
      return null;
    } catch (error) {
      console.error("读取缓存失败:", error);
      return null;
    }
  };
  
  // 设置缓存
  const setCache = async (key: string, value: T): Promise<void> => {
    const cacheKey = `${prefix}:${key}`;
    const item: CacheItem<T> = {
      value,
      expires: Date.now() + ttl
    };
    
    try {
      if (storage === 'memory') {
        memoryCache.set(cacheKey, item);
        return;
      }
      
      const storageObj = getStorageType();
      if (!storageObj) return;
      
      storageObj.setItem(cacheKey, JSON.stringify(item));
    } catch (error) {
      console.error("写入缓存失败:", error);
    }
  };
  
  // 清除缓存
  const clearCache = async (key?: string): Promise<void> => {
    try {
      if (key) {
        // 清除特定键
        const cacheKey = `${prefix}:${key}`;
        
        if (storage === 'memory') {
          memoryCache.delete(cacheKey);
          return;
        }
        
        const storageObj = getStorageType();
        if (!storageObj) return;
        
        storageObj.removeItem(cacheKey);
      } else {
        // 清除前缀下所有缓存
        if (storage === 'memory') {
          for (const key of memoryCache.keys()) {
            if (key.startsWith(`${prefix}:`)) {
              memoryCache.delete(key);
            }
          }
          return;
        }
        
        const storageObj = getStorageType();
        if (!storageObj) return;
        
        const keysToRemove: string[] = [];
        
        for (let i = 0; i < storageObj.length; i++) {
          const key = storageObj.key(i);
          if (key && key.startsWith(`${prefix}:`)) {
            keysToRemove.push(key);
          }
        }
        
        keysToRemove.forEach(key => storageObj.removeItem(key));
      }
    } catch (error) {
      console.error("清除缓存失败:", error);
    }
  };
  
  return { getCache, setCache, clearCache };
} 