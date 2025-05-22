import { AgentRuntime, type AgentState, type ToolDefinition } from "@ag-ui/server"
import { initChatSession, sendChatMessage, getHistoryMessages } from "./fastgpt"
import { generateImageFromChat } from "../utils/image-generator"

// FastGPT工具定义
const fastgptTools: ToolDefinition[] = [
  {
    name: "init_chat_session",
    description: "初始化FastGPT聊天会话",
    execute: async (params: { appId: string; variables?: Record<string, string> }) => {
      const { appId, variables } = params
      return await initChatSession(appId, variables)
    },
  },
  {
    name: "send_message",
    description: "发送消息到FastGPT",
    execute: async (params: {
      chatId: string
      content: string
      variables?: Record<string, string>
      streamCallback?: (chunk: string) => void
    }) => {
      const { chatId, content, variables, streamCallback } = params
      return await sendChatMessage(chatId, content, variables, streamCallback)
    },
  },
  {
    name: "get_history",
    description: "获取FastGPT历史消息",
    execute: async (params: { chatId: string }) => {
      const { chatId } = params
      return await getHistoryMessages(chatId)
    },
  },
  {
    name: "generate_image",
    description: "从聊天记录生成长图",
    execute: async (params: { chatId: string; includeWelcome?: boolean }) => {
      const { chatId, includeWelcome = true } = params
      const history = await getHistoryMessages(chatId)
      return await generateImageFromChat(history, includeWelcome)
    },
  },
  {
    name: "feedback",
    description: "提交反馈（点赞/点踩）",
    execute: async (params: { messageId: string; rating: "like" | "dislike"; comment?: string }) => {
      const { messageId, rating, comment } = params
      // 实现点赞/点踩功能
      const response = await fetch("/api/fastgpt/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, rating, comment }),
      })
      return await response.json()
    },
  },
  {
    name: "batch_forward",
    description: "批量转发消息",
    execute: async (params: { messages: string[]; targets: string[] }) => {
      const { messages, targets } = params
      // 实现批量转发功能
      const response = await fetch("/api/fastgpt/batch-forward", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, targets }),
      })
      return await response.json()
    },
  },
]

// 创建FastGPT AG-UI适配器
export class FastGptAgUiAdapter {
  private runtime: AgentRuntime

  constructor(threadId: string, runId: string) {
    this.runtime = new AgentRuntime({
      threadId,
      runId,
      tools: fastgptTools,
    })
  }

  // 初始化聊天会话
  async initChatSession(appId: string, variables?: Record<string, string>): Promise<any> {
    const result = await this.runtime.runTool("init_chat_session", { appId, variables })
    this.runtime.updateState({ chatId: result.chatId, appId, variables })
    return result
  }

  // 发送消息
  async sendMessage(content: string, streamCallback?: (chunk: string) => void): Promise<any> {
    const state = this.runtime.getState() as AgentState & { chatId: string; variables?: Record<string, string> }
    if (!state.chatId) {
      throw new Error("聊天会话未初始化")
    }

    const result = await this.runtime.runTool("send_message", {
      chatId: state.chatId,
      content,
      variables: state.variables,
      streamCallback,
    })

    // 更新状态，保存最新消息
    const messages = state.messages || []
    messages.push(
      {
        role: "user",
        content,
      },
      {
        role: "assistant",
        content: result.reply,
      },
    )

    this.runtime.updateState({ messages })
    return result
  }

  // 获取历史消息
  async getHistory(): Promise<any> {
    const state = this.runtime.getState() as AgentState & { chatId: string }
    if (!state.chatId) {
      throw new Error("聊天会话未初始化")
    }

    const result = await this.runtime.runTool("get_history", { chatId: state.chatId })
    this.runtime.updateState({ messages: result.messages })
    return result
  }

  // 生成长图
  async generateImage(includeWelcome = true): Promise<any> {
    const state = this.runtime.getState() as AgentState & { chatId: string }
    if (!state.chatId) {
      throw new Error("聊天会话未初始化")
    }

    return await this.runtime.runTool("generate_image", {
      chatId: state.chatId,
      includeWelcome,
    })
  }

  // 提交反馈
  async submitFeedback(messageId: string, rating: "like" | "dislike", comment?: string): Promise<any> {
    return await this.runtime.runTool("feedback", { messageId, rating, comment })
  }

  // 批量转发
  async batchForward(messages: string[], targets: string[]): Promise<any> {
    return await this.runtime.runTool("batch_forward", { messages, targets })
  }

  // 获取当前状态
  getState(): AgentState {
    return this.runtime.getState()
  }
}
