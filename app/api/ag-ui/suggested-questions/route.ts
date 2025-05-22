/**
 * AG-UI建议问题API路由 - 获取智能体建议的后续问题
 * AG-UI Suggested Questions API Route - Gets suggested follow-up questions from agent
 *
 * 本文件处理AG-UI建议问题请求，返回智能体建议的后续问题
 * 调用关系: 被lib/ag-ui/core-adapter.ts的fetchSuggestedQuestions方法调用
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

    // 调用FastGPT API获取建议问题
    const response = await fetch(`${apiUrl}/suggested-questions`, {
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
      return NextResponse.json(
        { error: `Failed to fetch suggested questions: ${errorText}` },
        { status: response.status },
      )
    }

    const data = await response.json()

    // 返回建议问题
    return NextResponse.json({
      success: true,
      questions: data.questions || [],
    })
  } catch (error: any) {
    console.error("Error in AG-UI suggested-questions route:", error)
    return NextResponse.json({ error: error.message || "Internal server error", success: false }, { status: 500 })
  }
}
