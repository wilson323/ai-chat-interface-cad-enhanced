import { type NextRequest, NextResponse } from "next/server"
import { getEnhancedFastGPTClient } from "@/lib/api/fastgpt-enhanced"
import { RequestPriority } from "@/lib/api/fastgpt-optimizer"
import { getCacheManager } from "@/lib/cache/cache-manager"

// 创建缓存管理器
const cacheManager = getCacheManager()

export async function POST(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") || crypto.randomUUID()

  try {
    const body = await request.json()
    const { model, agent_id, knowledge_id, user, baseUrl, useProxy } = body

    // 使用服务器端环境变量获取API密钥
    const apiKey = process.env.FASTGPT_API_KEY

    // 使用服务器端或提供的API URL
    const apiUrl = process.env.FASTGPT_API_URL || baseUrl || "https://zktecoaihub.com"

    // 创建增强型FastGPT客户端
    const client = getEnhancedFastGPTClient({
      apiKey,
      baseUrl: apiUrl,
      useProxy: useProxy === undefined ? true : useProxy,
      debug: process.env.NODE_ENV === "development",
    })

    // 生成缓存键
    const cacheKey = `init-chat:${agent_id || ""}:${model || ""}:${knowledge_id || ""}:${user || ""}`

    // 检查缓存
    const cachedResponse = await cacheManager.get(cacheKey)
    if (cachedResponse) {
      return NextResponse.json(cachedResponse, {
        headers: {
          "X-Cache": "HIT",
          "X-Request-ID": requestId,
        },
      })
    }

    // 准备请求参数
    const initParams = {
      ...(model && { model }),
      ...(agent_id && { agent_id }),
      ...(knowledge_id && { knowledge_id }),
      ...(user && { user }),
      priority: RequestPriority.HIGH, // 设置高优先级
    }

    // 发送请求
    const response = await client.initChat(initParams)

    // 缓存响应
    cacheManager.set(cacheKey, response, {
      ttl: 5 * 60 * 1000, // 5分钟
      tags: ["init-chat", agent_id || "default"],
    })

    return NextResponse.json(response, {
      headers: {
        "X-Cache": "MISS",
        "X-Request-ID": requestId,
      },
    })
  } catch (error) {
    console.error("Error in FastGPT init chat API route:", error)
    return NextResponse.json(
      { error: { message: error instanceof Error ? error.message : "Unknown error" } },
      {
        status: 500,
        headers: {
          "X-Request-ID": requestId,
        },
      },
    )
  }
}
