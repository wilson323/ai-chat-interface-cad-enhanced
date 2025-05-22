"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
// 在 import 部分添加新的图标
import { ThumbsUp, ThumbsDown, Copy, Share2, Bookmark, BookmarkCheck, Edit, Check, X } from "lucide-react"

type Agent = {
  id: string
  name: string
  avatar: string
  description: string
  status: "online" | "offline"
  category: "general" | "business" | "creative" | "technical"
  isNew?: boolean
  isPremium?: boolean
  personality?: string
  capabilities?: string[]
  model?: string
  config?: {
    avatarColor?: string
  }
}

type Message = {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  timestamp: Date
  isRead?: boolean
  isFavorite?: boolean
  attachments?: Array<{
    id: string
    type: "image" | "file" | "audio" | "video"
    url: string
    name: string
    size?: number
    thumbnail?: string
  }>
}

// 在 ChatMessageProps 类型中添加 onEdit 属性
type ChatMessageProps = {
  message: Message
  agent?: Agent | null
  index: number
  onLike: () => void
  onDislike: () => void
  onCopy: () => void
  onFavorite: () => void
  onShare: () => void
  onEdit?: (messageId: string, newContent: string) => void
  formatTime: (date: Date) => string
}

// 在 ChatMessage 组件中添加编辑状态和处理函数
export function ChatMessage({
  message,
  agent,
  index,
  onLike,
  onDislike,
  onCopy,
  onFavorite,
  onShare,
  onEdit,
  formatTime,
}: ChatMessageProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState(message.content)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 当进入编辑模式时，自动聚焦文本区域并调整高度
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [isEditing])

  // 处理编辑内容变化
  const handleEditChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditedContent(e.target.value)
    e.target.style.height = "auto"
    e.target.style.height = `${e.target.scrollHeight}px`
  }

  // 保存编辑
  const handleSaveEdit = () => {
    if (editedContent.trim() && onEdit) {
      onEdit(message.id, editedContent)
    }
    setIsEditing(false)
  }

  // 取消编辑
  const handleCancelEdit = () => {
    setEditedContent(message.content)
    setIsEditing(false)
  }

  return (
    <div
      className={cn(
        "group animate-in fade-in-0 slide-in-from-bottom-3 duration-300",
        message.role === "user" ? "justify-end" : "justify-start",
        "flex",
      )}
      style={{ animationDelay: `${index * 0.1}s` }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {message.role !== "user" && (
        <Avatar className="h-8 w-8 mr-2 mt-1 flex-shrink-0">
          <AvatarImage src={agent?.avatar || "/placeholder.svg?height=32&width=32"} alt={agent?.name || "AI"} />
          <AvatarFallback style={{ backgroundColor: agent?.config?.avatarColor || "#6cb33f" }}>
            {agent?.name?.charAt(0).toUpperCase() || "AI"}
          </AvatarFallback>
        </Avatar>
      )}
      <div
        className={cn(
          "max-w-[80%] rounded-2xl p-4 shadow-sm transition-all duration-200 hover:shadow-md",
          message.role === "user"
            ? "bg-[#6cb33f] text-white rounded-tr-none ml-auto"
            : "bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-tl-none",
          message.role === "system" &&
            "bg-gray-100/90 dark:bg-gray-700/90 backdrop-blur-sm text-gray-600 dark:text-gray-300 text-sm italic",
        )}
      >
        {isEditing && message.role === "user" ? (
          <div className="flex flex-col">
            <textarea
              ref={textareaRef}
              value={editedContent}
              onChange={handleEditChange}
              className="bg-transparent border-0 text-white resize-none focus:ring-0 focus:outline-none p-0 min-h-[24px]"
              style={{ height: "auto" }}
            />
            <div className="flex justify-end mt-2 space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelEdit}
                className="h-7 px-2 text-white/80 hover:text-white hover:bg-white/10"
              >
                <X className="h-3.5 w-3.5 mr-1" />
                取消
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSaveEdit}
                className="h-7 px-2 text-white/80 hover:text-white hover:bg-white/10"
              >
                <Check className="h-3.5 w-3.5 mr-1" />
                保存
              </Button>
            </div>
          </div>
        ) : (
          <div className={cn("text-sm", message.role === "user" ? "text-white" : "text-gray-800 dark:text-gray-200")}>
            {message.content}
          </div>
        )}

        {/* 消息附件 */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-2 space-y-2">
            {message.attachments.map((attachment) => (
              <div
                key={attachment.id}
                className={cn(
                  "rounded-lg overflow-hidden",
                  message.role === "user" ? "bg-white/20" : "bg-gray-100 dark:bg-gray-700",
                )}
              >
                {attachment.type === "image" && (
                  <img
                    src={attachment.url || "/placeholder.svg"}
                    alt={attachment.name}
                    className="w-full h-auto max-h-60 object-cover"
                  />
                )}
                {attachment.type === "file" && (
                  <div className="p-3 flex items-center">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded flex items-center justify-center mr-3">
                      <svg
                        className="w-5 h-5 text-blue-600 dark:text-blue-300"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{attachment.name}</p>
                      {attachment.size && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {Math.round(attachment.size / 1024)} KB
                        </p>
                      )}
                    </div>
                    <button className="ml-2 text-blue-600 dark:text-blue-400 text-sm font-medium">下载</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-1 flex justify-between items-center text-xs">
          <span className={cn(message.role === "user" ? "text-green-100" : "text-gray-500 dark:text-gray-400")}>
            {formatTime(message.timestamp)}
          </span>

          {message.role === "assistant" ? (
            <div
              className={cn(
                "flex space-x-1 transition-opacity duration-200",
                isHovered || message.isFavorite ? "opacity-100" : "opacity-0",
              )}
            >
              <div
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer"
                onClick={onCopy}
                role="button"
                tabIndex={0}
                title="复制"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>复制</span>
              </div>
              <div
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-green-600 dark:hover:text-green-400 cursor-pointer"
                onClick={onLike}
                role="button"
                tabIndex={0}
                title="有帮助"
              >
                <ThumbsUp className="h-3.5 w-3.5" />
                <span>有帮助</span>
              </div>
              <div
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-600 dark:hover:text-red-400 cursor-pointer"
                onClick={onDislike}
                role="button"
                tabIndex={0}
                title="没帮助"
              >
                <ThumbsDown className="h-3.5 w-3.5" />
                <span>没帮助</span>
              </div>
              <div
                className={cn(
                  "flex items-center gap-1 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer",
                  message.isFavorite ? "text-yellow-500 hover:text-yellow-600" : "text-gray-400 hover:text-yellow-500",
                )}
                onClick={onFavorite}
                role="button"
                tabIndex={0}
                title={message.isFavorite ? "取消收藏" : "收藏"}
              >
                {message.isFavorite ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
                <span>{message.isFavorite ? "取消收藏" : "收藏"}</span>
              </div>
              <div
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                onClick={onShare}
                role="button"
                tabIndex={0}
                title="分享"
              >
                <Share2 className="h-3.5 w-3.5" />
                <span>分享</span>
              </div>
            </div>
          ) : (
            <div
              className={cn("flex space-x-1 transition-opacity duration-200", isHovered ? "opacity-100" : "opacity-0")}
            >
              {!isEditing && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded-full text-green-100 hover:text-white hover:bg-white/10"
                  onClick={() => setIsEditing(true)}
                  title="编辑"
                >
                  <Edit className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
      {message.role === "user" && (
        <Avatar className="h-8 w-8 ml-2 mt-1 flex-shrink-0">
          <AvatarImage src="/images/user-avatar.png" alt="用户" />
          <AvatarFallback>用户</AvatarFallback>
        </Avatar>
      )}
    </div>
  )
}
