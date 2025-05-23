"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { FixedSizeList as List } from 'react-window'
import { useAgUI } from "@/hooks/use-ag-ui"
import { AgUIEventListener } from "@/components/ag-ui/event-listener"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Send, BarChart3, Settings } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

/**
 * 优化的AG-UI聊天界面组件 - 高性能版本
 * Optimized AG-UI Chat Interface Component - High performance version
 *
 * 本组件提供了性能优化的聊天界面，包括：
 * - 虚拟滚动支持1000+消息
 * - 流式渲染优化
 * - 内存管理
 * - 实时性能监控
 * - 打字机效果控制
 */

interface OptimizedAgUIChatInterfaceProps {
  appId: string
  initialChatId?: string
  className?: string
  // 性能配置
  performanceConfig?: {
    virtualScrollEnabled?: boolean
    itemHeight?: number
    overscan?: number
    typewriterSpeed?: number
    showPerformanceMetrics?: boolean
  }
  // 流式配置
  streamConfig?: {
    bufferSize?: number
    chunkDelay?: number
    typewriterSpeed?: number
    batchSize?: number
  }
}

interface MessageItem {
  id: string
  role: "user" | "assistant" | "system" | "tool"
  content: string
  timestamp: number
  isStreaming?: boolean
  metadata?: Record<string, any>
}

