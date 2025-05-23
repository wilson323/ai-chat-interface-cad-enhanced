import { NextRequest, NextResponse } from "next/server"

// 标准中间件函数
export function middleware(request: NextRequest) {
  // 基础请求处理逻辑
  const response = NextResponse.next()
  
  // 生产环境启用CSP
  if (process.env.NODE_ENV === 'production') {
    // 增强CSP策略，支持CAD文件处理和数据可视化
    response.headers.set(
      "Content-Security-Policy", 
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' wss: https:; worker-src 'self' blob:; child-src 'self' blob:; object-src 'self' blob:; frame-src 'self'"
    )
  }
  
  // 添加安全相关的HTTP头
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  
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
  
  // 添加跨域资源共享(CORS)头，用于API路由
  if (pathname.startsWith('/api/')) {
    // 允许所有来源访问API - 实际生产环境中应该限制为特定域名
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    
    // 处理预检请求
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { 
        status: 200,
        headers: response.headers
      })
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
