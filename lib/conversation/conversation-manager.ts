/**
 * 对话管理器 - 负责对话的创建、保存和加载
 * Conversation Manager - Responsible for creating, saving, and loading conversations
 */
import { BehaviorSubject, type Observable } from "rxjs"
import { v4 as uuidv4 } from "uuid"

import { getSyncManager } from "../sync/sync-manager"

// 对话类型
export interface Conversation {
  id: string
  title: string
  agentId: string
  messages: Message[]
  timestamp: Date
  pinned?: boolean
  unread?: number
  tags?: string[]
  metadata?: Record<string, unknown>
}

// 消息类型
export interface Message {
  id: string
  role: "user" | "assistant" | "system" | "tool"
  content: string
  timestamp: Date
  isRead?: boolean
  isFavorite?: boolean
  attachments?: Attachment[]
  feedback?: Feedback
}

// 附件类型
export interface Attachment {
  id: string
  type: "image" | "file" | "audio" | "video"
  url: string
  name: string
  size?: number
  thumbnail?: string
}

// 反馈类型
export interface Feedback {
  type: "like" | "dislike"
  comment?: string
  timestamp: Date
}

// 对话管理器配置
export interface ConversationManagerConfig {
  autoSave: boolean
  autoSaveInterval: number
  maxLocalConversations: number
  syncEnabled: boolean
}

// 默认配置
const DEFAULT_CONFIG: ConversationManagerConfig = {
  autoSave: true,
  autoSaveInterval: 5000,
  maxLocalConversations: 50,
  syncEnabled: true,
}

export class ConversationManager {
  private config: ConversationManagerConfig
  private conversations: Map<string, Conversation> = new Map()
  private activeConversationId: string | null = null
  private conversationsSubject = new BehaviorSubject<Conversation[]>([])
  private activeConversationSubject = new BehaviorSubject<Conversation | null>(null)
  private autoSaveIntervalId: NodeJS.Timeout | null = null
  private syncManager = getSyncManager()
  private isInitialized = false

  constructor(config: Partial<ConversationManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }

