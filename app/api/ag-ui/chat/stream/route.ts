/**
 * AG-UI聊天流API路由 - 提供SSE事件流支持
 * AG-UI Chat Stream API Route - Provides SSE event stream support
 *
 * 本文件创建一个SSE连接，用于接收和转发AG-UI事件
 * 调用关系: 被lib/ag-ui/core-adapter.ts的handleChatCompletion方法使用
 */

import { type NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const threadId = searchParams.get("threadId")
    const runId = searchParams.get("runId")

    if (!threadId || !runId) {
      return NextResponse.json({ error: "Missing required parameters: threadId, runId" }, { status: 400 })
    }

    // 创建响应流
    const stream = new TransformStream()
    const writer = stream.writable.getWriter()
    const encoder = new TextEncoder()

    // 将请求信息存储在全局事件映射中
    // 这里使用了一个简化的方法，实际生产环境可能需要使用Redis或其他存储
    if (!global.agUiEventStreams) {
      global.agUiEventStreams = new Map()
    }

    global.agUiEventStreams.set(`${threadId}:${runId}`, writer)

    // 设置清理函数
    const cleanup = () => {
      if (global.agUiEventStreams) {
        global.agUiEventStreams.delete(`${threadId}:${runId}`)
      }
    }

    // 30秒后自动关闭连接（如果没有活动）
    const timeoutId = setTimeout(async () => {
      try {
        await writer.write(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "CUSTOM",
              name: "connection_timeout",
              value: { message: "Connection timed out due to inactivity" },
              timestamp: Date.now(),
            })}\n\n`,
          ),
        )
        await writer.close()
        cleanup()
      } catch (error) {
        console.error("Error closing stream on timeout:", error)
      }
    }, 30000)

    // 当客户端断开连接时清理资源
    req.signal.addEventListener("abort", async () => {
      clearTimeout(timeoutId)
      try {
        await writer.close()
      } catch (error) {
        console.error("Error closing stream on abort:", error)
      }
      cleanup()
    })

    // 返回SSE响应
    return new NextResponse(stream.readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  } catch (error: any) {
    console.error("Error in AG-UI chat stream route:", error)
    return NextResponse.json({ error: error.message || "Internal server error", success: false }, { status: 500 })
  }
}
