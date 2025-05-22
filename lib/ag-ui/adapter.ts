import { Observable, Subject, from } from "rxjs"
import type {
  BaseEvent,
  TextMessageStartEvent,
  TextMessageContentEvent,
  TextMessageEndEvent,
  RunStartedEvent,
  RunFinishedEvent,
} from "./types"

/**
 * AG-UI适配器 - 将现有系统的消息流转换为AG-UI事件流
 * 该适配器确保现有系统功能不变的情况下支持AG-UI协议
 */
export class AgUIAdapter {
  private eventSubject = new Subject<BaseEvent>()
  private messageIdCounter = 0

  constructor(
    private options: {
      debug?: boolean
      threadId?: string
    } = {},
  ) {
    this.options.threadId = this.options.threadId || `thread-${Date.now()}`
  }

  /**
   * 获取事件流Observable
   */
  public getEventStream(): Observable<BaseEvent> {
    return this.eventSubject.asObservable()
  }

  /**
   * 处理来自FastGPT的流式响应
   * 将其转换为AG-UI事件流，但不改变原有处理逻辑
   */
  public handleFastGPTStreamResponse(response: ReadableStream<Uint8Array>): Observable<any> {
    // 生成唯一消息ID
    const messageId = `msg-${++this.messageIdCounter}`
    const runId = `run-${Date.now()}`

    // 发送运行开始事件
    this.emitEvent({
      type: "RUN_STARTED",
      threadId: this.options.threadId,
      runId,
      timestamp: Date.now(),
    } as RunStartedEvent)

    // 发送消息开始事件
    this.emitEvent({
      type: "TEXT_MESSAGE_START",
      messageId,
      role: "assistant",
      timestamp: Date.now(),
    } as TextMessageStartEvent)

    // 创建一个新的Observable来处理流式响应
    return new Observable<any>((observer) => {
      // 保持原有的处理逻辑
      const reader = response.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      const processChunk = async () => {
        try {
          const { done, value } = await reader.read()

          if (done) {
            // 处理缓冲区中剩余的数据
            if (buffer) {
              const chunk = buffer
              buffer = ""
              observer.next(chunk)
            }

            // 发送消息结束事件
            this.emitEvent({
              type: "TEXT_MESSAGE_END",
              messageId,
              timestamp: Date.now(),
            } as TextMessageEndEvent)

            // 发送运行结束事件
            this.emitEvent({
              type: "RUN_FINISHED",
              threadId: this.options.threadId,
              runId,
              timestamp: Date.now(),
            } as RunFinishedEvent)

            observer.complete()
            return
          }

          // 解码二进制数据
          const chunk = decoder.decode(value, { stream: true })
          buffer += chunk

          // 处理完整的JSON对象
          let boundary = buffer.indexOf("\n")
          while (boundary !== -1) {
            const part = buffer.substring(0, boundary)
            buffer = buffer.substring(boundary + 1)

            if (part.trim()) {
              try {
                const data = JSON.parse(part)

                // 发送消息内容事件
                if (data.text) {
                  this.emitEvent({
                    type: "TEXT_MESSAGE_CONTENT",
                    messageId,
                    delta: data.text,
                    timestamp: Date.now(),
                  } as TextMessageContentEvent)
                }

                // 将原始数据传递给观察者
                observer.next(data)
              } catch (e) {
                if (this.options.debug) {
                  console.error("Failed to parse JSON:", part, e)
                }
              }
            }

            boundary = buffer.indexOf("\n")
          }

          // 继续处理下一个块
          processChunk()
        } catch (error) {
          if (this.options.debug) {
            console.error("Error processing stream:", error)
          }
          observer.error(error)
        }
      }

      processChunk()

      // 返回清理函数
      return () => {
        reader.cancel().catch((err) => {
          if (this.options.debug) {
            console.error("Error cancelling reader:", err)
          }
        })
      }
    })
  }

  /**
   * 处理CAD解读智能体的响应
   */
  public handleCADAnalysisResponse(response: any): Observable<any> {
    const messageId = `msg-${++this.messageIdCounter}`
    const runId = `run-${Date.now()}`

    // 发送运行开始事件
    this.emitEvent({
      type: "RUN_STARTED",
      threadId: this.options.threadId,
      runId,
      timestamp: Date.now(),
    } as RunStartedEvent)

    // 将CAD分析结果转换为AG-UI事件
    this.emitEvent({
      type: "TEXT_MESSAGE_START",
      messageId,
      role: "assistant",
      timestamp: Date.now(),
    } as TextMessageStartEvent)

    // 将分析结果作为消息内容发送
    const resultText = JSON.stringify(response)
    this.emitEvent({
      type: "TEXT_MESSAGE_CONTENT",
      messageId,
      delta: resultText,
      timestamp: Date.now(),
    } as TextMessageContentEvent)

    // 发送消息结束事件
    this.emitEvent({
      type: "TEXT_MESSAGE_END",
      messageId,
      timestamp: Date.now(),
    } as TextMessageEndEvent)

    // 发送运行结束事件
    this.emitEvent({
      type: "RUN_FINISHED",
      threadId: this.options.threadId,
      runId,
      timestamp: Date.now(),
    } as RunFinishedEvent)

    // 返回原始响应的Observable
    return from([response])
  }

  /**
   * 发送事件到事件流
   */
  private emitEvent(event: BaseEvent): void {
    if (this.options.debug) {
      console.debug("AG-UI Event:", event)
    }
    this.eventSubject.next(event)
  }
}
