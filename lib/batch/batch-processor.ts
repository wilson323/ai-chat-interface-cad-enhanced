/**
 * 智能批处理系统 - 合并相似请求以减少API调用
 * Smart Batch Processing System - Merge similar requests to reduce API calls
 */
import { getFastGPTOptimizer, RequestPriority } from "../api/fastgpt-optimizer"
import { getCacheManager } from "../cache/cache-manager"

// 批处理配置
export interface BatchProcessorConfig {
  enabled: boolean
  maxBatchSize: number
  maxWaitTime: number
  similarityThreshold: number
  debug: boolean
  logLevel: "error" | "warn" | "info" | "debug"
}

// 批处理项
interface BatchItem<T> {
  id: string
  payload: any
  resolve: (value: T) => void
  reject: (reason: any) => void
  timestamp: number
  priority: RequestPriority
  timeout?: NodeJS.Timeout
  maxWaitTime: number
}

// 批处理组
interface BatchGroup<T> {
  id: string
  items: BatchItem<T>[]
  processor: (items: BatchItem<T>[]) => Promise<T[]>
  timestamp: number
  processing: boolean
}

// 默认配置
const DEFAULT_CONFIG: BatchProcessorConfig = {
  enabled: true,
  maxBatchSize: 5,
  maxWaitTime: 50, // 50毫秒
  similarityThreshold: 0.8,
  debug: false,
  logLevel: "error",
}

export class BatchProcessor {
  private config: BatchProcessorConfig
  private groups: Map<string, BatchGroup<any>> = new Map()
  private optimizer = getFastGPTOptimizer()
  private cacheManager = getCacheManager()
  private processingCount = 0
  private batchedCount = 0
  private savedRequestsCount = 0
  private processingTimer: NodeJS.Timeout | null = null

  constructor(config: Partial<BatchProcessorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }

    this.log("info", "BatchProcessor initialized with config:", this.config)

