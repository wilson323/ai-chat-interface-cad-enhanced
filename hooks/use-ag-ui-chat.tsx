"use client"

import { useState, useEffect, useRef } from "react"
import { AgUIAdapter } from "@/lib/ag-ui/adapter"
import type { BaseEvent } from "@/lib/ag-ui/types"
import type { Subscription } from "rxjs"

/**
 * AG-UI聊天Hook
 * 提供AG-UI事件流处理能力，同时保持与现有聊天组件的兼容性
 */
export function useAgUIChat(
  options: {
    debug?: boolean
    threadId?: string
    onEvent?: (event: BaseEvent) => void
  } = {},
) {
  const [adapter] = useState(
    () =>
      new AgUIAdapter({
        debug: options.debug,
        threadId: options.threadId || `thread-${Date.now()}`,
      }),
  )

  const subscriptionRef = useRef<Subscription | null>(null)

  // 订阅事件流
  useEffect(() => {
    if (options.onEvent) {
      subscriptionRef.current = adapter.getEventStream().subscribe({
        next: (event) => {
          options.onEvent?.(event)
        },
        error: (err) => {
          console.error("AG-UI event stream error:", err)
        },
      })
    }

    return () => {
      subscriptionRef.current?.unsubscribe()
    }
  }, [adapter, options.onEvent])

  /**
   * 处理FastGPT流式响应
   * 这个函数可以直接替代现有的处理函数，不会改变原有行为
   */
  const handleFastGPTStreamResponse = (response: ReadableStream<Uint8Array>) => {
    return adapter.handleFastGPTStreamResponse(response)
  }

  /**
   * 处理CAD解读响应
   */
  const handleCADAnalysisResponse = (response: any) => {
    return adapter.handleCADAnalysisResponse(response)
  }

  return {
    handleFastGPTStreamResponse,
    handleCADAnalysisResponse,
    eventStream: adapter.getEventStream(),
    threadId: options.threadId,
  }
}
