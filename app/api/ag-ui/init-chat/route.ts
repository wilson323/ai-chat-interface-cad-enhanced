/**
 * AG-UI初始化聊天API路由 - 初始化聊天会话并返回必要信息
 * AG-UI Initialize Chat API Route - Initializes chat session and returns necessary information
 *
 * 本文件处理AG-UI聊天初始化请求，创建新会话或加载现有会话
 * 调用关系: 被lib/ag-ui/core-adapter.ts的initializeSession方法调用
 */

import { type NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { appId, chatId, threadId } = body

    if (!appId) {
      return NextResponse.json({ error: "Missing required parameter: appId" }, { status: 400 })
    }

    // 获取环境变量
    const apiUrl = process.env.FASTGPT_API_URL || "/api/proxy/fastgpt"
    const apiKey = process.env.FASTGPT_API_KEY

    if (!apiKey) {
      return NextResponse.json({ error: "FastGPT API configuration missing" }, { status: 500 })
    }

    // 调用FastGPT API初始化聊天
    const response = await fetch(`${apiUrl}/init-chat`, {
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
      return NextResponse.json({ error: `Failed to initialize chat: ${errorText}` }, { status: response.status })
    }

    const data = await response.json()

    // 返回初始化结果
    return NextResponse.json({
      success: true,
      chatId: data.chatId || chatId,
      welcomeMessage: data.welcomeMessage || "",
      systemPrompt: data.systemPrompt || "",
      variables: data.variables || {},
      suggestedQuestions: data.suggestedQuestions || [],
      threadId,
    })
  } catch (error: any) {
    console.error("Error in AG-UI init-chat route:", error)
    return NextResponse.json({ error: error.message || "Internal server error", success: false }, { status: 500 })
  }
}
