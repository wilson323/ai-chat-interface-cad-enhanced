/**
 * AG-UI反馈API路由 - 提交消息反馈（点赞/点踩）
 * AG-UI Feedback API Route - Submits message feedback (like/dislike)
 *
 * 本文件处理AG-UI消息反馈请求，将反馈提交到FastGPT
 * 调用关系: 被lib/ag-ui/core-adapter.ts的submitFeedback方法调用
 */

import { type NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { appId, chatId, messageId, feedback, comment } = body

    if (!appId || !chatId || !messageId || !feedback) {
      return NextResponse.json(
        { error: "Missing required parameters: appId, chatId, messageId, feedback" },
        { status: 400 },
      )
    }

    if (feedback !== "like" && feedback !== "dislike") {
      return NextResponse.json({ error: "Invalid feedback value. Must be 'like' or 'dislike'" }, { status: 400 })
    }

    // 获取环境变量
    const apiUrl = process.env.FASTGPT_API_URL || "/api/proxy/fastgpt"
    const apiKey = process.env.FASTGPT_API_KEY

    if (!apiKey) {
      return NextResponse.json({ error: "FastGPT API configuration missing" }, { status: 500 })
    }

    // 调用FastGPT API提交反馈
    const response = await fetch(`${apiUrl}/feedback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        appId,
        chatId,
        messageId,
        feedback,
        comment,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json({ error: `Failed to submit feedback: ${errorText}` }, { status: response.status })
    }

    // 返回成功结果
    return NextResponse.json({
      success: true,
      message: `Feedback '${feedback}' submitted successfully`,
    })
  } catch (error: any) {
    console.error("Error in AG-UI feedback route:", error)
    return NextResponse.json({ error: error.message || "Internal server error", success: false }, { status: 500 })
  }
}
