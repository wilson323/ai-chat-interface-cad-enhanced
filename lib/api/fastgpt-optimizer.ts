/**
 * FastGPT请求优化器 - 减少FastGPT请求并提高性能
 * FastGPT Request Optimizer - Reduces FastGPT requests and improves performance
 *
 * 特性:
 * - 请求优先级队列
 * - 请求批处理和合并
 * - 自动重试和错误处理
 * - 断路器模式防止级联故障
 * - 请求超时和取消
 * - 详细的统计和监控
 */
import { getCacheManager } from "../cache/cache-manager"
import { v4 as uuidv4 } from "uuid"

// 请求优先级
export enum RequestPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  CRITICAL = 3,
}

// 请求状态
export enum RequestStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
  CANCELED = "canceled",
}

// 请求项
export interface RequestItem {
  id: string
  priority: RequestPriority
  status: RequestStatus
  timestamp: number
  retries: number
  payload: any
  resolve: (value: any) => void
  reject: (reason: any) => void
  cacheKey?: string
  cacheTTL?: number
  cacheTags?: string[]
  timeout?: number
  timeoutId?: NodeJS.Timeout
  endpoint: string
  startTime?: number
  endTime?: number
  responseTime?: number
  error?: any
  bypassCircuitBreaker?: boolean
}

// 优化器配置
export interface OptimizerConfig {
  maxConcurrentRequests: number // 最大并发请求数
  maxQueueSize: number // 最大队列大小
  requestTimeout: number // 请求超时时间（毫秒）
  retryDelay: number // 重试延迟（毫秒）
  maxRetries: number // 最大重试次数
  batchingEnabled: boolean // 是否启用批处理
  batchingWindow: number // 批处理窗口（毫秒）
  batchingMaxSize: number // 批处理最大大小
  circuitBreakerEnabled: boolean // 是否启用断路器
  circuitBreakerThreshold: number // 断路器阈值
  circuitBreakerResetTimeout: number // 断路器重置超时（毫秒）
  cacheEnabled: boolean // 是否启用缓存
  cacheTTL: number // 缓存TTL（毫秒）
  healthCheckInterval: number // 健康检查间隔（毫秒）
  debug: boolean // 是否启用调试
  logLevel: "error" | "warn" | "info" | "debug" // 日志级别
}

// 默认配置
const DEFAULT_CONFIG: OptimizerConfig = {
  maxConcurrentRequests: 5,
  maxQueueSize: 100,
  requestTimeout: 30000, // 30秒
  retryDelay: 1000, // 1秒
  maxRetries: 3,
  batchingEnabled: true,
  batchingWindow: 50, // 50毫秒
  batchingMaxSize: 5,
  circuitBreakerEnabled: true,
  circuitBreakerThreshold: 5,
  circuitBreakerResetTimeout: 30000, // 30秒
  cacheEnabled: true,
  cacheTTL: 5 * 60 * 1000, // 5分钟
  healthCheckInterval: 60000, // 1分钟
  debug: false,
  logLevel: "error",
}

export class FastGPTOptimizer {
  private config: OptimizerConfig
  private requestQueue: RequestItem[] = []
  private activeRequests = 0
  private batchingTimeout: ReturnType<typeof setTimeout> | null = null
  private batchingQueue: Map<string, RequestItem[]> = new Map()
  private failureCount = 0
  private circuitOpen = false
  private circuitResetTimeout: NodeJS.Timeout | null = null
  private cacheManager = getCacheManager()
  private requestCount = 0
  private successCount = 0
  private failureRate = 0
  private averageResponseTime = 0
  private totalResponseTime = 0
  private healthCheckInterval: NodeJS.Timeout | null = null
  private lastHealthCheck = Date.now()
  private isHealthy = true
  private startTime = Date.now()
  private requestHistory: {
    timestamp: number
    endpoint: string
    success: boolean
    responseTime?: number
    error?: string
  }[] = []
  private readonly MAX_HISTORY_SIZE = 100

  constructor(config: Partial<OptimizerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }

    this.log("info", "FastGPTOptimizer initialized with config:", this.config)

    // 启动健康检查
    if (this.config.healthCheckInterval > 0) {
      this.healthCheckInterval = setInterval(() => {
        this.performHealthCheck()
      }, this.config.healthCheckInterval)
    }

