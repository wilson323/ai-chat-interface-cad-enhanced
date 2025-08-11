// 轻量版 FastGPT AG-UI 适配器（移除外部依赖）
import FastGPTApi from "./fastgpt"
// 移除顶层导入，改为函数内动态导入避免在服务端打包期引入浏览器依赖
// import { generateImageFromChat } from "../utils/image-generator"

interface AgentStateInternal {
  threadId: string
  runId: string
  chatId?: string
  appId?: string
  variables?: Record<string, string>
  messages?: Array<{ role: 'user' | 'assistant'; content: string }>
}

export class FastGptAgUiAdapter {
  private state: AgentStateInternal

  constructor(threadId: string, runId: string) {
    this.state = { threadId, runId, messages: [] }
  }

  getState(): AgentStateInternal {
    return this.state
  }

  private updateState(patch: Partial<AgentStateInternal>): void {
    this.state = { ...this.state, ...patch }
  }

  async initChatSession(appId: string, variables?: Record<string, string>): Promise<any> {
    const result = await FastGPTApi.createChatSession(appId)
    this.updateState({ chatId: result?.id, appId, variables })
    return result
  }

  async sendMessage(content: string, streamCallback?: (chunk: string) => void): Promise<any> {
    const { chatId, variables } = this.state
    if (!chatId) throw new Error("聊天会话未初始化")

    // 直接走统一 chat API 路由
    const response = await fetch("/api/fastgpt/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId, messages: [{ role: 'user', content }], variables, stream: !!streamCallback }),
    })

    if (streamCallback && response.body) {
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        streamCallback(decoder.decode(value))
      }
    }

    const result = await response.json().catch(() => ({ reply: '' }))
    const messages = this.state.messages || []
    messages.push({ role: 'user', content }, { role: 'assistant', content: result.reply || '' })
    this.updateState({ messages })
    return result
  }

  async getHistory(): Promise<any> {
    const { chatId } = this.state
    if (!chatId) throw new Error("聊天会话未初始化")
    const result = await FastGPTApi.getChatSessions(chatId)
    this.updateState({ messages: result?.messages || [] })
    return result
  }

  async generateImage(includeWelcome = true): Promise<any> {
    const { chatId } = this.state
    if (!chatId) throw new Error("聊天会话未初始化")
    const history = await FastGPTApi.getChatSessions(chatId)
    const { generateImageFromChat } = await import("../utils/image-generator")
    return await generateImageFromChat(history, includeWelcome)
  }

  async submitFeedback(messageId: string, rating: "like" | "dislike", comment?: string): Promise<any> {
    const response = await fetch("/api/fastgpt/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId, rating, comment }),
    })
    return await response.json()
  }

  async batchForward(messages: string[], targets: string[]): Promise<any> {
    const response = await fetch("/api/fastgpt/batch-forward", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, targets }),
    })
    return await response.json()
  }
}

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
 * 在服务端创建到 FastGPT 的上游 SSE 请求
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
