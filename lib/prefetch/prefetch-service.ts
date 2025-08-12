/**
 * 预取服务 - 提前加载可能需要的数据，减少用户等待时间
 * Prefetch Service - Preload potentially needed data to reduce user waiting time
 *
 * 特性:
 * - 基于用户行为的智能预取
 * - 可配置的预取规则和策略
 * - 低优先级后台加载
 * - 网络和资源感知
 * - 详细的统计和监控
 */
import { getEnhancedFastGPTClient } from "../api/fastgpt-enhanced"
import { RequestPriority } from "../api/fastgpt-optimizer"
import { getCacheManager } from "../cache/cache-manager"

// 预取规则类型
export interface PrefetchRule {
  id: string
  pattern: RegExp | string
  dependencies: string[]
  prefetchFn: () => Promise<any>
  condition?: () => boolean
  priority: RequestPriority
  ttl?: number
}

// 预取服务配置
export interface PrefetchServiceConfig {
  enabled: boolean
  maxConcurrentPrefetches: number
  networkConditions: {
    onlyWifi: boolean
    minBatteryLevel: number
  }
  throttleTime: number
  debug: boolean
  logLevel: "error" | "warn" | "info" | "debug"
}

// 默认配置
const DEFAULT_CONFIG: PrefetchServiceConfig = {
  enabled: true,
  maxConcurrentPrefetches: 2,
  networkConditions: {
    onlyWifi: true,
    minBatteryLevel: 20,
  },
  throttleTime: 500, // 500毫秒
  debug: false,
  logLevel: "error",
}

export class PrefetchService {
  private config: PrefetchServiceConfig
  private rules: PrefetchRule[] = []
  private activePrefetches = 0
  private prefetchQueue: PrefetchRule[] = []
  private client = getEnhancedFastGPTClient()
  private cacheManager = getCacheManager()
  private isNetworkSuitable = true
  private isBatterySuitable = true
  private prefetchCount = 0
  private successCount = 0
  private failureCount = 0
  private lastPrefetchTime = 0
  private throttleTimeout: NodeJS.Timeout | null = null
  private networkType: string | null = null

  constructor(config: Partial<PrefetchServiceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }

    // 初始化网络和电池状态监听
    if (typeof window !== "undefined") {
      this.initNetworkMonitoring()
      this.initBatteryMonitoring()
    }

