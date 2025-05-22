/**
 * AG-UI聊天历史API路由 - 获取聊天历史记录
 * AG-UI Chat History API Route - Retrieves chat history
 *
 * 本文件处理AG-UI聊天历史请求，返回指定会话的历史消息
 * 调用关系: 被lib/ag-ui/core-adapter.ts的fetchChatHistory方法调用
 */

import { type NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const appId = searchParams.get("appId")
    const chatId = searchParams.get("chatId")

    if (!appId || !chatId) {
      return NextResponse.json({ error: "Missing required parameters: appId, chatId" }, { status: 400 })
    }

    // 获取环境变量
    const apiUrl = process.env.FASTGPT_API_URL || "/api/proxy/fastgpt"
    const apiKey = process.env.FASTGPT_API_KEY

    if (!apiKey) {
      return NextResponse.json({ error: "FastGPT API configuration missing" }, { status: 500 })
    }

    // 调用FastGPT API获取聊天历史
    const response = await fetch(`${apiUrl}/chat-history`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        appId,
        chatId,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json({ error: `Failed to fetch chat history: ${errorText}` }, { status: response.status })
    }

    const data = await response.json()

    // 格式化消息
    const formattedMessages = (data.messages || []).map((msg: any) => ({
      id: msg.id || `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp || new Date().toISOString(),
    }))

    // 返回历史记录
    return NextResponse.json({
      success: true,
      messages: formattedMessages,
      chatId,
    })
  } catch (error: any) {
    console.error("Error in AG-UI history route:", error)
    return NextResponse.json({ error: error.message || "Internal server error", success: false }, { status: 500 })
  }
}
