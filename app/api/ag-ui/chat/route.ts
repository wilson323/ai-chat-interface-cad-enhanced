import { type NextRequest, NextResponse } from "next/server"
import { rateLimiter } from '@/lib/rate-limiter'
import { z } from 'zod'
import { createOptimizedStreamWriter, globalStreamMonitor } from '@/lib/ag-ui/stream-optimizer'
import { KnownProviders } from '@/lib/api/ai-provider-adapter'
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
    const identifier = req.headers.get('x-real-ip') || 'anonymous'
    const { success } = await rateLimiter.limit(identifier)
    if (!success) return new Response('Too many requests', { status: 429 })

    const body = await req.json()
    const schema = z.object({
      appId: z.string().min(1),
      chatId: z.string().optional(),
      messages: z.array(z.object({ role: z.enum(["user", "assistant", "system"]), content: z.string().max(10000) })).min(1),
      tools: z.array(z.any()).optional(),
      context: z.any().optional(),
      variables: z.record(z.string()).optional(),
      systemPrompt: z.string().optional(),
      provider: z.enum(["dashscope","deepseek","moonshot","zhipu"]).optional(),
      baseUrl: z.string().url().optional(),
      apiKey: z.string().optional(),
      model: z.string().optional(),
      streamConfig: z.object({ bufferSize: z.number().optional(), chunkDelay: z.number().optional(), typewriterSpeed: z.number().optional(), batchSize: z.number().optional(), }).optional()
    })
    const validationResult = schema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid request body', issues: validationResult.error.flatten() }, { status: 400 })
    }
    const { appId, chatId, messages, variables, systemPrompt, streamConfig, provider, baseUrl, apiKey: extKey, model } = validationResult.data

    // 构建基于当前请求的绝对路径，避免 Node 端相对 URL 解析失败
    const origin = req.nextUrl.origin
    const targetUrl = `${origin}/api/fastgpt/api/v1/chat/completions`
    const apiKey = process.env.FASTGPT_API_KEY
    const useExternal = !!provider
    if (!useExternal && !apiKey) return NextResponse.json({ error: "FastGPT API configuration missing" }, { status: 500 })

    // 构建 TransformStream（Node18 提供 Web Streams API 全局实现）
    const stream = new TransformStream()
    const writer = stream.writable.getWriter()

    const optimizer = createOptimizedStreamWriter(writer, {
      bufferSize: streamConfig?.bufferSize,
      chunkDelay: streamConfig?.chunkDelay,
      typewriterSpeed: streamConfig?.typewriterSpeed,
      batchSize: streamConfig?.batchSize,
    })

    const threadId = `thread-${Date.now()}`
    const runId = `run-${Date.now()}`
    const messageId = `msg-${Date.now()}`
    const sessionId = `session-${requestStartTime}`
    globalStreamMonitor.addOptimizer(sessionId, optimizer)

    await optimizer.writeEventDirect({ type: EventType.RUN_STARTED, threadId, runId, timestamp: Date.now() })
    await optimizer.addEvent({ type: EventType.TEXT_MESSAGE_START, messageId, role: 'assistant', timestamp: Date.now() })

    let firstChunkTime: number | null = null

    // 控制中断与清理
    let aborted = false
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null
    const onAbort = async () => {
      aborted = true
      try {
        await reader?.cancel()
      } catch {}
      try {
        optimizer.destroy()
      } catch {}
      try {
        await writer.close()
      } catch {}
    }
    if (req.signal.aborted) {
      await onAbort()
      return new Response(stream.readable, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' } })
    }
    req.signal.addEventListener('abort', onAbort)

    // 调用上游
    const upstream = useExternal
      ? await (async () => {
          const adapter = (() => {
            switch (provider) {
              case 'dashscope': return KnownProviders.dashscope(extKey || process.env.EXTERNAL_AI_API_KEY || '', baseUrl)
              case 'deepseek': return KnownProviders.deepseek(extKey || process.env.EXTERNAL_AI_API_KEY || '', baseUrl)
              case 'moonshot': return KnownProviders.moonshot(extKey || process.env.EXTERNAL_AI_API_KEY || '', baseUrl)
              case 'zhipu': return KnownProviders.zhipu(extKey || process.env.EXTERNAL_AI_API_KEY || '', baseUrl)
              default: return KnownProviders.dashscope(extKey || process.env.EXTERNAL_AI_API_KEY || '', baseUrl)
            }
          })()
          return adapter.chat({
            model: model || appId,
            messages,
            stream: true,
            temperature: 0.7,
            max_tokens: 2048,
          })
        })()
      : await fetch(targetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
            'X-Request-Start': requestStartTime.toString(),
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
          signal: req.signal,
        })

    if (!upstream.ok || !upstream.body) {
      const errorText = await upstream.text().catch(() => upstream.statusText)
      const errorEvent: AgUIEvent = { type: EventType.RUN_ERROR, message: errorText || 'Upstream error', code: upstream.status || 500, timestamp: Date.now() }
      await optimizer.writeEventDirect(errorEvent)
      optimizer.destroy()
      await writer.close()
      return new Response(stream.readable, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' } })
    }

    // 解析上游 SSE
    const decoder = new TextDecoder()
    reader = (upstream.body as any).getReader()
    if (!reader) {
      throw new Error('ReadableStream reader unavailable')
    }
    let buffer = ''

    ;(async () => {
      try {
        while (true) {
          if (aborted) break
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream: true })
          buffer += chunk

          // SSE 按行解析
          const lines = buffer.split(/\n/)
          buffer = lines.pop() || ''
          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed) continue
            if (trimmed.startsWith('data: ')) {
              const dataStr = trimmed.slice(6)
              if (dataStr === '[DONE]') continue
              try {
                if (!firstChunkTime) {
                  firstChunkTime = Date.now()
                  console.log(`First chunk latency: ${firstChunkTime - requestStartTime}ms`)
                }
                const data = JSON.parse(dataStr)

                if (data.choices && data.choices[0]?.delta) {
                  const delta = data.choices[0].delta
                  if (delta.content) {
                    await optimizer.addEvent({ type: EventType.TEXT_MESSAGE_CONTENT, messageId, delta: delta.content, timestamp: Date.now() })
                  }
                  if (delta.tool_calls && delta.tool_calls.length > 0) {
                    const toolCall = delta.tool_calls[0]
                    const toolCallId = `tool-${toolCall.index}-${runId}`
                    if (toolCall.function?.name) {
                      await optimizer.addEvent({ type: EventType.TOOL_CALL_START, toolCallId, toolCallName: toolCall.function.name, parentMessageId: messageId, timestamp: Date.now() })
                    }
                    if (toolCall.function?.arguments) {
                      await optimizer.addEvent({ type: EventType.TOOL_CALL_ARGS, toolCallId, delta: toolCall.function.arguments, timestamp: Date.now() })
                    }
                    await optimizer.addEvent({ type: EventType.TOOL_CALL_END, toolCallId, timestamp: Date.now() })
                  }
                }

                if (data.event) {
                  if (data.event === 'flowNodeStatus') {
                    await optimizer.addEvent({ type: 'STEP_STARTED', stepName: data.data?.name || 'unknown', timestamp: Date.now() } as any)
                  } else if (data.event === 'interactive') {
                    await optimizer.addEvent({ type: EventType.CUSTOM, name: 'interactive', value: data.data, timestamp: Date.now() })
                  }
                }

                await optimizer.addEvent({ type: 'RAW', event: data, source: 'fastgpt', timestamp: Date.now() } as any)
              } catch (e) {
                await optimizer.addEvent({ type: EventType.RUN_ERROR, message: (e as Error).message, code: 500, timestamp: Date.now() })
              }
            }
          }
        }
      } catch (err: any) {
        // 对于中断错误不视为异常
        const message = (typeof err?.name === 'string' && err.name === 'AbortError') ? 'aborted' : (err as Error).message || 'stream error'
        if (!aborted && message !== 'aborted') {
          await optimizer.writeEventDirect({ type: EventType.RUN_ERROR, message, code: 500, timestamp: Date.now() })
        }
      } finally {
        try {
          if (!aborted) {
            await optimizer.flush()
            await optimizer.writeEventDirect({ type: EventType.TEXT_MESSAGE_END, messageId, timestamp: Date.now() })
            await optimizer.writeEventDirect({ type: EventType.RUN_FINISHED, threadId, runId, timestamp: Date.now() })
          }
          optimizer.destroy()
          await writer.close()
        } catch {}
      }
    })()

    return new Response(stream.readable, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' } })
  } catch (error) {
    console.error("AG-UI chat route error:", error)
    return NextResponse.json({ error: (error as Error).message || 'Unknown error' }, { status: 500 })
  }
}
