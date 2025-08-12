import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { createOpenAIClient, normalizeMessages, resolveProviderConfig } from "@/lib/api/openai-provider"

const bodySchema = z.object({
  provider: z.enum(["dashscope", "deepseek", "moonshot", "zhipu"]).default("dashscope"),
  baseUrl: z.string().url().optional(),
  apiKey: z.string().min(1).optional(),
  model: z.string().min(1),
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant", "system"]),
      content: z.union([
        z.string(),
        z.array(z.object({ type: z.literal("text"), text: z.string() })),
      ]),
    }),
  ),
  stream: z.boolean().optional(),
  temperature: z.number().optional(),
  max_tokens: z.number().optional(),
})


export async function POST(req: NextRequest) {
  try {
    const json = await req.json()
    const parsed = bodySchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid_request", issues: parsed.error.flatten() }, { status: 400 })
    }

    const { provider, baseUrl, apiKey, model, messages, stream, temperature, max_tokens } = parsed.data
    const resolved = resolveProviderConfig(provider, apiKey, baseUrl)
    const client = createOpenAIClient(resolved)

    const normalizedMessages = normalizeMessages(messages, resolved.useContentArray)

    const res = await client.chat.completions.create({
      model,
      messages: normalizedMessages as any,
      stream: !!stream,
      temperature,
      max_tokens,
    }) as any

    if (stream && res.toReadableStream) {
      return new NextResponse(res.toReadableStream(), { headers: { 'Content-Type': 'text/event-stream' } })
    }

    return NextResponse.json(res)
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || "unknown_error" }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ ok: true })
}


