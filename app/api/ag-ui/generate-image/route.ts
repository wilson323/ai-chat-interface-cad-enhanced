/**
 * AG-UI生成长图API路由 - 生成聊天记录长图
 * AG-UI Generate Image API Route - Generates a long image of chat history
 *
 * 本文件处理AG-UI生成长图请求，将聊天记录转换为图片
 * 调用关系: 被lib/ag-ui/core-adapter.ts的generateLongImage方法调用
 */

import { type NextRequest, NextResponse } from "next/server"
import { generateChatImage } from "@/lib/utils/image-generator"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { appId, chatId, includeWelcome = true } = body

    if (!appId || !chatId) {
      return NextResponse.json({ error: "Missing required parameters: appId, chatId" }, { status: 400 })
    }

    // 获取环境变量
    const apiUrl = process.env.FASTGPT_API_URL || "/api/proxy/fastgpt"
    const apiKey = process.env.FASTGPT_API_KEY

    if (!apiKey) {
      return NextResponse.json({ error: "FastGPT API configuration missing" }, { status: 500 })
    }

    // 获取聊天历史
    const historyResponse = await fetch(`${apiUrl}/chat-history`, {
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

    if (!historyResponse.ok) {
      const errorText = await historyResponse.text()
      return NextResponse.json(
        { error: `Failed to fetch chat history: ${errorText}` },
        { status: historyResponse.status },
      )
    }

    const historyData = await historyResponse.json()
    const messages = historyData.messages || []

    // 过滤消息（如果不包含欢迎消息）
    const filteredMessages = includeWelcome
      ? messages
      : messages.filter((msg: any) => msg.role !== "system" && !msg.isWelcome)

    // 生成图片
    const imageUrl = await generateChatImage({
      messages: filteredMessages,
      appName: historyData.appName || "AI Chat",
      darkMode: false,
    })

    // 返回图片URL
    return NextResponse.json({
      success: true,
      imageUrl,
    })
  } catch (error: any) {
    console.error("Error in AG-UI generate-image route:", error)
    return NextResponse.json({ error: error.message || "Internal server error", success: false }, { status: 500 })
  }
}
