/**
 * 请求限流中间件 - 防止API过载
 * Rate Limiter Middleware - Prevents API overload
 */
import { type NextRequest, NextResponse } from "next/server"
import { Redis } from "@upstash/redis"
import { Ratelimit } from "@upstash/ratelimit"

// 限流配置
export interface RateLimitConfig {
  // 限流标识符提取函数
  identifierFn: (req: NextRequest) => string
  // 限流规则
  rules: {
    // 路径匹配模式（正则表达式）
    pathPattern: RegExp
    // 限流窗口（秒）
    window: number
    // 窗口内允许的最大请求数
    limit: number
    // 阻塞时间（秒）
    blockDuration?: number
  }[]
  // 是否启用
  enabled: boolean
  // 是否记录日志
  debug: boolean
}

// 默认配置
const DEFAULT_CONFIG: RateLimitConfig = {
  identifierFn: (req) => {
    // 默认使用IP地址作为标识符
    const ipHeader = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip")
    const ip = (ipHeader?.split(",")[0]?.trim()) || "127.0.0.1"
    return ip
  },
  rules: [
    // FastGPT API请求限流
    {
      pathPattern: /^\/api\/fastgpt\/.*/,
      window: 60, // 1分钟
      limit: 60, // 60个请求
    },
    // AG-UI API请求限流
    {
      pathPattern: /^\/api\/ag-ui\/.*/,
      window: 60, // 1分钟
      limit: 120, // 120个请求
    },
    // 其他API请求限流
    {
      pathPattern: /^\/api\/.*/,
      window: 60, // 1分钟
      limit: 200, // 200个请求
    },
  ],
  enabled: true,
  debug: false,
}

// 限流器缓存
const limiters: Record<string, Ratelimit> = {}

// Redis客户端
let redis: Redis | null = null

/**
 * 初始化Redis客户端
 * @returns Redis客户端
 */
function getRedisClient(): Redis {
  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL || "",
      token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
    })
  }
  return redis
}

/**
 * 获取限流器
 * @param rule 限流规则
 * @returns 限流器
 */
function getRateLimiter(rule: RateLimitConfig["rules"][0]): Ratelimit {
  // 创建限流器键
  const key = `ratelimit:${rule.pathPattern.toString()}:${rule.window}:${rule.limit}`

  // 如果限流器已存在，直接返回
  if (limiters[key]) {
    return limiters[key]
  }

  // 创建新的限流器
  const limiter = new Ratelimit({
    redis: getRedisClient(),
    limiter: Ratelimit.slidingWindow(rule.limit, `${rule.window} s`),
    analytics: true,
    prefix: "ratelimit",
    // blockDuration 字段不在 RegionRatelimitConfig 中，移除或由实现内部处理
  })

  // 缓存限流器
  limiters[key] = limiter

  return limiter
}

/**
 * 请求限流中间件
 * @param req 请求
 * @param config 配置
 * @returns 响应或undefined
 */
export async function rateLimiterMiddleware(
  req: NextRequest,
  config: Partial<RateLimitConfig> = {},
): Promise<NextResponse | undefined> {
  // 合并配置
  const effectiveConfig: RateLimitConfig = {
    ...DEFAULT_CONFIG,
    ...config,
    rules: [...(DEFAULT_CONFIG.rules || []), ...(config.rules || [])],
  }

  // 如果未启用，直接返回
  if (!effectiveConfig.enabled) {
    return undefined
  }

  // 检查是否有Redis配置
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    if (effectiveConfig.debug) {
      console.warn("Rate limiter disabled: Missing Redis configuration")
    }
    return undefined
  }

  // 获取请求路径
  const path = req.nextUrl.pathname

  // 查找匹配的规则
  const matchingRule = effectiveConfig.rules.find((rule) => rule.pathPattern.test(path))

  // 如果没有匹配的规则，直接返回
  if (!matchingRule) {
    return undefined
  }

  try {
    // 获取标识符
    const identifier = effectiveConfig.identifierFn(req)

    // 获取限流器
    const limiter = getRateLimiter(matchingRule)

    // 检查限流
    const { success, limit, remaining, reset } = await limiter.limit(`${path}:${identifier}`)

    // 设置限流头
    const headers = new Headers()
    headers.set("X-RateLimit-Limit", limit.toString())
    headers.set("X-RateLimit-Remaining", remaining.toString())
    headers.set("X-RateLimit-Reset", reset.toString())

    // 如果被限流，返回429响应
    if (!success) {
      if (effectiveConfig.debug) {
        console.log(`Rate limited: ${identifier} for ${path}`)
      }

      return NextResponse.json(
        {
          error: {
            message: "Too many requests, please try again later.",
            code: "rate_limit_exceeded",
          },
        },
        {
          status: 429,
          headers,
        },
      )
    }

    // 请求未被限流，添加头部
    return NextResponse.next({
      headers,
    })
  } catch (error) {
    console.error("Error in rate limiter middleware:", error)
    // 出错时不阻止请求
    return undefined
  }
}
