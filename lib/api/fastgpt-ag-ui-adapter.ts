// 轻量版 FastGPT AG-UI 适配器（移除外部依赖）
import FastGPTApi from "./fastgpt"
import { generateImageFromChat } from "../utils/image-generator"

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
