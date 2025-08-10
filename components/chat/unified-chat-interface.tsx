"use client"

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { useAgUI } from "@/hooks/use-ag-ui"
import { AgUIEventListener } from "@/components/ag-ui/event-listener"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, ImageIcon, Loader2, BarChart3, Settings } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useMobile } from "@/hooks/use-mobile"
import { WelcomeScreen } from "./welcome-screen"
import { AgentSelector } from "./agent-selector"
import { SuggestedQuestions } from "./suggested-questions"
import { MessageFeedback } from "./message-feedback"
import { EnhancedChatMessage } from "./enhanced-chat-message"
import { Badge } from "@/components/ui/badge"

/**
 * Unified Chat Interface - A high-performance, feature-rich chat component
 * that consolidates all previous chat interface implementations.
 *
 * This component provides:
 * - A consistent architecture based on the `useAgUI` hook.
 * - High performance with `react-window` for virtualized message lists.
 * - Feature-completeness: agent selection, message feedback, image generation, etc.
 * - A polished and consistent user interface.
 * - Real-time performance monitoring for development builds.
 */

interface UnifiedChatInterfaceProps {
  initialAgentId?: string
  initialChatId?: string
  className?: string
  // Performance configuration
  performanceConfig?: {
    virtualScrollEnabled?: boolean
    itemHeight?: number
    overscan?: number
    showPerformanceMetrics?: boolean
  }
}

interface MessageItem {
  id: string
  role: "user" | "assistant" | "system" | "tool"
  content: string
  timestamp: number
  feedback?: "like" | "dislike"
  isStreaming?: boolean
  metadata?: Record<string, any>
}

// Performance Metrics Component (remains the same)
const PerformanceMetrics = React.memo(
  ({ visible, onToggle }: { visible: boolean; onToggle: () => void }) => {
    const [metrics, setMetrics] = useState<any>(null)
    const [health, setHealth] = useState<any>(null)

    useEffect(() => {
      if (!visible) return

      const fetchMetrics = async () => {
        try {
          const response = await fetch("/api/ag-ui/performance")
          if (response.ok) {
            const data = await response.json()
            setMetrics(data.metrics)
            setHealth(data.status)
          }
        } catch (error) {
          console.error("Failed to fetch performance metrics:", error)
        }
      }

      fetchMetrics()
      const interval = setInterval(fetchMetrics, 2000) // Update every 2 seconds

      return () => clearInterval(interval)
    }, [visible])

    if (!visible) {
      return (
        <Button variant="outline" size="sm" onClick={onToggle} className="fixed top-4 right-4 z-50">
          <BarChart3 className="h-4 w-4" />
        </Button>
      )
    }

    return (
      <Card className="fixed top-4 right-4 w-80 z-50 shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            Performance Monitor
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
                  health.level === "excellent"
                    ? "default"
                    : health.level === "good"
                    ? "secondary"
                    : "destructive"
                }
              >
                {health.level}
              </Badge>
              <span className="text-sm">Score: {health.score}</span>
            </div>
          )}
          {metrics && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>Latency: {metrics.averageLatency?.toFixed(0) || 0}ms</div>
              <div>Events/s: {metrics.eventsPerSecond?.toFixed(0) || 0}</div>
              <div>Buffer: {((metrics.bufferUtilization || 0) * 100).toFixed(0)}%</div>
              <div>Memory: {((metrics.memoryUsage || 0) / 1024).toFixed(0)}KB</div>
            </div>
          )}
        </CardContent>
      </Card>
    )
  },
)
PerformanceMetrics.displayName = "PerformanceMetrics"

