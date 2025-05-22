import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { messageId, rating, comment } = await request.json()

    if (!messageId || !rating) {
      return NextResponse.json({ error: "缺少必要参数" }, { status: 400 })
    }

    // 调用FastGPT API提交反馈
    const response = await fetch(`${process.env.FASTGPT_API_URL}/api/feedback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.FASTGPT_API_KEY}`,
      },
      body: JSON.stringify({
        messageId,
        rating,
        comment: comment || "",
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || "提交反馈失败")
    }

    const result = await response.json()
    return NextResponse.json(result)
  } catch (error) {
    console.error("提交反馈错误:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "处理请求时发生未知错误" },
      { status: 500 },
    )
  }
}
