import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { KnownProviders, OpenAICompatibleAdapter } from '@/lib/api/ai-provider-adapter'

const bodySchema = z.object({
  provider: z.enum(['dashscope', 'deepseek', 'moonshot', 'zhipu']).default('dashscope'),
  baseUrl: z.string().url().optional(),
  apiKey: z.string().min(1).optional(),
  model: z.string().min(1).default('qwen-asr-v1'),
  fileBase64: z.string().optional(),
  fileUrl: z.string().url().optional(),
  mimeType: z.string().optional(),
}).refine((d) => !!d.fileBase64 || !!d.fileUrl, { message: 'fileBase64 or fileUrl required' })

function getAdapter(p: string, apiKey: string | undefined, baseUrl?: string): OpenAICompatibleAdapter {
  const key = apiKey || process.env.EXTERNAL_AI_API_KEY || ''
  switch (p) {
    case 'deepseek': return KnownProviders.deepseek(key, baseUrl)
    case 'moonshot': return KnownProviders.moonshot(key, baseUrl)
    case 'zhipu': return KnownProviders.zhipu(key, baseUrl)
    default: return KnownProviders.dashscope(key, baseUrl)
  }
}

export async function POST(req: NextRequest) {
  try {
    const json = await req.json()
    const parsed = bodySchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: 'invalid_request', issues: parsed.error.flatten() }, { status: 400 })
    }

    const { provider, baseUrl, apiKey, ...rest } = parsed.data
    const adapter = getAdapter(provider, apiKey, baseUrl)
    const res = await adapter.transcribe(rest, { signal: req.signal })
    const headers: Record<string, string> = {}
    res.headers.forEach((v, k) => (headers[k] = v))
    return new NextResponse(res.body, { status: res.status, headers })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || 'unknown_error' }, { status: 500 })
  }
}

export async function GET() { return NextResponse.json({ ok: true }) }
