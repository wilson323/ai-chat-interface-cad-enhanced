"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useAgUiChat } from "@/hooks/use-ag-ui-chat"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, ImageIcon } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useTheme } from "next-themes"
import { useMobile } from "@/hooks/use-mobile"
import { WelcomeScreen } from "./welcome-screen"
import { AgentSelector } from "./agent-selector"
import { SuggestedQuestions } from "./suggested-questions"
import { MessageFeedback } from "./message-feedback"
import { EnhancedChatMessage } from "./enhanced-chat-message"

interface Message {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  timestamp: number
  feedback?: "like" | "dislike"
}

export function AgUiChatInterface() {
  const { toast } = useToast()
  const { theme } = useTheme()
  const isMobile = useMobile()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<string>("default")
  const [showWelcome, setShowWelcome] = useState(true)
  const [chatId, setChatId] = useState<string | null>(null)
  const [requiredVariables, setRequiredVariables] = useState<Record<string, string>>({})
  const [variableValues, setVariableValues] = useState<Record<string, string>>({})

  // 使用AG-UI聊天Hook
  const { initChat, sendMessage, getHistory, generateImage, submitFeedback, batchForward, isInitialized } =
    useAgUiChat()

  // 初始化聊天
  const handleInitChat = useCallback(
    async (agentId: string) => {
      try {
        setIsLoading(true)
        const result = await initChat(agentId, variableValues)
        setChatId(result.chatId)

        // 检查是否有必填变量
        if (result.requiredVariables && Object.keys(result.requiredVariables).length > 0) {
          setRequiredVariables(result.requiredVariables)
        } else {
          setShowWelcome(false)
        }

        // 加载历史消息
        if (result.chatId) {
          const history = await getHistory(result.chatId)
          if (history.messages && history.messages.length > 0) {
            setMessages(
              history.messages.map((msg: any) => ({
                id: msg.id || `msg_${Date.now()}_${Math.random()}`,
                role: msg.role,
                content: msg.content,
                timestamp: msg.timestamp || Date.now(),
              })),
            )
            setShowWelcome(false)
          }
        }
      } catch (error) {
        console.error("初始化聊天失败:", error)
        toast({
          title: "初始化失败",
          description: error instanceof Error ? error.message : "无法初始化聊天",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    },
    [initChat, getHistory, variableValues, toast],
  )

  // 选择智能体
  const handleAgentSelect = useCallback(
    (agentId: string) => {
      setSelectedAgent(agentId)
      handleInitChat(agentId)
    },
    [handleInitChat],
  )

  // 提交变量值
  const handleSubmitVariables = useCallback(() => {
    // 检查所有必填变量是否已填写
    const missingVariables = Object.keys(requiredVariables).filter((key) => !variableValues[key])
    if (missingVariables.length > 0) {
      toast({
        title: "缺少必填信息",
        description: `请填写以下信息: ${missingVariables.join(", ")}`,
        variant: "destructive",
      })
      return
    }

    // 重新初始化聊天，带上变量值
    handleInitChat(selectedAgent)
  }, [requiredVariables, variableValues, selectedAgent, handleInitChat, toast])

  // 发送消息
  const handleSendMessage = useCallback(async () => {
    if (!input.trim() || isLoading || !chatId) return

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      role: "user",
      content: input,
      timestamp: Date.now(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      // 创建一个临时的助手消息，用于流式显示
      const tempAssistantId = `assistant_${Date.now()}`
      setMessages((prev) => [
        ...prev,
        {
          id: tempAssistantId,
          role: "assistant",
          content: "",
          timestamp: Date.now(),
        },
      ])

      let accumulatedContent = ""

      // 发送消息并处理流式响应
      const result = await sendMessage(input, (chunk) => {
        accumulatedContent += chunk
        setMessages((prev) =>
          prev.map((msg) => (msg.id === tempAssistantId ? { ...msg, content: accumulatedContent } : msg)),
        )

        // 滚动到底部
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
        }
      })

      // 更新最终消息
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempAssistantId
            ? {
                ...msg,
                id: result.messageId || tempAssistantId,
                content: result.reply || accumulatedContent,
              }
            : msg,
        ),
      )
    } catch (error) {
      console.error("发送消息失败:", error)
      toast({
        title: "发送失败",
        description: error instanceof Error ? error.message : "无法发送消息",
        variant: "destructive",
      })

      // 移除临时助手消息
      setMessages((prev) => prev.filter((msg) => msg.role !== "assistant" || msg.content !== ""))
    } finally {
      setIsLoading(false)
    }
  }, [input, isLoading, chatId, sendMessage, toast])

  // 处理反馈
  const handleFeedback = useCallback(
    async (messageId: string, rating: "like" | "dislike", comment?: string) => {
      try {
        await submitFeedback(messageId, rating, comment)

        // 更新消息状态
        setMessages((prev) => prev.map((msg) => (msg.id === messageId ? { ...msg, feedback: rating } : msg)))

        toast({
          title: "反馈已提交",
          description: "感谢您的反馈",
        })
      } catch (error) {
        console.error("提交反馈失败:", error)
        toast({
          title: "提交失败",
          description: error instanceof Error ? error.message : "无法提交反馈",
          variant: "destructive",
        })
      }
    },
    [submitFeedback, toast],
  )

  // 生成长图
  const handleGenerateImage = useCallback(async () => {
    if (!chatId) return

    try {
      setIsLoading(true)
      const result = await generateImage(true) // 包含欢迎界面

      if (result.imageUrl) {
        // 打开新窗口显示图片
        window.open(result.imageUrl, "_blank")
      } else {
        throw new Error("生成图片失败")
      }
    } catch (error) {
      console.error("生成长图失败:", error)
      toast({
        title: "生成失败",
        description: error instanceof Error ? error.message : "无法生成长图",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [chatId, generateImage, toast])

  // 批量转发
  const handleBatchForward = useCallback(
    async (selectedMessageIds: string[], targets: string[]) => {
      if (selectedMessageIds.length === 0 || targets.length === 0) return

      try {
        setIsLoading(true)
        await batchForward(selectedMessageIds, targets)

        toast({
          title: "转发成功",
          description: `已将${selectedMessageIds.length}条消息转发给${targets.length}个目标`,
        })
      } catch (error) {
        console.error("批量转发失败:", error)
        toast({
          title: "转发失败",
          description: error instanceof Error ? error.message : "无法转发消息",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    },
    [batchForward, toast],
  )

  // 滚动到底部
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  // 初始化
  useEffect(() => {
    if (selectedAgent && !chatId && !isLoading) {
      handleInitChat(selectedAgent)
    }
  }, [selectedAgent, chatId, isLoading, handleInitChat])

  return (
    <div className="flex flex-col h-full">
      {/* 智能体选择器 */}
      <div className="p-4 border-b">
        <AgentSelector onSelect={handleAgentSelect} selectedAgent={selectedAgent} />
      </div>

      {/* 主聊天区域 */}
      <div className="flex-1 overflow-hidden">
        {showWelcome ? (
          <div className="h-full">
            {Object.keys(requiredVariables).length > 0 ? (
              <Card className="m-4 p-4">
                <h2 className="text-xl font-bold mb-4">请填写以下必要信息</h2>
                {Object.entries(requiredVariables).map(([key, description]) => (
                  <div key={key} className="mb-4">
                    <label className="block text-sm font-medium mb-1">{description}</label>
                    <input
                      type="text"
                      className="w-full p-2 border rounded"
                      value={variableValues[key] || ""}
                      onChange={(e) =>
                        setVariableValues((prev) => ({
                          ...prev,
                          [key]: e.target.value,
                        }))
                      }
                    />
                  </div>
                ))}
                <Button onClick={handleSubmitVariables} disabled={isLoading}>
                  {isLoading ? "提交中..." : "提交"}
                </Button>
              </Card>
            ) : (
              <WelcomeScreen onClose={() => setShowWelcome(false)} />
            )}
          </div>
        ) : (
          <ScrollArea className="h-full p-4">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">开始新的对话吧</p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div key={message.id} className="group">
                    <EnhancedChatMessage message={message} isLoading={isLoading && message.content === ""} />
                    {message.role === "assistant" && message.content && (
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <MessageFeedback
                          messageId={message.id}
                          onFeedback={(rating, comment) => handleFeedback(message.id, rating, comment)}
                          initialRating={message.feedback}
                        />
                      </div>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>
        )}
      </div>

      {/* 建议问题 */}
      {!showWelcome && messages.length > 0 && (
        <div className="px-4 py-2 border-t">
          <SuggestedQuestions onSelect={(question) => setInput(question)} />
        </div>
      )}

      {/* 输入区域 */}
      <div className="p-4 border-t">
        <div className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入消息..."
            className="flex-1 min-h-[80px] resize-none"
            onKeyDown={(e) => {
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
    </div>
  )
}
