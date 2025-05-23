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

  // 性能优化配置 - 针对不同设备环境优化
  const streamConfig = {
    bufferSize: isMobile ? 4096 : 8192, // 移动端使用较小缓冲区
    chunkDelay: isMobile ? 32 : 16, // 移动端降低帧率
    typewriterSpeed: isMobile ? 80 : 120, // 移动端较慢打字速度
    batchSize: isMobile ? 5 : 10, // 移动端小批处理
  }

  const performanceConfig = {
    virtualScrollEnabled: true,
    itemHeight: isMobile ? 100 : 80, // 移动端增大触摸区域
    overscan: isMobile ? 3 : 5, // 移动端减少预渲染
    typewriterSpeed: streamConfig.typewriterSpeed,
    showPerformanceMetrics: process.env.NODE_ENV === 'development' && !isMobile, // 开发环境且非移动端显示
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
        // 传递性能优化配置
        streamConfig={streamConfig}
        performanceConfig={performanceConfig}
      />
    </div>
  )
}
