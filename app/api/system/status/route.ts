/**
 * 系统状态API - 提供系统状态信息
 * System Status API - Provides system status information
 */
import { NextResponse } from "next/server"
import { getEnhancedFastGPTClient } from "@/lib/api/enhanced-fastgpt-client"
import { getFastGPTOptimizer } from "@/lib/api/fastgpt-optimizer"
import { getCacheManager } from "@/lib/cache/cache-manager"
import { getPrefetchService } from "@/lib/prefetch/prefetch-service"
import { getBatchProcessor } from "@/lib/batch/batch-processor"
import { getRetryManager } from "@/lib/retry/retry-manager"
import { getPreloadManager } from "@/lib/preload/preload-manager"
import { getFallbackManager } from "@/lib/fallback/fallback-manager"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    // 获取各组件状态
    const client = getEnhancedFastGPTClient()
    const clientStats = client.getStats()

    const optimizer = getFastGPTOptimizer()
    const optimizerStats = optimizer.getStats()

    const cacheManager = getCacheManager()
    const cacheStats = await cacheManager.getStats()

    const prefetchService = getPrefetchService()
    const prefetchStats = prefetchService.getStats()

    const batchProcessor = getBatchProcessor()
    const batchStats = (batchProcessor as any).getStats ? (batchProcessor as any).getStats() : {
      groupCount: 0,
      efficiency: 0,
      savedRequestsCount: 0,
    }

    const retryManager = getRetryManager()
    const retryStats = retryManager.getStats()

    const preloadManager = getPreloadManager()
    const preloadStats = preloadManager.getStats()

    const fallbackManager = getFallbackManager()
    const fallbackStats = fallbackManager.getStats()

    // 判断系统健康状态
    const isHealthy = optimizerStats.isHealthy && !optimizerStats.circuitBreakerOpen

    // 构建响应
    const response = {
      status: isHealthy ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      version: process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0",
      components: {
        client: {
          status: clientStats.isOnline ? "online" : "offline",
          requestCount: clientStats.requestCount,
          successRate: clientStats.successRate,
          offlineQueueSize: clientStats.offlineQueueSize,
        },
        optimizer: {
          status: optimizerStats.circuitBreakerOpen ? "circuit_open" : "operational",
          requestCount: optimizerStats.requestCount,
          failureRate: optimizerStats.failureRate,
          averageResponseTime: optimizerStats.averageResponseTime,
          queueSize: optimizerStats.queueSize,
        },
        cache: {
          memory: {
            size: cacheStats.memory.size,
            hitRatio: cacheStats.memory.hitRatio,
          },
          redis: cacheStats.redis ? (cacheStats.redis as any) : null,
        },
        prefetch: {
          activeRules: prefetchStats.activeRules,
          successRate: prefetchStats.successRate,
          isNetworkSuitable: prefetchStats.isNetworkSuitable,
        },
        batch: {
          groupCount: batchStats.groupCount,
          efficiency: batchStats.efficiency,
          savedRequestsCount: batchStats.savedRequestsCount,
        },
        retry: {
          retryCount: retryStats.retryCount,
          successCount: retryStats.successCount,
          retryRate: retryStats.retryRate,
        },
        preload: {
          loadedCount: preloadStats.loadedCount,
          failedCount: preloadStats.failedCount,
          averageLoadTime: preloadStats.averageLoadTime,
        },
        fallback: {
          activeFallbacks: fallbackStats.activeFallbacks,
          successRate: fallbackStats.successRate,
        },
      },
      uptime: process.uptime(),
    }

    return NextResponse.json(response, {
      status: isHealthy ? 200 : 503,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    })
  } catch (error) {
    console.error("System status check failed:", error)

    return NextResponse.json(
      {
        status: "error",
        timestamp: new Date().toISOString(),
        error: (error instanceof Error ? error.message : String(error)),
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    )
  }
}
