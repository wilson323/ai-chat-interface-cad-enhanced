import { type NextRequest, NextResponse } from "next/server"
import { Redis } from "@upstash/redis"

// 创建Redis客户端
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
})

// 同步项类型
interface SyncItem {
  id: string
  type: string
  data: any
  timestamp: number
}

// 同步处理器映射
const syncHandlers: Record<string, (data: any) => Promise<any>> = {
  // 对话同步处理器
  conversation: async (data) => {
    try {
      // 保存对话到Redis
      const key = `conversation:${data.id}`
      await redis.set(key, JSON.stringify(data))

      // 设置过期时间（30天）
      await redis.expire(key, 60 * 60 * 24 * 30)

      return { success: true, id: data.id }
    } catch (error) {
      console.error("Error syncing conversation:", error)
      throw error
    }
  },

  // 消息同步处理器
  message: async (data) => {
    try {
      // 保存消息到Redis
      const key = `message:${data.id}`
      await redis.set(key, JSON.stringify(data))

      // 添加到对话消息列表
      if (data.conversationId) {
        await redis.sadd(`conversation:${data.conversationId}:messages`, data.id)
      }

      return { success: true, id: data.id }
    } catch (error) {
      console.error("Error syncing message:", error)
      throw error
    }
  },

  // 反馈同步处理器
  feedback: async (data) => {
    try {
      // 保存反馈到Redis
      const key = `feedback:${data.messageId}`
      await redis.set(key, JSON.stringify(data))

      return { success: true, id: data.messageId }
    } catch (error) {
      console.error("Error syncing feedback:", error)
      throw error
    }
  },

  // CAD分析结果同步处理器
  "cad-analysis": async (data) => {
    try {
      // 保存CAD分析结果到Redis
      const key = `cad-analysis:${data.id}`
      await redis.set(key, JSON.stringify(data))

      return { success: true, id: data.id }
    } catch (error) {
      console.error("Error syncing CAD analysis:", error)
      throw error
    }
  },
}

export async function POST(req: NextRequest) {
  try {
    // 验证请求
    const authHeader = req.headers.get("authorization")
    if (
      process.env.API_KEY &&
      (!authHeader || !authHeader.startsWith("Bearer ") || authHeader.slice(7) !== process.env.API_KEY)
    ) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { items } = body as { items: SyncItem[] }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 })
    }

    // 使用管道批量处理
    const pipeline = redis.pipeline()
    const results = []

    // 处理每个同步项
    for (const item of items) {
      try {
        const { type, data } = item

        // 检查是否有对应的处理器
        if (!syncHandlers[type]) {
          results.push({ id: item.id, success: false, error: `Unknown sync type: ${type}` })
          continue
        }

        // 调用处理器
        const result = await syncHandlers[type](data)
        results.push({ id: item.id, success: true, ...result })
      } catch (error) {
        console.error(`Error processing sync item ${item.id}:`, error)
        results.push({ id: item.id, success: false, error: "Processing error" })
      }
    }

    // 执行管道
    await pipeline.exec()

    return NextResponse.json({
      success: true,
      results,
      timestamp: Date.now(),
    })
  } catch (error) {
    console.error("Sync API error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 },
    )
  }
}
