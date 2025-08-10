/**
 * 增强版FastGPT客户端 - 高性能、低延迟、高可用的FastGPT API客户端
 * Enhanced FastGPT Client - High-performance, low-latency, highly available FastGPT API client
 *
 * 特性:
 * - 多级缓存策略
 * - 请求优化和批处理
 * - 断路器模式防止级联故障
 * - 离线支持和请求队列
 * - 自动重试和错误处理
 * - 详细的统计和监控
 */
import { getFastGPTOptimizer, RequestPriority } from "./fastgpt-optimizer"
import { getCacheManager } from "../cache/cache-manager"

// 使用泛型替代any
interface APIResponse<T = unknown> {
  data: T
  status: number
  headers: Record<string, string>
}

async function enhancedFetch<T>(url: string): Promise<APIResponse<T>> {
  const res = await fetch(url)
  const data = (await res.json().catch(() => ({}))) as T
  const headersObj: Record<string, string> = {}
  res.headers.forEach((v, k) => (headersObj[k] = v))
  return { data, status: res.status, headers: headersObj }
}

// 响应类型
export interface FastGPTResponse {
  id: string
  object: string
  created: number
  model: string
  choices: {
    index: number
    message: {
      role: string
      content: string
    }
    finish_reason: string
  }[]
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
  detail?: any
  responseData?: any[]
}

// 错误响应类型
export interface FastGPTErrorResponse {
  error: {
    code: number
    message: string
  }
}

// 客户端配置
export interface FastGPTClientConfig {
  apiKey: string
  baseUrl: string
  useProxy: boolean
  timeout: number
  maxRetries: number
  cacheEnabled: boolean
  cacheTTL: number
  offlineSupport: boolean
  fallbackResponses: boolean
  debug: boolean
  logLevel: "error" | "warn" | "info" | "debug"
}

// 默认配置
const DEFAULT_CONFIG: FastGPTClientConfig = {
  apiKey: "",
  baseUrl: "",
  useProxy: true,
  timeout: 30000, // 30秒
  maxRetries: 3,
  cacheEnabled: true,
  cacheTTL: 5 * 60 * 1000, // 5分钟
  offlineSupport: true,
  fallbackResponses: true,
  debug: false,
  logLevel: "error",
}

export class EnhancedFastGPTClient {
  private config: FastGPTClientConfig
  private optimizer = getFastGPTOptimizer()
  private cacheManager = getCacheManager()
  private isOnline = true
  private offlineQueue: Array<{
    method: string
    endpoint: string
    payload: any
    resolve: (value: any) => void
    reject: (reason: any) => void
    timestamp: number
    priority: RequestPriority
  }> = []
  private fallbackResponses: Map<string, any> = new Map()
  private requestCount = 0
  private successCount = 0
  private errorCount = 0
  private startTime = Date.now()
  private lastActivity = Date.now()

  constructor(config: Partial<FastGPTClientConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }

    // 监听在线状态
    if (typeof window !== "undefined" && this.config.offlineSupport) {
      window.addEventListener("online", this.handleOnline)
      window.addEventListener("offline", this.handleOffline)
      this.isOnline = navigator.onLine
    }

    // 初始化一些常见请求的回退响应
    if (this.config.fallbackResponses) {
      this.initializeFallbackResponses()
    }