    // 启动处理定时器
    this.startProcessingTimer()
  }

  /**
   * 添加批处理项
   * @param groupId 组ID
   * @param item 批处理项
   * @param processor 处理器函数
   * @returns 处理结果Promise
   */
  public add<T>(
    groupId: string,
    item: {
      id: string
      payload: any
      priority?: RequestPriority
      maxWaitTime?: number
    },
    processor: (items: BatchItem<T>[]) => Promise<T[]>,
  ): Promise<T> {
    if (!this.config.enabled) {
      // 如果批处理被禁用，直接处理单个项
      return this.processSingleItem(item, processor)
    }

    return new Promise<T>((resolve, reject) => {
      const priority = item.priority || RequestPriority.NORMAL
      const maxWaitTime = item.maxWaitTime || this.config.maxWaitTime

      // 创建批处理项
      const batchItem: BatchItem<T> = {
        id: item.id,
        payload: item.payload,
        resolve,
        reject,
        timestamp: Date.now(),
        priority,
        maxWaitTime,
      }

      // 设置超时处理
      batchItem.timeout = setTimeout(() => {
        this.processItemTimeout(groupId, batchItem)
      }, maxWaitTime)

      // 获取或创建批处理组
      let group = this.groups.get(groupId) as BatchGroup<T>
      if (!group) {
        group = {
          id: groupId,
          items: [],
          processor,
          timestamp: Date.now(),
          processing: false,
        }
        this.groups.set(groupId, group)
      }

      // 添加项到组
      group.items.push(batchItem)
      this.log("debug", `Added item to batch group ${groupId}, current size: ${group.items.length}`)

      // 如果达到最大批处理大小，立即处理
      if (group.items.length >= this.config.maxBatchSize) {
        this.processGroup(groupId)
      }
    })
  }

  /**
   * 获取统计信息
   */
  public getStats(): {
    groupCount: number
    processingCount: number
    batchedCount: number
    savedRequestsCount: number
    efficiency: number
  } {
    return {
      groupCount: this.groups.size,
      processingCount: this.processingCount,
      batchedCount: this.batchedCount,
      savedRequestsCount: this.savedRequestsCount,
      efficiency: this.batchedCount > 0 ? this.savedRequestsCount / this.batchedCount : 0,
    }
  }

  /**
   * 清除所有批处理组
   */
  public clear(): void {
    // 取消所有超时
    for (const group of this.groups.values()) {
      for (const item of group.items) {
        if (item.timeout) {
          clearTimeout(item.timeout)
        }
      }
    }

    // 清除所有组
    this.groups.clear()
    this.log("info", "All batch groups cleared")
  }

  /**
   * 处理单个项
   * @param item 项
   * @param processor 处理器函数
   * @returns 处理结果Promise
   */
  private async processSingleItem<T>(
    item: {
      id: string
      payload: any
      priority?: RequestPriority
      maxWaitTime?: number
    },
    processor: (items: BatchItem<T>[]) => Promise<T[]>,
  ): Promise<T> {
    const batchItem: BatchItem<T> = {
      id: item.id,
      payload: item.payload,
      resolve: () => {},
      reject: () => {},
      timestamp: Date.now(),
      priority: item.priority || RequestPriority.NORMAL,
      maxWaitTime: item.maxWaitTime || this.config.maxWaitTime,
    }

    try {
      const results = await processor([batchItem])
      return results[0]
    } catch (error) {
      this.log("error", "Error processing single item:", error)
      throw error
    }
  }

  /**
   * 处理项超时
   * @param groupId 组ID
   * @param item 批处理项
   */
  private processItemTimeout<T>(groupId: string, item: BatchItem<T>): void {
    const group = this.groups.get(groupId) as BatchGroup<T>
    if (!group) return

    // 如果组正在处理中，不做任何操作
    if (group.processing) return

    // 查找项在组中的索引
    const index = group.items.findIndex((i) => i.id === item.id)
    if (index === -1) return

    // 从组中移除项
    const [removedItem] = group.items.splice(index, 1)

    // 清除超时
    if (removedItem.timeout) {
      clearTimeout(removedItem.timeout)
    }

    // 单独处理该项
    this.processSingleItem(
      {
        id: removedItem.id,
        payload: removedItem.payload,
        priority: removedItem.priority,
      },
      group.processor,
    )
      .then((result) => {
        removedItem.resolve(result)
      })
      .catch((error) => {
        removedItem.reject(error)
      })

    this.log("debug", `Item ${item.id} timed out and processed individually`)
  }

  /**
   * 处理批处理组
   * @param groupId 组ID
   */
  private async processGroup<T>(groupId: string): Promise<void> {
    const group = this.groups.get(groupId) as BatchGroup<T>
    if (!group || group.processing || group.items.length === 0) return

    // 标记组为处理中
    group.processing = true

    // 获取要处理的项
    const items = [...group.items]
    group.items = []

    // 清除所有超时
    for (const item of items) {
      if (item.timeout) {
        clearTimeout(item.timeout)
      }
    }

    // 更新统计信息
    this.processingCount++
    this.batchedCount += items.length
    this.savedRequestsCount += items.length - 1

    this.log("info", `Processing batch group ${groupId} with ${items.length} items`)

    try {
      // 处理批处理组
      const results = await group.processor(items)

      // 确保结果数量与项数量匹配
      if (results.length !== items.length) {
        throw new Error(`Batch processor returned ${results.length} results for ${items.length} items`)
      }

      // 解析每个项的结果
      for (let i = 0; i < items.length; i++) {
        items[i].resolve(results[i])
      }

      this.log("debug", `Successfully processed batch group ${groupId}`)
    } catch (error) {
      this.log("error", `Error processing batch group ${groupId}:`, error)

      // 拒绝所有项
      for (const item of items) {
        item.reject(error)
      }
    } finally {
      // 更新统计信息
      this.processingCount--

      // 如果组中还有项，继续处理
      if (this.groups.has(groupId)) {
        const updatedGroup = this.groups.get(groupId) as BatchGroup<T>
        updatedGroup.processing = false

        if (updatedGroup.items.length > 0) {
          // 延迟处理，避免递归调用堆栈溢出
          setTimeout(() => {
            this.processGroup(groupId)
          }, 0)
        }
      }
    }
  }

  /**
   * 启动处理定时器
   */
  private startProcessingTimer(): void {
    // 每10毫秒检查一次是否有需要处理的组
    this.processingTimer = setInterval(() => {
      const now = Date.now()

      // 检查每个组
      for (const [groupId, group] of this.groups.entries()) {
        // 如果组正在处理中或没有项，跳过
        if (group.processing || group.items.length === 0) continue

        // 检查是否有项已经等待足够长时间
        const oldestItem = group.items.reduce((oldest, item) => {
          return item.timestamp < oldest.timestamp ? item : oldest
        }, group.items[0])

        if (now - oldestItem.timestamp >= oldestItem.maxWaitTime) {
          this.processGroup(groupId)
        }
      }
    }, 10)
  }

  /**
   * 停止处理定时器
   */
  public dispose(): void {
    if (this.processingTimer) {
      clearInterval(this.processingTimer)
      this.processingTimer = null
    }

    this.clear()
    this.log("info", "BatchProcessor disposed")
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
      const formattedMessage = `[${timestamp}] [BatchProcessor] [${level.toUpperCase()}] ${message}`

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
let batchProcessorInstance: BatchProcessor | null = null

export function getBatchProcessor(config?: Partial<BatchProcessorConfig>): BatchProcessor {
  if (!batchProcessorInstance) {
    batchProcessorInstance = new BatchProcessor(config)
  } else if (config) {
    // 如果提供了新配置，销毁旧实例并创建新实例
    batchProcessorInstance.dispose()
    batchProcessorInstance = new BatchProcessor(config)
  }

  return batchProcessorInstance
}
