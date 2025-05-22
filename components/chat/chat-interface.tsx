"use client"

import { useState } from "react"
import StreamChatInterface from "./stream-chat-interface"
import { SuggestedQuestions } from "./suggested-questions"
import { useMobile } from "@/hooks/use-mobile"
import { useRouter } from "next/navigation"
import { defaultAgent } from "@/config/default-agent"

export default function ChatInterface() {
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([
    "ZKTeco 公司的主要产品有哪些？",
    "如何解决门禁系统连接问题？",
    "人脸识别技术的优势是什么？",
    "如何设置考勤管理系统？",
  ])
  const [selectedQuestion, setSelectedQuestion] = useState("")
  const isMobile = useMobile()
  const router = useRouter()

  const handleSelectQuestion = (question: string) => {
    setSelectedQuestion(question)
  }

  const handleBackClick = () => {
    router.push("/")
  }

  return (
    <div className="flex flex-col h-full w-full">
      {suggestedQuestions.length > 0 && !selectedQuestion && (
        <SuggestedQuestions
          questions={suggestedQuestions}
          onSelectQuestion={handleSelectQuestion}
          className={isMobile ? "absolute top-16 left-0 right-0 z-10" : "mt-4"}
        />
      )}

      <StreamChatInterface
        agentId={defaultAgent.id}
        initialSystemPrompt={defaultAgent.systemPrompt}
        agentName={defaultAgent.name}
        agentAvatar={defaultAgent.avatar || "/images/zkteco-mascot.png"}
        onBackClick={handleBackClick}
      />
    </div>
  )
}