    this.log("info", "EnhancedFastGPTClient initialized with config:", {
      ...this.config,
      apiKey: "***", // 隐藏API密钥
    })
  }

  /**
   * 聊天完成
   * @param params 参数
   * @returns 响应
   */
  public async chat(params: {
    model: string
    messages: {
      role: string
      content:
        | string
        | Array<{
            type: string
            text?: string
            image_url?: { url: string }
            file_url?: string
            name?: string
            url?: string
          }>
    }[]
    stream?: boolean
    temperature?: number
    max_tokens?: number
    tools?: any[]
    tool_choice?: string | object
    files?: any[]
    detail?: boolean
    system?: string
    user?: string
    chatId?: string
    responseChatItemId?: string
    variables?: Record<string, any>
    priority?: RequestPriority
    bypassCache?: boolean
    timeout?: number
  }): Promise<FastGPTResponse | ReadableStream> {
    const endpoint = "/api/fastgpt/chat"
    const {
      priority = RequestPriority.NORMAL,
      bypassCache = false,
      timeout = this.config.timeout,
      ...restParams
    } = params

    // 更新最后活动时间
    this.lastActivity = Date.now()
    this.requestCount++

    try {
      // 如果请求流式响应，不使用缓存
      const useCache = this.config.cacheEnabled && !params.stream && !bypassCache

      // 生成缓存键
      const cacheKey = useCache ? this.generateChatCacheKey(params) : undefined

      // 如果离线且启用了离线支持，添加到离线队列
      if (!this.isOnline && this.config.offlineSupport) {
        return new Promise((resolve, reject) => {
          this.offlineQueue.push({
            method: "POST",
            endpoint,
            payload: params,
            resolve,
            reject,
            timestamp: Date.now(),
            priority,
          })

          this.log("info", "Added request to offline queue, queue size:", this.offlineQueue.length)

          // 如果启用了回退响应，尝试提供回退响应
          if (this.config.fallbackResponses) {
            const fallbackKey = this.generateFallbackKey(params)
            const fallbackResponse = this.fallbackResponses.get(fallbackKey)

            if (fallbackResponse) {
              this.log("info", "Providing fallback response for offline request")
              resolve(fallbackResponse)
            } else {
              // 生成一个通用的回退响应
              const genericFallback = this.generateGenericFallbackResponse(params)
              resolve(genericFallback)
            }
          } else {
            // 否则拒绝请求
            reject(new Error("Device is offline and no fallback response available"))
          }
        })
      }

      this.log("debug", "Chat request:", {
        ...params,
        apiKey: "***", // 隐藏API密钥
      })

      // 使用优化器发送请求
      const response = await this.optimizer.request<Response>(
        endpoint,
        {
          ...restParams,
          baseUrl: this.config.baseUrl,
          useProxy: this.config.useProxy,
        },
        {
          priority,
          cacheKey,
          cacheTTL: this.config.cacheTTL,
          cacheTags: ["chat", params.model],
          timeout,
          bypassCache,
        },
      )

      // 如果是流式响应，直接返回
      if (params.stream) {
        return response.body as ReadableStream
      }

      // 否则解析JSON响应
      const result = await response.json()

      // 更新统计信息
      this.successCount++

      // 如果启用了回退响应，缓存响应用于离线回退
      if (this.config.fallbackResponses && !params.stream) {
        const fallbackKey = this.generateFallbackKey(params)
        this.fallbackResponses.set(fallbackKey, result)
      }

      return result
    } catch (error) {
      this.log("error", "Chat request failed:", error)
      this.errorCount++

      // 如果启用了回退响应，尝试提供回退响应
      if (this.config.fallbackResponses && !params.stream) {
        const fallbackKey = this.generateFallbackKey(params)
        const fallbackResponse = this.fallbackResponses.get(fallbackKey)

        if (fallbackResponse) {
          this.log("info", "Providing fallback response for failed request")
          return fallbackResponse
        }
      }

      throw error
    }
  }

  /**
   * 初始化聊天
   * @param params 参数
   * @returns 响应
   */
  public async initChat(params: {
    model?: string
    agent_id?: string
    knowledge_id?: string
    user?: string
    priority?: RequestPriority
    bypassCache?: boolean
    timeout?: number
  }): Promise<any> {
    const endpoint = "/api/fastgpt/init-chat"
    const {
      priority = RequestPriority.HIGH,
      bypassCache = false,
      timeout = this.config.timeout,
      ...restParams
    } = params

    // 更新最后活动时间
    this.lastActivity = Date.now()
    this.requestCount++

    try {
      // 生成缓存键
      const cacheKey =
        this.config.cacheEnabled && !bypassCache
          ? `init-chat:${params.agent_id || ""}:${params.model || ""}`
          : undefined

      // 如果离线且启用了离线支持，添加到离线队列
      if (!this.isOnline && this.config.offlineSupport) {
        return new Promise((resolve, reject) => {
          this.offlineQueue.push({
            method: "POST",
            endpoint,
            payload: params,
            resolve,
            reject,
            timestamp: Date.now(),
            priority,
          })

          this.log("info", "Added request to offline queue, queue size:", this.offlineQueue.length)

          // 如果启用了回退响应，尝试提供回退响应
          if (this.config.fallbackResponses) {
            const fallbackKey = `init-chat:${params.agent_id || "default"}:${params.model || "default"}`
            const fallbackResponse = this.fallbackResponses.get(fallbackKey)

            if (fallbackResponse) {
              this.log("info", "Providing fallback response for offline request")
              resolve(fallbackResponse)
            } else {
              // 生成一个通用的回退响应
              const genericFallback = this.generateGenericInitChatResponse(params)
              resolve(genericFallback)
            }
          } else {
            // 否则拒绝请求
            reject(new Error("Device is offline and no fallback response available"))
          }
        })
      }

      this.log("debug", "InitChat request:", params)

      // 使用优化器发送请求
      const response = await this.optimizer.request<Response>(
        endpoint,
        {
          ...restParams,
          baseUrl: this.config.baseUrl,
          useProxy: this.config.useProxy,
        },
        {
          priority,
          cacheKey,
          cacheTTL: this.config.cacheTTL,
          cacheTags: ["init-chat", params.agent_id || "default"],
          timeout,
          bypassCache,
        },
      )

      // 解析JSON响应
      const result = await response.json()

      // 更新统计信息
      this.successCount++

      // 如果启用了回退响应，缓存响应用于离线回退
      if (this.config.fallbackResponses) {
        const fallbackKey = `init-chat:${params.agent_id || "default"}:${params.model || "default"}`
        this.fallbackResponses.set(fallbackKey, result)
      }

      return result
    } catch (error) {
      this.log("error", "InitChat request failed:", error)
      this.errorCount++

      // 如果启用了回退响应，尝试提供回退响应
      if (this.config.fallbackResponses) {
        const fallbackKey = `init-chat:${params.agent_id || "default"}:${params.model || "default"}`
        const fallbackResponse = this.fallbackResponses.get(fallbackKey)

        if (fallbackResponse) {
          this.log("info", "Providing fallback response for failed request")
          return fallbackResponse
        }
      }

      throw error
    }
  }

  /**
   * 获取历史对话
   * @param params 参数
   * @returns 响应
   */
  public async getHistories(params: {
    appId: string
    offset?: number
    pageSize?: number
    source?: string
    priority?: RequestPriority
    bypassCache?: boolean
    timeout?: number
  }): Promise<any> {
    const { priority = RequestPriority.LOW, bypassCache = false, timeout = this.config.timeout, ...restParams } = params
    const endpoint = this.getApiUrl("/api/core/chat/getHistories")

    // 更新最后活动时间
    this.lastActivity = Date.now()
    this.requestCount++

    try {
      // 生成缓存键
      const cacheKey =
        this.config.cacheEnabled && !bypassCache
          ? `histories:${params.appId}:${params.offset || 0}:${params.pageSize || 20}`
          : undefined

      // 如果离线且启用了离线支持，添加到离线队列
      if (!this.isOnline && this.config.offlineSupport) {
        return new Promise((resolve, reject) => {
          this.offlineQueue.push({
            method: "POST",
            endpoint,
            payload: params,
            resolve,
            reject,
            timestamp: Date.now(),
            priority,
          })

          this.log("info", "Added request to offline queue, queue size:", this.offlineQueue.length)

          // 如果启用了回退响应，提供空历史列表
          if (this.config.fallbackResponses) {
            resolve({
              data: [],
              total: 0,
              offset: params.offset || 0,
              pageSize: params.pageSize || 20,
            })
          } else {
            // 否则拒绝请求
            reject(new Error("Device is offline and no fallback response available"))
          }
        })
      }

      this.log("debug", "GetHistories request:", params)

      // 使用优化器发送请求
      const response = await this.optimizer.request<Response>(
        endpoint,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.config.apiKey}`,
          },
          body: JSON.stringify(restParams),
        },
        {
          priority,
          cacheKey,
          cacheTTL: 60 * 1000, // 1分钟缓存
          cacheTags: ["histories", params.appId],
          timeout,
          bypassCache,
        },
      )

      // 解析JSON响应
      const result = await response.json()

      // 更新统计信息
      this.successCount++

      return result
    } catch (error) {
      this.log("error", "GetHistories request failed:", error)
      this.errorCount++

      // 如果启用了回退响应，提供空历史列表
      if (this.config.fallbackResponses) {
        return {
          data: [],
          total: 0,
          offset: params.offset || 0,
          pageSize: params.pageSize || 20,
        }
      }

      throw error
    }
  }

  /**
   * 获取聊天记录
   * @param params 参数
   * @returns 响应
   */
  public async getChatRecords(params: {
    appId: string
    chatId: string
    offset?: number
    pageSize?: number
    loadCustomFeedbacks?: boolean
    priority?: RequestPriority
    bypassCache?: boolean
    timeout?: number
  }): Promise<any> {
    const { priority = RequestPriority.LOW, bypassCache = false, timeout = this.config.timeout, ...restParams } = params
    const endpoint = this.getApiUrl("/api/core/chat/getPaginationRecords")

    // 更新最后活动时间
    this.lastActivity = Date.now()
    this.requestCount++

    try {
      // 生成缓存键
      const cacheKey =
        this.config.cacheEnabled && !bypassCache
          ? `chat-records:${params.appId}:${params.chatId}:${params.offset || 0}:${params.pageSize || 20}`
          : undefined

      // 如果离线且启用了离线支持，添加到离线队列
      if (!this.isOnline && this.config.offlineSupport) {
        return new Promise((resolve, reject) => {
          this.offlineQueue.push({
            method: "POST",
            endpoint,
            payload: params,
            resolve,
            reject,
            timestamp: Date.now(),
            priority,
          })

          this.log("info", "Added request to offline queue, queue size:", this.offlineQueue.length)

          // 如果启用了回退响应，提供空记录列表
          if (this.config.fallbackResponses) {
            resolve({
              data: [],
              total: 0,
              offset: params.offset || 0,
              pageSize: params.pageSize || 20,
            })
          } else {
            // 否则拒绝请求
            reject(new Error("Device is offline and no fallback response available"))
          }
        })
      }

      this.log("debug", "GetChatRecords request:", params)

      // 使用优化器发送请求
      const response = await this.optimizer.request<Response>(
        endpoint,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.config.apiKey}`,
          },
          body: JSON.stringify(restParams),
        },
        {
          priority,
          cacheKey,
          cacheTTL: 60 * 1000, // 1分钟缓存
          cacheTags: ["chat-records", params.appId, params.chatId],
          timeout,
          bypassCache,
        },
      )

      // 解析JSON响应
      const result = await response.json()

      // 更新统计信息
      this.successCount++

      return result
    } catch (error) {
      this.log("error", "GetChatRecords request failed:", error)
      this.errorCount++

      // 如果启用了回退响应，提供空记录列表
      if (this.config.fallbackResponses) {
        return {
          data: [],
          total: 0,
          offset: params.offset || 0,
          pageSize: params.pageSize || 20,
        }
      }

      throw error
    }
  }

  /**
   * 获取统计信息
   */
  public getStats(): {
    requestCount: number
    successCount: number
    errorCount: number
    successRate: number
    offlineQueueSize: number
    isOnline: boolean
    lastActivity: number
    uptime: number
  } {
    return {
      requestCount: this.requestCount,
      successCount: this.successCount,
      errorCount: this.errorCount,
      successRate: this.requestCount > 0 ? this.successCount / this.requestCount : 1,
      offlineQueueSize: this.offlineQueue.length,
      isOnline: this.isOnline,
      lastActivity: this.lastActivity,
      uptime: Date.now() - this.startTime,
    }
  }

  /**
   * 清除缓存
   * @param tags 标签
   */
  public async clearCache(tags?: string[]): Promise<void> {
    try {
      if (tags && tags.length > 0) {
        // 清除指定标签的缓存
        for (const tag of tags) {
          await this.cacheManager.deleteByTag(tag)
        }
      } else {
        // 清除所有缓存
        await this.cacheManager.clear()
      }

      this.log("info", "Cache cleared", tags || "all")
    } catch (error) {
      this.log("error", "Error clearing cache:", error)
      throw error
    }
  }

  /**
   * 获取缓存统计信息
   */
  public async getCacheStats(): Promise<any> {
    try {
      return await this.cacheManager.getStats()
    } catch (error) {
      this.log("error", "Error getting cache stats:", error)
      throw error
    }
  }

  /**
   * 获取优化器统计信息
   */
  public getOptimizerStats(): any {
    try {
      return this.optimizer.getStats()
    } catch (error) {
      this.log("error", "Error getting optimizer stats:", error)
      throw error
    }
  }

  /**
   * 清理资源
   */
  public dispose(): void {
    // 移除事件监听器
    if (typeof window !== "undefined" && this.config.offlineSupport) {
      window.removeEventListener("online", this.handleOnline)
      window.removeEventListener("offline", this.handleOffline)
    }

    // 清空离线队列
    this.offlineQueue = []

    // 清空回退响应
    this.fallbackResponses.clear()

    this.log("info", "EnhancedFastGPTClient disposed")
  }

  /**
   * 处理在线状态变化
   */
  private handleOnline = (): void => {
    this.isOnline = true

    this.log("info", "Online, processing offline queue:", this.offlineQueue.length)

    // 处理离线队列
    const queue = [...this.offlineQueue]
    this.offlineQueue = []

    // 按优先级排序
    queue.sort((a, b) => b.priority - a.priority)

    for (const item of queue) {
      // 根据方法处理请求
      if (item.method === "POST") {
        if (item.endpoint === "/api/fastgpt/chat") {
          this.chat(item.payload).then(item.resolve).catch(item.reject)
        } else if (item.endpoint === "/api/fastgpt/init-chat") {
          this.initChat(item.payload).then(item.resolve).catch(item.reject)
        } else {
          // 其他请求
          this.optimizer.request(item.endpoint, item.payload).then(item.resolve).catch(item.reject)
        }
      }
    }
  }

  /**
   * 处理离线状态变化
   */
  private handleOffline = (): void => {
    this.isOnline = false

    this.log("info", "Offline")
  }

  /**
   * 获取API URL
   * @param path 路径
   * @returns API URL
   */
  private getApiUrl(path: string): string {
    if (this.config.useProxy) {
      return `/api/proxy${path}`
    }
    return `${this.config.baseUrl}${path}`
  }

  /**
   * 生成聊天缓存键
   * @param params 参数
   * @returns 缓存键
   */
  private generateChatCacheKey(params: any): string {
    // 提取消息内容
    const messages = params.messages || []
    const messagesKey = messages
      .map((msg: any) => `${msg.role}:${typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content)}`)
      .join("|")

    // 组合缓存键
    return `chat:${params.model || "default"}:${messagesKey}:${params.temperature || 0}:${params.max_tokens || 0}`
  }

  /**
   * 生成回退键
   * @param params 参数
   * @returns 回退键
   */
  private generateFallbackKey(params: any): string {
    // 对于聊天请求，使用最后一条用户消息作为键
    const messages = params.messages || []
    let lastUserMessage = ""

    // 从后往前查找最后一条用户消息
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") {
        lastUserMessage =
          typeof messages[i].content === "string" ? messages[i].content : JSON.stringify(messages[i].content)
        break
      }
    }

    // 如果找不到用户消息，使用模型作为键
    if (!lastUserMessage) {
      return `fallback:${params.model || "default"}`
    }

    // 使用消息的哈希作为键
    return `fallback:${params.model || "default"}:${this.hashString(lastUserMessage)}`
  }

  /**
   * 对字符串进行哈希
   * @param str 字符串
   * @returns 哈希
   */
  private hashString(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // 转换为32位整数
    }
    return hash.toString(16)
  }

  /**
   * 初始化回退响应
   */
  private initializeFallbackResponses(): void {
    // 初始化一些常见请求的回退响应

    // 默认初始化聊天响应
    const defaultInitChatResponse = {
      welcomeMessage: "欢迎使用AI助手。我现在处于离线模式，但我会尽力帮助您。",
      systemPrompt: "你是一个有用的AI助手。",
      suggestedQuestions: ["你能做什么？", "离线模式有哪些限制？", "什么时候会恢复在线？"],
    }

    this.fallbackResponses.set("init-chat:default:default", defaultInitChatResponse)

    // 默认聊天响应
    const defaultChatResponse: FastGPTResponse = {
      id: "offline-response",
      object: "chat.completion",
      created: Date.now(),
      model: "offline-model",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content:
              "我目前处于离线模式，无法连接到服务器。请检查您的网络连接，稍后再试。在此期间，我只能提供有限的帮助。",
          },
          finish_reason: "stop",
        },
      ],
      usage: {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      },
    }

    this.fallbackResponses.set("fallback:default", defaultChatResponse)
  }

  /**
   * 生成通用回退响应
   * @param params 参数
   * @returns 回退响应
   */
  private generateGenericFallbackResponse(params: any): FastGPTResponse {
    // 提取最后一条用户消息
    const messages = params.messages || []
    let lastUserMessage = ""

    // 从后往前查找最后一条用户消息
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") {
        lastUserMessage =
          typeof messages[i].content === "string" ? messages[i].content : JSON.stringify(messages[i].content)
        break
      }
    }

    // 根据用户消息生成简单的回复
    let responseContent = "我目前处于离线模式，无法连接到服务器。请检查您的网络连接，稍后再试。"

    if (lastUserMessage) {
      // 简单的关键词匹配
      if (lastUserMessage.includes("你好") || lastUserMessage.includes("嗨") || lastUserMessage.includes("hi")) {
        responseContent = "你好！我目前处于离线模式，但仍然可以为您提供一些基本帮助。"
      } else if (lastUserMessage.includes("帮助") || lastUserMessage.includes("help")) {
        responseContent = "在离线模式下，我只能提供有限的帮助。一旦网络恢复，我将能够更好地回答您的问题。"
      } else if (lastUserMessage.includes("时间") || lastUserMessage.includes("日期")) {
        const now = new Date()
        responseContent = `当前时间是 ${now.toLocaleString()}。请注意，我目前处于离线模式。`
      }
    }

    return {
      id: "offline-response-" + Date.now(),
      object: "chat.completion",
      created: Date.now(),
      model: "offline-model",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: responseContent,
          },
          finish_reason: "stop",
        },
      ],
      usage: {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      },
    }
  }

  /**
   * 生成通用初始化聊天回退响应
   * @param params 参数
   * @returns 回退响应
   */
  private generateGenericInitChatResponse(params: any): any {
    return {
      welcomeMessage: `欢迎使用${params.agent_id ? params.agent_id : "AI"}助手。我目前处于离线模式，但仍然可以为您提供一些基本帮助。`,
      systemPrompt: "你是一个有用的AI助手，目前处于离线模式。",
      suggestedQuestions: ["你能在离线模式下做什么？", "如何检查网络连接？", "离线模式有哪些限制？"],
    }
  }

  /**
   * 记录日志
   * @param level 日志级别
   * @param message 日志消息
   * @param data 附加数据
   */
  private log(level: "error" | "warn" | "info" | "debug", message: string, data?: any): void {
    // 根据配置的日志级别过滤日志
    const levelPriority = { error: 0, warn: 1, info: 2, debug: 3 }
    if (levelPriority[level] > levelPriority[this.config.logLevel]) {
      return
    }

    // 只有在调试模式下或错误日志才输出
    if (this.config.debug || level === "error") {
      const timestamp = new Date().toISOString()
      const formattedMessage = `[${timestamp}] [EnhancedFastGPTClient] [${level.toUpperCase()}] ${message}`

      switch (level) {
        case "error":
          console.error(formattedMessage, data)
          break
        case "warn":
          console.warn(formattedMessage, data)
          break
        case "info":
          console.info(formattedMessage, data)
          break
        case "debug":
          console.debug(formattedMessage, data)
          break
      }
    }
  }
}

// 创建单例实例
let enhancedFastGPTClientInstance: EnhancedFastGPTClient | null = null

export function getEnhancedFastGPTClient(config?: Partial<FastGPTClientConfig>): EnhancedFastGPTClient {
  if (!enhancedFastGPTClientInstance) {
    enhancedFastGPTClientInstance = new EnhancedFastGPTClient(config)
  } else if (config) {
    // 如果提供了新配置，销毁旧实例并创建新实例
    enhancedFastGPTClientInstance.dispose()
    enhancedFastGPTClientInstance = new EnhancedFastGPTClient(config)
  }

  return enhancedFastGPTClientInstance
}

// 创建默认实例
export const enhancedFastGPTClient = getEnhancedFastGPTClient({
  apiKey: "", // 空API密钥 - 将由服务器端提供
  baseUrl: process.env.NEXT_PUBLIC_FASTGPT_API_URL || "https://zktecoaihub.com",
  useProxy: true,
})