    // 定期清理请求历史
    setInterval(() => {
      this.cleanupRequestHistory()
    }, 60000) // 每分钟清理一次
  }

  /**
   * 发送请求
   * @param endpoint 端点
   * @param payload 请求负载
   * @param options 选项
   * @returns 响应
   */
  public async request<T>(
    endpoint: string,
    payload: any,
    options: {
      priority?: RequestPriority
      cacheKey?: string
      cacheTTL?: number
      cacheTags?: string[]
      timeout?: number
      bypassCache?: boolean
      bypassCircuitBreaker?: boolean
      bypassQueue?: boolean
      retries?: number
    } = {},
  ): Promise<T> {
    const {
      priority = RequestPriority.NORMAL,
      cacheKey,
      cacheTTL = this.config.cacheTTL,
      cacheTags,
      timeout = this.config.requestTimeout,
      bypassCache = false,
      bypassCircuitBreaker = false,
      bypassQueue = false,
      retries = this.config.maxRetries,
    } = options

    // 生成请求ID
    const requestId = uuidv4()
    const requestStartTime = Date.now()

    try {
      // 检查断路器
      if (this.config.circuitBreakerEnabled && this.circuitOpen && !bypassCircuitBreaker) {
        const error = new Error("Circuit breaker is open, request rejected")
        this.recordRequest(endpoint, false, 0, error.message)
        throw error
      }

      // 检查健康状态
      if (!this.isHealthy && !bypassCircuitBreaker) {
        const error = new Error("Service is unhealthy, request rejected")
        this.recordRequest(endpoint, false, 0, error.message)
        throw error
      }

      // 检查缓存
      const effectiveCacheKey = cacheKey || this.generateCacheKey(endpoint, payload)
      if (this.config.cacheEnabled && !bypassCache) {
        try {
          const cachedResult = await this.cacheManager.get<T>(effectiveCacheKey)
          if (cachedResult) {
            this.log("debug", `Cache hit for ${effectiveCacheKey}`)
            this.recordRequest(endpoint, true, 0)
            return cachedResult
          }
        } catch (error) {
          this.log("error", `Cache error for ${effectiveCacheKey}: ${error instanceof Error ? error.message : String(error)}`)
        }
      }

      // 如果启用了批处理，尝试批处理请求
      if (this.config.batchingEnabled && this.canBatch(endpoint, payload)) {
        return this.batchRequest<T>(endpoint, payload, {
          priority,
          cacheKey: effectiveCacheKey,
          cacheTTL,
          cacheTags,
          timeout,
          bypassCircuitBreaker,
        })
      }

      // 如果绕过队列，直接发送请求
      if (bypassQueue) {
        const result = await this.executeRequest<T>(endpoint, payload, {
          cacheKey: effectiveCacheKey,
          cacheTTL,
          cacheTags,
        })

        const responseTime = Date.now() - requestStartTime
        this.recordRequest(endpoint, true, responseTime)

        return result
      }

      // 创建一个Promise，将其添加到队列中
      return new Promise<T>((resolve, reject) => {
        // 检查队列大小
        if (this.requestQueue.length >= this.config.maxQueueSize) {
          // 如果队列已满，拒绝低优先级请求
          if (priority < RequestPriority.HIGH) {
            const error = new Error("Request queue is full, request rejected")
            this.recordRequest(endpoint, false, 0, error.message)
            reject(error)
            return
          }
          // 对于高优先级请求，移除最低优先级的请求
          this.removeLowestPriorityRequest()
        }

        // 创建请求项
        const requestItem: RequestItem = {
          id: requestId,
          priority,
          status: RequestStatus.PENDING,
          timestamp: Date.now(),
          retries: 0,
          payload,
          resolve,
          reject,
          cacheKey: effectiveCacheKey,
          cacheTTL,
          cacheTags,
          timeout,
          endpoint,
          bypassCircuitBreaker,
        }

        // 设置超时
        if (timeout > 0) {
          requestItem.timeoutId = setTimeout(() => {
            this.handleRequestTimeout(requestId)
          }, timeout)
        }

        // 添加到队列
        this.requestQueue.push(requestItem)

        // 按优先级和时间戳排序
        this.sortQueue()

        this.log("debug", `Added request ${requestId} to queue, queue size: ${this.requestQueue.length}`)

        // 尝试处理队列
        this.processQueue()
      })
    } catch (error) {
      // 记录请求失败
      const responseTime = Date.now() - requestStartTime
      this.recordRequest(endpoint, false, responseTime, error instanceof Error ? error.message : String(error))

      throw error
    }
  }

  /**
   * 取消请求
   * @param requestId 请求ID
   * @returns 是否成功取消
   */
  public cancelRequest(requestId: string): boolean {
    // 查找请求
    const index = this.requestQueue.findIndex((item) => item.id === requestId)
    if (index === -1) return false

    const requestItem = this.requestQueue[index]

    // 清除超时
    if (requestItem.timeoutId) {
      clearTimeout(requestItem.timeoutId)
    }

    // 从队列中移除
    this.requestQueue.splice(index, 1)

    // 更新状态
    requestItem.status = RequestStatus.CANCELED

    // 记录请求取消
    this.recordRequest(requestItem.endpoint, false, 0, "Request canceled")

    // 拒绝Promise
    requestItem.reject(new Error("Request canceled"))

    this.log("info", `Canceled request ${requestId}`)

    return true
  }

  /**
   * 获取统计信息
   */
  public getStats(): {
    queueSize: number
    activeRequests: number
    requestCount: number
    successCount: number
    failureRate: number
    averageResponseTime: number
    circuitBreakerOpen: boolean
    isHealthy: boolean
    uptime: number
  } {
    return {
      queueSize: this.requestQueue.length,
      activeRequests: this.activeRequests,
      requestCount: this.requestCount,
      successCount: this.successCount,
      failureRate: this.failureRate,
      averageResponseTime: this.averageResponseTime,
      circuitBreakerOpen: this.circuitOpen,
      isHealthy: this.isHealthy,
      uptime: Date.now() - this.startTime,
    }
  }

  /**
   * 获取请求历史
   */
  public getRequestHistory(): {
    timestamp: number
    endpoint: string
    success: boolean
    responseTime?: number
    error?: string
  }[] {
    return [...this.requestHistory]
  }

  /**
   * 清除所有请求
   */
  public clearQueue(): void {
    // 拒绝所有请求
    for (const requestItem of this.requestQueue) {
      if (requestItem.timeoutId) {
        clearTimeout(requestItem.timeoutId)
      }
      requestItem.status = RequestStatus.CANCELED
      requestItem.reject(new Error("Queue cleared"))

      // 记录请求取消
      this.recordRequest(requestItem.endpoint, false, 0, "Queue cleared")
    }

    // 清空队列
    this.requestQueue = []

    this.log("info", "Cleared queue")
  }

  /**
   * 重置断路器
   */
  public resetCircuitBreaker(): void {
    this.failureCount = 0
    this.circuitOpen = false

    if (this.circuitResetTimeout) {
      clearTimeout(this.circuitResetTimeout)
      this.circuitResetTimeout = null
    }

    this.log("info", "Circuit breaker reset")
  }

  /**
   * 销毁优化器
   */
  public dispose(): void {
    // 清除所有定时器
    if (this.batchingTimeout) {
      clearTimeout(this.batchingTimeout)
      this.batchingTimeout = null
    }

    if (this.circuitResetTimeout) {
      clearTimeout(this.circuitResetTimeout)
      this.circuitResetTimeout = null
    }

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
      this.healthCheckInterval = null
    }

    // 清除所有请求
    this.clearQueue()

    this.log("info", "FastGPTOptimizer disposed")
  }

  /**
   * 处理请求队列
   */
  private processQueue(): void {
    // 如果断路器打开，不处理队列
    if (this.config.circuitBreakerEnabled && this.circuitOpen) {
      return
    }

    // 处理队列中的请求，直到达到最大并发请求数
    while (this.requestQueue.length > 0 && this.activeRequests < this.config.maxConcurrentRequests) {
      // 获取下一个请求
      const requestItem = this.requestQueue.shift()
      if (!requestItem) break

      // 更新状态
      requestItem.status = RequestStatus.PROCESSING
      requestItem.startTime = Date.now()
      this.activeRequests++

      // 处理请求
      this.processRequest(requestItem)
    }
  }

  /**
   * 处理单个请求
   * @param requestItem 请求项
   */
  private async processRequest(requestItem: RequestItem): Promise<void> {
    const { id, payload, resolve, reject, cacheKey, cacheTTL, cacheTags, endpoint } = requestItem

    try {
      this.log("debug", `Processing request ${id} to ${endpoint}`)

      // 执行请求
      const result = await this.executeRequest(endpoint, payload, {
        cacheKey,
        cacheTTL,
        cacheTags,
      })

      // 请求成功
      requestItem.endTime = Date.now()
      requestItem.responseTime = requestItem.endTime - (requestItem.startTime || requestItem.timestamp)
      requestItem.status = RequestStatus.COMPLETED

      this.handleRequestSuccess(id, result, requestItem.responseTime)
      resolve(result)

      // 记录请求成功
      this.recordRequest(endpoint, true, requestItem.responseTime)
    } catch (error) {
      // 请求失败
      requestItem.endTime = Date.now()
      requestItem.responseTime = requestItem.endTime - (requestItem.startTime || requestItem.timestamp)
      requestItem.error = error

      this.handleRequestFailure(requestItem, error, requestItem.responseTime)
    } finally {
      // 清除超时
      if (requestItem.timeoutId) {
        clearTimeout(requestItem.timeoutId)
      }

      // 更新活动请求数
      this.activeRequests--

      // 继续处理队列
      this.processQueue()
    }
  }

  /**
   * 执行请求
   * @param endpoint 端点
   * @param payload 请求负载
   * @param options 选项
   * @returns 响应
   */
  private async executeRequest<T>(
    endpoint: string,
    payload: any,
    options: {
      cacheKey?: string
      cacheTTL?: number
      cacheTags?: string[]
    } = {},
  ): Promise<T> {
    const { cacheKey, cacheTTL, cacheTags } = options

    try {
      // 实际发送请求
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()

      // 缓存结果
      if (this.config.cacheEnabled && cacheKey) {
        try {
          await this.cacheManager.set(cacheKey, result, {
            ttl: cacheTTL,
            tags: cacheTags,
          })
        } catch (error) {
          this.log("error", `Error caching result for ${cacheKey}: ${error instanceof Error ? error.message : String(error)}`)
        }
      }

      return result
    } catch (error) {
      this.log("error", `Error executing request to ${endpoint}: ${error instanceof Error ? error.message : String(error)}`)
      throw error
    }
  }

  /**
   * 处理请求成功
   * @param requestId 请求ID
   * @param result 结果
   * @param responseTime 响应时间
   */
  private handleRequestSuccess(requestId: string, result: any, responseTime: number): void {
    // 更新统计信息
    this.requestCount++
    this.successCount++
    this.failureRate = this.requestCount > 0 ? (this.requestCount - this.successCount) / this.requestCount : 0

    this.totalResponseTime += responseTime
    this.averageResponseTime = this.successCount > 0 ? this.totalResponseTime / this.successCount : 0

    // 重置失败计数
    if (this.config.circuitBreakerEnabled) {
      this.failureCount = Math.max(0, this.failureCount - 1) // 逐渐减少失败计数
    }

    this.log("debug", `Request ${requestId} succeeded in ${responseTime}ms`)
  }

  /**
   * 处理请求失败
   * @param requestItem 请求项
   * @param error 错误
   * @param responseTime 响应时间
   */
  private handleRequestFailure(requestItem: RequestItem, error: any, responseTime: number): void {
    const { id, retries, resolve, reject, payload, cacheKey, cacheTTL, cacheTags, endpoint, bypassCircuitBreaker } =
      requestItem

    // 更新统计信息
    this.requestCount++
    this.failureRate = this.requestCount > 0 ? (this.requestCount - this.successCount) / this.requestCount : 0

    this.log("error", `Request ${id} failed in ${responseTime}ms: ${error instanceof Error ? error.message : String(error)}`)

    // 记录请求失败
    this.recordRequest(endpoint, false, responseTime, error instanceof Error ? error.message : String(error))

    // 检查是否应该重试
    if (retries < this.config.maxRetries) {
      // 增加重试计数
      requestItem.retries++
      requestItem.status = RequestStatus.PENDING

      // 计算重试延迟（指数退避）
      const delay = this.config.retryDelay * Math.pow(2, retries)

      this.log("info", `Retrying request ${id} in ${delay}ms (retry ${retries + 1}/${this.config.maxRetries})`)

      // 延迟后重试
      setTimeout(() => {
        // 重新添加到队列
        this.requestQueue.push(requestItem)
        this.sortQueue()
        this.processQueue()
      }, delay)
    } else {
      // 超过最大重试次数，拒绝Promise
      requestItem.status = RequestStatus.FAILED
      reject(error)

      // 更新断路器
      if (this.config.circuitBreakerEnabled && !bypassCircuitBreaker) {
        this.failureCount++

        if (this.failureCount >= this.config.circuitBreakerThreshold) {
          this.openCircuitBreaker()
        }
      }
    }
  }

  /**
   * 处理请求超时
   * @param requestId 请求ID
   */
  private handleRequestTimeout(requestId: string): void {
    // 查找请求
    const index = this.requestQueue.findIndex((item) => item.id === requestId)
    if (index === -1) return

    const requestItem = this.requestQueue[index]

    // 从队列中移除
    this.requestQueue.splice(index, 1)

    // 更新状态
    requestItem.status = RequestStatus.FAILED
    const error = new Error(`Request timeout after ${requestItem.timeout}ms`)
    requestItem.error = error

    // 拒绝Promise
    requestItem.reject(error)

    this.log("warn", `Request ${requestId} timed out after ${requestItem.timeout}ms`)

    // 记录请求超时
    this.recordRequest(requestItem.endpoint, false, requestItem.timeout || 0, "Request timeout")

    // 更新统计信息
    this.requestCount++
    this.failureRate = this.requestCount > 0 ? (this.requestCount - this.successCount) / this.requestCount : 0

    // 更新断路器
    if (this.config.circuitBreakerEnabled && !requestItem.bypassCircuitBreaker) {
      this.failureCount++

      if (this.failureCount >= this.config.circuitBreakerThreshold) {
        this.openCircuitBreaker()
      }
    }
  }

  /**
   * 打开断路器
   */
  private openCircuitBreaker(): void {
    if (this.circuitOpen) return

    this.circuitOpen = true

    this.log("warn", "Circuit breaker opened")

    // 拒绝所有待处理的请求
    for (const requestItem of this.requestQueue) {
      if (requestItem.status === RequestStatus.PENDING && !requestItem.bypassCircuitBreaker) {
        if (requestItem.timeoutId) {
          clearTimeout(requestItem.timeoutId)
        }
        requestItem.status = RequestStatus.FAILED
        const error = new Error("Circuit breaker is open, request rejected")
        requestItem.error = error
        requestItem.reject(error)

        // 记录请求拒绝
        this.recordRequest(requestItem.endpoint, false, 0, "Circuit breaker open")
      }
    }

    // 清空队列
    this.requestQueue = this.requestQueue.filter(
      (item) => item.status !== RequestStatus.PENDING || item.bypassCircuitBreaker,
    )

    // 设置重置超时
    this.circuitResetTimeout = setTimeout(() => {
      this.resetCircuitBreaker()
    }, this.config.circuitBreakerResetTimeout)
  }

  /**
   * 批处理请求
   * @param endpoint 端点
   * @param payload 请求负载
   * @param options 选项
   * @returns 响应
   */
  private batchRequest<T>(
    endpoint: string,
    payload: any,
    options: {
      priority: RequestPriority
      cacheKey?: string
      cacheTTL?: number
      cacheTags?: string[]
      timeout?: number
      bypassCircuitBreaker?: boolean
    },
  ): Promise<T> {
    const { priority, cacheKey, cacheTTL, cacheTags, timeout, bypassCircuitBreaker } = options
    const batchKey = this.generateBatchKey(endpoint, payload)

    // 创建一个Promise，将其添加到批处理队列中
    return new Promise<T>((resolve, reject) => {
      // 创建请求项
      const requestItem: RequestItem = {
        id: uuidv4(),
        priority,
        status: RequestStatus.PENDING,
        timestamp: Date.now(),
        retries: 0,
        payload,
        resolve,
        reject,
        cacheKey,
        cacheTTL,
        cacheTags,
        timeout,
        endpoint,
        bypassCircuitBreaker,
      }

      // 设置超时
      if (timeout && timeout > 0) {
        requestItem.timeoutId = setTimeout(() => {
          // 从批处理队列中移除
          const batch = this.batchingQueue.get(batchKey) || []
          const index = batch.findIndex((item) => item.id === requestItem.id)
          if (index !== -1) {
            batch.splice(index, 1)
            if (batch.length === 0) {
              this.batchingQueue.delete(batchKey)
            } else {
              this.batchingQueue.set(batchKey, batch)
            }
          }

          // 拒绝Promise
          const error = new Error(`Request timeout after ${timeout}ms`)
          requestItem.error = error
          reject(error)

          // 记录请求超时
          this.recordRequest(endpoint, false, timeout, "Request timeout")
        }, timeout)
      }

      // 添加到批处理队列
      const batch = this.batchingQueue.get(batchKey) || []
      batch.push(requestItem)
      this.batchingQueue.set(batchKey, batch)

      // 如果这是第一个请求，设置批处理超时
      if (batch.length === 1) {
        this.scheduleBatch(batchKey)
      }
      // 如果达到最大批处理大小，立即处理
      else if (batch.length >= this.config.batchingMaxSize) {
        this.processBatch(batchKey)
      }
    })
  }

  /**
   * 安排批处理
   * @param batchKey 批处理键
   */
  private scheduleBatch(batchKey: string): void {
    if (this.batchingTimeout) {
      clearTimeout(this.batchingTimeout)
    }

    this.batchingTimeout = setTimeout(() => {
      this.processBatch(batchKey)
    }, this.config.batchingWindow)
  }

  /**
   * 处理批处理
   * @param batchKey 批处理键
   */
  private async processBatch(batchKey: string): Promise<void> {
    // 获取批处理队列
    const batch = this.batchingQueue.get(batchKey) || []
    if (batch.length === 0) return

    // 从队列中移除
    this.batchingQueue.delete(batchKey)

    this.log("info", `Processing batch of ${batch.length} requests`)

    // 合并请求
    const mergedPayload = this.mergeBatchPayloads(batch)
    const endpoint = batch[0].endpoint

    try {
      // 执行批处理请求
      const startTime = Date.now()
      const result = await this.executeRequest(endpoint, mergedPayload)
      const responseTime = Date.now() - startTime

      // 分发结果
      this.distributeBatchResults(batch, result, responseTime)

      // 记录批处理请求成功
      this.recordRequest(endpoint, true, responseTime, undefined, batch.length)
    } catch (error) {
      // 记录批处理请求失败
      this.recordRequest(endpoint, false, 0, error instanceof Error ? error.message : String(error), batch.length)

      // 处理错误
      for (const requestItem of batch) {
        // 清除超时
        if (requestItem.timeoutId) {
          clearTimeout(requestItem.timeoutId)
        }

        // 如果可以重试，添加到主队列
        if (requestItem.retries < this.config.maxRetries) {
          requestItem.retries++
          this.requestQueue.push(requestItem)
        } else {
          // 否则拒绝Promise
          requestItem.status = RequestStatus.FAILED
          requestItem.error = error
          requestItem.reject(error)
        }
      }

      // 更新断路器
      if (this.config.circuitBreakerEnabled) {
        this.failureCount++

        if (this.failureCount >= this.config.circuitBreakerThreshold) {
          this.openCircuitBreaker()
        }
      }

      // 处理队列
      this.sortQueue()
      this.processQueue()
    }
  }

  /**
   * 合并批处理负载
   * @param batch 批处理
   * @returns 合并的负载
   */
  private mergeBatchPayloads(batch: RequestItem[]): any {
    // 这里的实现取决于API的具体要求
    // 这只是一个示例，实际实现可能需要根据API调整
    const firstItem = batch[0]

    // 创建一个新的负载对象
    const mergedPayload = {
      ...firstItem.payload,
      batch: true,
      items: batch.map((item) => ({
        id: item.id,
        ...item.payload,
      })),
    }

    return mergedPayload
  }

  /**
   * 分发批处理结果
   * @param batch 批处理
   * @param result 结果
   * @param responseTime 响应时间
   */
  private distributeBatchResults(batch: RequestItem[], result: any, responseTime: number): void {
    // 这里的实现取决于API的具体响应格式
    // 这只是一个示例，实际实现可能需要根据API调整

    // 如果结果是一个数组，假设它与批处理项一一对应
    if (Array.isArray(result) && result.length === batch.length) {
      for (let i = 0; i < batch.length; i++) {
        const requestItem = batch[i]
        const itemResult = result[i]

        // 清除超时
        if (requestItem.timeoutId) {
          clearTimeout(requestItem.timeoutId)
        }

        // 缓存结果
        if (this.config.cacheEnabled && requestItem.cacheKey) {
          try {
            this.cacheManager.set(requestItem.cacheKey, itemResult, {
              ttl: requestItem.cacheTTL,
              tags: requestItem.cacheTags,
            })
          } catch (error) {
            this.log("error", `Error caching result for ${requestItem.cacheKey}: ${error instanceof Error ? error.message : String(error)}`)
          }
        }

        // 更新请求状态
        requestItem.status = RequestStatus.COMPLETED
        requestItem.responseTime = responseTime

        // 解析Promise
        requestItem.resolve(itemResult)

        // 更新统计信息
        this.handleRequestSuccess(requestItem.id, itemResult, responseTime)
      }
    }
    // 如果结果有一个items字段，假设它包含每个请求的结果
    else if (result.items && Array.isArray(result.items)) {
      for (const requestItem of batch) {
        // 查找对应的结果
        const itemResult = result.items.find((item: any) => item.id === requestItem.id)

        // 清除超时
        if (requestItem.timeoutId) {
          clearTimeout(requestItem.timeoutId)
        }

        if (itemResult) {
          // 缓存结果
          if (this.config.cacheEnabled && requestItem.cacheKey) {
            try {
              this.cacheManager.set(requestItem.cacheKey, itemResult, {
                ttl: requestItem.cacheTTL,
                tags: requestItem.cacheTags,
              })
            } catch (error) {
              this.log("error", `Error caching result for ${requestItem.cacheKey}: ${error instanceof Error ? error.message : String(error)}`)
            }
          }

          // 更新请求状态
          requestItem.status = RequestStatus.COMPLETED
          requestItem.responseTime = responseTime

          // 解析Promise
          requestItem.resolve(itemResult)

          // 更新统计信息
          this.handleRequestSuccess(requestItem.id, itemResult, responseTime)
        } else {
          // 如果找不到对应的结果，拒绝Promise
          requestItem.status = RequestStatus.FAILED
          const error = new Error("No result found for request")
          requestItem.error = error
          requestItem.reject(error)

          // 记录请求失败
          this.recordRequest(requestItem.endpoint, false, responseTime, "No result found for request")
        }
      }
    }
    // 否则，假设所有请求都得到相同的结果
    else {
      for (const requestItem of batch) {
        // 清除超时
        if (requestItem.timeoutId) {
          clearTimeout(requestItem.timeoutId)
        }

        // 缓存结果
        if (this.config.cacheEnabled && requestItem.cacheKey) {
          try {
            this.cacheManager.set(requestItem.cacheKey, result, {
              ttl: requestItem.cacheTTL,
              tags: requestItem.cacheTags,
            })
          } catch (error) {
            this.log("error", `Error caching result for ${requestItem.cacheKey}: ${error instanceof Error ? error.message : String(error)}`)
          }
        }

        // 更新请求状态
        requestItem.status = RequestStatus.COMPLETED
        requestItem.responseTime = responseTime

        // 解析Promise
        requestItem.resolve(result)

        // 更新统计信息
        this.handleRequestSuccess(requestItem.id, result, responseTime)
      }
    }
  }

  /**
   * 检查是否可以批处理
   * @param endpoint 端点
   * @param payload 负载
   * @returns 是否可以批处理
   */
  private canBatch(endpoint: string, payload: any): boolean {
    // 这里的实现取决于API的具体要求
    // 这只是一个示例，实际实现可能需要根据API调整

    // 检查端点是否支持批处理
    const batchableEndpoints = ["/api/fastgpt/chat", "/api/fastgpt/completions", "/api/fastgpt/embeddings"]

    return batchableEndpoints.includes(endpoint)
  }

  /**
   * 生成批处理键
   * @param endpoint 端点
   * @param payload 负载
   * @returns 批处理键
   */
  private generateBatchKey(endpoint: string, payload: any): string {
    // 这里的实现取决于API的具体要求
    // 这只是一个示例，实际实现可能需要根据API调整

    // 对于聊天请求，使用模型作为批处理键
    if (endpoint.includes("/chat")) {
      return `${endpoint}:${payload.model || "default"}`
    }

    // 对于其他请求，使用端点作为批处理键
    return endpoint
  }

  /**
   * 生成缓存键
   * @param endpoint 端点
   * @param payload 负载
   * @returns 缓存键
   */
  private generateCacheKey(endpoint: string, payload: any): string {
    // 对于聊天请求，使用消息内容和模型作为缓存键
    if (endpoint.includes("/chat")) {
      const messages = payload.messages || []
      const messagesKey = messages
        .map((msg: any) => `${msg.role}:${typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content)}`)
        .join("|")

      return `${endpoint}:${payload.model || "default"}:${messagesKey}`
    }

    // 对于其他请求，使用端点和负载的哈希作为缓存键
    return `${endpoint}:${this.hashPayload(payload)}`
  }

  /**
   * 对负载进行哈希
   * @param payload 负载
   * @returns 哈希
   */
  private hashPayload(payload: any): string {
    // 简单的哈希实现
    const str = JSON.stringify(payload)
    let hash = 0

    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // 转换为32位整数
    }

    return hash.toString(16)
  }

  /**
   * 按优先级和时间戳排序队列
   */
  private sortQueue(): void {
    this.requestQueue.sort((a, b) => {
      // 首先按优先级排序（高优先级在前）
      if (a.priority !== b.priority) {
        return b.priority - a.priority
      }
      // 然后按时间戳排序（早的在前）
      return a.timestamp - b.timestamp
    })
  }

  /**
   * 移除最低优先级的请求
   */
  private removeLowestPriorityRequest(): void {
    // 找到最低优先级的请求
    let lowestPriorityIndex = 0
    let lowestPriority = RequestPriority.CRITICAL

    for (let i = 0; i < this.requestQueue.length; i++) {
      if (this.requestQueue[i].priority < lowestPriority) {
        lowestPriority = this.requestQueue[i].priority
        lowestPriorityIndex = i
      }
    }

    // 移除请求
    const requestItem = this.requestQueue[lowestPriorityIndex]
    this.requestQueue.splice(lowestPriorityIndex, 1)

    // 清除超时
    if (requestItem.timeoutId) {
      clearTimeout(requestItem.timeoutId)
    }

    // 更新状态
    requestItem.status = RequestStatus.CANCELED
    const error = new Error("Request dropped due to queue overflow")
    requestItem.error = error

    // 拒绝Promise
    requestItem.reject(error)

    // 记录请求拒绝
    this.recordRequest(requestItem.endpoint, false, 0, "Queue overflow")

    this.log("warn", `Dropped request ${requestItem.id} due to queue overflow`)
  }

  /**
   * 执行健康检查
   */
  private async performHealthCheck(): Promise<void> {
    this.lastHealthCheck = Date.now()

    // 检查失败率
    const failureRateThreshold = 0.5 // 50%
    const isFailureRateHigh = this.failureRate > failureRateThreshold && this.requestCount > 10

    // 检查响应时间
    const responseTimeThreshold = 5000 // 5秒
    const isResponseTimeSlow = this.averageResponseTime > responseTimeThreshold && this.successCount > 10

    // 检查断路器状态
    const isCircuitBreakerOpen = this.circuitOpen

    // 更新健康状态
    const wasHealthy = this.isHealthy
    this.isHealthy = !isFailureRateHigh && !isResponseTimeSlow && !isCircuitBreakerOpen

    // 如果健康状态发生变化，记录日志
    if (wasHealthy !== this.isHealthy) {
      if (this.isHealthy) {
        this.log("info", "Service is now healthy")
      } else {
        this.log("warn", "Service is now unhealthy", {
          failureRate: this.failureRate,
          averageResponseTime: this.averageResponseTime,
          circuitBreakerOpen: this.circuitOpen,
        })
      }
    }
  }

  /**
   * 记录请求
   * @param endpoint 端点
   * @param success 是否成功
   * @param responseTime 响应时间
   * @param error 错误信息
   * @param batchSize 批处理大小
   */
  private recordRequest(
    endpoint: string,
    success: boolean,
    responseTime: number,
    error?: string,
    batchSize?: number,
  ): void {
    // 添加到请求历史
    this.requestHistory.push({
      timestamp: Date.now(),
      endpoint,
      success,
      responseTime,
      error,
    })

    // 如果是批处理请求，更新统计信息
    if (batchSize && batchSize > 1) {
      // 更新请求计数
      this.requestCount += batchSize

      if (success) {
        // 更新成功计数
        this.successCount += batchSize

        // 更新响应时间
        this.totalResponseTime += responseTime * batchSize
        this.averageResponseTime = this.successCount > 0 ? this.totalResponseTime / this.successCount : 0
      }

      // 更新失败率
      this.failureRate = this.requestCount > 0 ? (this.requestCount - this.successCount) / this.requestCount : 0
    }
  }

  /**
   * 清理请求历史
   */
  private cleanupRequestHistory(): void {
    // 如果历史记录超过最大大小，删除最旧的记录
    if (this.requestHistory.length > this.MAX_HISTORY_SIZE) {
      this.requestHistory = this.requestHistory.slice(-this.MAX_HISTORY_SIZE)
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
      const formattedMessage = `[${timestamp}] [FastGPTOptimizer] [${level.toUpperCase()}] ${message}`

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
let fastGPTOptimizerInstance: FastGPTOptimizer | null = null

export function getFastGPTOptimizer(config?: Partial<OptimizerConfig>): FastGPTOptimizer {
  if (!fastGPTOptimizerInstance) {
    fastGPTOptimizerInstance = new FastGPTOptimizer(config)
  } else if (config) {
    // 如果提供了新配置，销毁旧实例并创建新实例
    fastGPTOptimizerInstance.dispose()
    fastGPTOptimizerInstance = new FastGPTOptimizer(config)
  }

  return fastGPTOptimizerInstance
}

// 添加类型声明
declare global {
  interface NodeJS {
    Timeout: number
  }
}
