"use client"

import { Button } from "@/components/ui/button"
import { Sparkles } from "lucide-react"
import { useState, useEffect } from "react"
import { useMobile } from "@/hooks/use-mobile"

interface SuggestedQuestionsProps {
  questions: string[]
  onSelectQuestion: (question: string) => void
  className?: string
}

export function SuggestedQuestions({ questions, onSelectQuestion, className = "" }: SuggestedQuestionsProps) {
  const [isVisible, setIsVisible] = useState(true)
  const isMobile = useMobile()

  // Auto-hide on mobile after a delay
  useEffect(() => {
    if (isMobile) {
      const timer = setTimeout(() => {
        setIsVisible(false)
      }, 10000) // Hide after 10 seconds on mobile

      return () => clearTimeout(timer)
    }
  }, [isMobile])

  if (!isVisible || questions.length === 0) return null

  return (
    <div className={`w-full max-w-3xl mx-auto p-3 ${className}`}>
      <div className="bg-gray-50/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg p-3 shadow-sm border border-gray-200/50 dark:border-gray-700/50">
        <div className="flex items-center mb-2">
          <Sparkles className="h-4 w-4 text-primary-500 mr-2" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">猜你想问</span>
          {isMobile && (
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-6 text-xs text-gray-500"
              onClick={() => setIsVisible(false)}
            >
              关闭
            </Button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {questions.map((question, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              className="text-xs bg-white/80 dark:bg-gray-700/80 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600"
              onClick={() => {
                onSelectQuestion(question)
                setIsVisible(false)
              }}
            >
              {question}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
