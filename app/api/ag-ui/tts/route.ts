import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { KnownProviders } from '@/lib/api/ai-provider-adapter'
import { createOptimizedStreamWriter } from '@/lib/ag-ui/stream-optimizer'
import { EventType } from '@/lib/ag-ui/types'

const bodySchema = z.object({
  text: z.string().min(1),
  model: z.string().optional(),
  voice: z.string().optional(),
  format: z.enum(['mp3','wav','ogg']).optional(),
  provider: z.enum(['dashscope','deepseek','moonshot','zhipu']).optional(),
  baseUrl: z.string().url().optional(),
  apiKey: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const json = await req.json()
    const parsed = bodySchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: 'invalid_request', issues: parsed.error.flatten() }, { status: 400 })
    }

    const { text, model, voice, format, provider, baseUrl, apiKey } = parsed.data

    // AG-UI 事件流（可选）：先发送 RUN_STARTED
    const stream = new TransformStream()
    const writer = stream.writable.getWriter()
    const optimizer = createOptimizedStreamWriter(writer)
    const runId = `run-${Date.now()}`
    await optimizer.writeEventDirect({ type: EventType.RUN_STARTED, runId, timestamp: Date.now() } as any)

    // 选择适配器（默认 dashscope），按需可扩展
    const adapter = (() => {
      const key = apiKey || process.env.EXTERNAL_AI_API_KEY || ''
      switch (provider) {
        case 'deepseek': return KnownProviders.deepseek(key, baseUrl)
        case 'moonshot': return KnownProviders.moonshot(key, baseUrl)
        case 'zhipu': return KnownProviders.zhipu(key, baseUrl)
        default: return KnownProviders.dashscope(key, baseUrl)
      }
    })()

    const res = await adapter.speech({ model: model || 'qwen-tts-v1', input: text, voice, format })
    if (!res.ok) {
      const err = await res.text().catch(() => res.statusText)
      await optimizer.writeEventDirect({ type: EventType.RUN_ERROR, message: err, code: res.status, timestamp: Date.now() } as any)
      await writer.close()
      return new NextResponse(stream.readable, { headers: { 'Content-Type': 'text/event-stream' } })
    }

    const contentType = res.headers.get('Content-Type') || 'audio/mpeg'
    const arrayBuf = await res.arrayBuffer()
    const base64 = Buffer.from(arrayBuf).toString('base64')
    const dataUrl = `data:${contentType};base64,${base64}`

    await optimizer.writeEventDirect({ type: EventType.CUSTOM, name: 'AUDIO_RESULT', value: { dataUrl, contentType }, timestamp: Date.now() } as any)
    await optimizer.writeEventDirect({ type: EventType.RUN_FINISHED, runId, timestamp: Date.now() } as any)
    await writer.close()

    return new NextResponse(stream.readable, { headers: { 'Content-Type': 'text/event-stream' } })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'unknown_error' }, { status: 500 })
  }
}


