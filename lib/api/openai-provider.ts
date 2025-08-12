import OpenAI from 'openai'

export type ProviderKey = 'dashscope' | 'deepseek' | 'moonshot' | 'zhipu'

export interface ProviderResolvedConfig {
  apiKey: string
  baseURL: string
  useContentArray: boolean
}

export function resolveProviderConfig(provider: ProviderKey | undefined, apiKey?: string, baseUrl?: string): ProviderResolvedConfig {
  const key = apiKey || process.env.EXTERNAL_AI_API_KEY || ''
  const forcedDashscope = process.env.EXTERNAL_AI_FORCE_DASHSCOPE === 'true'
  const p: ProviderKey = forcedDashscope ? 'dashscope' : (provider || 'dashscope')

  switch (p) {
    case 'deepseek':
      return { apiKey: key, baseURL: (baseUrl || 'https://api.deepseek.com/v1'), useContentArray: false }
    case 'moonshot':
      return { apiKey: key, baseURL: (baseUrl || 'https://api.moonshot.cn/v1'), useContentArray: false }
    case 'zhipu':
      return { apiKey: key, baseURL: (baseUrl || 'https://open.bigmodel.cn/api/paas/v4/openai'), useContentArray: false }
    case 'dashscope':
    default:
      return { apiKey: key, baseURL: (baseUrl || 'https://dashscope.aliyuncs.com/compatible-mode/v1'), useContentArray: true }
  }
}

export function createOpenAIClient(config: ProviderResolvedConfig): OpenAI {
  return new OpenAI({ apiKey: config.apiKey, baseURL: config.baseURL })
}

export type ChatMessage = {
  role: 'user' | 'assistant' | 'system'
  content: string | Array<{ type: 'text'; text: string }>
}

export function normalizeMessages(messages: Array<ChatMessage>, useContentArray: boolean): Array<ChatMessage> {
  return messages.map((m) => ({
    role: m.role,
    content: useContentArray
      ? (Array.isArray(m.content) ? m.content : [{ type: 'text', text: String(m.content) }])
      : (typeof m.content === 'string' ? m.content : m.content.map((c) => c.text).join('\n')),
  }))
}