export function UnifiedChatInterface({
  initialAgentId = "default",
  initialChatId,
  className = "",
  performanceConfig = {},
}: UnifiedChatInterfaceProps) {
  const { toast } = useToast()
  const isMobile = useMobile()

  // Configuration with defaults
  const config = {
    virtualScrollEnabled: !isMobile, // Disable virtualization on mobile for better touch experience
    itemHeight: 90,
    overscan: 5,
    showPerformanceMetrics: process.env.NODE_ENV === "development" && !isMobile,
    ...performanceConfig,
  }

  // State Management
  const [input, setInput] = useState("")
  const [showMetrics, setShowMetrics] = useState(config.showPerformanceMetrics)
  const [selectedAgent, setSelectedAgent] = useState<string>(initialAgentId)
  const [showWelcome, setShowWelcome] = useState(true)
  const [variableValues, setVariableValues] = useState<Record<string, string>>({})
  const [currentStreamContent, setCurrentStreamContent] = useState("")
  const [currentStreamingId, setCurrentStreamingId] = useState<string | null>(null)

  // Refs
  const listRef = useRef<React.RefObject<ScrollArea>>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerHeight, setContainerHeight] = useState(400)

  // AG-UI Hook
  const {
    isInitialized,
    isLoading,
    error,
    messages,
    appId,
    chatId,
    variables: requiredVariables,
    suggestedQuestions,
    events,
    initializeSession,
    sendMessage,
    submitFeedback,
    generateLongImage,
    batchForward,
    fetchHistory,
  } = useAgUI({
    debug: process.env.NODE_ENV === "development",
    initialThreadId: initialChatId,
  })

  // Message data processing
  const messageItems = useMemo((): MessageItem[] => {
    return messages.map(msg => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      timestamp: new Date(msg.timestamp).getTime(),
      feedback: msg.feedback,
      metadata: msg.metadata,
    }))
  }, [messages])
  // 将下游组件要求的 Date 类型转换在渲染处进行
  const messageItemsForView = useMemo(() =>
    messageItems.map(m => ({ ...m, timestampDate: new Date(m.timestamp) })), [messageItems])

  // 容器高度（非虚拟滚动）
  useEffect(() => {
    const updateHeight = () => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const availableHeight = window.innerHeight - rect.top - 150
      setContainerHeight(Math.max(300, availableHeight))
    }
    updateHeight()
    window.addEventListener("resize", updateHeight)
    return () => window.removeEventListener("resize", updateHeight)
  }, [])

  // Initialize session or fetch history
  const handleInitChat = useCallback(
    async (agentId: string) => {
      try {
        const result = await initializeSession(agentId, initialChatId)
        if (result?.chatId && !initialChatId) {
          await fetchHistory()
          setShowWelcome(messages.length === 0)
        } else {
          setShowWelcome(true)
        }
      } catch (err) {
        toast({
          title: "Initialization Failed",
          description: err instanceof Error ? err.message : "Could not initialize chat session.",
          variant: "destructive",
        })
      }
    },
    [initializeSession, fetchHistory, initialChatId, messages.length, toast],
  )

  useEffect(() => {
    if (isInitialized && selectedAgent) {
      handleInitChat(selectedAgent)
    }
  }, [isInitialized, selectedAgent, handleInitChat])

  // Auto-scroll to bottom
  useEffect(() => {
    if (config.virtualScrollEnabled && listRef.current) {
      // listRef.current.scrollToItem(messageItems.length, "end") // This line is no longer needed
    }
  }, [messageItems.length, config.virtualScrollEnabled])

  // Callbacks for UI interactions
  const handleAgentSelect = useCallback(
    (agentId: string) => {
      setSelectedAgent(agentId)
      // Initialization is handled by the useEffect above
    },
    [],
  )

  const handleSubmitVariables = useCallback(() => {
    const missing = Object.keys(requiredVariables).filter(key => !variableValues[key])
    if (missing.length > 0) {
      toast({
        title: "Missing Information",
        description: `Please fill in the following: ${missing.join(", ")}`,
        variant: "destructive",
      })
      return
    }
    handleInitChat(selectedAgent)
  }, [requiredVariables, variableValues, selectedAgent, handleInitChat, toast])

  const handleSendMessage = useCallback(async () => {
    if (!input.trim() || isLoading || !chatId) return
    const content = input
    setInput("")
    await sendMessage(content)
  }, [input, isLoading, chatId, sendMessage])

  const handleFeedback = useCallback(
    async (messageId: string, rating: "like" | "dislike", comment?: string) => {
      try {
        await submitFeedback(messageId, rating, comment)
        toast({ title: "Feedback Submitted", description: "Thank you for your feedback." })
      } catch (err) {
        toast({
          title: "Feedback Failed",
          description: err instanceof Error ? err.message : "Could not submit feedback.",
          variant: "destructive",
        })
      }
    },
    [submitFeedback, toast],
  )

  const handleGenerateImage = useCallback(async () => {
    if (!chatId) return
    try {
      const result = await generateLongImage(true)
      const url = typeof result === 'string' ? result : (result as any)?.imageUrl
      if (url) {
        window.open(url, "_blank")
      } else {
        throw new Error("Failed to get image URL.")
      }
    } catch (err) {
      toast({
        title: "Image Generation Failed",
        description: err instanceof Error ? err.message : "Could not generate the image.",
        variant: "destructive",
      })
    }
  }, [chatId, generateLongImage, toast])

  const renderPlainList = () => (
    <ScrollArea className="h-full p-4">
      {messageItemsForView.map(message => (
        <div key={message.id} className="group">
          <EnhancedChatMessage message={{ id: message.id, role: message.role, content: message.content, timestamp: new Date(message.timestamp) }} isLoading={false} />
          {message.role === "assistant" && message.content && (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity pl-12">
              <MessageFeedback
                messageId={message.id}
                onFeedback={handleFeedback}
                initialRating={message.feedback}
              />
            </div>
          )}
        </div>
      ))}
    </ScrollArea>
  )

  return (
    <div className={`flex flex-col h-full ${className}`}>
      <div className="p-4 border-b">
        <AgentSelector onSelect={handleAgentSelect} selectedAgent={selectedAgent} />
      </div>

      <div className="flex-1 overflow-hidden" ref={containerRef}>
        {showWelcome ? (
          <div className="h-full">
            {Object.keys(requiredVariables).length > 0 ? (
              <Card className="m-4 p-4">
                <h2 className="text-xl font-bold mb-4">Please provide required information</h2>
                {Object.entries(requiredVariables).map(([key, description]) => (
                  <div key={key} className="mb-4">
                    <label className="block text-sm font-medium mb-1">{description as any}</label>
                    <input
                      type="text"
                      className="w-full p-2 border rounded"
                      value={variableValues[key] || ""}
                      onChange={e =>
                        setVariableValues(prev => ({ ...prev, [key]: e.target.value }))
                      }
                    />
                  </div>
                ))}
                <Button onClick={handleSubmitVariables} disabled={isLoading}>
                  {isLoading ? "Submitting..." : "Submit"}
                </Button>
              </Card>
            ) : (
              <WelcomeScreen onClose={() => setShowWelcome(false)} />
            )}
          </div>
        ) : (
          renderPlainList()
        )}
      </div>

      {!showWelcome && suggestedQuestions.length > 0 && (
        <div className="p-4 border-t">
          <SuggestedQuestions questions={suggestedQuestions} onSelectQuestion={(question: string) => setInput(question)} />
        </div>
      )}

      <div className="p-4 border-t">
        <div className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value)}
            placeholder="Enter a message..."
            className="flex-1 min-h-[80px] resize-none"
            onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSendMessage()
              }
            }}
            disabled={isLoading || !chatId}
          />
          <div className="flex flex-col gap-2">
            <Button
              onClick={handleSendMessage}
              disabled={isLoading || !input.trim() || !chatId}
              className="h-10 w-10 p-0"
            >
              <Send className="h-5 w-5" />
            </Button>
            <Button
              onClick={handleGenerateImage}
              disabled={isLoading || messages.length === 0 || !chatId}
              className="h-10 w-10 p-0"
              variant="outline"
            >
              <ImageIcon className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      <AgUIEventListener
        events={events}
        onTextMessageContent={(id, content) => {
          setCurrentStreamingId(id)
          setCurrentStreamContent(prev => prev + content)
        }}
        onTextMessageEnd={() => {
          setCurrentStreamingId(null)
          setCurrentStreamContent("")
        }}
        onRunError={(message, code) =>
          toast({ title: `Error (${code})`, description: message, variant: "destructive" })
        }
      />
      {config.showPerformanceMetrics && (
        <PerformanceMetrics visible={showMetrics} onToggle={() => setShowMetrics(!showMetrics)} />
      )}
    </div>
  )
}
