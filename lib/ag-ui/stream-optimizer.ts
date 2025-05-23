/**
 * AG-UI流式响应优化器 - 提供高性能的事件流处理能力
 * AG-UI Stream Optimizer - Provides high-performance event stream processing
 * 
 * 本文件实现了AG-UI事件流的性能优化，包括事件批处理、缓冲优化、内存管理等
 * 调用关系: 被app/api/ag-ui/chat/route.ts使用，优化流式响应性能
 */

import type { BaseEvent, AgUIEvent } from './types'

// 流式优化配置
export interface StreamOptimizationConfig {
  bufferSize: number // 缓冲区大小 (默认: 8KB)
  chunkDelay: number // 块间延迟 (ms, 默认: 16ms = 60fps)
  typewriterSpeed: number // 打字机速度 (字符/秒, 默认: 120)
  batchSize: number // 批处理大小 (默认: 10)
  maxBuffer: number // 最大缓冲区 (默认: 64KB)
  debounceMs: number // 防抖延迟 (默认: 5ms)
}

// 默认配置
const DEFAULT_CONFIG: StreamOptimizationConfig = {
  bufferSize: 8192, // 8KB
  chunkDelay: 16, // 60fps
  typewriterSpeed: 120, // 每秒120字符
  batchSize: 10,
  maxBuffer: 65536, // 64KB
  debounceMs: 5,
}

// 性能指标
export interface PerformanceMetrics {
  totalEvents: number
  eventsPerSecond: number
  averageLatency: number
  bufferUtilization: number
  memoryUsage: number
  errorRate: number
  lastUpdate: number
}

// 事件批处理器
class EventBatcher {
  private events: AgUIEvent[] = []
  private timer: NodeJS.Timeout | null = null
  private config: StreamOptimizationConfig

  constructor(
    config: StreamOptimizationConfig,
    private onFlush: (events: AgUIEvent[]) => Promise<void>
  ) {
    this.config = config
  }

  add(event: AgUIEvent): void {
    this.events.push(event)

    // 如果达到批处理大小，立即刷新
    if (this.events.length >= this.config.batchSize) {
      this.flush()
      return
    }

    // 设置定时器
    if (!this.timer) {
      this.timer = setTimeout(() => {
        this.flush()
      }, this.config.debounceMs)
    }
  }

  private async flush(): Promise<void> {
    if (this.events.length === 0) return

    const eventsToFlush = [...this.events]
    this.events = []

    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }

    try {
      await this.onFlush(eventsToFlush)
    } catch (error) {
      console.error('Error flushing events:', error)
      // 重新加入队列（可选的错误恢复机制）
      this.events.unshift(...eventsToFlush)
    }
  }

  destroy(): void {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    this.events = []
  }
}

// 打字机效果控制器
class TypewriterController {
  private config: StreamOptimizationConfig
  private contentBuffer: string = ''
  private isTyping: boolean = false
  private currentPosition: number = 0
  private timer: NodeJS.Timeout | null = null

  constructor(
    config: StreamOptimizationConfig,
    private onChunk: (chunk: string) => void
  ) {
    this.config = config
  }

  addContent(content: string): void {
    this.contentBuffer += content
    this.startTyping()
  }

  private startTyping(): void {
    if (this.isTyping || this.currentPosition >= this.contentBuffer.length) {
      return
    }

    this.isTyping = true
    this.typeNextChunk()
  }

  private typeNextChunk(): void {
    if (this.currentPosition >= this.contentBuffer.length) {
      this.isTyping = false
      return
    }

    // 计算每次输出的字符数（基于配置的打字机速度）
    const charsPerFrame = Math.max(1, Math.floor(this.config.typewriterSpeed / (1000 / this.config.chunkDelay)))
    const endPosition = Math.min(this.currentPosition + charsPerFrame, this.contentBuffer.length)
    
    const chunk = this.contentBuffer.slice(this.currentPosition, endPosition)
    this.currentPosition = endPosition

    if (chunk) {
      this.onChunk(chunk)
    }

    // 安排下一次输出
    this.timer = setTimeout(() => {
      this.typeNextChunk()
    }, this.config.chunkDelay)
  }

  reset(): void {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    this.contentBuffer = ''
    this.currentPosition = 0
    this.isTyping = false
  }

  destroy(): void {
    this.reset()
  }
}

// 流式响应优化器主类
export class StreamOptimizer {
  private config: StreamOptimizationConfig
  private batcher: EventBatcher
  private typewriter: TypewriterController
  private metrics: PerformanceMetrics
  private encoder = new TextEncoder()
  private startTime = Date.now()

  constructor(
    config: Partial<StreamOptimizationConfig> = {},
    private writer: WritableStreamDefaultWriter<Uint8Array>
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    
    // 初始化性能指标
    this.metrics = {
      totalEvents: 0,
      eventsPerSecond: 0,
      averageLatency: 0,
      bufferUtilization: 0,
      memoryUsage: 0,
      errorRate: 0,
      lastUpdate: Date.now(),
    }

    // 初始化事件批处理器
    this.batcher = new EventBatcher(this.config, (events) => this.flushEvents(events))

    // 初始化打字机控制器
    this.typewriter = new TypewriterController(this.config, (chunk) => {
      // 创建流式内容事件
      const event: AgUIEvent = {
        type: 'TEXT_MESSAGE_CHUNK',
        messageId: 'current',
        role: 'assistant',
        delta: chunk,
        timestamp: Date.now(),
      }
      this.batcher.add(event)
    })
  }

