import { NextRequest, NextResponse } from "next/server"
import { rateLimiterMiddleware } from "@/middleware/rate-limiter"

// 标准中间件函数（避免使用 async/await）
export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  try {
    // 记录请求
    // 动态引入以兼容 Edge 运行时打包
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('@/lib/middleware/stats').recordRequest?.()
  } catch {}

  // 生产环境启用统一安全策略
  if (process.env.NODE_ENV === 'production') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { csp, permissionsPolicy } = require('@/config/security')?.getSecurityConfig?.(true) || { csp: '', permissionsPolicy: '' }
      if (csp) response.headers.set('Content-Security-Policy', csp)
      if (permissionsPolicy) response.headers.set('Permissions-Policy', permissionsPolicy)
    } catch {}
  }

  // 安全头
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  const { pathname } = request.nextUrl

  // 管理员路由鉴权（同步逻辑）
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    const adminToken = request.cookies.get('adminToken')?.value
    if (!adminToken) {
      const url = new URL('/admin/login', request.url)
      url.searchParams.set('redirect', pathname)
      return NextResponse.redirect(url)
    }
  }

  // 统一限流 + CORS 策略（返回 Promise，避免 await）
  if (pathname.startsWith('/api/')) {
    const allowOrigin = process.env.CORS_ALLOW_ORIGIN || '*'
    response.headers.set('Access-Control-Allow-Origin', allowOrigin)
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')

    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 200, headers: response.headers })
    }

    try {
      const maybePromise = (rateLimiterMiddleware as (req: NextRequest) => Promise<NextResponse | undefined>)(request)
      return Promise.resolve(maybePromise)
        .then((limited) => {
          if (limited) return limited
          return response
        })
        .catch(() => response)
    } catch {
      return response
    }
  }

  return response
}

// 统一配置规则
export const config = {
  matcher: [
    "/((?!_next/static|favicon.ico|public/).*)",
    "/api/:path*",
    "/admin/:path*"
  ]
}
