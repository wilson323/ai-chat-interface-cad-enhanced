/**
 * 高可用性中间件 - 整合所有优化措施
 * High Availability Middleware - Integrates all optimization measures
 */

import { NextRequest, NextResponse } from "next/server"
import { rateLimiterMiddleware } from "./rate-limiter"
import { getSecurityConfig } from "@/config/security"

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

// 简化配置
const DEFAULT_CONFIG = {
  rateLimiting: true,
  cacheControl: true,
  securityHeaders: false, // 完全禁用安全头
  cors: true,
  requestTracking: true
}

// 请求计数器
let requestCounter = 0
// 错误计数器
let errorCounter = 0
// 开始时间
const startTime = Date.now()

// 确保process.env类型正确
declare const process: NodeJS.Process

/**
 * 高可用性中间件
 * @param req 请求
 * @param config 配置
 * @returns 响应
 */
export async function highAvailabilityMiddleware(req: NextRequest) {
  const res = NextResponse.next()
  
  // 使用环境变量的正确类型访问方式
  const isProd = process.env.NODE_ENV === 'production'
  
  if (isProd) {
    const { csp, permissionsPolicy } = getSecurityConfig(true)
    res.headers.set('Content-Security-Policy', csp)
    res.headers.set('Permissions-Policy', permissionsPolicy)
    res.headers.set('X-Content-Type-Options', 'nosniff')
  }

  if (DEFAULT_CONFIG.rateLimiting) {
    const rateLimitRes = await rateLimiterMiddleware(req)
    if (rateLimitRes) return rateLimitRes
  }

  return res
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

// 修正模块扩展声明
declare module "next" {
  interface NextRequest {
    geo?: {
      city?: string
      country?: string
    }
  }
}
