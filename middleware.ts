import type { NextRequest, NextResponse } from "next/server"
import { highAvailabilityMiddleware } from "./middleware/high-availability"

// 定义CSP策略
const cspPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://www.googletagmanager.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data:;
  font-src 'self';
  connect-src 'self' https://www.google-analytics.com;
  frame-ancestors 'none';
  form-action 'self';
  base-uri 'self';
`.replace(/\s+/g, ' ').trim();

export async function middleware(req: NextRequest): Promise<NextResponse> {
  const securityHeaders = [
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Content-Security-Policy', value: cspPolicy },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' }
  ]

  const response = await highAvailabilityMiddleware(req, {
    debug: process.env.NODE_ENV === "development",
  })

  securityHeaders.forEach(({ key, value }) => {
    response.headers.set(key, value)
  })
  
  return response
}

export const config = {
  matcher: [
    /*
     * 匹配所有路径，除了：
     * - API路由（/api/*)
     * - 静态文件（/_next/static/*, /favicon.ico, /robots.txt, /sitemap.xml）
     */
    "/((?!_next/static|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
}
