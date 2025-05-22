/**
 * 高可用性中间件 - 整合所有优化措施
 * High Availability Middleware - Integrates all optimization measures
 */
import { type NextRequest, NextResponse } from "next/server"
import { rateLimiterMiddleware } from "./rate-limiter"

// 高可用性配置
export interface HighAvailabilityConfig {
  // 是否启用请求限流
  rateLimiting: boolean
  // 是否启用缓存控制
  cacheControl: boolean
  // 是否启用安全头
  securityHeaders: boolean
  // 是否启用CORS
  cors: boolean
  // 是否启用压缩
  compression: boolean
  // 是否启用请求跟踪
  requestTracking: boolean
  // 是否启用调试
  debug: boolean
}

// 默认配置
const DEFAULT_CONFIG: HighAvailabilityConfig = {
  rateLimiting: true,
  cacheControl: true,
  securityHeaders: true,
  cors: true,
  compression: true,
  requestTracking: true,
  debug: false,
}

// 请求计数器
let requestCounter = 0
// 错误计数器
let errorCounter = 0
// 开始时间
const startTime = Date.now()

/**
 * 高可用性中间件
 * @param req 请求
 * @param config 配置
 * @returns 响应
 */
export async function highAvailabilityMiddleware(
  req: NextRequest,
  config: Partial<HighAvailabilityConfig> = {},
): Promise<NextResponse> {
  // 合并配置
  const effectiveConfig: HighAvailabilityConfig = { ...DEFAULT_CONFIG, ...config }

  // 生成请求ID
  const requestId = crypto.randomUUID()

  // 跟踪请求
  if (effectiveConfig.requestTracking) {
    requestCounter++
    if (effectiveConfig.debug) {
      console.log(`Request ${requestId}: ${req.method} ${req.nextUrl.pathname}`)
    }
  }

  try {
    // 应用请求限流
    if (effectiveConfig.rateLimiting) {
      const rateLimitResponse = await rateLimiterMiddleware(req)
      if (rateLimitResponse) {
        return rateLimitResponse
      }
    }

    // 获取响应
    const response = NextResponse.next()

    // 添加请求ID头
    response.headers.set("X-Request-ID", requestId)

    // 添加缓存控制头
    if (effectiveConfig.cacheControl) {
      // API路由不缓存
      if (req.nextUrl.pathname.startsWith("/api/")) {
        response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
        response.headers.set("Pragma", "no-cache")
        response.headers.set("Expires", "0")
      }
      // 静态资源缓存
      else if (
        req.nextUrl.pathname.match(/\.(js|css|jpg|jpeg|png|gif|ico|svg|woff|woff2|ttf|eot|mp3|mp4|webm|ogg|pdf)$/)
      ) {
        response.headers.set("Cache-Control", "public, max-age=31536000, immutable")
      }
      // 其他路由使用适当的缓存
      else {
        response.headers.set("Cache-Control", "public, max-age=60, s-maxage=60, stale-while-revalidate=300")
      }
    }

    // 添加安全头
    if (effectiveConfig.securityHeaders) {
      response.headers.set("X-Content-Type-Options", "nosniff")
      response.headers.set("X-Frame-Options", "DENY")
      response.headers.set("X-XSS-Protection", "1; mode=block")
      response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
      response.headers.set(
        "Permissions-Policy",
        "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()",
      )
    }

    // 添加CORS头
    if (effectiveConfig.cors) {
      response.headers.set("Access-Control-Allow-Origin", "*")
      response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
      response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization")
      response.headers.set("Access-Control-Max-Age", "86400")
    }

    return response
  } catch (error) {
    // 记录错误
    errorCounter++
    console.error(`Error in high availability middleware (${requestId}):`, error)

    // 返回错误响应
    return NextResponse.json(
      {
        error: {
          message: "An internal server error occurred",
          code: "internal_server_error",
          requestId,
        },
      },
      {
        status: 500,
        headers: {
          "X-Request-ID": requestId,
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      },
    )
  }
}

/**
 * 获取中间件统计信息
 * @returns 统计信息
 */
export function getMiddlewareStats(): {
  requestCount: number
  errorCount: number
  errorRate: number
  uptime: number
} {
  const uptime = Date.now() - startTime
  return {
    requestCount: requestCounter,
    errorCount: errorCounter,
    errorRate: requestCounter > 0 ? errorCounter / requestCounter : 0,
    uptime,
  }
}