// 消息项组件（优化的）
const MessageItemComponent = React.memo(({ 
  message, 
  isCurrentStreaming, 
  currentStreamContent 
}: { 
  message: MessageItem
  isCurrentStreaming: boolean
  currentStreamContent: string
}) => {
  const isUser = message.role === "user"
  const displayContent = isCurrentStreaming ? currentStreamContent : message.content

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} items-start max-w-full p-2`}>
      <div
        className={`rounded-lg px-4 py-2 max-w-[80%] transition-all duration-200 ${
          isUser
            ? "bg-blue-500 text-white rounded-br-none"
            : "bg-gray-200 dark:bg-gray-700 rounded-bl-none"
        }`}
      >
        <div className="whitespace-pre-wrap break-words text-sm">
          {displayContent}
          {isCurrentStreaming && (
            <span className="inline-block w-2 h-4 bg-current ml-1 animate-pulse" />
          )}
        </div>
        {message.timestamp && (
          <div className="text-xs opacity-60 mt-1">
            {new Date(message.timestamp).toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  )
})

MessageItemComponent.displayName = "MessageItemComponent"

// 性能指标组件
const PerformanceMetrics = React.memo(({ 
  visible, 
  onToggle 
}: { 
  visible: boolean
  onToggle: () => void 
}) => {
  const [metrics, setMetrics] = useState<any>(null)
  const [health, setHealth] = useState<any>(null)

  useEffect(() => {
    if (!visible) return

    const fetchMetrics = async () => {
      try {
        const response = await fetch('/api/ag-ui/performance')
        if (response.ok) {
          const data = await response.json()
          setMetrics(data.metrics)
          setHealth(data.status)
        }
      } catch (error) {
        console.error('Failed to fetch performance metrics:', error)
      }
    }

    fetchMetrics()
    const interval = setInterval(fetchMetrics, 2000) // 每2秒更新

    return () => clearInterval(interval)
  }, [visible])

  if (!visible) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={onToggle}
        className="fixed top-4 right-4 z-50"
      >
        <BarChart3 className="h-4 w-4" />
      </Button>
    )
  }

  return (
    <Card className="fixed top-4 right-4 w-80 z-50 shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          性能监控
          <Button variant="ghost" size="sm" onClick={onToggle}>
            ✕
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        {health && (
          <div className="flex items-center space-x-2">
            <Badge 
              variant={
                health.level === 'excellent' ? 'default' :
                health.level === 'good' ? 'secondary' :
                health.level === 'warning' ? 'destructive' : 'destructive'
              }
            >
              {health.level}
            </Badge>
            <span className="text-sm">得分: {health.score}</span>
          </div>
        )}
        {metrics && (
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>延迟: {metrics.averageLatency?.toFixed(0) || 0}ms</div>
            <div>事件/秒: {metrics.eventsPerSecond?.toFixed(0) || 0}</div>
            <div>缓冲: {((metrics.bufferUtilization || 0) * 100).toFixed(0)}%</div>
            <div>内存: {((metrics.memoryUsage || 0) / 1024).toFixed(0)}KB</div>
          </div>
        )}
      </CardContent>
    </Card>
  )
})

PerformanceMetrics.displayName = "PerformanceMetrics"

export function OptimizedAgUIChatInterface({ 
  appId, 
  initialChatId, 
  className = "",
  performanceConfig = {},
  streamConfig = {}
}: OptimizedAgUIChatInterfaceProps) {
  // 配置默认值
  const config = {
    virtualScrollEnabled: true,
    itemHeight: 80,
    overscan: 5,
    typewriterSpeed: 120,
    showPerformanceMetrics: process.env.NODE_ENV === 'development',
    ...performanceConfig
  }

  // 状态管理
  const [input, setInput] = useState("")
  const [showMetrics, setShowMetrics] = useState(config.showPerformanceMetrics)
  const [currentStreamContent, setCurrentStreamContent] = useState("")
  const [currentStreamingId, setCurrentStreamingId] = useState<string | null>(null)
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<List>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerHeight, setContainerHeight] = useState(400)

  // AG-UI Hook
  const {
    isInitialized,
    isLoading,
    error,
    messages,
    currentMessage,
    suggestedQuestions,
    events,
    initializeSession,
    sendMessage,
  } = useAgUI({
    debug: process.env.NODE_ENV === "development",
  })

  // 消息数据处理
  const messageItems = useMemo((): MessageItem[] => {
    return messages.map(msg => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      timestamp: typeof msg.timestamp === 'number' ? msg.timestamp : Date.now(),
      metadata: msg.metadata
    }))
  }, [messages])

  // 容器高度响应式
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        const availableHeight = window.innerHeight - rect.top - 200 // 预留底部空间
        setContainerHeight(Math.max(300, availableHeight))
      }
    }

    updateHeight()
    window.addEventListener('resize', updateHeight)
    return () => window.removeEventListener('resize', updateHeight)
  }, [])

  // 初始化会话
  useEffect(() => {
    if (isInitialized && appId) {
      initializeSession(appId, initialChatId)
    }
  }, [isInitialized, appId, initialChatId, initializeSession])

  // 自动滚动到底部
  useEffect(() => {
    if (config.virtualScrollEnabled && listRef.current) {
      // 虚拟滚动模式下滚动到最新消息
      listRef.current.scrollToItem(messageItems.length - 1, "end")
    } else if (messagesEndRef.current) {
      // 普通模式下滚动到底部
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messageItems.length, config.virtualScrollEnabled])

  // 处理流式内容更新
  const handleStreamContent = useCallback((messageId: string, content: string) => {
    setCurrentStreamingId(messageId)
    setCurrentStreamContent(prev => prev + content)
  }, [])

  const handleStreamEnd = useCallback((messageId: string) => {
    setCurrentStreamingId(null)
    setCurrentStreamContent("")
  }, [])

  // 发送消息
  const handleSendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return

    const message = input.trim()
    setInput("")
    
    // 发送消息时包含流式配置
    await sendMessage(message, {
      streamConfig
    })
  }, [input, isLoading, sendMessage, streamConfig])

  // 按键事件处理
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }, [handleSendMessage])

  // 建议问题点击
  const handleSuggestedQuestionClick = useCallback((question: string) => {
    setInput(question)
  }, [])

  // 虚拟滚动渲染项
  const renderMessageItem = useCallback(({ index, style }: { index: number, style: React.CSSProperties }) => {
    const message = messageItems[index]
    const isCurrentStreaming = currentStreamingId === message.id
    
    return (
      <div style={style}>
        <MessageItemComponent 
          message={message}
          isCurrentStreaming={isCurrentStreaming}
          currentStreamContent={currentStreamContent}
        />
      </div>
    )
  }, [messageItems, currentStreamingId, currentStreamContent])

  return (
    <div className={`flex flex-col h-full relative ${className}`} ref={containerRef}>
      {/* 性能监控 */}
      <PerformanceMetrics 
        visible={showMetrics} 
        onToggle={() => setShowMetrics(!showMetrics)} 
      />

      {/* 消息列表区域 */}
      <div className="flex-1 overflow-hidden">
        {config.virtualScrollEnabled ? (
          // 虚拟滚动模式
          <List
            ref={listRef}
            height={containerHeight}
            itemCount={messageItems.length}
            itemSize={config.itemHeight}
            overscanCount={config.overscan}
            className="scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600"
          >
            {renderMessageItem}
          </List>
        ) : (
          // 普通滚动模式
          <div className="h-full overflow-y-auto p-4 space-y-4">
            {messageItems.map((message) => (
              <MessageItemComponent
                key={message.id}
                message={message}
                isCurrentStreaming={currentStreamingId === message.id}
                currentStreamContent={currentStreamContent}
              />
            ))}

            {/* 当前正在生成的消息 */}
            {currentMessage && !currentStreamingId && (
              <div className="flex justify-start items-start max-w-full">
                <div className="bg-gray-200 dark:bg-gray-700 rounded-lg rounded-bl-none px-4 py-2 max-w-[80%]">
                  <div className="whitespace-pre-wrap break-words">{currentMessage}</div>
                </div>
              </div>
            )}

            {/* 错误消息 */}
            {error && (
              <div className="flex justify-center items-center">
                <div className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-lg px-4 py-2">
                  {error.message}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* 建议问题 */}
      {suggestedQuestions.length > 0 && !isLoading && (
        <div className="px-4 py-2 space-x-2 space-y-2 flex flex-wrap border-t dark:border-gray-700">
          {suggestedQuestions.map((question, index) => (
            <button
              key={index}
              className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full px-3 py-1 text-sm transition-colors"
              onClick={() => handleSuggestedQuestionClick(question)}
            >
              {question}
            </button>
          ))}
        </div>
      )}

      {/* 输入区域 */}
      <div className="border-t p-4 dark:border-gray-700">
        <div className="flex space-x-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息..."
            className="flex-1 resize-none min-h-[40px] max-h-[120px]"
            rows={1}
            disabled={isLoading}
          />
          <div className="flex flex-col space-y-1">
            <Button 
              onClick={handleSendMessage} 
              disabled={isLoading || !input.trim()}
              size="sm"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
            {process.env.NODE_ENV === 'development' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMetrics(!showMetrics)}
              >
                <Settings className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 事件监听器 */}
      <AgUIEventListener
        events={events}
        onTextMessageContent={handleStreamContent}
        onTextMessageEnd={handleStreamEnd}
        onRunError={(message, code) => {
          console.error(`AG-UI Error (${code}): ${message}`)
        }}
      />
    </div>
  )
} 