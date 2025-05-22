import { type NextRequest, NextResponse } from "next/server"
import { fetchEventSource } from "@microsoft/fetch-event-source"

/**
 * AG-UI聊天API路由 - 提供AG-UI协议支持，同时保持与后端代理的对接
 * AG-UI Chat API Route - Provides AG-UI protocol support while maintaining backend proxy integration
 *
 * 本文件处理AG-UI聊天请求，将其转换为FastGPT API请求，并将响应转换为AG-UI事件流
 * 调用关系: 被前端通过fetch调用，内部调用FastGPT API
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { appId, chatId, messages, tools, context, variables, systemPrompt } = body

    // 验证必要参数
    if (!appId || !messages) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    // 获取环境变量
    const apiUrl = process.env.FASTGPT_API_URL || "/api/proxy/fastgpt"
    const apiKey = process.env.FASTGPT_API_KEY

    if (!apiKey) {
      return NextResponse.json({ error: "FastGPT API configuration missing" }, { status: 500 })
    }

    // 创建响应流
    const stream = new TransformStream()
    const writer = stream.writable.getWriter()
    const encoder = new TextEncoder()

    // 生成唯一ID
    const threadId = `thread-${Date.now()}`
    const runId = `run-${Date.now()}`
    const messageId = `msg-${Date.now()}`

    // 发送运行开始事件
    await writer.write(
      encoder.encode(
        `data: ${JSON.stringify({
          type: "RUN_STARTED",
          threadId,
          runId,
          timestamp: Date.now(),
        })}\n\n`,
      ),
    )

    // 发送消息开始事件
    await writer.write(
      encoder.encode(
        `data: ${JSON.stringify({
          type: "TEXT_MESSAGE_START",
          messageId,
          role: "assistant",
          timestamp: Date.now(),
        })}\n\n`,
      ),
    )

    // 调用FastGPT API
    fetchEventSource(`${apiUrl}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        appId,
        chatId,
        messages,
        stream: true,
        detail: true,
        system: systemPrompt,
        variables,
      }),
      async onmessage(event) {
        try {
          if (event.data === "[DONE]") return

          const data = JSON.parse(event.data)

          // 转换为AG-UI事件并写入流
          if (data.choices && data.choices[0].delta) {
            const delta = data.choices[0].delta

            // 处理文本内容
            if (delta.content) {
              await writer.write(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "TEXT_MESSAGE_CONTENT",
                    messageId,
                    delta: delta.content,
                    timestamp: Date.now(),
                  })}\n\n`,
                ),
              )
            }

            // 处理工具调用
            if (delta.tool_calls && delta.tool_calls.length > 0) {
              const toolCall = delta.tool_calls[0]
              const toolCallId = `tool-${toolCall.index}-${runId}`

              // 工具调用开始
              if (toolCall.function && toolCall.function.name) {
                await writer.write(
                  encoder.encode(
                    `data: ${JSON.stringify({
                      type: "TOOL_CALL_START",
                      toolCallId,
                      toolCallName: toolCall.function.name,
                      parentMessageId: messageId,
                      timestamp: Date.now(),
                    })}\n\n`,
                  ),
                )
              }

              // 工具调用参数
              if (toolCall.function && toolCall.function.arguments) {
                await writer.write(
                  encoder.encode(
                    `data: ${JSON.stringify({
                      type: "TOOL_CALL_ARGS",
                      toolCallId,
                      delta: toolCall.function.arguments,
                      timestamp: Date.now(),
                    })}\n\n`,
                  ),
                )
              }

              // 工具调用结束
              await writer.write(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "TOOL_CALL_END",
                    toolCallId,
                    timestamp: Date.now(),
                  })}\n\n`,
                ),
              )
            }
          }

          // 同时写入原始数据，保持兼容性
          await writer.write(encoder.encode(`data: ${event.data}\n\n`))
        } catch (error) {
          console.error("Error processing message:", error)
        }
      },
      async onclose() {
        // 发送消息结束和运行结束事件
        await writer.write(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "TEXT_MESSAGE_END",
              messageId,
              timestamp: Date.now(),
            })}\n\n`,
          ),
        )

        await writer.write(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "RUN_FINISHED",
              threadId,
              runId,
              timestamp: Date.now(),
            })}\n\n`,
          ),
        )

        await writer.close()
      },
      onerror(error) {
        console.error("Error from FastGPT API:", error)
        writer
          .write(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "RUN_ERROR",
                message: error.message || "Unknown error",
                code: 500,
                timestamp: Date.now(),
              })}\n\n`,
            ),
          )
          .catch(console.error)
      },
    }).catch(async (error) => {
      console.error("Error fetching from FastGPT API:", error)
      await writer.write(
        encoder.encode(
          `data: ${JSON.stringify({
            type: "RUN_ERROR",
            message: error.message || "Failed to connect to FastGPT API",
            code: 500,
            timestamp: Date.now(),
          })}\n\n`,
        ),
      )
      await writer.close()
    })

    // 返回流式响应
    return new NextResponse(stream.readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  } catch (error: any) {
    console.error("Error in AG-UI chat route:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
