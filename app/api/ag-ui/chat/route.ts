import { type NextRequest, NextResponse } from "next/server"
import { fetchEventSource } from "@microsoft/fetch-event-source"
import { rateLimiter } from '@/lib/rate-limiter'
import { z } from 'zod'
import { createOptimizedStreamWriter, globalStreamMonitor } from '@/lib/ag-ui/stream-optimizer'
import type { AgUIEvent } from '@/lib/ag-ui/types'
import { EventType } from '@/lib/ag-ui/types'

/**
 * AG-UI聊天API路由 - 提供AG-UI协议支持，同时保持与后端代理的对接
 * AG-UI Chat API Route - Provides AG-UI protocol support while maintaining backend proxy integration
 *
 * 本文件处理AG-UI聊天请求，将其转换为FastGPT API请求，并将响应转换为AG-UI事件流
 * 调用关系: 被前端通过fetch调用，内部调用FastGPT API
 * 
 * 性能优化版本：集成了流式响应优化器，实现高性能事件流处理
 */
export async function POST(req: NextRequest) {
  const requestStartTime = Date.now()
  
  try {
    // 增加速率限制
    const identifier = req.headers.get('x-real-ip') || 'anonymous'
    const { success } = await rateLimiter.limit(identifier)
    
    if (!success) {
      return new Response('Too many requests', { status: 429 })
    }

    // 解析并验证输入
    const body = await req.json()
    
    const schema = z.object({
      appId: z.string().min(1),
      chatId: z.string().optional(),
      messages: z.array(z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string().max(10000)
      })).min(1),
      tools: z.array(z.any()).optional(),
      context: z.any().optional(),
      variables: z.record(z.string()).optional(),
      systemPrompt: z.string().optional(),
      // 流式优化配置
      streamConfig: z.object({
        bufferSize: z.number().optional(),
        chunkDelay: z.number().optional(),
        typewriterSpeed: z.number().optional(),
        batchSize: z.number().optional(),
      }).optional()
    })
    
    const validationResult = schema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', issues: validationResult.error.flatten() },
        { status: 400 }
      )
    }
    
    const { appId, chatId, messages, tools, context, variables, systemPrompt, streamConfig } = validationResult.data

    // 获取环境变量
    const apiUrl = process.env.FASTGPT_API_URL || "/api/proxy/fastgpt"
    const apiKey = process.env.FASTGPT_API_KEY

    if (!apiKey) {
      return NextResponse.json({ error: "FastGPT API configuration missing" }, { status: 500 })
    }

    // 创建优化的响应流
    const stream = new TransformStream()
    const writer = stream.writable.getWriter()
    
    // 创建流式优化器
    const optimizer = createOptimizedStreamWriter(writer, {
      // 根据配置或使用默认值
      bufferSize: streamConfig?.bufferSize,
      chunkDelay: streamConfig?.chunkDelay,
      typewriterSpeed: streamConfig?.typewriterSpeed,
      batchSize: streamConfig?.batchSize,
    })

    // 生成唯一ID
    const threadId = `thread-${Date.now()}`
    const runId = `run-${Date.now()}`
    const messageId = `msg-${Date.now()}`
    const sessionId = `session-${requestStartTime}`

    // 添加到性能监控
    globalStreamMonitor.addOptimizer(sessionId, optimizer)

    // 发送运行开始事件 - 使用直接写入确保立即发送
    const runStartedEvent: AgUIEvent = {
      type: EventType.RUN_STARTED,
      threadId,
      runId,
      timestamp: Date.now(),
    }
    await optimizer.writeEventDirect(runStartedEvent)

    // 发送消息开始事件
    const messageStartEvent: AgUIEvent = {
      type: EventType.TEXT_MESSAGE_START,
      messageId,
      role: "assistant",
      timestamp: Date.now(),
    }
    await optimizer.addEvent(messageStartEvent)

    // 首字时间追踪
    let firstChunkTime: number | null = null

    // 调用FastGPT API
    fetchEventSource(`${apiUrl}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        // 添加性能相关头部
        "X-Request-Start": requestStartTime.toString(),
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

          // 记录首字时间
          if (!firstChunkTime) {
            firstChunkTime = Date.now()
            console.log(`First chunk latency: ${firstChunkTime - requestStartTime}ms`)
          }

          const data = JSON.parse(event.data)

          // 转换为AG-UI事件并写入流
          if (data.choices && data.choices[0].delta) {
            const delta = data.choices[0].delta

            // 处理文本内容 - 使用优化器的打字机效果
            if (delta.content) {
              const contentEvent: AgUIEvent = {
                type: EventType.TEXT_MESSAGE_CONTENT,
                messageId,
                delta: delta.content,
                timestamp: Date.now(),
              }
              await optimizer.addEvent(contentEvent)
            }

            // 处理工具调用
            if (delta.tool_calls && delta.tool_calls.length > 0) {
              const toolCall = delta.tool_calls[0]
              const toolCallId = `tool-${toolCall.index}-${runId}`

              // 工具调用开始
              if (toolCall.function && toolCall.function.name) {
                const toolStartEvent: AgUIEvent = {
                  type: EventType.TOOL_CALL_START,
                  toolCallId,
                  toolCallName: toolCall.function.name,
                  parentMessageId: messageId,
                  timestamp: Date.now(),
                }
                await optimizer.addEvent(toolStartEvent)
              }

              // 工具调用参数
              if (toolCall.function && toolCall.function.arguments) {
                const toolArgsEvent: AgUIEvent = {
                  type: EventType.TOOL_CALL_ARGS,
                  toolCallId,
                  delta: toolCall.function.arguments,
                  timestamp: Date.now(),
                }
                await optimizer.addEvent(toolArgsEvent)
              }

              // 工具调用结束
              const toolEndEvent: AgUIEvent = {
                type: EventType.TOOL_CALL_END,
                toolCallId,
                timestamp: Date.now(),
              }
              await optimizer.addEvent(toolEndEvent)
            }
          }

          // 处理FastGPT特有的事件类型
          if (data.event) {
            switch (data.event) {
              case 'flowNodeStatus':
                const stepEvent: AgUIEvent = {
                  type: "STEP_STARTED",
                  stepName: data.data?.name || 'unknown',
                  timestamp: Date.now(),
                }
                await optimizer.addEvent(stepEvent)
                break
              
              case 'interactive':
                // 处理交互节点
                const interactiveEvent: AgUIEvent = {
                  type: EventType.CUSTOM,
                  name: "interactive",
                  value: data.data,
                  timestamp: Date.now(),
                }
                await optimizer.addEvent(interactiveEvent)
                break
            }
          }

          // 保持向后兼容 - 写入原始数据
          const rawEvent: AgUIEvent = {
            type: "RAW",
            event: data,
            source: "fastgpt",
            timestamp: Date.now(),
          }
          await optimizer.addEvent(rawEvent)

        } catch (error) {
          console.error("Error processing message:", error)
          const errorEvent: AgUIEvent = {
            type: EventType.RUN_ERROR,
            message: `Error processing message: ${error instanceof Error ? error.message : 'Unknown error'}`,
            code: 500,
            timestamp: Date.now(),
          }
          await optimizer.addEvent(errorEvent)
        }
      },
      async onclose() {
        try {
          // 刷新所有缓冲的事件
          await optimizer.flush()

          // 发送消息结束和运行结束事件
          const messageEndEvent: AgUIEvent = {
            type: EventType.TEXT_MESSAGE_END,
            messageId,
            timestamp: Date.now(),
          }
          await optimizer.writeEventDirect(messageEndEvent)

          const runFinishedEvent: AgUIEvent = {
            type: EventType.RUN_FINISHED,
            threadId,
            runId,
            timestamp: Date.now(),
          }
          await optimizer.writeEventDirect(runFinishedEvent)

          // 记录性能指标
          const totalTime = Date.now() - requestStartTime
          const firstChunkLatency = firstChunkTime ? firstChunkTime - requestStartTime : 0
          
          console.log(`Session ${sessionId} completed:`, {
            totalTime,
            firstChunkLatency,
            metrics: optimizer.getMetrics(),
          })

          // 清理资源
          optimizer.destroy()
          await writer.close()

        } catch (error) {
          console.error("Error in onclose:", error)
        }
      },
      onerror(error) {
        console.error("Error from FastGPT API:", error)
        const errorEvent: AgUIEvent = {
          type: EventType.RUN_ERROR,
          message: (error as any)?.message || "Unknown error from FastGPT API",
          code: 500,
          timestamp: Date.now(),
        }
        
        optimizer.writeEventDirect(errorEvent)
          .then(() => {
            optimizer.destroy()
            return writer.close()
          })
          .catch(console.error)
      },
    }).catch(async (error) => {
      console.error("Error fetching from FastGPT API:", error)
      const errorEvent: AgUIEvent = {
        type: EventType.RUN_ERROR,
        message: (error as any)?.message || "Failed to connect to FastGPT API",
        code: 500,
        timestamp: Date.now(),
      }
      
      try {
        await optimizer.writeEventDirect(errorEvent)
        optimizer.destroy()
        await writer.close()
      } catch (closeError) {
        console.error("Error closing stream:", closeError)
      }
    })

    // 返回优化的流式响应
    return new NextResponse(stream.readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no", // 禁用Nginx缓冲
        "X-Session-ID": sessionId,
        "X-Request-Start": requestStartTime.toString(),
      },
    })
  } catch (error: any) {
    console.error("Error in AG-UI chat route:", error)
    return NextResponse.json({ 
      error: error.message || "Internal server error",
      timestamp: Date.now(),
      requestId: `req-${Date.now()}`,
    }, { status: 500 })
  }
}
