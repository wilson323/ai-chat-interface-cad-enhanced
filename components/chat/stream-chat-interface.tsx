"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, Send, ImageIcon, Mic, Paperclip, Smile } from "lucide-react"
import fastGPTClient from "@/lib/api/fastgpt-client"
import { useMobile } from "@/hooks/use-mobile"
import { MobileHeader } from "./mobile-header"
import { EnhancedChatMessage } from "./enhanced-chat-message"
import { SuggestedQuestions } from "./suggested-questions"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { getContrastTextColor } from "@/lib/utils/avatar-utils"

interface Message {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  timestamp: Date
  isFavorite?: boolean
}

// 性能优化配置接口
interface StreamConfig {
  bufferSize?: number
  chunkDelay?: number
  typewriterSpeed?: number
  batchSize?: number
}

interface PerformanceConfig {
  virtualScrollEnabled?: boolean
  itemHeight?: number
  overscan?: number
  typewriterSpeed?: number
  showPerformanceMetrics?: boolean
}

export default function StreamChatInterface({
  agentId = "",
  initialSystemPrompt = "",
  userId = "anonymous",
  agentName = "AI 助手",
  agentAvatar = "/images/zkteco-mascot.png",
  onBackClick,
  selectedAgent,
  // 新增性能配置参数
  streamConfig,
  performanceConfig,
}: {
  agentId?: string
  initialSystemPrompt?: string
  userId?: string
  agentName?: string
  agentAvatar?: string
  onBackClick?: () => void
  selectedAgent?: any
  streamConfig?: StreamConfig
  performanceConfig?: PerformanceConfig
}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [streamingContent, setStreamingContent] = useState("")
  const [welcomeMessage, setWelcomeMessage] = useState("")
  const [chatId, setChatId] = useState<string>(`chat_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`)
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const isMobile = useMobile()
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const recordingInterval = useRef<NodeJS.Timeout | null>(null)
  const { toast } = useToast()

  // 性能监控状态
  const [performanceMetrics, setPerformanceMetrics] = useState<any>(null)
  const performanceInterval = useRef<NodeJS.Timeout | null>(null)

  // Initialize chat
  useEffect(() => {
    const initChat = async () => {
      try {
        // Try to get chat initialization data
        const initData = await fastGPTClient.getChatInit(agentId, chatId).catch(() => null)

        if (initData?.welcomeMessage) {
          setWelcomeMessage(initData.welcomeMessage)
          setMessages([
            {
              id: `system_${Date.now()}`,
              role: "system",
              content: initData.systemPrompt || initialSystemPrompt,
              timestamp: new Date(),
            },
            {
              id: `welcome_${Date.now()}`,
              role: "assistant",
              content: initData.welcomeMessage,
              timestamp: new Date(),
            },
          ])

          // Set suggested questions if available
          if (initData.suggestedQuestions && Array.isArray(initData.suggestedQuestions)) {
            setSuggestedQuestions(initData.suggestedQuestions)
          } else {
            // Default suggested questions
            setSuggestedQuestions([
              "ZKTeco 公司的主要产品有哪些？",
              "如何解决门禁系统连接问题？",
              "人脸识别技术的优势是什么？",
              "如何设置考勤管理系统？",
            ])
          }
        } else if (initialSystemPrompt) {
          setMessages([
            {
              id: `system_${Date.now()}`,
              role: "system",
              content: initialSystemPrompt,
              timestamp: new Date(),
            },
          ])

          // Default suggested questions
          setSuggestedQuestions([
            "ZKTeco 公司的主要产品有哪些？",
            "如何解决门禁系统连接问题？",
            "人脸识别技术的优势是什么？",
            "如何解决考勤管理系统？",
          ])
        }
      } catch (error) {
        console.error("Failed to initialize chat:", error)
        if (initialSystemPrompt) {
          setMessages([
            {
              id: `system_${Date.now()}`,
              role: "system",
              content: initialSystemPrompt,
              timestamp: new Date(),
            },
          ])
        }
      }
    }

    initChat()
  }, [agentId, initialSystemPrompt, chatId, userId])

  // 性能监控 - 仅在开发环境启用
  useEffect(() => {
    if (performanceConfig?.showPerformanceMetrics) {
      const fetchMetrics = async () => {
        try {
          const response = await fetch('/api/ag-ui/performance')
          if (response.ok) {
            const data = await response.json()
            setPerformanceMetrics(data)
          }
        } catch (error) {
          console.error('Failed to fetch performance metrics:', error)
        }
      }

      fetchMetrics()
      performanceInterval.current = setInterval(fetchMetrics, 2000)

      return () => {
        if (performanceInterval.current) {
          clearInterval(performanceInterval.current)
        }
      }
    }
  }, [performanceConfig?.showPerformanceMetrics])

  // Scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, streamingContent])

  // Focus input on desktop
  useEffect(() => {
    if (!isMobile && inputRef.current && !isLoading) {
      inputRef.current.focus()
    }
  }, [isMobile, isLoading, messages])

  // Adjust padding for mobile header
  useEffect(() => {
    if (isMobile && chatContainerRef.current) {
      chatContainerRef.current.style.paddingTop = "60px"
    } else if (chatContainerRef.current) {
      chatContainerRef.current.style.paddingTop = "0px"
    }
  }, [isMobile])

  // 使用优化的AG-UI API进行流式响应处理
  const processStreamResponseWithOptimization = async (response: Response) => {
    if (!response.body) {
      throw new Error("Response body is null")
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let done = false
    let accumulatedContent = ""

    setStreamingContent("")

    try {
      while (!done) {
        const { value, done: doneReading } = await reader.read()
        done = doneReading

        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split("\n").filter((line) => line.trim() !== "")

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6)

            if (data === "[DONE]") {
              break
            }

            try {
              const parsed = JSON.parse(data)
              
              // 处理AG-UI事件流
              if (parsed.type === "TEXT_MESSAGE_CONTENT" && parsed.delta) {
                accumulatedContent += parsed.delta
                setStreamingContent(accumulatedContent)
              }
              // 兼容原有FastGPT格式
              else if (parsed.choices && parsed.choices[0].delta && parsed.choices[0].delta.content) {
                const content = parsed.choices[0].delta.content
                accumulatedContent += content
                setStreamingContent(accumulatedContent)
              }
            } catch (e) {
              console.error("Error parsing stream data:", e)
            }
          }
        }
      }

      // Stream ended, add complete message
      if (accumulatedContent) {
        const newMessage: Message = {
          id: `assistant_${Date.now()}`,
          role: "assistant",
          content: accumulatedContent,
          timestamp: new Date(),
        }

        setMessages((prev) => [...prev, newMessage])
        setStreamingContent("")

        // Generate suggested questions based on response
        generateSuggestedQuestions(accumulatedContent)
      }
    } catch (error) {
      console.error("Error processing stream:", error)
      throw error
    }
  }

  // Process streaming response (保持原有函数名以维持兼容性)
  const processStreamResponse = processStreamResponseWithOptimization

  // Generate suggested questions based on assistant's response
  const generateSuggestedQuestions = (lastResponse: string) => {
    // This is a simple implementation - in production, you might want to use AI to generate relevant questions
    const questionTemplates = [
      "可以详细解释一下",
      "还有什么相关的",
      "如何实际应用",
      "有什么注意事项",
    ]

    const newQuestions = questionTemplates.map((template) => `${template}${lastResponse.slice(0, 10)}...？`)
    setSuggestedQuestions(newQuestions.slice(0, 3))
  }

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)
    setSuggestedQuestions([])

    try {
      // 使用优化的AG-UI API
      const response = await fetch("/api/ag-ui/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          appId: agentId,
          chatId,
          messages: [
            ...messages.filter(m => m.role !== "system"),
            userMessage
          ].map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          // 传递性能配置
          streamConfig: streamConfig,
          // 添加系统提示
          systemPrompt: messages.find(m => m.role === "system")?.content || initialSystemPrompt,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      await processStreamResponse(response)
    } catch (error) {
      console.error("Error sending message:", error)
      toast({
        title: "发送失败",
        description: "消息发送失败，请重试",
        variant: "destructive",
      })

      // Remove the user message on error
      setMessages((prev) => prev.filter((msg) => msg.id !== userMessage.id))
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleVoiceInput = () => {
    if (isRecording) {
      // Stop recording
      setIsRecording(false)
      setRecordingTime(0)
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current)
      }
      toast({
        title: "录音结束",
        description: "语音识别功能正在开发中",
      })
    } else {
      // Start recording
      setIsRecording(true)
      setRecordingTime(0)
      recordingInterval.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
      toast({
        title: "开始录音",
        description: "语音识别功能正在开发中",
      })
    }
  }

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const handleMessageFeedback = (messageId: string, type: "like" | "dislike", comment?: string) => {
    console.log("Message feedback:", { messageId, type, comment })
    toast({
      title: "反馈已收到",
      description: `感谢您的${type === "like" ? "点赞" : "反馈"}`,
    })
  }

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content)
    toast({
      title: "已复制",
      description: "消息内容已复制到剪贴板",
    })
  }

  const handleFavoriteMessage = (messageId: string) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === messageId ? { ...msg, isFavorite: !msg.isFavorite } : msg))
    )
    toast({
      title: "收藏成功",
      description: "消息已添加到收藏夹",
    })
  }

  const handleSelectQuestion = (question: string) => {
    setInput(question)
    setSuggestedQuestions([])
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  // 显示的消息列表（过滤掉系统消息）
  const displayMessages = messages.filter((msg) => msg.role !== "system")

  return (
    <div className="flex flex-col h-full w-full bg-background relative">
      {/* 性能指标显示（仅开发环境） */}
      {performanceConfig?.showPerformanceMetrics && performanceMetrics && (
        <div className="fixed top-4 right-4 z-50 bg-white dark:bg-gray-800 p-2 rounded-lg shadow-lg text-xs">
          <div>延迟: {performanceMetrics.metrics?.averageLatency?.toFixed(0) || 0}ms</div>
          <div>状态: {performanceMetrics.status?.level || 'unknown'}</div>
        </div>
      )}

      {/* Mobile Header */}
      {isMobile && (
        <MobileHeader
          agentName={agentName}
          agentAvatar={agentAvatar}
          onBackClick={onBackClick}
          className="fixed top-0 left-0 right-0 z-40"
        />
      )}

      {/* Messages Container */}
      <div
        ref={chatContainerRef}
        className={cn(
          "flex-1 overflow-y-auto space-y-4 p-4",
          isMobile ? "pb-20" : "pb-4"
        )}
      >
        {displayMessages.map((message) => (
          <EnhancedChatMessage
            key={message.id}
            message={message}
            onFeedback={handleMessageFeedback}
            onCopy={handleCopyMessage}
            onFavorite={handleFavoriteMessage}
            agentAvatar={agentAvatar}
            agentName={agentName}
          />
        ))}

        {/* Streaming message */}
        {streamingContent && (
          <div className="flex space-x-3">
            <Avatar className="w-8 h-8 flex-shrink-0">
              <AvatarImage src={agentAvatar} alt={agentName} />
              <AvatarFallback style={{ backgroundColor: getContrastTextColor(agentName) }}>
                {agentName.slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="bg-muted rounded-lg p-3">
                <div className="whitespace-pre-wrap text-sm">
                  {streamingContent}
                  <span className="inline-block w-2 h-4 bg-primary ml-1 animate-pulse rounded" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading indicator */}
        {isLoading && !streamingContent && (
          <div className="flex space-x-3">
            <Avatar className="w-8 h-8 flex-shrink-0">
              <AvatarImage src={agentAvatar} alt={agentName} />
              <AvatarFallback style={{ backgroundColor: getContrastTextColor(agentName) }}>
                {agentName.slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="bg-muted rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">正在思考...</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions */}
      {suggestedQuestions.length > 0 && !isLoading && (
        <div className="px-4 pb-2">
          <SuggestedQuestions
            questions={suggestedQuestions}
            onSelectQuestion={handleSelectQuestion}
            className="max-w-none"
          />
        </div>
      )}

      {/* Input Area */}
      <div className={cn(
        "border-t bg-background p-4",
        isMobile ? "fixed bottom-0 left-0 right-0 z-30" : ""
      )}>
        <div className="flex space-x-2">
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入消息..."
              disabled={isLoading}
              className="pr-24"
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toast({ title: "功能开发中", description: "图片上传功能正在开发中" })}
                disabled={isLoading}
                className="p-1 h-auto"
              >
                <ImageIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toast({ title: "功能开发中", description: "文件上传功能正在开发中" })}
                disabled={isLoading}
                className="p-1 h-auto"
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleVoiceInput}
                disabled={isLoading}
                className={cn("p-1 h-auto", isRecording && "text-red-500")}
              >
                <Mic className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <Button onClick={handleSendMessage} disabled={isLoading || !input.trim()}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>

        {/* Recording indicator */}
        {isRecording && (
          <div className="flex items-center justify-center mt-2 text-red-500 text-sm">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-2" />
            录音中 {formatRecordingTime(recordingTime)}
          </div>
        )}
      </div>
    </div>
  )
}
