"use client"

import type React from "react"

/**
 * AG-UI聊天界面组件 - 使用AG-UI协议的聊天界面
 * AG-UI Chat Interface Component - Chat interface using AG-UI protocol
 *
 * 本文件提供了一个使用AG-UI协议的聊天界面组件
 * 调用关系: 可被任何需要AG-UI聊天功能的页面使用
 */

import { useState, useEffect, useRef } from "react"
import { useAgUI } from "@/hooks/use-ag-ui"
import { AgUIEventListener } from "@/components/ag-ui/event-listener"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Send } from "lucide-react"

interface AgUIChatInterfaceProps {
  appId: string
  initialChatId?: string
  className?: string
}

export function AgUIChatInterface({ appId, initialChatId, className = "" }: AgUIChatInterfaceProps) {
  const [input, setInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
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

  // 初始化会话
  useEffect(() => {
    if (isInitialized && appId) {
      initializeSession(appId, initialChatId)
    }
  }, [isInitialized, appId, initialChatId, initializeSession])

  // 滚动到最新消息
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, currentMessage])

  // 处理发送消息
  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return

    const message = input.trim()
    setInput("")
    await sendMessage(message)
  }

  // 处理按键事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // 处理建议问题点击
  const handleSuggestedQuestionClick = (question: string) => {
    setInput(question)
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} items-start max-w-full`}
          >
            <div
              className={`rounded-lg px-4 py-2 max-w-[80%] ${
                message.role === "user"
                  ? "bg-blue-500 text-white rounded-br-none"
                  : "bg-gray-200 dark:bg-gray-700 rounded-bl-none"
              }`}
            >
              <div className="whitespace-pre-wrap break-words">{message.content}</div>
            </div>
          </div>
        ))}

        {/* 当前正在生成的消息 */}
        {currentMessage && (
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

        {/* 滚动到底部的参考点 */}
        <div ref={messagesEndRef} />
      </div>

      {/* 建议问题 */}
      {suggestedQuestions.length > 0 && !isLoading && (
        <div className="px-4 py-2 space-x-2 space-y-2 flex flex-wrap">
          {suggestedQuestions.map((question, index) => (
            <button
              key={index}
              className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full px-3 py-1 text-sm"
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
            className="flex-1 resize-none"
            rows={1}
            disabled={isLoading}
          />
          <Button onClick={handleSendMessage} disabled={isLoading || !input.trim()}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* 事件监听器 */}
      <AgUIEventListener
        events={events}
        onTextMessageContent={(messageId, content) => {
          // 可以在这里添加打字机效果
          setIsTyping(true)
        }}
        onTextMessageEnd={(messageId) => {
          setIsTyping(false)
        }}
        onRunError={(message, code) => {
          console.error(`Error (${code}): ${message}`)
        }}
      />
    </div>
  )
}
