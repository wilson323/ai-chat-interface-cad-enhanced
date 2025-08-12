"use client"

import { Check,ThumbsDown, ThumbsUp } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface MessageFeedbackProps {
  messageId: string
  onFeedback: (messageId: string, type: "like" | "dislike", comment?: string) => void
  className?: string
  initialRating?: "like" | "dislike"
}

export function MessageFeedback({ messageId, onFeedback, className = "", initialRating }: MessageFeedbackProps) {
  const [feedback, setFeedback] = useState<"like" | "dislike" | null>(initialRating ?? null)
  const [showComment, setShowComment] = useState(false)
  const [comment, setComment] = useState("")
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleFeedback = (type: "like" | "dislike") => {
    setFeedback(type)

    if (type === "like") {
      onFeedback(messageId, type)
      setIsSubmitted(true)
    } else {
      setShowComment(true)
    }
  }

  const handleSubmitComment = () => {
    if (feedback) {
      onFeedback(messageId, feedback, comment)
      setIsSubmitted(true)
      setShowComment(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className={cn("flex items-center text-xs text-gray-500 dark:text-gray-400", className)}>
        <Check className="h-3 w-3 mr-1" />
        <span>感谢您的反馈</span>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex items-center space-x-2">
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-7 px-2 rounded-full text-gray-500 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20",
            feedback === "like" && "text-primary-500 bg-primary-50 dark:bg-primary-900/20",
          )}
          onClick={() => handleFeedback("like")}
        >
          <ThumbsUp className="h-3.5 w-3.5 mr-1" />
          <span className="text-xs">有帮助</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-7 px-2 rounded-full text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20",
            feedback === "dislike" && "text-red-500 bg-red-50 dark:bg-red-900/20",
          )}
          onClick={() => handleFeedback("dislike")}
        >
          <ThumbsDown className="h-3.5 w-3.5 mr-1" />
          <span className="text-xs">没帮助</span>
        </Button>
      </div>

      {showComment && (
        <div className="mt-2 flex flex-col space-y-2">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="请告诉我们如何改进..."
            className="w-full text-xs p-2 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            rows={2}
          />
          <div className="flex justify-end space-x-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                setShowComment(false)
                setFeedback(null)
              }}
            >
              取消
            </Button>
            <Button
              variant="default"
              size="sm"
              className="h-7 text-xs bg-primary-500 hover:bg-primary-600"
              onClick={handleSubmitComment}
            >
              提交
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
