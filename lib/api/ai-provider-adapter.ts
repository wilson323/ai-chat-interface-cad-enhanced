import { z } from "zod"

export type ChatMessage = {
  role: "user" | "assistant" | "system"
  content: string | Array<{ type: "text"; text: string }>
}

export interface ChatRequest {
  model: string
  messages: Array<ChatMessage>
  stream?: boolean
  temperature?: number
  max_tokens?: number
}

export interface SpeechRequest {
  model: string
  input: string
  voice?: string
  format?: 'mp3' | 'wav' | 'ogg'
}

export interface TranscribeRequest {
  model: string
  // 以下二选一：
  fileBase64?: string // data url 或 纯 base64
  fileUrl?: string
  mimeType?: string
}

export interface EmbeddingsRequest {
  model: string
  input: string | Array<string>
  encoding_format?: 'float' | 'base64'
  user?: string
}

export interface ProviderConfig {
  baseUrl: string
  apiKey: string
  headers?: Record<string, string>
  useContentArray?: boolean
}

/**
 * 统一的 OpenAI 兼容适配器（国内主流厂商）
 * - 仅依赖 OpenAI 风格的 /chat/completions
 * - 可通过 useContentArray 控制 content 结构（兼容 DashScope 等）
 */
export class OpenAICompatibleAdapter {
  private config: ProviderConfig

  constructor(config: ProviderConfig) {
    this.config = config
  }

  /**
   * 健康探活（最小负载）
   */
  async ping(model: string): Promise<{ ok: boolean; status: number; body?: unknown }> {
    try {
      const body: ChatRequest = {
        model,
        messages: [
          {
            role: "user",
            content: this.config.useContentArray ? [{ type: "text", text: "ping" }] : "ping",
          },
        ],
        stream: false,
        temperature: 0,
        max_tokens: 16,
      }

      const res = await fetch(this.url("/chat/completions"), {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify(body),
      })

      const status = res.status
      let data: unknown = undefined
      try {
        data = await res.json()
      } catch {
        // ignore non-JSON
      }
      return { ok: res.ok, status, body: data }
    } catch (error) {
      return { ok: false, status: 0, body: { error: (error as Error).message } }
    }
  }

  /**
   * 标准对话
   */
  async chat(req: ChatRequest, init?: RequestInit): Promise<Response> {
    const schema = z.object({
      model: z.string().min(1),
      messages: z
        .array(
          z.object({
            role: z.enum(["user", "assistant", "system"]),
            content: z.union([
              z.string(),
              z.array(
                z.object({
                  type: z.literal("text"),
                  text: z.string(),
                }),
              ),
            ]),
          }),
        )
        .min(1),
      stream: z.boolean().optional(),
      temperature: z.number().optional(),
      max_tokens: z.number().optional(),
    })

    const parsed = schema.safeParse(req)
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "invalid_request", issues: parsed.error.flatten() }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      )
    }

    // 根据厂商要求调整 content 结构
    const normalized: ChatRequest = {
      ...parsed.data,
      messages: parsed.data.messages.map((m) => ({
        role: m.role,
        content: this.config.useContentArray
          ? Array.isArray(m.content)
            ? m.content
            : [{ type: "text", text: String(m.content) }]
          : typeof m.content === "string"
            ? m.content
            : m.content.map((c) => c.text).join("\n"),
      })),
    }

    const mergedHeaders = { ...(this.headers()), ...(init?.headers as Record<string, string> | undefined) }
    return fetch(this.url("/chat/completions"), {
      method: "POST",
      headers: mergedHeaders,
      body: JSON.stringify(normalized),
      signal: init?.signal,
    })
  }

  /**
   * 文本转语音（OpenAI 兼容 /audio/speech）
   */
  async speech(req: SpeechRequest, init?: RequestInit): Promise<Response> {
    const payload = {
      model: req.model,
      input: req.input,
      voice: req.voice || 'female',
      format: req.format || 'mp3',
    }
    const mergedHeaders = { ...(this.headers()), ...(init?.headers as Record<string, string> | undefined) }
    return fetch(this.url('/audio/speech'), {
      method: 'POST',
      headers: mergedHeaders,
      body: JSON.stringify(payload),
      signal: init?.signal,
    })
  }

  /**
   * 语音转文本（OpenAI 兼容 /audio/transcriptions）
   */
  async transcribe(req: TranscribeRequest, init?: RequestInit): Promise<Response> {
    // 采用 JSON 直传模式（部分兼容端实现支持）。如需 multipart，可后续扩展
    const payload: any = {
      model: req.model,
    }
    if (req.fileUrl) payload.file_url = req.fileUrl
    if (req.fileBase64) payload.file_base64 = req.fileBase64
    if (req.mimeType) payload.mime_type = req.mimeType

    const mergedHeaders = { ...(this.headers()), ...(init?.headers as Record<string, string> | undefined) }
    return fetch(this.url('/audio/transcriptions'), {
      method: 'POST',
      headers: mergedHeaders,
      body: JSON.stringify(payload),
      signal: init?.signal,
    })
  }

  /**
   * 词向量（OpenAI 兼容 /embeddings）
   */
  async embeddings(req: EmbeddingsRequest, init?: RequestInit): Promise<Response> {
    const schema = z.object({
      model: z.string().min(1),
      input: z.union([z.string(), z.array(z.string()).min(1)]),
      encoding_format: z.enum(['float', 'base64']).optional(),
      user: z.string().optional(),
    })
    const parsed = schema.safeParse(req)
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: 'invalid_request', issues: parsed.error.flatten() }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      )
    }

    const mergedHeaders = { ...(this.headers()), ...(init?.headers as Record<string, string> | undefined) }
    return fetch(this.url('/embeddings'), {
      method: 'POST',
      headers: mergedHeaders,
      body: JSON.stringify(parsed.data),
      signal: init?.signal,
    })
  }

  private url(path: string): string {
    return `${this.config.baseUrl.replace(/\/$/, "")}${path}`
  }

  private headers(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.config.apiKey}`,
      ...(this.config.headers || {}),
    }
  }
}

export const KnownProviders = {
  // 需要 useContentArray 以兼容 DashScope 兼容模式的严格校验
  dashscope: (apiKey: string, baseUrl = "https://dashscope.aliyuncs.com/compatible-mode/v1") =>
    new OpenAICompatibleAdapter({ baseUrl, apiKey, useContentArray: true }),
  // DeepSeek（OpenAI 兼容）
  deepseek: (apiKey: string, baseUrl = "https://api.deepseek.com/v1") =>
    new OpenAICompatibleAdapter({ baseUrl, apiKey }),
  // Moonshot（Kimi）
  moonshot: (apiKey: string, baseUrl = "https://api.moonshot.cn/v1") =>
    new OpenAICompatibleAdapter({ baseUrl, apiKey }),
  // 智谱 GLM（OpenAI 兼容通道，按平台配置）
  zhipu: (apiKey: string, baseUrl = "https://open.bigmodel.cn/api/paas/v4/openai") =>
    new OpenAICompatibleAdapter({ baseUrl, apiKey }),
}


