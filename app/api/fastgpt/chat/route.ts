import { type NextRequest, NextResponse } from "next/server"

import { getEnhancedFastGPTClient } from "@/lib/api/enhanced-fastgpt-client"
import { RequestPriority } from "@/lib/api/fastgpt-optimizer"
import { getCacheManager } from "@/lib/cache/cache-manager"

// 创建缓存管理器
const cacheManager = getCacheManager()

export async function POST(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") || crypto.randomUUID()

  try {
    const body = await request.json()
    const { messages, stream, detail, chatId, responseChatItemId, variables, baseUrl, useProxy } = body

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

    // 准备请求参数
    const chatParams = {
      model: body.model || "gpt-3.5-turbo",
      messages,
      stream: stream || false,
      detail: detail || false,
      ...(chatId && { chatId }),
      ...(responseChatItemId && { responseChatItemId }),
      ...(variables && { variables }),
      priority: RequestPriority.HIGH, // 设置高优先级
    }

    // 生成缓存键（仅用于非流式请求）
    const cacheKey = !stream
      ? `chat:${chatParams.model}:${JSON.stringify(messages)}:${detail ? 1 : 0}:${JSON.stringify(variables || {})}`
      : undefined

    // 检查缓存
    if (cacheKey) {
      const cachedResponse = await cacheManager.get(cacheKey)
      if (cachedResponse) {
        return NextResponse.json(cachedResponse, {
          headers: {
            "X-Cache": "HIT",
            "X-Request-ID": requestId,
          },
        })
      }
    }

    // 发送请求
    const response = await client.chat(chatParams)

    // 处理流式响应
    if (stream) {
      // 返回流
      return new Response(response as ReadableStream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "X-Request-ID": requestId,
        },
      })
    }

    // 处理非流式响应
    // 缓存响应
    if (cacheKey) {
      cacheManager.set(cacheKey, response, {
        ttl: 5 * 60 * 1000, // 5分钟
        tags: ["chat", chatParams.model],
      })
    }

    return NextResponse.json(response, {
      headers: {
        "X-Cache": "MISS",
        "X-Request-ID": requestId,
      },
    })
  } catch (error) {
    console.error("Error in FastGPT chat API route:", error)
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
