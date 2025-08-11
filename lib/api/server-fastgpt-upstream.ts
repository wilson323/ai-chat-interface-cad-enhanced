export interface FastGptUpstreamParams {
  origin: string
  apiKey: string
  appId: string
  chatId?: string
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
  variables?: Record<string, string>
  systemPrompt?: string
  signal?: AbortSignal
}

/**
 * 仅服务端使用：创建到 FastGPT 的上游 SSE 请求
 */
export async function createFastGptUpstream(params: FastGptUpstreamParams): Promise<Response> {
  const { origin, apiKey, appId, chatId, messages, variables, systemPrompt, signal } = params
  if (!origin || !apiKey) {
    throw new Error('Missing origin or apiKey for FastGPT upstream')
  }
  const targetUrl = `${origin}/api/fastgpt/api/v1/chat/completions`
  return fetch(targetUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
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
    signal,
  })
}
