"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { useMobile } from "@/hooks/use-mobile"
import { Sun, Moon, Menu, LogOut, Sparkles, User } from "lucide-react"
import { UnifiedChatInterface } from "@/components/chat/unified-chat-interface"
import { ChatSidebar } from "@/components/chat/chat-sidebar"
import { AgentSelector } from "@/components/chat/agent-selector"
import { useFastGPT } from "@/contexts/FastGPTContext"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"

// Types
type Agent = {
  id: string
  name: string
  avatar: string
  description: string
  status: "online" | "offline"
  category: "general" | "business" | "creative" | "technical"
  isNew?: boolean
  isPremium?: boolean
}

type Message = {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  timestamp: Date
  isRead?: boolean
  attachments?: Array<{
    id: string
    type: "image" | "file" | "audio"
    url: string
    name: string
  }>
}

type Conversation = {
  id: string
  title: string
  agentId: string
  messages: Message[]
  timestamp: Date
  pinned?: boolean
  unread?: number
}

// Mock data
const publishedAgents: Agent[] = [
  {
    id: "default",
    name: "ZKTeco 助手",
    avatar: "/images/clean-assistant-avatar.png",
    description: "通用AI助手，可以回答各种问题",
    status: "online",
    category: "general",
  },
  {
    id: "business",
    name: "商务顾问",
    avatar: "/images/clean-business-avatar.png",
    description: "专注于商业策略和市场分析",
    status: "online",
    category: "business",
  },
  {
    id: "creative",
    name: "创意助手",
    avatar: "/images/clean-creative-avatar.png",
    description: "帮助激发创意和设计灵感",
    status: "online",
    category: "creative",
  },
  {
    id: "tech",
    name: "技术专家",
    avatar: "/images/clean-tech-avatar.png",
    description: "解决技术问题和编程挑战",
    status: "online",
    category: "technical",
    isNew: true,
  },
  {
    id: "writer",
    name: "写作助手",
    avatar: "/images/clean-writer-avatar.png",
    description: "帮助撰写和编辑各类文本",
    status: "online",
    category: "creative",
  },
  {
    id: "analyst",
    name: "数据分析师",
    avatar: "/images/clean-analyst-avatar.png",
    description: "分析数据并提供洞察",
    status: "online",
    category: "business",
    isPremium: true,
  },
]

const mockConversations: Conversation[] = [
  {
    id: "conv1",
    title: "关于AI技术的讨论",
    agentId: "default",
    messages: [
      {
        id: "msg1",
        role: "user",
        content: "你好，我想了解一下最新的AI技术发展趋势。",
        timestamp: new Date(Date.now() - 1000 * 60 * 30),
      },
      {
        id: "msg2",
        role: "assistant",
        content:
          "您好！最近AI技术发展迅速，主要趋势包括大型语言模型的进步、多模态AI的发展、AI在特定领域的应用深化，以及更注重AI伦理和安全。您对哪个方面特别感兴趣？",
        timestamp: new Date(Date.now() - 1000 * 60 * 29),
      },
    ],
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    pinned: true,
  },
  {
    id: "conv2",
    title: "市场策略分析",
    agentId: "business",
    messages: [
      {
        id: "msg3",
        role: "user",
        content: "我们的新产品应该如何定位市场？",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
      },
      {
        id: "msg4",
        role: "assistant",
        content:
          "根据您的产品特点，我建议从以下几个方面考虑市场定位：1. 目标客户群体分析；2. 竞争对手优劣势分析；3. 产品差异化优势；4. 价格策略制定。您希望我详细展开哪个方面？",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 + 1000 * 30),
      },
    ],
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
    unread: 2,
  },
  {
    id: "conv3",
    title: "创意广告方案",
    agentId: "creative",
    messages: [
      {
        id: "msg5",
        role: "user",
        content: "我需要为一款环保产品设计创意广告方案。",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
      },
      {
        id: "msg6",
        role: "assistant",
        content:
          "环保产品的创意广告可以从情感共鸣和社会责任感入手。我建议以下方向：1. 展示产品对环境的积极影响；2. 使用对比手法突显问题与解决方案；3. 讲述感人的环保故事；4. 互动式体验让用户参与环保行动。您更倾向于哪种风格？",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3 + 1000 * 30),
      },
    ],
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
  },
]

