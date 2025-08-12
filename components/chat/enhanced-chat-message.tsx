"use client"

import { Copy, MoreHorizontal, Star } from "lucide-react"
import { useState } from "react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useIsMobile } from "@/components/ui/use-mobile"
import { cn } from "@/lib/utils"

import { MessageFeedback } from "./message-feedback"

interface Message {
  id: string
  role: "user" | "assistant" | "system" | "tool"
  content: string
  timestamp: Date
  isFavorite?: boolean
}

interface EnhancedChatMessageProps {
  message: Message
  agentAvatar?: string
  agentName?: string
  userAvatar?: string
  userName?: string
  onCopy?: (content: string) => void
  onFeedback?: (messageId: string, type: "like" | "dislike", comment?: string) => void
  onFavorite?: (messageId: string) => void
  formatTime?: (date: Date) => string
  isLoading?: boolean
  currentStreamContent?: string
}

export function EnhancedChatMessage({
  message,
  agentAvatar = "/images/zkteco-mascot.png",
  agentName = "AI 助手",
  userAvatar,
  userName = "用户",
  onCopy,
  onFeedback,
  onFavorite,
  formatTime = (date: Date) => date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
}: EnhancedChatMessageProps) {
  const [showActions, setShowActions] = useState(false)
  const isMobile = useIsMobile()

  const handleCopy = () => {
    if (onCopy) {
      onCopy(message.content)
    } else {
      navigator.clipboard.writeText(message.content)
    }
  }

  const handleFavorite = () => {
    if (onFavorite) {
      onFavorite(message.id)
    }
  }

  const handleFeedback = (messageId: string, type: "like" | "dislike", comment?: string) => {
    if (onFeedback) {
      onFeedback(messageId, type, comment)
    }
  }

  return (
    <div
      className={`flex w-full ${message.role === "user" ? "justify-end" : "justify-start"}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      onTouchStart={() => setShowActions(true)}
    >
      <div className={`flex max-w-[90%] md:max-w-[80%] ${message.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
        <Avatar
          className={`h-8 w-8 flex-shrink-0 ${message.role === "user" ? "ml-2 bg-primary-500" : "mr-2 bg-green-500"}`}
        >
          {message.role === "user" ? (
            <>
              <AvatarImage src={userAvatar || "/placeholder.svg"} alt={userName} />
              <AvatarFallback>{userName.charAt(0)}</AvatarFallback>
            </>
          ) : (
            <>
              <AvatarImage src={agentAvatar || "/placeholder.svg"} alt={agentName} />
              <AvatarFallback>{agentName.charAt(0)}</AvatarFallback>
            </>
          )}
        </Avatar>

        <div className="flex flex-col">
          <Card
            className={cn(
              "mb-1",
              message.role === "user"
                ? "bg-primary-50 dark:bg-primary-900/20 text-gray-800 dark:text-gray-200"
                : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200",
            )}
          >
            <CardContent className="p-2 md:p-3">
              <div className="whitespace-pre-wrap text-sm md:text-base">{message.content}</div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-gray-500 dark:text-gray-400">{formatTime(message.timestamp)}</span>

            {(showActions || isMobile) && message.role === "assistant" && (
              <div className="flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  onClick={handleCopy}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-6 w-6 rounded-full text-gray-400 hover:text-yellow-500",
                    message.isFavorite && "text-yellow-500",
                  )}
                  onClick={handleFavorite}
                >
                  <Star className="h-3.5 w-3.5" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>

          {message.role === "assistant" && onFeedback && (
            <div className={`mt-1 ${showActions || isMobile ? "block" : "hidden"}`}>
              <MessageFeedback messageId={message.id} onFeedback={handleFeedback} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
