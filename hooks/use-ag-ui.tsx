"use client"

/**
 * AG-UI React Hook - 提供AG-UI协议的React集成
 * AG-UI React Hook - Provides React integration for AG-UI protocol
 *
 * 本文件提供了一个React Hook，用于在React组件中使用AG-UI协议
 * 调用关系: 被前端组件调用，内部使用lib/ag-ui/core-adapter.ts
 */

import { useState, useEffect, useRef, useCallback } from "react"
import { AgUICoreAdapter } from "@/lib/ag-ui/core-adapter"
import type { Subscription } from "rxjs"
import type { BaseEvent, Message } from "@/lib/ag-ui/types"

interface UseAgUIOptions {
  debug?: boolean
  proxyUrl?: string
  initialThreadId?: string
}

export function useAgUI(options: UseAgUIOptions = {}) {
  const [isInitialized, setIsInitialized] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [messages, setMessages] = useState<Array<Message>>([])
  const [currentMessage, setCurrentMessage] = useState<string>("")
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([])
  const [variables, setVariables] = useState<Record<string, unknown>>({})
  const [chatId, setChatId] = useState<string>("")
  const [appId, setAppId] = useState<string>("")
  const [events, setEvents] = useState<BaseEvent[]>([])

  // 使用ref存储adapter实例，确保在组件生命周期内保持一致
  const adapterRef = useRef<AgUICoreAdapter | null>(null)
  const subscriptionRef = useRef<Subscription | null>(null)

  // 初始化adapter
  useEffect(() => {
    adapterRef.current = new AgUICoreAdapter({
      debug: options.debug,
      threadId: options.initialThreadId,
      proxyUrl: options.proxyUrl,
    })

    // 订阅事件流
    subscriptionRef.current = adapterRef.current.getEventStream().subscribe({
      next: (event) => {
        setEvents((prev) => [...prev, event])

        // 处理不同类型的事件
        switch (event.type) {
          case "TEXT_MESSAGE_CONTENT":
            setCurrentMessage((prev) => prev + String((event as Record<string, unknown>).delta ?? ""))
            break

          case "TEXT_MESSAGE_END":
            if (currentMessage.length > 0) {
              setMessages((prev) => [
                ...prev,
                {
                  id: String((event as Record<string, unknown>).messageId ?? `msg-${Date.now()}`),
                  role: "assistant",
                  content: currentMessage,
                  timestamp: new Date(),
                },
              ])
              setCurrentMessage("")
            }
            break

          case "STATE_SNAPSHOT":
            {
              const snapshotUnknown = (event as Record<string, unknown>).snapshot as Record<string, unknown> | undefined
              if (snapshotUnknown) {
                const nextVariables = (snapshotUnknown as Record<string, unknown>).variables as Record<string, unknown> | undefined
                if (nextVariables) setVariables(nextVariables)
                const nextChatId = (snapshotUnknown as Record<string, unknown>).chatId as string | undefined
                if (typeof nextChatId === "string") setChatId(nextChatId)
                const nextAppId = (snapshotUnknown as Record<string, unknown>).appId as string | undefined
                if (typeof nextAppId === "string") setAppId(nextAppId)
                const nextSuggested = (snapshotUnknown as Record<string, unknown>).suggestedQuestions as string[] | undefined
                if (Array.isArray(nextSuggested)) setSuggestedQuestions(nextSuggested)
              }
            }
            break

          case "CUSTOM":
            if ((event as Record<string, unknown>).name === "suggested_questions") {
              const val = (event as Record<string, unknown>).value
              if (Array.isArray(val)) setSuggestedQuestions(val as string[])
            }
            break
        }
      },
      error: (err) => {
        console.error("Error in AG-UI event stream:", err)
        setError(err instanceof Error ? err : new Error(String(err)))
      },
    })

    setIsInitialized(true)

    // 清理订阅
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe()
      }
    }
  }, [options.debug, options.initialThreadId, options.proxyUrl])

  // 初始化会话
  const initializeSession = useCallback(async (agentAppId: string, initialChatId?: string) => {
    if (!adapterRef.current) return null

    setIsLoading(true)
    setError(null)

    try {
      const result = await adapterRef.current.initializeSession(agentAppId, initialChatId)
      setAppId(agentAppId)
      setChatId(result.chatId || initialChatId || "")

      if (result.welcomeMessage) {
        setMessages([
          {
            id: `welcome-${Date.now()}`,
            role: "assistant",
            content: result.welcomeMessage,
            timestamp: new Date(),
          },
        ])
      }

      if (result.variables) {
        setVariables(result.variables)
      }

      if (result.suggestedQuestions) {
        setSuggestedQuestions(result.suggestedQuestions)
      }

      return result
    } catch (err) {
      console.error("Error initializing session:", err)
      setError(err instanceof Error ? err : new Error(String(err)))
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 发送消息
  const sendMessage = useCallback(
    async (content: string, systemPrompt?: string) => {
      if (!adapterRef.current || !appId || !chatId) {
        setError(new Error("Session not initialized"))
        return null
      }

      setIsLoading(true)
      setError(null)

      // 添加用户消息到列表
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: "user",
        content,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, userMessage])

      try {
        // 准备消息历史
        const messageHistory = [
          ...messages.map((msg) => ({ role: msg.role, content: msg.content })),
          { role: "user", content },
        ]

        // 发送消息并获取响应流
        const responseStream = await adapterRef.current.handleChatCompletion(
          appId,
          chatId,
          messageHistory,
          systemPrompt,
          variables as Record<string, any>,
        )

        return responseStream
      } catch (err) {
        console.error("Error sending message:", err)
        setError(err instanceof Error ? err : new Error(String(err)))
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [appId, chatId, messages, variables],
  )

  // 获取聊天历史
  const fetchHistory = useCallback(async () => {
    if (!adapterRef.current || !appId || !chatId) {
      setError(new Error("Session not initialized"))
      return null
    }

    setIsLoading(true)
    setError(null)

    try {
      const history = await adapterRef.current.fetchChatHistory(appId, chatId)

      if (history.messages) {
        setMessages(
          (history.messages as Array<Message | Record<string, unknown>>).map((msg) => ({
            id: String((msg as Message).id ?? `msg-${Date.now()}`),
            role: (msg as Message).role,
            content: (msg as Message).content,
            timestamp: new Date(((msg as Message).timestamp as Date | number | undefined) ?? Date.now()),
            name: (msg as Message).name,
            toolCalls: (msg as Message).toolCalls,
            metadata: (msg as Message).metadata,
            feedback: (msg as Message).feedback,
          })),
        )
      }

      return history
    } catch (err) {
      console.error("Error fetching history:", err)
      setError(err instanceof Error ? err : new Error(String(err)))
      return null
    } finally {
      setIsLoading(false)
    }
  }, [appId, chatId])

  // 提交反馈
  const submitFeedback = useCallback(
    async (messageId: string, feedback: "like" | "dislike", comment?: string) => {
      if (!adapterRef.current || !appId || !chatId) {
        setError(new Error("Session not initialized"))
        return false
      }

      try {
        return await adapterRef.current.submitFeedback(appId, chatId, messageId, feedback, comment)
      } catch (err) {
        console.error("Error submitting feedback:", err)
        setError(err instanceof Error ? err : new Error(String(err)))
        return false
      }
    },
    [appId, chatId],
  )

  // 生成长图
  const generateLongImage = useCallback(
    async (includeWelcome = true) => {
      if (!adapterRef.current || !appId || !chatId) {
        setError(new Error("Session not initialized"))
        return null
      }

      setIsLoading(true)
      setError(null)

      try {
        const imageUrl = await adapterRef.current.generateLongImage(appId, chatId, includeWelcome)
        return imageUrl
      } catch (err) {
        console.error("Error generating long image:", err)
        setError(err instanceof Error ? err : new Error(String(err)))
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [appId, chatId],
  )

  // 批量转发
  const batchForward = useCallback(
    async (targetAppIds: string[], messageIds: string[]) => {
      if (!adapterRef.current || !appId || !chatId) {
        setError(new Error("Session not initialized"))
        return null
      }

      setIsLoading(true)
      setError(null)

      try {
        const result = await adapterRef.current.batchForward(appId, chatId, targetAppIds, messageIds)
        return result
      } catch (err) {
        console.error("Error in batch forward:", err)
        setError(err instanceof Error ? err : new Error(String(err)))
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [appId, chatId],
  )

  // 获取建议问题
  const fetchSuggestedQuestions = useCallback(async () => {
    if (!adapterRef.current || !appId || !chatId) {
      setError(new Error("Session not initialized"))
      return []
    }

    try {
      const questions = await adapterRef.current.fetchSuggestedQuestions(appId, chatId)
      setSuggestedQuestions(questions)
      return questions
    } catch (err) {
      console.error("Error fetching suggested questions:", err)
      setError(err instanceof Error ? err : new Error(String(err)))
      return []
    }
  }, [appId, chatId])

  return {
    isInitialized,
    isLoading,
    error,
    messages,
    currentMessage,
    suggestedQuestions,
    variables,
    chatId,
    appId,
    events,
    initializeSession,
    sendMessage,
    fetchHistory,
    submitFeedback,
    generateLongImage,
    batchForward,
    fetchSuggestedQuestions,
  }
}