export default function ChatPage() {
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isAgentSelectorOpen, setIsAgentSelectorOpen] = useState(false)
  const { toast } = useToast()
  const isMobile = useMobile()
  const router = useRouter()

  const { isConfigured, isLoading, currentUser, selectedApp, setCurrentUser } = useFastGPT()

  // 初始化
  useEffect(() => {
    // 检查系统主题偏好
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setIsDarkMode(true)
      document.documentElement.classList.add("dark")
    }
  }, [])

  // 处理主题切换
  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode)
    document.documentElement.classList.toggle("dark")
  }

  // 处理登出
  const handleLogout = () => {
    setCurrentUser(null)
    toast({
      title: "已登出",
      description: "您已成功退出登录",
    })
  }

  // 如果API未配置，显示配置提示
  if (!isConfigured && !isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold mb-2">欢迎使用 FastGPT 聊天</h1>
              <p className="text-gray-500 dark:text-gray-400">请先在管理员界面配置 FastGPT API</p>
            </div>
            <Button className="w-full bg-[#6cb33f] hover:bg-green-600" onClick={() => router.push("/admin")}>
              前往管理员界面
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 加载状态
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#6cb33f] border-t-transparent"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`h-screen flex flex-col bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 ${isDarkMode ? "dark" : ""}`}
    >
      {/* 顶部导航栏 */}
      <header className="border-b border-gray-200/80 dark:border-gray-800/80 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md py-3 px-4 flex items-center justify-between z-10">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className="mr-2 text-gray-500 dark:text-gray-400"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center">
            <div className="h-8 w-8 rounded-full bg-[#6cb33f]/20 flex items-center justify-center mr-2">
              <img src="/images/zkteco-mascot.png" alt="FastGPT" className="h-6 w-6" />
            </div>
            <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-200 hidden md:block">FastGPT 聊天</h1>
          </div>
        </div>

        <div className="flex items-center">
          {selectedApp && (
            <Button
              variant="ghost"
              className="mr-2 text-gray-600 dark:text-gray-300"
              onClick={() => setIsAgentSelectorOpen(true)}
            >
              <Avatar className="h-6 w-6 mr-2">
                <AvatarImage src={selectedApp.avatar || "/placeholder.svg?height=24&width=24"} alt={selectedApp.name} />
                <AvatarFallback>{selectedApp.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <span className="hidden md:inline">{selectedApp.name}</span>
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="text-gray-500 dark:text-gray-400"
            onClick={toggleTheme}
            aria-label={isDarkMode ? "切换到浅色模式" : "切换到深色模式"}
          >
            {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>

          {currentUser ? (
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-500 dark:text-gray-400 ml-2"
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-500 dark:text-gray-400 ml-2"
              onClick={() => router.push("/auth/auto-login?userId=demo&password=demo")}
            >
              <User className="h-5 w-5" />
            </Button>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* 聊天界面 */}
        <main className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-gray-50/50 to-white/50 dark:from-gray-900/50 dark:to-gray-800/50">
          {selectedApp ? (
            <UnifiedChatInterface key={selectedApp.id} initialAgentId={selectedApp.id} />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-4">
              <div className="text-center max-w-md">
                <div className="mb-6">
                  <div className="h-24 w-24 rounded-full bg-[#6cb33f]/20 flex items-center justify-center mx-auto">
                    <Sparkles className="h-12 w-12 text-[#6cb33f]" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">选择一个智能体开始对话</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-8">请从智能体列表中选择一个AI助手开始对话</p>
                <Button
                  onClick={() => setIsAgentSelectorOpen(true)}
                  className="bg-[#6cb33f] hover:bg-green-600 text-white px-6 py-2"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  选择智能体
                </Button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* 侧边栏 */}
      <ChatSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* 智能体选择器 */}
      <AgentSelector isOpen={isAgentSelectorOpen} onClose={() => setIsAgentSelectorOpen(false)} />
    </div>
  )
}
