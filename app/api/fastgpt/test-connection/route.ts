import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { baseUrl, useProxy } = body

    // Use server-side environment variable for API key
    const apiKey = process.env.FASTGPT_API_KEY

    // Use server-side or provided API URL
    const apiUrl = process.env.FASTGPT_API_URL || baseUrl || "https://zktecoaihub.com"

    // Determine the actual API endpoint for testing
    const endpoint = useProxy
      ? `/api/proxy?url=${encodeURIComponent(apiUrl.replace(/^https?:\/\//, ""))}/api/v1/models`
      : `${apiUrl}/api/v1/models`

    // Make the request to test the connection
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    })

    if (!response.ok) {
      // Try with root endpoint if models endpoint fails
      const rootEndpoint = useProxy
        ? `/api/proxy?url=${encodeURIComponent(apiUrl.replace(/^https?:\/\//, ""))}`
        : apiUrl

      const rootResponse = await fetch(rootEndpoint, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      })

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

    const data = await response.json()
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
