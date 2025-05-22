import { type NextRequest, NextResponse } from "next/server"

/**
 * 通用代理API路由
 * 用于转发请求到FastGPT API或其他服务
 */
export async function POST(req: NextRequest) {
  try {
    // 获取请求路径
    const url = new URL(req.url)
    const path = url.pathname.replace("/api/proxy", "")

    // 获取环境变量
    const apiUrl = process.env.FASTGPT_API_URL
    const apiKey = process.env.FASTGPT_API_KEY

    if (!apiUrl || !apiKey) {
      return NextResponse.json({ error: "API configuration missing" }, { status: 500 })
    }

    // Get the request body
    const body = await req.json().catch(() => ({}))

    // Construct the full URL
    const fullUrl = `${apiUrl}${path}`

    // Forward the request to the target URL
    const response = await fetch(fullUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    })

    // Return the response from the target URL
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    })
  } catch (error) {
    console.error("Error in proxy route:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get the URL from the query parameter
    const url = request.nextUrl.searchParams.get("url")

    if (!url) {
      return NextResponse.json({ error: "URL parameter is required" }, { status: 400 })
    }

    // Construct the full URL
    const fullUrl = url.startsWith("http") ? url : `https://${url}`

    // Forward the request to the target URL
    const response = await fetch(fullUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: request.headers.get("Authorization") || "",
      },
    })

    // Return the response from the target URL
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    })
  } catch (error) {
    console.error("Error in proxy route:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