    // 初始化
    this.init()
  }

  // 初始化
  private async init(): Promise<void> {
    if (this.isInitialized === true) return

    // 从本地存储加载对话
    await this.loadFromLocalStorage()

    // 启动自动保存
    if (this.config.autoSave === true) {
      this.startAutoSave()
    }

    this.isInitialized = true
  }

  // 获取所有对话
  public getConversations(): Observable<Conversation[]> {
    return this.conversationsSubject.asObservable()
  }

  // 获取当前活动对话
  public getActiveConversation(): Observable<Conversation | null> {
    return this.activeConversationSubject.asObservable()
  }

  // 创建新对话
  public createConversation(agentId: string, title: string, initialMessages: Message[] = []): Conversation {
    const id = uuidv4()
    const conversation: Conversation = {
      id,
      title,
      agentId,
      messages: initialMessages,
      timestamp: new Date(),
      unread: 0,
    }

    this.conversations.set(id, conversation)
    this.updateConversationsSubject()

    // 设置为活动对话
    this.setActiveConversation(id)

    // 同步到服务器
    if (this.config.syncEnabled) {
      this.syncManager.addItem("conversation", conversation)
    }

    return conversation
  }

  // 设置活动对话
  public setActiveConversation(conversationId: string | null): void {
    this.activeConversationId = conversationId

    const conversation = conversationId !== null ? this.conversations.get(conversationId) ?? null : null
    this.activeConversationSubject.next(conversation)

    // 清除未读消息
    if (conversation !== null && typeof conversation.unread === "number" && conversation.unread > 0) {
      this.updateConversation(conversation.id, { unread: 0 })
    }
  }

  // 添加消息到对话
  public addMessage(conversationId: string, message: Message): void {
    const conversation = this.conversations.get(conversationId)
    if (conversation == null) return

    conversation.messages.push(message)
    conversation.timestamp = new Date()

    // 如果不是当前活动对话，增加未读计数
    if (conversationId !== this.activeConversationId) {
      conversation.unread = (conversation.unread ?? 0) + 1
    }

    this.updateConversationsSubject()

    // 如果是当前活动对话，更新活动对话
    if (conversationId === this.activeConversationId) {
      this.activeConversationSubject.next(conversation)
    }

    // 同步到服务器
    if (this.config.syncEnabled === true) {
      this.syncManager.addItem("message", {
        ...message,
        conversationId,
      })
    }
  }

  // 更新对话
  public updateConversation(conversationId: string, updates: Partial<Conversation>): void {
    const conversation = this.conversations.get(conversationId)
    if (conversation == null) return

    // 应用更新
    Object.assign(conversation, updates)

    this.updateConversationsSubject()

    // 如果是当前活动对话，更新活动对话
    if (conversationId === this.activeConversationId) {
      this.activeConversationSubject.next(conversation)
    }

    // 同步到服务器
    if (this.config.syncEnabled === true) {
      this.syncManager.addItem("conversation", conversation)
    }
  }

  // 删除对话
  public deleteConversation(conversationId: string): void {
    if (this.conversations.has(conversationId) === false) return

    this.conversations.delete(conversationId)

    // 如果是当前活动对话，清除活动对话
    if (conversationId === this.activeConversationId) {
      this.activeConversationId = null
      this.activeConversationSubject.next(null)
    }

    this.updateConversationsSubject()

    // 同步到服务器（标记为删除）
    if (this.config.syncEnabled === true) {
      this.syncManager.addItem("conversation", {
        id: conversationId,
        deleted: true,
        timestamp: new Date(),
      })
    }

    // 从本地存储中删除
    this.saveToLocalStorage()
  }

  // 添加反馈
  public addFeedback(conversationId: string, messageId: string, feedback: Feedback): void {
    const conversation = this.conversations.get(conversationId)
    if (conversation == null) return

    const message = conversation.messages.find((m) => m.id === messageId)
    if (message == null) return

    message.feedback = feedback

    this.updateConversationsSubject()

    // 如果是当前活动对话，更新活动对话
    if (conversationId === this.activeConversationId) {
      this.activeConversationSubject.next(conversation)
    }

    // 同步到服务器
    if (this.config.syncEnabled === true) {
      this.syncManager.addItem("feedback", {
        messageId,
        conversationId,
        ...feedback,
      })
    }
  }

  // 更新消息
  public updateMessage(conversationId: string, messageId: string, updates: Partial<Message>): void {
    const conversation = this.conversations.get(conversationId)
    if (conversation == null) return

    const messageIndex = conversation.messages.findIndex((m) => m.id === messageId)
    if (messageIndex === -1) return

    // 应用更新
    Object.assign(conversation.messages[messageIndex], updates)

    this.updateConversationsSubject()

    // 如果是当前活动对话，更新活动对话
    if (conversationId === this.activeConversationId) {
      this.activeConversationSubject.next(conversation)
    }

    // 同步到服务器
    if (this.config.syncEnabled === true) {
      this.syncManager.addItem("message", {
        ...conversation.messages[messageIndex],
        conversationId,
      })
    }
  }

  // 更新对话主题
  public updateConversationTitle(conversationId: string, title: string): void {
    this.updateConversation(conversationId, { title })
  }

  // 切换对话置顶状态
  public togglePinned(conversationId: string): void {
    const conversation = this.conversations.get(conversationId)
    if (conversation == null) return

    this.updateConversation(conversationId, { pinned: conversation.pinned === true ? false : true })
  }

  // 更新对话标签
  public updateTags(conversationId: string, tags: string[]): void {
    this.updateConversation(conversationId, { tags })
  }

  // 保存到本地存储
  private saveToLocalStorage(): void {
    try {
      // 转换为数组并按时间戳排序
      const conversationsArray = Array.from(this.conversations.values())
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, this.config.maxLocalConversations)

      localStorage.setItem("conversations", JSON.stringify(conversationsArray))
      localStorage.setItem("activeConversationId", this.activeConversationId ?? "")
    } catch (error) {
      console.error("Error saving conversations to localStorage:", error)
    }
  }

  // 从本地存储加载
  private async loadFromLocalStorage(): Promise<void> {
    try {
      const storedConversations = localStorage.getItem("conversations")
      const storedActiveId = localStorage.getItem("activeConversationId")

      if (storedConversations !== null) {
        const conversations = JSON.parse(storedConversations) as Conversation[]

        // 转换日期字符串为Date对象
        conversations.forEach((conv) => {
          conv.timestamp = new Date(conv.timestamp)
          conv.messages.forEach((msg) => {
            msg.timestamp = new Date(msg.timestamp)
            if (msg.feedback?.timestamp) {
              msg.feedback.timestamp = new Date(msg.feedback.timestamp)
            }
          })

          this.conversations.set(conv.id, conv)
        })

        this.updateConversationsSubject()
      }

      // 设置活动对话
      if (storedActiveId !== null && this.conversations.has(storedActiveId)) {
        this.setActiveConversation(storedActiveId)
      }
    } catch (error) {
      console.error("Error loading conversations from localStorage:", error)
    }
  }

  // 更新对话Subject
  private updateConversationsSubject(): void {
    const conversationsArray = Array.from(this.conversations.values()).sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
    )

    this.conversationsSubject.next(conversationsArray)
  }

  // 启动自动保存
  private startAutoSave(): void {
    if (this.autoSaveIntervalId !== null) {
      clearInterval(this.autoSaveIntervalId)
    }

    this.autoSaveIntervalId = setInterval(() => {
      this.saveToLocalStorage()
    }, this.config.autoSaveInterval)
  }

  // 停止自动保存
  private stopAutoSave(): void {
    if (this.autoSaveIntervalId !== null) {
      clearInterval(this.autoSaveIntervalId)
      this.autoSaveIntervalId = null
    }
  }

  // 清理资源
  public dispose(): void {
    this.stopAutoSave()
    this.saveToLocalStorage()
  }
}

// 创建单例实例
let conversationManagerInstance: ConversationManager | null = null

export function getConversationManager(config?: Partial<ConversationManagerConfig>): ConversationManager {
  if (!conversationManagerInstance) {
    conversationManagerInstance = new ConversationManager(config)
  }

  return conversationManagerInstance
}
