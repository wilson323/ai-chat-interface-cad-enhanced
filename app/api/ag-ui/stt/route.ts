import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { KnownProviders } from '@/lib/api/ai-provider-adapter'
import { createOptimizedStreamWriter } from '@/lib/ag-ui/stream-optimizer'
import { EventType } from '@/lib/ag-ui/types'

const bodySchema = z.object({
  model: z.string().optional(),
  fileBase64: z.string().optional(),
  fileUrl: z.string().url().optional(),
  mimeType: z.string().optional(),
  provider: z.enum(['dashscope','deepseek','moonshot','zhipu']).optional(),
  baseUrl: z.string().url().optional(),
  apiKey: z.string().optional(),
}).refine((d) => !!d.fileBase64 || !!d.fileUrl, { message: 'fileBase64 or fileUrl required' })

export async function POST(req: NextRequest) {
  try {
    const json = await req.json()
    const parsed = bodySchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: 'invalid_request', issues: parsed.error.flatten() }, { status: 400 })
    }

    const { model, fileBase64, fileUrl, mimeType, provider, baseUrl, apiKey } = parsed.data

    const stream = new TransformStream()
    const writer = stream.writable.getWriter()
    const optimizer = createOptimizedStreamWriter(writer)
    const runId = `run-${Date.now()}`
    await optimizer.writeEventDirect({ type: EventType.RUN_STARTED, runId, timestamp: Date.now() } as any)

    const adapter = (() => {
      const key = apiKey || process.env.EXTERNAL_AI_API_KEY || ''
      switch (provider) {
        case 'deepseek': return KnownProviders.deepseek(key, baseUrl)
        case 'moonshot': return KnownProviders.moonshot(key, baseUrl)
        case 'zhipu': return KnownProviders.zhipu(key, baseUrl)
        default: return KnownProviders.dashscope(key, baseUrl)
      }
    })()

    const res = await adapter.transcribe({ model: model || 'qwen-asr-v1', fileBase64, fileUrl, mimeType })
    if (!res.ok) {
      const err = await res.text().catch(() => res.statusText)
      await optimizer.writeEventDirect({ type: EventType.RUN_ERROR, message: err, code: res.status, timestamp: Date.now() } as any)
      await writer.close()
      return new NextResponse(stream.readable, { headers: { 'Content-Type': 'text/event-stream' } })
    }

    const data = await res.json().catch(() => ({}))
    await optimizer.writeEventDirect({ type: EventType.CUSTOM, name: 'TRANSCRIPTION_RESULT', value: data, timestamp: Date.now() } as any)
    await optimizer.writeEventDirect({ type: EventType.RUN_FINISHED, runId, timestamp: Date.now() } as any)
    await writer.close()

    return new NextResponse(stream.readable, { headers: { 'Content-Type': 'text/event-stream' } })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'unknown_error' }, { status: 500 })
  }
}


