/**
 * 系统初始化 - 初始化所有系统组件
 * System Initialization - Initialize all system components
 */
import { getCacheManager } from "./cache/cache-manager"
import { getRedisCacheAdapter } from "./cache/redis-cache-adapter"
import { getFastGPTOptimizer } from "./api/fastgpt-optimizer"
import { getEnhancedFastGPTClient } from "./api/fastgpt-enhanced"
import { getPrefetchService } from "./lib/prefetch/prefetch-service"
import { getBatchProcessor } from "./lib/batch/batch-processor"
import { getRetryManager } from "./lib/retry/retry-manager"
import { getPreloadManager } from "./lib/preload/preload-manager"
import { getFallbackManager } from "./lib/fallback/fallback-manager"
import { RequestPriority } from "./api/fastgpt-optimizer"

// 系统配置
export interface SystemConfig {
  debug: boolean
  logLevel: "error" | "warn" | "info" | "debug"
  cache: {
    enabled: boolean
    useRedis: boolean
    memorySize: number
    ttl: number
  }
  optimizer: {
    maxConcurrentRequests: number
    circuitBreakerEnabled: boolean
    batchingEnabled: boolean
  }
  prefetch: {
    enabled: boolean
    onlyWifi: boolean
  }
  batch: {
    enabled: boolean
    maxBatchSize: number
    maxWaitTime: number
  }
  retry: {
    enabled: boolean
    maxRetries: number
    initialDelay: number
  }
  preload: {
    enabled: boolean
    maxConcurrent: number
  }
  fallback: {
    enabled: boolean
    maxFallbackLevels: number
  }
}

// 默认配置
const DEFAULT_CONFIG: SystemConfig = {
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
  batch: {
    enabled: true,
    maxBatchSize: 5,
    maxWaitTime: 50, // 50毫秒
  },
  retry: {
    enabled: true,
    maxRetries: 3,
    initialDelay: 300, // 300毫秒
  },
  preload: {
    enabled: true,
    maxConcurrent: 3,
  },
  fallback: {
    enabled: true,
    maxFallbackLevels: 3,
  },
}

// 初始化状态
let initialized = false

/**
 * 初始化系统
 * @param config 配置
 */
export async function initSystem(config: Partial<SystemConfig> = {}): Promise<void> {
  // 如果已初始化，直接返回
  if (initialized) {
    console.log("[System] System already initialized")
    return
  }

  // 合并配置
  const mergedConfig = {
    ...DEFAULT_CONFIG,
    ...config,
    cache: { ...DEFAULT_CONFIG.cache, ...config.cache },
    optimizer: { ...DEFAULT_CONFIG.optimizer, ...config.optimizer },
    prefetch: { ...DEFAULT_CONFIG.prefetch, ...config.prefetch },
    batch: { ...DEFAULT_CONFIG.batch, ...config.batch },
    retry: { ...DEFAULT_CONFIG.retry, ...config.retry },
    preload: { ...DEFAULT_CONFIG.preload, ...config.preload },
    fallback: { ...DEFAULT_CONFIG.fallback, ...config.fallback },
  }

  console.log("[System] Initializing system with config:", mergedConfig)

  try {
    // 初始化缓存管理器
    const cacheManager = getCacheManager({
      debug: mergedConfig.debug,
      logLevel: mergedConfig.logLevel,
      memorySize: mergedConfig.cache.memorySize,
      memoryTTL: mergedConfig.cache.ttl,
      useRedisCache: mergedConfig.cache.useRedis,
    })

    // 如果启用Redis，初始化Redis适配器
    if (mergedConfig.cache.useRedis) {
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
      maxConcurrentRequests: mergedConfig.optimizer.maxConcurrentRequests,
      circuitBreakerEnabled: mergedConfig.optimizer.circuitBreakerEnabled,
      batchingEnabled: mergedConfig.optimizer.batchingEnabled,
      cacheEnabled: mergedConfig.cache.enabled,
      cacheTTL: mergedConfig.cache.ttl,
    })

    // 初始化客户端
    const client = getEnhancedFastGPTClient({
      debug: mergedConfig.debug,
      logLevel: mergedConfig.logLevel,
      cacheEnabled: mergedConfig.cache.enabled,
      cacheTTL: mergedConfig.cache.ttl,
      offlineSupport: true,
      fallbackResponses: true,
    })

    // 初始化批处理器
    const batchProcessor = getBatchProcessor({
      enabled: mergedConfig.batch.enabled,
      debug: mergedConfig.debug,
      logLevel: mergedConfig.logLevel,
      maxBatchSize: mergedConfig.batch.maxBatchSize,
      maxWaitTime: mergedConfig.batch.maxWaitTime,
    })

    // 初始化重试管理器
    const retryManager = getRetryManager({
      enabled: mergedConfig.retry.enabled,
      debug: mergedConfig.debug,
      logLevel: mergedConfig.logLevel,
      maxRetries: mergedConfig.retry.maxRetries,
      initialDelay: mergedConfig.retry.initialDelay,
    })

    // 初始化预加载管理器
    const preloadManager = getPreloadManager({
      enabled: mergedConfig.preload.enabled,
      debug: mergedConfig.debug,
      logLevel: mergedConfig.logLevel,
      maxConcurrent: mergedConfig.preload.maxConcurrent,
    })

    // 初始化降级管理器
    const fallbackManager = getFallbackManager({
      enabled: mergedConfig.fallback.enabled,
      debug: mergedConfig.debug,
      logLevel: mergedConfig.logLevel,
      maxFallbackLevels: mergedConfig.fallback.maxFallbackLevels,
    })

    // 初始化预取服务
    const prefetchService = getPrefetchService({
      enabled: mergedConfig.prefetch.enabled,
      debug: mergedConfig.debug,
      logLevel: mergedConfig.logLevel,
      networkConditions: {
        onlyWifi: mergedConfig.prefetch.onlyWifi,
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

    // 注册默认降级策略
    fallbackManager.register("api.chat", [
      {
        id: "cached-response",
        priority: 100,
        condition: () => cacheManager.has("last-successful-chat"),
        fallback: async () => {
          const cachedResponse = await cacheManager.get("last-successful-chat")
          return {
            ...cachedResponse,
            choices: [
              {
                index: 0,
                message: {
                  role: "assistant",
                  content: "这是一个缓存的响应。当前网络连接不可用，请稍后再试。",
                },
                finish_reason: "stop",
              },
            ],
          }
        },
      },
      {
        id: "offline-response",
        priority: 50,
        condition: () => true,
        fallback: async () => {
          return {
            id: "offline-response",
            object: "chat.completion",
            created: Date.now(),
            model: "offline-model",
            choices: [
              {
                index: 0,
                message: {
                  role: "assistant",
                  content: "我目前处于离线模式，无法连接到服务器。请检查您的网络连接，稍后再试。",
                },
                finish_reason: "stop",
              },
            ],
            usage: {
              prompt_tokens: 0,
              completion_tokens: 0,
              total_tokens: 0,
            },
          }
        },
      },
    ])

    // 标记为已初始化
    initialized = true

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
