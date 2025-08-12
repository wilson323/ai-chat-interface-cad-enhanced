"use client"

/**
 * AG-UI事件监听器组件 - 监听AG-UI事件并执行回调
 * AG-UI Event Listener Component - Listens to AG-UI events and executes callbacks
 *
 * 本文件提供了一个React组件，用于监听AG-UI事件并执行回调
 * 调用关系: 可被任何需要监听AG-UI事件的组件使用
 */

import { useEffect } from "react"

import type { BaseEvent } from "@/lib/ag-ui/types"

interface EventListenerProps {
  events: BaseEvent[]
  onEvent?: (event: BaseEvent) => void
  onTextMessageContent?: (messageId: string, content: string) => void
  onTextMessageEnd?: (messageId: string) => void
  onRunStarted?: (threadId: string, runId: string) => void
  onRunFinished?: (threadId: string, runId: string) => void
  onRunError?: (message: string, code: number) => void
  onToolCallStart?: (toolCallId: string, toolName: string, parentMessageId: string) => void
  onToolCallEnd?: (toolCallId: string) => void
  onStateSnapshot?: (state: Record<string, any>) => void
  onCustomEvent?: (name: string, value: any) => void
}

export function AgUIEventListener({
  events,
  onEvent,
  onTextMessageContent,
  onTextMessageEnd,
  onRunStarted,
  onRunFinished,
  onRunError,
  onToolCallStart,
  onToolCallEnd,
  onStateSnapshot,
  onCustomEvent,
}: EventListenerProps) {
  useEffect(() => {
    if (events.length === 0) return

    // 获取最新事件
    const latestEvent = events[events.length - 1]

    // 通用事件处理
    if (onEvent) {
      onEvent(latestEvent)
    }

    // 根据事件类型处理
    switch (latestEvent.type) {
      case "TEXT_MESSAGE_CONTENT":
        if (onTextMessageContent) {
          onTextMessageContent((latestEvent as any).messageId, (latestEvent as any).delta)
        }
        break

      case "TEXT_MESSAGE_END":
        if (onTextMessageEnd) {
          onTextMessageEnd((latestEvent as any).messageId)
        }
        break

      case "RUN_STARTED":
        if (onRunStarted) {
          onRunStarted((latestEvent as any).threadId, (latestEvent as any).runId)
        }
        break

      case "RUN_FINISHED":
        if (onRunFinished) {
          onRunFinished((latestEvent as any).threadId, (latestEvent as any).runId)
        }
        break

      case "RUN_ERROR":
        if (onRunError) {
          onRunError((latestEvent as any).message, (latestEvent as any).code)
        }
        break

      case "TOOL_CALL_START":
        if (onToolCallStart) {
          onToolCallStart(
            (latestEvent as any).toolCallId,
            (latestEvent as any).toolCallName,
            (latestEvent as any).parentMessageId,
          )
        }
        break

      case "TOOL_CALL_END":
        if (onToolCallEnd) {
          onToolCallEnd((latestEvent as any).toolCallId)
        }
        break

      case "STATE_SNAPSHOT":
        if (onStateSnapshot) {
          onStateSnapshot((latestEvent as any).snapshot)
        }
        break

      case "CUSTOM":
        if (onCustomEvent) {
          onCustomEvent((latestEvent as any).name, (latestEvent as any).value)
        }
        break
    }
  }, [
    events,
    onEvent,
    onTextMessageContent,
    onTextMessageEnd,
    onRunStarted,
    onRunFinished,
    onRunError,
    onToolCallStart,
    onToolCallEnd,
    onStateSnapshot,
    onCustomEvent,
  ])

  // 这个组件不渲染任何内容
  return null
}
