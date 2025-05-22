/**
 * 同步管理器 - 负责客户端和服务器之间的数据同步
 * Sync Manager - Responsible for data synchronization between client and server
 */
import { BehaviorSubject, type Observable, Subject, debounceTime, filter } from "rxjs"
import { v4 as uuidv4 } from "uuid"

// 同步状态
export type SyncStatus = "idle" | "syncing" | "success" | "error" | "offline"

// 同步项
export interface SyncItem {
  id: string
  type: string
  data: any
  timestamp: number
  priority: number
  retries: number
  status: SyncStatus
}

// 同步管理器配置
export interface SyncManagerConfig {
  endpoint: string
  debounceTime: number
  maxRetries: number
  batchSize: number
  syncInterval: number
  offlineStorage: boolean
  apiKey?: string
}

// 默认配置
const DEFAULT_CONFIG: SyncManagerConfig = {
  endpoint: "/api/sync",
  debounceTime: 500,
  maxRetries: 5,
  batchSize: 10,
  syncInterval: 5000,
  offlineStorage: true,
}

export class SyncManager {
  private config: SyncManagerConfig
  private queue: SyncItem[] = []
  private statusSubject = new BehaviorSubject<SyncStatus>("idle")
  private syncSubject = new Subject<SyncItem[]>()
  private intervalId: NodeJS.Timeout | null = null
  private isOnline = true
  private pendingChanges = new BehaviorSubject<number>(0)

  constructor(config: Partial<SyncManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }

    // 设置自动同步
    this.syncSubject
      .pipe(
        debounceTime(this.config.debounceTime),
        filter(() => this.isOnline),
      )
      .subscribe(async (items) => {
        await this.processBatch(items)
      })

    // 监听在线状态
    if (typeof window !== "undefined") {
      window.addEventListener("online", this.handleOnline)
      window.addEventListener("offline", this.handleOffline)
      this.isOnline = navigator.onLine
    }

    // 启动定时同步
    this.startSyncInterval()
  }

  // 获取同步状态
  public getStatus(): Observable<SyncStatus> {
    return this.statusSubject.asObservable()
  }

  // 获取待同步项数量
  public getPendingCount(): Observable<number> {
    return this.pendingChanges.asObservable()
  }

  // 添加同步项
  public addItem(type: string, data: any, priority = 1): string {
    const id = uuidv4()
    const item: SyncItem = {
      id,
      type,
      data,
      timestamp: Date.now(),
      priority,
      retries: 0,
      status: "idle",
    }

    this.queue.push(item)
    this.pendingChanges.next(this.queue.length)

    // 如果启用了离线存储，保存到本地
    if (this.config.offlineStorage && typeof localStorage !== "undefined") {
      this.saveToLocalStorage()
    }

    // 触发同步
    this.triggerSync()

    return id
  }

  // 触发同步
  private triggerSync(): void {
    if (this.queue.length === 0) return

    // 按优先级和时间戳排序
    const sortedItems = [...this.queue]
      .sort((a, b) => b.priority - a.priority || a.timestamp - b.timestamp)
      .slice(0, this.config.batchSize)

    this.syncSubject.next(sortedItems)
  }

  // 处理批量同步
  private async processBatch(items: SyncItem[]): Promise<void> {
    if (items.length === 0) return

    this.statusSubject.next("syncing")

    try {
      const itemIds = items.map((item) => item.id)
      const payload = {
        items: items.map(({ id, type, data, timestamp }) => ({
          id,
          type,
          data,
          timestamp,
        })),
      }

      const response = await fetch(this.config.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : {}),
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.statusText}`)
      }

      const result = await response.json()

      // 处理成功同步的项
      if (result.success) {
        // 从队列中移除已同步的项
        this.queue = this.queue.filter((item) => !itemIds.includes(item.id))
        this.pendingChanges.next(this.queue.length)

        // 更新本地存储
        if (this.config.offlineStorage && typeof localStorage !== "undefined") {
          this.saveToLocalStorage()
        }

        this.statusSubject.next("success")
      } else {
        // 增加重试次数
        this.queue = this.queue.map((item) => {
          if (itemIds.includes(item.id)) {
            return {
              ...item,
              retries: item.retries + 1,
              status: item.retries >= this.config.maxRetries ? "error" : "idle",
            }
          }
          return item
        })

        this.statusSubject.next("error")
      }
    } catch (error) {
      console.error("Sync error:", error)

      // 增加重试次数
      this.queue = this.queue.map((item) => {
        if (items.find((i) => i.id === item.id)) {
          return {
            ...item,
            retries: item.retries + 1,
            status: item.retries >= this.config.maxRetries ? "error" : "idle",
          }
        }
        return item
      })

      this.statusSubject.next("error")
    }

    // 如果队列中还有项，继续同步
    if (this.queue.length > 0) {
      this.triggerSync()
    }
  }

  // 启动定时同步
  private startSyncInterval(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
    }

    this.intervalId = setInterval(() => {
      if (this.isOnline && this.queue.length > 0) {
        this.triggerSync()
      }
    }, this.config.syncInterval)
  }

  // 停止定时同步
  public stopSyncInterval(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  // 处理在线状态变化
  private handleOnline = (): void => {
    this.isOnline = true
    this.statusSubject.next("idle")

    // 恢复在线后立即同步
    if (this.queue.length > 0) {
      this.triggerSync()
    }
  }

  // 处理离线状态变化
  private handleOffline = (): void => {
    this.isOnline = false
    this.statusSubject.next("offline")
  }

  // 保存到本地存储
  private saveToLocalStorage(): void {
    try {
      localStorage.setItem("sync_queue", JSON.stringify(this.queue))
    } catch (error) {
      console.error("Error saving to localStorage:", error)
    }
  }

  // 从本地存储加载
  public loadFromLocalStorage(): void {
    try {
      const stored = localStorage.getItem("sync_queue")
      if (stored) {
        this.queue = JSON.parse(stored)
        this.pendingChanges.next(this.queue.length)

        // 过滤掉已达到最大重试次数的项
        this.queue = this.queue.filter((item) => item.retries < this.config.maxRetries)
      }
    } catch (error) {
      console.error("Error loading from localStorage:", error)
    }
  }

  // 清理资源
  public dispose(): void {
    this.stopSyncInterval()

    if (typeof window !== "undefined") {
      window.removeEventListener("online", this.handleOnline)
      window.removeEventListener("offline", this.handleOffline)
    }
  }
}

// 创建单例实例
let syncManagerInstance: SyncManager | null = null

export function getSyncManager(config?: Partial<SyncManagerConfig>): SyncManager {
  if (!syncManagerInstance) {
    syncManagerInstance = new SyncManager(config)

    // 从本地存储加载
    if (typeof window !== "undefined") {
      syncManagerInstance.loadFromLocalStorage()
    }
  }

  return syncManagerInstance
}
