import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { messages, targets } = await request.json()

    if (!Array.isArray(messages) || !Array.isArray(targets) || messages.length === 0 || targets.length === 0) {
      return NextResponse.json({ error: "缺少必要参数" }, { status: 400 })
    }

    // 调用FastGPT API批量转发
    const response = await fetch(`${process.env.FASTGPT_API_URL}/api/batch-forward`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.FASTGPT_API_KEY}`,
      },
      body: JSON.stringify({
        messages,
        targets,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || "批量转发失败")
    }

    const result = await response.json()
    return NextResponse.json(result)
  } catch (error) {
    console.error("批量转发错误:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "处理请求时发生未知错误" },
      { status: 500 },
    )
  }
}
