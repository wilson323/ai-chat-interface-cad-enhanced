/**
 * AG-UI批量转发API路由 - 将消息批量转发到其他智能体
 * AG-UI Batch Forward API Route - Forwards messages to other agents in batch
 *
 * 本文件处理AG-UI批量转发请求，将选定消息转发到其他智能体
 * 调用关系: 被lib/ag-ui/core-adapter.ts的batchForward方法调用
 */

import { type NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { sourceAppId, sourceChatId, targetAppIds, messageIds } = body

    if (!sourceAppId || !sourceChatId || !targetAppIds || !messageIds) {
      return NextResponse.json(
        { error: "Missing required parameters: sourceAppId, sourceChatId, targetAppIds, messageIds" },
        { status: 400 },
      )
    }

    if (!Array.isArray(targetAppIds) || targetAppIds.length === 0) {
      return NextResponse.json({ error: "targetAppIds must be a non-empty array" }, { status: 400 })
    }

    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return NextResponse.json({ error: "messageIds must be a non-empty array" }, { status: 400 })
    }

    // 获取环境变量
    const apiUrl = process.env.FASTGPT_API_URL || "/api/proxy/fastgpt"
    const apiKey = process.env.FASTGPT_API_KEY

    if (!apiKey) {
      return NextResponse.json({ error: "FastGPT API configuration missing" }, { status: 500 })
    }

    // 调用FastGPT API批量转发
    const response = await fetch(`${apiUrl}/batch-forward`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        sourceAppId,
        sourceChatId,
        targetAppIds,
        messageIds,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json({ error: `Failed to batch forward: ${errorText}` }, { status: response.status })
    }

    const data = await response.json()

    // 返回转发结果
    return NextResponse.json({
      success: true,
      results: data.results || [],
      message: `Successfully forwarded ${messageIds.length} messages to ${targetAppIds.length} agents`,
    })
  } catch (error: any) {
    console.error("Error in AG-UI batch-forward route:", error)
    return NextResponse.json({ error: error.message || "Internal server error", success: false }, { status: 500 })
  }
}
