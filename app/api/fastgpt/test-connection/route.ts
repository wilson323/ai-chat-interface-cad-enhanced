import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { baseUrl, useProxy } = body

    const apiKey = process.env.FASTGPT_API_KEY || ""
    const apiUrl = (process.env.FASTGPT_API_URL || baseUrl || "https://zktecoaihub.com").replace(/\/$/, "")

    // 目标路径：/api/v1/models
    const modelsPath = "/api/v1/models"

    // 根据是否使用代理构造测试端点
    const endpoint = useProxy
      ? `/api/proxy?url=${encodeURIComponent(`${apiUrl.replace(/^https?:\/\//, "")}${modelsPath}`)}`
      : `${apiUrl}${modelsPath}`

    const headers: Record<string, string> = {}
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`

    // 请求 models 以测试连通性
    const response = await fetch(endpoint, {
      method: "GET",
      headers,
    })

    if (!response.ok) {
      // 回退到根路径探测
      const rootEndpoint = useProxy
        ? `/api/proxy?url=${encodeURIComponent(apiUrl.replace(/^https?:\/\//, ""))}`
        : apiUrl

      const rootResponse = await fetch(rootEndpoint, { method: "GET", headers })

      if (!rootResponse.ok) {
        const errorData = await rootResponse.json().catch(() => ({ error: { message: rootResponse.statusText } }))
        return NextResponse.json({
          success: false,
          error: errorData.error || { message: rootResponse.statusText },
          status: rootResponse.status,
        })
      }

      const rootData = await rootResponse.json().catch(() => ({}))
      return NextResponse.json({ success: true, data: rootData, useProxy })
    }

    const data = await response.json().catch(() => ({}))
    return NextResponse.json({ success: true, data, useProxy })
  } catch (error) {
    console.error("Error in FastGPT test connection API route:", error)
    return NextResponse.json({
      success: false,
      error: { message: error instanceof Error ? error.message : "Unknown error" },
      status: 500,
    })
  }
}
