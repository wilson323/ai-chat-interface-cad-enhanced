/**
 * AG-UI核心适配器 - 提供AG-UI协议与现有系统的桥接功能
 * AG-UI Core Adapter - Provides bridging between AG-UI protocol and existing system
 *
 * 本文件负责处理AG-UI事件流的创建、管理和分发，是AG-UI集成的核心组件
 * 调用关系: 被hooks/use-ag-ui.tsx和lib/ag-ui/adapter.ts引用
 */

import { type Observable, Subject } from "rxjs"
import type { BaseEvent } from "./types"

export interface AgUICoreAdapterOptions {
  debug?: boolean
  threadId?: string
  proxyUrl?: string
}

export class AgUICoreAdapter {
  private eventSubject: Subject<BaseEvent>
  private debug: boolean
  private threadId: string
  private proxyUrl: string

  constructor(options: AgUICoreAdapterOptions = {}) {
    this.eventSubject = new Subject<BaseEvent>()
    this.debug = options.debug || false
    this.threadId = options.threadId || `thread_${Date.now()}`
    this.proxyUrl = options.proxyUrl || "/api/ag-ui/chat"

    if (this.debug) {
      console.log("AgUICoreAdapter initialized with options:", options)
    }
  }

  /**
   * 获取事件流Observable
   * Get event stream Observable
   */
  public getEventStream(): Observable<BaseEvent> {
    return this.eventSubject.asObservable()
  }

  /**
   * 初始化会话
   * Initialize session
   */
  public async initializeSession(appId: string, initialChatId?: string): Promise<any> {
    try {
      const response = await fetch("/api/ag-ui/init-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          appId,
          chatId: initialChatId,
          threadId: this.threadId,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to initialize session: ${response.statusText}`)
      }

      const result = await response.json()

      // 发送状态快照事件
      this.eventSubject.next({
        type: "STATE_SNAPSHOT",
        snapshot: {
          chatId: result.chatId || initialChatId,
          appId,
          variables: result.variables || {},
          suggestedQuestions: result.suggestedQuestions || [],
        },
        timestamp: Date.now(),
      })

      if (result.welcomeMessage) {
        const messageId = `welcome-${Date.now()}`

        // 发送欢迎消息开始事件
        this.eventSubject.next({
          type: "TEXT_MESSAGE_START",
          messageId,
          role: "assistant",
          timestamp: Date.now(),
        })

        // 发送欢迎消息内容事件
        this.eventSubject.next({
          type: "TEXT_MESSAGE_CONTENT",
          messageId,
          delta: result.welcomeMessage,
          timestamp: Date.now(),
        })

        // 发送欢迎消息结束事件
        this.eventSubject.next({
          type: "TEXT_MESSAGE_END",
          messageId,
          timestamp: Date.now(),
        })
      }

      return result
    } catch (error) {
      console.error("Error initializing session:", error)
      throw error
    }
  }

  /**
   * 处理聊天完成请求
   * Handle chat completion request
   */
  public async handleChatCompletion(
    appId: string,
    chatId: string,
    messages: Array<{ role: string; content: string }>,
    systemPrompt?: string,
    variables?: Record<string, any>,
  ): Promise<any> {
    try {
      const runId = `run-${Date.now()}`

      // 发送运行开始事件
      this.eventSubject.next({
        type: "RUN_STARTED",
        threadId: this.threadId,
        runId,
        timestamp: Date.now(),
      })

      // 创建EventSource连接
      const params = new URLSearchParams({
        threadId: this.threadId,
        runId,
      })

      const eventSource = new EventSource(`/api/ag-ui/chat/stream?${params.toString()}`)

      // 发送请求到API
      fetch(this.proxyUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          appId,
          chatId,
          messages,
          systemPrompt,
          variables,
          threadId: this.threadId,
          runId,
        }),
      }).catch((error) => {
        console.error("Error sending chat completion request:", error)
        this.eventSubject.next({
          type: "RUN_ERROR",
          message: error.message || "Failed to send request",
          code: 500,
          timestamp: Date.now(),
        })
        eventSource.close()
      })

      // 处理事件流
      eventSource.onmessage = (event) => {
        try {
          if (event.data === "[DONE]") {
            eventSource.close()
            return
          }

          const data = JSON.parse(event.data)

          // 转发事件到Subject
          if (data.type) {
            this.eventSubject.next(data)
          }

          // 如果是运行结束事件，关闭EventSource
          if (data.type === "RUN_FINISHED" || data.type === "RUN_ERROR") {
            eventSource.close()
          }
        } catch (error) {
          console.error("Error processing event:", error)
        }
      }

      eventSource.onerror = (error) => {
        console.error("EventSource error:", error)
        this.eventSubject.next({
          type: "RUN_ERROR",
          message: "Connection error",
          code: 500,
          timestamp: Date.now(),
        })
        eventSource.close()
      }

      return { runId, threadId: this.threadId }
    } catch (error) {
      console.error("Error in handleChatCompletion:", error)
      throw error
    }
  }

  /**
   * 获取聊天历史
   * Fetch chat history
   */
  public async fetchChatHistory(appId: string, chatId: string): Promise<any> {
    try {
      const response = await fetch(`/api/ag-ui/history?appId=${appId}&chatId=${chatId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch chat history: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error("Error fetching chat history:", error)
      throw error
    }
  }

  /**
   * 提交反馈
   * Submit feedback
   */
  public async submitFeedback(
    appId: string,
    chatId: string,
    messageId: string,
    feedback: "like" | "dislike",
    comment?: string,
  ): Promise<boolean> {
    try {
      const response = await fetch("/api/ag-ui/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          appId,
          chatId,
          messageId,
          feedback,
          comment,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to submit feedback: ${response.statusText}`)
      }

      const result = await response.json()
      return result.success || false
    } catch (error) {
      console.error("Error submitting feedback:", error)
      throw error
    }
  }

  /**
   * 生成长图
   * Generate long image
   */
  public async generateLongImage(appId: string, chatId: string, includeWelcome = true): Promise<string | null> {
    try {
      const response = await fetch("/api/ag-ui/generate-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          appId,
          chatId,
          includeWelcome,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to generate image: ${response.statusText}`)
      }

      const result = await response.json()
      return result.imageUrl || null
    } catch (error) {
      console.error("Error generating long image:", error)
      throw error
    }
  }

  /**
   * 批量转发
   * Batch forward
   */
  public async batchForward(appId: string, chatId: string, targetAppIds: string[], messageIds: string[]): Promise<any> {
    try {
      const response = await fetch("/api/ag-ui/batch-forward", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          appId,
          chatId,
          targetAppIds,
          messageIds,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to batch forward: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error("Error in batch forward:", error)
      throw error
    }
  }

  /**
   * 获取建议问题
   * Fetch suggested questions
   */
  public async fetchSuggestedQuestions(appId: string, chatId: string): Promise<string[]> {
    try {
      const response = await fetch(`/api/ag-ui/suggested-questions?appId=${appId}&chatId=${chatId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch suggested questions: ${response.statusText}`)
      }

      const result = await response.json()
      return result.questions || []
    } catch (error) {
      console.error("Error fetching suggested questions:", error)
      throw error
    }
  }
}
