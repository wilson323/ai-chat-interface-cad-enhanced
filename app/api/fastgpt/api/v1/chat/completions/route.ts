import { type NextRequest, NextResponse } from "next/server"

const FASTGPT_API_URL = process.env.FASTGPT_API_URL || "https://zktecoaihub.com"
const FASTGPT_API_KEY = process.env.FASTGPT_API_KEY || ""

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const response = await fetch(`${FASTGPT_API_URL}/api/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${FASTGPT_API_KEY}`,
      },
      body: JSON.stringify(body),
    })

    // For streaming responses, we need to return the response as is
    if (body.stream) {
      // Create a new readable stream
      const stream = new ReadableStream({
        async start(controller) {
          // Get the response body as a reader
          const reader = response.body?.getReader()
          if (!reader) {
            controller.close()
            return
          }

          try {
            while (true) {
              const { done, value } = await reader.read()
              if (done) {
                break
              }
              // Push the chunk to the new stream
              controller.enqueue(value)
            }
          } catch (error) {
            console.error("Error reading stream:", error)
          } finally {
            controller.close()
            reader.releaseLock()
          }
        },
      })

      // Return the stream with the appropriate headers
      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      })
    }

    // For non-streaming responses, return the JSON
    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error("Error in chat completions:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