  // 添加事件到优化器
  async addEvent(event: AgUIEvent): Promise<void> {
    const startTime = Date.now()

    try {
      // 更新性能指标
      this.metrics.totalEvents++
      this.updateMetrics()

      // 处理特殊事件类型
      if (event.type === 'TEXT_MESSAGE_CONTENT' && 'delta' in event) {
        // 使用打字机效果处理文本内容
        this.typewriter.addContent(event.delta as string)
      } else {
        // 其他事件直接批处理
        this.batcher.add(event)
      }

      // 计算延迟
      const latency = Date.now() - startTime
      this.metrics.averageLatency = (this.metrics.averageLatency + latency) / 2

    } catch (error) {
      console.error('Error adding event to optimizer:', error)
      this.metrics.errorRate++
      throw error
    }
  }

  // 刷新事件到流
  private async flushEvents(events: AgUIEvent[]): Promise<void> {
    try {
      for (const event of events) {
        const eventData = `data: ${JSON.stringify(event)}\n\n`
        const encoded = this.encoder.encode(eventData)
        
        // 检查缓冲区大小
        if (encoded.length > this.config.maxBuffer) {
          console.warn('Event size exceeds max buffer, splitting...')
          // 这里可以实现事件分割逻辑
        }
        
        await this.writer.write(encoded)
      }
    } catch (error) {
      console.error('Error writing events to stream:', error)
      throw error
    }
  }

  // 直接写入事件（绕过优化器，用于关键事件）
  async writeEventDirect(event: AgUIEvent): Promise<void> {
    try {
      const eventData = `data: ${JSON.stringify(event)}\n\n`
      await this.writer.write(this.encoder.encode(eventData))
    } catch (error) {
      console.error('Error writing direct event:', error)
      throw error
    }
  }

  // 更新性能指标
  private updateMetrics(): void {
    const now = Date.now()
    const elapsed = (now - this.startTime) / 1000 // 秒
    
    this.metrics.eventsPerSecond = this.metrics.totalEvents / elapsed
    this.metrics.bufferUtilization = this.batcher['events'].length / this.config.batchSize
    this.metrics.lastUpdate = now

    // 估算内存使用（简单实现）
    const estimatedMemory = this.batcher['events'].length * 1024 + // 每个事件约1KB
                           this.typewriter['contentBuffer'].length * 2 // 字符串内存
    this.metrics.memoryUsage = estimatedMemory
  }

  // 获取性能指标
  getMetrics(): PerformanceMetrics {
    this.updateMetrics()
    return { ...this.metrics }
  }

  // 重置打字机效果
  resetTypewriter(): void {
    this.typewriter.reset()
  }

  // 强制刷新所有缓冲的事件
  async flush(): Promise<void> {
    try {
      await this.batcher['flush']()
    } catch (error) {
      console.error('Error flushing stream optimizer:', error)
    }
  }

  // 销毁优化器
  destroy(): void {
    this.batcher.destroy()
    this.typewriter.destroy()
  }
}

// 创建优化的流式写入器
export function createOptimizedStreamWriter(
  writer: WritableStreamDefaultWriter<Uint8Array>,
  config?: Partial<StreamOptimizationConfig>
): StreamOptimizer {
  return new StreamOptimizer(config, writer)
}

// 性能监控工具
export class StreamPerformanceMonitor {
  private metrics: Map<string, PerformanceMetrics> = new Map()
  private startTime = Date.now()

  addOptimizer(id: string, optimizer: StreamOptimizer): void {
    // 定期收集指标
    const interval = setInterval(() => {
      const metrics = optimizer.getMetrics()
      this.metrics.set(id, metrics)
    }, 1000) // 每秒收集一次

    // 清理定时器（简化实现，实际应该在适当时机清理）
    setTimeout(() => clearInterval(interval), 300000) // 5分钟后停止监控
  }

  getAggregatedMetrics(): PerformanceMetrics {
    const allMetrics = Array.from(this.metrics.values())
    
    if (allMetrics.length === 0) {
      return {
        totalEvents: 0,
        eventsPerSecond: 0,
        averageLatency: 0,
        bufferUtilization: 0,
        memoryUsage: 0,
        errorRate: 0,
        lastUpdate: Date.now(),
      }
    }

    return {
      totalEvents: allMetrics.reduce((sum, m) => sum + m.totalEvents, 0),
      eventsPerSecond: allMetrics.reduce((sum, m) => sum + m.eventsPerSecond, 0) / allMetrics.length,
      averageLatency: allMetrics.reduce((sum, m) => sum + m.averageLatency, 0) / allMetrics.length,
      bufferUtilization: allMetrics.reduce((sum, m) => sum + m.bufferUtilization, 0) / allMetrics.length,
      memoryUsage: allMetrics.reduce((sum, m) => sum + m.memoryUsage, 0),
      errorRate: allMetrics.reduce((sum, m) => sum + m.errorRate, 0),
      lastUpdate: Date.now(),
    }
  }

  getOptimizationReport(): {
    uptime: number
    totalOptimizers: number
    averagePerformance: PerformanceMetrics
    recommendations: string[]
  } {
    const metrics = this.getAggregatedMetrics()
    const uptime = Date.now() - this.startTime
    const recommendations: string[] = []

    // 生成优化建议
    if (metrics.averageLatency > 100) {
      recommendations.push('考虑增加缓冲区大小以减少延迟')
    }
    if (metrics.bufferUtilization > 0.8) {
      recommendations.push('缓冲区利用率较高，考虑增加批处理大小')
    }
    if (metrics.eventsPerSecond > 1000) {
      recommendations.push('事件频率很高，考虑启用更激进的批处理策略')
    }
    if (metrics.errorRate > 0.01) {
      recommendations.push('错误率较高，请检查网络连接和错误处理逻辑')
    }

    return {
      uptime,
      totalOptimizers: this.metrics.size,
      averagePerformance: metrics,
      recommendations,
    }
  }
}

// 全局性能监控实例
export const globalStreamMonitor = new StreamPerformanceMonitor() 