    this.log("info", "PrefetchService initialized with config:", this.config)
  }

  /**
   * 添加预取规则
   * @param rule 预取规则
   */
  public addRule(rule: PrefetchRule): void {
    // 检查是否已存在相同ID的规则
    const existingIndex = this.rules.findIndex((r) => r.id === rule.id)
    if (existingIndex !== -1) {
      // 替换现有规则
      this.rules[existingIndex] = rule
      this.log("info", `Updated prefetch rule: ${rule.id}`)
    } else {
      // 添加新规则
      this.rules.push(rule)
      this.log("info", `Added prefetch rule: ${rule.id}`)
    }
  }

  /**
   * 移除预取规则
   * @param ruleId 规则ID
   * @returns 是否成功移除
   */
  public removeRule(ruleId: string): boolean {
    const initialLength = this.rules.length
    this.rules = this.rules.filter((rule) => rule.id !== ruleId)
    const removed = this.rules.length < initialLength

    if (removed) {
      this.log("info", `Removed prefetch rule: ${ruleId}`)
    }

    return removed
  }

  /**
   * 触发预取
   * @param path 路径或标识符
   */
  public trigger(path: string): void {
    if (!this.config.enabled) {
      return
    }

    // 检查网络和电池条件
    if (!this.checkConditions()) {
      this.log("debug", "Skipping prefetch due to unsuitable conditions")
      return
    }

    // 查找匹配的规则
    const matchingRules = this.findMatchingRules(path)
    if (matchingRules.length === 0) {
      return
    }

    this.log("debug", `Found ${matchingRules.length} matching rules for path: ${path}`)

    // 添加到预取队列
    for (const rule of matchingRules) {
      // 检查规则条件
      if (rule.condition && !rule.condition()) {
        continue
      }

      // 添加到队列
      this.prefetchQueue.push(rule)
    }

    // 节流处理
    this.throttlePrefetch()
  }

  /**
   * 获取统计信息
   */
  public getStats(): {
    activeRules: number
    activePrefetches: number
    queueSize: number
    prefetchCount: number
    successCount: number
    failureCount: number
    successRate: number
    isNetworkSuitable: boolean
    isBatterySuitable: boolean
    networkType: string | null
  } {
    return {
      activeRules: this.rules.length,
      activePrefetches: this.activePrefetches,
      queueSize: this.prefetchQueue.length,
      prefetchCount: this.prefetchCount,
      successCount: this.successCount,
      failureCount: this.failureCount,
      successRate: this.prefetchCount > 0 ? this.successCount / this.prefetchCount : 1,
      isNetworkSuitable: this.isNetworkSuitable,
      isBatterySuitable: this.isBatterySuitable,
      networkType: this.networkType,
    }
  }

  /**
   * 清空预取队列
   */
  public clearQueue(): void {
    this.prefetchQueue = []
    this.log("info", "Prefetch queue cleared")
  }

  /**
   * 启用预取服务
   */
  public enable(): void {
    this.config.enabled = true
    this.log("info", "Prefetch service enabled")
  }

  /**
   * 禁用预取服务
   */
  public disable(): void {
    this.config.enabled = false
    this.log("info", "Prefetch service disabled")
  }

  /**
   * 查找匹配的规则
   * @param path 路径或标识符
   * @returns 匹配的规则
   */
  private findMatchingRules(path: string): PrefetchRule[] {
    return this.rules.filter((rule) => {
      if (typeof rule.pattern === "string") {
        return rule.pattern === path
      } else {
        return rule.pattern.test(path)
      }
    })
  }

  /**
   * 节流预取处理
   */
  private throttlePrefetch(): void {
    if (this.throttleTimeout) {
      clearTimeout(this.throttleTimeout)
    }

    const now = Date.now()
    const timeSinceLastPrefetch = now - this.lastPrefetchTime

    if (timeSinceLastPrefetch >= this.config.throttleTime) {
      // 可以立即处理
      this.processPrefetchQueue()
      this.lastPrefetchTime = now
    } else {
      // 需要等待
      const waitTime = this.config.throttleTime - timeSinceLastPrefetch
      this.throttleTimeout = setTimeout(() => {
        this.processPrefetchQueue()
        this.lastPrefetchTime = Date.now()
      }, waitTime)
    }
  }

  /**
   * 处理预取队列
   */
  private processPrefetchQueue(): void {
    // 按优先级排序
    this.prefetchQueue.sort((a, b) => b.priority - a.priority)

    // 处理队列中的预取，直到达到最大并发预取数
    while (this.prefetchQueue.length > 0 && this.activePrefetches < this.config.maxConcurrentPrefetches) {
      const rule = this.prefetchQueue.shift()
      if (!rule) break

      // 执行预取
      this.executePrefetch(rule)
    }
  }

  /**
   * 执行预取
   * @param rule 预取规则
   */
  private async executePrefetch(rule: PrefetchRule): Promise<void> {
    this.activePrefetches++
    this.prefetchCount++

    try {
      this.log("debug", `Executing prefetch for rule: ${rule.id}`)

      // 执行预取函数
      await rule.prefetchFn()

      // 预取成功
      this.successCount++
      this.log("debug", `Prefetch successful for rule: ${rule.id}`)
    } catch (error) {
      // 预取失败
      this.failureCount++
      this.log("error", `Prefetch failed for rule: ${rule.id}:`, error)
    } finally {
      // 更新活动预取数
      this.activePrefetches--

      // 继续处理队列
      if (this.prefetchQueue.length > 0) {
        this.processPrefetchQueue()
      }
    }
  }

  /**
   * 检查预取条件
   * @returns 是否满足预取条件
   */
  private checkConditions(): boolean {
    // 检查网络条件
    if (this.config.networkConditions.onlyWifi && !this.isWifiConnected()) {
      return false
    }

    // 检查电池条件
    if (!this.isBatterySuitable) {
      return false
    }

    return this.isNetworkSuitable
  }

  /**
   * 检查是否连接到WiFi
   * @returns 是否连接到WiFi
   */
  private isWifiConnected(): boolean {
    // 在浏览器环境中检查
    if (typeof navigator !== "undefined" && navigator.connection) {
      const connection = navigator.connection as any
      return connection.type === "wifi"
    }

    // 默认假设连接到WiFi
    return true
  }

  /**
   * 初始化网络监控
   */
  private initNetworkMonitoring(): void {
    if (typeof navigator !== "undefined" && navigator.connection) {
      const connection = navigator.connection as any

      // 保存当前网络类型
      this.networkType = connection.type || null

      // 更新网络状态
      this.updateNetworkStatus()

      // 监听网络变化
      connection.addEventListener("change", () => {
        this.networkType = connection.type || null
        this.updateNetworkStatus()
      })
    }

    // 监听在线状态
    window.addEventListener("online", () => {
      this.isNetworkSuitable = true
      this.log("info", "Network is online")
    })

    window.addEventListener("offline", () => {
      this.isNetworkSuitable = false
      this.log("info", "Network is offline")
    })
  }

  /**
   * 更新网络状态
   */
  private updateNetworkStatus(): void {
    if (typeof navigator !== "undefined" && navigator.connection) {
      const connection = navigator.connection as any

      // 检查是否满足网络条件
      if (this.config.networkConditions.onlyWifi && connection.type !== "wifi") {
        this.isNetworkSuitable = false
        this.log("info", `Network type (${connection.type}) is not suitable for prefetching`)
      } else {
        this.isNetworkSuitable = true
        this.log("debug", `Network type (${connection.type}) is suitable for prefetching`)
      }
    }
  }

  /**
   * 初始化电池监控
   */
  private initBatteryMonitoring(): void {
    if (typeof navigator !== "undefined" && (navigator as any).getBattery) {
      ;(navigator as any).getBattery().then((battery: any) => {
        // 更新电池状态
        this.updateBatteryStatus(battery)

        // 监听电池变化
        battery.addEventListener("levelchange", () => {
          this.updateBatteryStatus(battery)
        })

        battery.addEventListener("chargingchange", () => {
          this.updateBatteryStatus(battery)
        })
      })
    }
  }

  /**
   * 更新电池状态
   * @param battery 电池对象
   */
  private updateBatteryStatus(battery: any): void {
    // 如果正在充电，则始终适合预取
    if (battery.charging) {
      this.isBatterySuitable = true
      return
    }

    // 检查电池电量
    const batteryLevel = battery.level * 100
    this.isBatterySuitable = batteryLevel >= this.config.networkConditions.minBatteryLevel

    if (!this.isBatterySuitable) {
      this.log("info", `Battery level (${batteryLevel.toFixed(0)}%) is too low for prefetching`)
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
      const formattedMessage = `[${timestamp}] [PrefetchService] [${level.toUpperCase()}] ${message}`

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
let prefetchServiceInstance: PrefetchService | null = null

export function getPrefetchService(config?: Partial<PrefetchServiceConfig>): PrefetchService {
  if (!prefetchServiceInstance) {
    prefetchServiceInstance = new PrefetchService(config)
  } else if (config) {
    // 如果提供了新配置，重新创建实例
    prefetchServiceInstance = new PrefetchService(config)
  }

  return prefetchServiceInstance
}

// 创建默认实例
export const prefetchService = getPrefetchService()

// 添加一些默认的预取规则
prefetchService.addRule({
  id: "init-chat",
  pattern: "/chat",
  dependencies: [],
  prefetchFn: async () => {
    const client = getEnhancedFastGPTClient()
    return client.initChat({
      priority: RequestPriority.LOW,
    })
  },
  priority: RequestPriority.LOW,
  ttl: 5 * 60 * 1000, // 5分钟
})

prefetchService.addRule({
  id: "chat-histories",
  pattern: "/chat",
  dependencies: ["init-chat"],
  prefetchFn: async () => {
    const client = getEnhancedFastGPTClient()
    return client.getHistories({
      appId: "default",
      priority: RequestPriority.LOW,
    })
  },
  priority: RequestPriority.LOW,
  ttl: 60 * 1000, // 1分钟
})
