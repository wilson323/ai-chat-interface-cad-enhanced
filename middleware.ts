import { NextRequest, NextResponse } from "next/server"

// 标准中间件函数
export function middleware(request: NextRequest) {
  // 基础请求处理逻辑
  const response = NextResponse.next()
  
  // 生产环境启用统一安全策略
  if (process.env.NODE_ENV === 'production') {
    const { csp, permissionsPolicy } = require('@/config/security')?.getSecurityConfig?.(true) || { csp: '', permissionsPolicy: '' }
    if (csp) response.headers.set('Content-Security-Policy', csp)
    if (permissionsPolicy) response.headers.set('Permissions-Policy', permissionsPolicy)
  }
  // 安全头
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  // 处理路由隔离 - 管理员路由权限控制
  const { pathname } = request.nextUrl
  
  // 如果是管理员路由，检查认证状态
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    // 获取管理员令牌
    const adminToken = request.cookies.get('adminToken')?.value
    
    // 如果未认证，重定向到登录页面
    if (!adminToken) {
      const url = new URL('/admin/login', request.url)
      // 保存原始 URL 作为重定向后的目标
      url.searchParams.set('redirect', pathname)
      return NextResponse.redirect(url)
    }
  }
  
  // 统一CORS策略（生产环境可配置白名单域名）
  if (pathname.startsWith('/api/')) {
    const allowOrigin = process.env.CORS_ALLOW_ORIGIN || '*'
    response.headers.set('Access-Control-Allow-Origin', allowOrigin)
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 200, headers: response.headers })
    }
  }

  return response
}

// 统一配置规则
export const config = {
  matcher: [
    // 排除静态资源和favicon
    "/((?!_next/static|favicon.ico|public/).*)",
    // 包含所有API路由
    "/api/:path*",
    // 包含管理员路由
    "/admin/:path*"
  ]
}
