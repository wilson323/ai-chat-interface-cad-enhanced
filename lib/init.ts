/**
 * 系统初始化 - 初始化所有系统组件
 * System Initialization - Initialize all system components
 */
import { getCacheManager } from "./cache/cache-manager"
import { getRedisCacheAdapter } from "./cache/redis-cache-adapter"
import { getFastGPTOptimizer } from "./api/fastgpt-optimizer"
import { getEnhancedFastGPTClient } from "./api/fastgpt-enhanced"
import { getPrefetchService } from "./prefetch/prefetch-service"
import { RequestPriority } from "./api/fastgpt-optimizer"

// 环境类型声明移除，避免与其他声明冲突

// 初始化配置
interface InitConfig {
  debug?: boolean
  logLevel?: "error" | "warn" | "info" | "debug"
  cache?: {
    enabled?: boolean
    useRedis?: boolean
    memorySize?: number
    ttl?: number
  }
  optimizer?: {
    maxConcurrentRequests?: number
    circuitBreakerEnabled?: boolean
    batchingEnabled?: boolean
  }
  prefetch?: {
    enabled?: boolean
    onlyWifi?: boolean
  }
}

// 默认配置
const DEFAULT_CONFIG: InitConfig = {
  debug: false,
  logLevel: "error",
  cache: {
    enabled: true,
    useRedis: true,
    memorySize: 500,
    ttl: 5 * 60 * 1000, // 5分钟
  },
  optimizer: {
    maxConcurrentRequests: 5,
    circuitBreakerEnabled: true,
    batchingEnabled: true,
  },
  prefetch: {
    enabled: true,
    onlyWifi: true,
  },
}

// 初始化系统
export async function initSystem(config: InitConfig = {}): Promise<void> {
  const mergedConfig = {
    ...DEFAULT_CONFIG,
    ...config,
    cache: { ...DEFAULT_CONFIG.cache, ...config.cache },
    optimizer: { ...DEFAULT_CONFIG.optimizer, ...config.optimizer },
    prefetch: { ...DEFAULT_CONFIG.prefetch, ...config.prefetch },
  }

  console.log("[System] Initializing system with config:", mergedConfig)

  try {
    // 初始化缓存管理器
    const cacheManager = getCacheManager({
      debug: mergedConfig.debug,
      logLevel: mergedConfig.logLevel,
      memorySize: mergedConfig.cache?.memorySize,
      memoryTTL: mergedConfig.cache?.ttl,
      useRedisCache: mergedConfig.cache?.useRedis,
    })

    // 如果启用Redis，初始化Redis适配器
    if (mergedConfig.cache?.useRedis) {
      const redisAdapter = getRedisCacheAdapter({
        debug: mergedConfig.debug,
        logLevel: mergedConfig.logLevel,
      })

      // 连接到Redis
      const connected = await redisAdapter.connect()
      if (connected) {
        console.log("[System] Connected to Redis cache")
      } else {
        console.warn("[System] Failed to connect to Redis cache, falling back to local cache only")
      }
    }

    // 初始化优化器
    const optimizer = getFastGPTOptimizer({
      debug: mergedConfig.debug,
      logLevel: mergedConfig.logLevel,
      maxConcurrentRequests: mergedConfig.optimizer?.maxConcurrentRequests,
      circuitBreakerEnabled: mergedConfig.optimizer?.circuitBreakerEnabled,
      batchingEnabled: mergedConfig.optimizer?.batchingEnabled,
      cacheEnabled: mergedConfig.cache?.enabled,
      cacheTTL: mergedConfig.cache?.ttl,
    })

    // 初始化客户端
    const client = getEnhancedFastGPTClient({
      debug: mergedConfig.debug,
      logLevel: mergedConfig.logLevel,
      cacheEnabled: mergedConfig.cache?.enabled,
      cacheTTL: mergedConfig.cache?.ttl,
      offlineSupport: true,
      fallbackResponses: true,
    })

    // 初始化预取服务
    const prefetchService = getPrefetchService({
      enabled: mergedConfig.prefetch?.enabled,
      debug: mergedConfig.debug,
      logLevel: mergedConfig.logLevel,
      networkConditions: {
        onlyWifi: mergedConfig.prefetch?.onlyWifi ?? false,
        minBatteryLevel: 20,
      },
    })

    // 添加默认预取规则
    prefetchService.addRule({
      id: "init-chat",
      pattern: "/chat",
      dependencies: [],
      prefetchFn: async () => {
        const client = getEnhancedFastGPTClient()
        return client.initChat({
          priority: RequestPriority.LOW,
        })
      },
      priority: RequestPriority.LOW,
      ttl: 5 * 60 * 1000, // 5分钟
    })

    prefetchService.addRule({
      id: "chat-histories",
      pattern: "/chat",
      dependencies: ["init-chat"],
      prefetchFn: async () => {
        const client = getEnhancedFastGPTClient()
        return client.getHistories({
          appId: "default",
          priority: RequestPriority.LOW,
        })
      },
      priority: RequestPriority.LOW,
      ttl: 60 * 1000, // 1分钟
    })

    console.log("[System] System initialized successfully")
  } catch (error) {
    console.error("[System] Failed to initialize system:", error)
    throw error
  }
}

// 如果在浏览器环境中，自动初始化系统
if (typeof window !== "undefined") {
  // 延迟初始化，确保页面加载完成
  window.addEventListener("load", () => {
    initSystem({
      debug: process.env.NODE_ENV === "development",
      logLevel: process.env.NODE_ENV === "development" ? "debug" : "error",
    }).catch((error) => {
      console.error("[System] Auto-initialization failed:", error)
    })
  })
}

export const initializeApp = async (): Promise<{initialized: boolean}> => {
  try {
    // 初始化逻辑
    return {
      initialized: true
    }
  } catch (error) {
    console.error("[System] Initialization failed:", error)
    return {
      initialized: false
    }
  }
}
