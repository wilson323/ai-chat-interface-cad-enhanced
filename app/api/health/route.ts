/**
 * 健康检查API - 提供系统健康状态信息
 * Health Check API - Provides system health status information
 */
import { NextResponse } from "next/server"
import { getEnhancedFastGPTClient } from "@/lib/api/fastgpt-enhanced"
import { getFastGPTOptimizer } from "@/lib/api/fastgpt-optimizer"
import { getCacheManager } from "@/lib/cache/cache-manager"
import { getPrefetchService } from "@/lib/prefetch/prefetch-service"

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
          redis: cacheStats.redis
            ? {
                connected: cacheStats.redis.connected,
                size: cacheStats.redis.size,
              }
            : null,
        },
        prefetch: {
          activeRules: prefetchStats.activeRules,
          successRate: prefetchStats.successRate,
          isNetworkSuitable: prefetchStats.isNetworkSuitable,
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
    console.error("Health check failed:", error)

    return NextResponse.json(
      {
        status: "error",
        timestamp: new Date().toISOString(),
        error: error.message,
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
