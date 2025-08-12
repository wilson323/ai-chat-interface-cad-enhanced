import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createOpenAIClient, resolveProviderConfig } from '@/lib/api/openai-provider'

const bodySchema = z.object({
  provider: z.enum(['dashscope', 'deepseek', 'moonshot', 'zhipu']).default('dashscope'),
  baseUrl: z.string().url().optional(),
  apiKey: z.string().min(1).optional(),
  model: z.string().min(1),
  input: z.union([z.string(), z.array(z.string()).min(1)]),
  encoding_format: z.enum(['float', 'base64']).optional(),
  user: z.string().optional(),
})


export async function POST(req: NextRequest) {
  try {
    const json = await req.json()
    const parsed = bodySchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: 'invalid_request', issues: parsed.error.flatten() }, { status: 400 })
    }

    const { provider, baseUrl, apiKey, model, input, encoding_format, user } = parsed.data
    const resolved = resolveProviderConfig(provider, apiKey, baseUrl)
    const client = createOpenAIClient(resolved)

    const res = await client.embeddings.create({
      model,
      input,
      encoding_format,
      user,
    })

    return NextResponse.json(res)
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || 'unknown_error' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ ok: true })
}
