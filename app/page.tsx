"use client"

import { useRef } from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { useMobile } from "@/hooks/use-mobile"
import {
  Sun,
  Moon,
  Menu,
  Search,
  ArrowLeft,
  Plus,
  MessageSquare,
  Settings,
  LogOut,
  Star,
  Clock,
  MoreHorizontal,
  Sparkles,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  FileUp,
} from "lucide-react"
import { ChatMessage } from "@/components/chat/chat-message"
import { ChatInput } from "@/components/chat/chat-input"
import { AgentCard } from "@/components/chat/agent-card"
import { WelcomeScreen } from "@/components/chat/welcome-screen"
import { ThreeDAvatar } from "@/components/chat/three-d-avatar"

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
  personality?: string
  capabilities?: string[]
  model?: string
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

type Conversation = {
  id: string
  title: string
  agentId: string
  messages: Message[]
  timestamp: Date
  pinned?: boolean
  unread?: number
  tags?: string[]
}

// Mock data
const publishedAgents: Agent[] = [
  {
    id: "default",
    name: "ZKTeco 助手",
    avatar: "/images/agents/assistant.png",
    description: "通用AI助手，可以回答各种问题",
    status: "online",
    category: "general",
    personality: "友好、专业、全面",
    capabilities: ["问答", "创意写作", "信息检索"],
    model: "GPT-4",
  },
  {
    id: "business",
    name: "商务顾问",
    avatar: "/images/agents/business.png",
    description: "专注于商业策略和市场分析",
    status: "online",
    category: "business",
    personality: "专业、分析型、直接",
    capabilities: ["市场分析", "商业策略", "竞争对手研究"],
    model: "GPT-4",
  },
  {
    id: "creative",
    name: "创意助手",
    avatar: "/images/agents/creative.png",
    description: "帮助激发创意和设计灵感",
    status: "online",
    category: "creative",
    personality: "活泼、创新、想象力丰富",
    capabilities: ["创意构思", "设计建议", "内容创作"],
    model: "Claude-3",
  },
  {
    id: "tech",
    name: "技术专家",
    avatar: "/images/agents/tech.png",
    description: "解决技术问题和编程挑战",
    status: "online",
    category: "technical",
    isNew: true,
    personality: "精确、逻辑性强、详细",
    capabilities: ["代码审查", "技术问题解决", "架构建议"],
    model: "GPT-4o",
  },
  {
    id: "writer",
    name: "写作助手",
    avatar: "/images/agents/writer.png",
    description: "帮助撰写和编辑各类文本",
    status: "online",
    category: "creative",
    personality: "文学性、细致、有条理",
    capabilities: ["内容创作", "文本编辑", "风格调整"],
    model: "Claude-3",
  },
  {
    id: "poster",
    name: "海报智能体",
    avatar: "/images/agents/poster.png",
    description: "创建专业海报和视觉设计",
    status: "online",
    category: "creative",
    isNew: true,
    personality: "创造性、美学敏感、直观",
    capabilities: ["海报设计", "视觉创意", "品牌表达"],
    model: "GPT-4o",
  },
  {
    id: "cad-analyzer",
    name: "CAD解析智能体",
    avatar: "/images/agents/cad.png",
    description: "分析和解读CAD文件",
    status: "online",
    category: "technical",
    isNew: true,
    personality: "严谨、精确、分析型",
    capabilities: ["CAD文件分析", "图纸解读", "技术评估"],
    model: "GPT-4o",
  },
  {
    id: "analyst",
    name: "数据分析师",
    avatar: "/images/agents/analyst.png",
    description: "分析数据并提供洞察",
    status: "online",
    category: "business",
    isPremium: true,
    personality: "分析型、精确、客观",
    capabilities: ["数据可视化", "趋势分析", "预测建模"],
    model: "GPT-4o",
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
    tags: ["AI", "技术", "趋势"],
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
    tags: ["市场", "策略", "产品"],
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
    tags: ["创意", "广告", "环保"],
  },
]

export default function ChatPage() {
  // 状态
  const [agents, setAgents] = useState<Agent[]>(publishedAgents)
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>(mockConversations)
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null)
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [showNotification, setShowNotification] = useState(false)
  const [notificationMessage, setNotificationMessage] = useState("")
  const [activeTab, setActiveTab] = useState("conversations")
  const [agentCategory, setAgentCategory] = useState<string>("all")
  const [displayLimit, setDisplayLimit] = useState(4)
  const [showWelcomeScreen, setShowWelcomeScreen] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const [showAgentDetails, setShowAgentDetails] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()
  const isMobile = useMobile()
  const router = useRouter()

  // 初始化
  useEffect(() => {
    // 检查系统主题偏好
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setIsDarkMode(true)
      document.documentElement.classList.add("dark")
    }

    // 检查是否有对话历史，如果有则不显示欢迎屏幕
    if (localStorage.getItem("hasVisited")) {
      setShowWelcomeScreen(false)
    } else {
      localStorage.setItem("hasVisited", "true")
    }

    // 检查用户的音频偏好
    const audioPreference = localStorage.getItem("audioMuted")
    if (audioPreference !== null) {
      setIsMuted(audioPreference === "true")
    }

    // 检查用户登录状态
    const userJson = localStorage.getItem("currentUser")
    if (userJson) {
      try {
        const user = JSON.parse(userJson)
        setCurrentUser(user)

        // 如果用户已登录，显示欢迎消息
        toast({
          title: "已登录",
          description: `欢迎回来，用户 ${user.id}`,
        })
      } catch (e) {
        console.error("解析用户数据出错:", e)
      }
    }

    // 只有在非静音状态下才播放欢迎音效
    if (!isMuted) {
      const audio = new Audio("/sounds/welcome.mp3")
      audio.volume = 0.5
      audio.play().catch((e) => console.log("Audio play failed:", e))
    }
  }, [isMuted, toast])

  // 滚动到消息底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [currentConversation?.messages, isLoading])

  // 处理主题切换
  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode)
    document.documentElement.classList.toggle("dark")

    // 播放切换音效
    if (!isMuted) {
      const audio = new Audio(`/sounds/${isDarkMode ? "light" : "dark"}-mode.mp3`)
      audio.volume = 0.3
      audio.play().catch((e) => console.log("Audio play failed:", e))
    }
  }

  // 处理全屏切换
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((e) => {
        console.log(`Error attempting to enable fullscreen: ${e.message}`)
      })
      setIsFullscreen(true)
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
        setIsFullscreen(false)
      }
    }
  }

  // 处理声音切换
  const toggleMute = () => {
    const newMutedState = !isMuted
    setIsMuted(newMutedState)
    // 保存用户偏好到 localStorage
    localStorage.setItem("audioMuted", String(newMutedState))
    toast({
      title: isMuted ? "声音已开启" : "声音已静音",
      description: isMuted ? "现在您将听到交互音效" : "所有音效已被静音",
    })
  }

  // 处理登出
  const handleLogout = () => {
    localStorage.removeItem("currentUser")
    setCurrentUser(null)
    toast({
      title: "已登出",
      description: "您已成功退出登录",
    })
  }

  // 创建新对话
  const createNewConversation = (agent: Agent) => {
    // 处理特殊智能体的跳转
    if (agent.id === "poster") {
      router.push("/poster-generator")
      return
    }
    
    // 处理CAD智能体跳转
    if (agent.id === "cad-analyzer") {
      router.push("/cad-analyzer")
      return
    }
  
    const newConversation: Conversation = {
      id: `conv-${Date.now()}`,
      title: `与${agent.name}的新对话`,
      agentId: agent.id,
      messages: [
        {
          id: `msg-welcome-${Date.now()}`,
          role: "assistant",
          content: `您好！我是${agent.name}，很高兴为您服务。请问有什么我可以帮助您的吗？`,
          timestamp: new Date(),
        },
      ],
      timestamp: new Date(),
      tags: [agent.category],
    }
    setConversations([newConversation, ...conversations])
    setCurrentConversation(newConversation)
    setSelectedAgent(agent)
    setActiveTab("conversations")
    setShowWelcomeScreen(false)

    // 播放新对话音效
    if (!isMuted) {
      const audio = new Audio("/sounds/new-conversation.mp3")
      audio.volume = 0.4
      audio.play().catch((e) => console.log("Audio play failed:", e))
    }
  }

  // 处理对话选择
  const handleConversationSelect = (conversationId: string) => {
    const conversation = conversations.find((conv) => conv.id === conversationId)
    if (conversation) {
      setCurrentConversation(conversation)
      const agent = agents.find((a) => a.id === conversation.agentId)
      if (agent) {
        setSelectedAgent(agent)
      }

      // 清除未读消息计数
      if (conversation.unread) {
        const updatedConversation = { ...conversation, unread: 0 }
        setConversations(conversations.map((conv) => (conv.id === conversationId ? updatedConversation : conv)))
      }

      // 播放选择对话音效
      if (!isMuted) {
        const audio = new Audio("/sounds/select-conversation.mp3")
        audio.volume = 0.2
        audio.play().catch((e) => console.log("Audio play failed:", e))
      }
    }
    if (isMobile) {
      setIsSidebarOpen(false)
    }
    setShowWelcomeScreen(false)
  }

  // 处理消息提交
  const handleSubmit = (message: string) => {
    if (!message.trim() || !selectedAgent || !currentConversation) return

    // 添加用户消息
    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: message,
      timestamp: new Date(),
    }

    // 更新对话
    const updatedConversation = {
      ...currentConversation,
      messages: [...currentConversation.messages, userMessage],
      timestamp: new Date(),
    }

    setCurrentConversation(updatedConversation)
    setConversations(conversations.map((conv) => (conv.id === currentConversation.id ? updatedConversation : conv)))

    setIsLoading(true)

    // 播放发送消息音效
    if (!isMuted) {
      const audio = new Audio("/sounds/message-sent.mp3")
      audio.volume = 0.3
      audio.play().catch((e) => console.log("Audio play failed:", e))
    }

    // 模拟API调用
    setTimeout(() => {
      // 添加助手消息
      const assistantMessage: Message = {
        id: `msg-${Date.now()}`,
        role: "assistant",
        content: generateMockResponse(message, selectedAgent.id),
        timestamp: new Date(),
        isRead: true,
      }

      // 更新对话
      const finalConversation = {
        ...updatedConversation,
        messages: [...updatedConversation.messages, assistantMessage],
        // 如果是第一条消息，更新标题
        title:
          updatedConversation.messages.length <= 1
            ? message.slice(0, 30) + (message.length > 30 ? "..." : "")
            : updatedConversation.title,
      }

      setCurrentConversation(finalConversation)
      setConversations(conversations.map((conv) => (conv.id === currentConversation.id ? finalConversation : conv)))

      setIsLoading(false)

      // 播放接收消息音效
      if (!isMuted) {
        const audio = new Audio("/sounds/message-received.mp3")
        audio.volume = 0.4
        audio.play().catch((e) => console.log("Audio play failed:", e))
      }
    }, 1500)
  }

  // 处理消息反馈
  const handleMessageFeedback = (messageId: string, type: "like" | "dislike") => {
    toast({
      title: type === "like" ? "已收到反馈" : "我们会改进",
      description: type === "like" ? "感谢您的积极反馈！" : "感谢您帮助我们改进。",
    })

    // 播放反馈音效
    if (!isMuted) {
      const audio = new Audio(`/sounds/feedback-${type}.mp3`)
      audio.volume = 0.3
      audio.play().catch((e) => console.log("Audio play failed:", e))
    }
  }

  // 处理消息收藏
  const handleMessageFavorite = (messageId: string) => {
    if (!currentConversation) return

    const updatedMessages = currentConversation.messages.map((msg) =>
      msg.id === messageId ? { ...msg, isFavorite: !msg.isFavorite } : msg,
    )

    const updatedConversation = {
      ...currentConversation,
      messages: updatedMessages,
    }

    setCurrentConversation(updatedConversation)
    setConversations(conversations.map((conv) => (conv.id === currentConversation.id ? updatedConversation : conv)))

    const message = currentConversation.messages.find((msg) => msg.id === messageId)
    const isFavorite = message?.isFavorite

    toast({
      title: isFavorite ? "已取消收藏" : "已收藏消息",
      description: isFavorite ? "消息已从收藏夹中移除" : "消息已添加到收藏夹",
    })

    // 播放收藏音效
    if (!isMuted) {
      const audio = new Audio(`/sounds/${isFavorite ? "unfavorite" : "favorite"}.mp3`)
      audio.volume = 0.3
      audio.play().catch((e) => console.log("Audio play failed:", e))
    }
  }

  // 复制消息到剪贴板
  const copyToClipboard = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        showNotificationMessage("消息已复制")

        // 播放复制音效
        if (!isMuted) {
          const audio = new Audio("/sounds/copy.mp3")
          audio.volume = 0.3
          audio.play().catch((e) => console.log("Audio play failed:", e))
        }
      })
      .catch((err) => {
        console.error("复制失败: ", err)
        showNotificationMessage("复制失败")
      })
  }

  // 显示通知
  const showNotificationMessage = (message: string) => {
    setNotificationMessage(message)
    setShowNotification(true)
    setTimeout(() => {
      setShowNotification(false)
    }, 2000)
  }

  // 生成模拟回复
  const generateMockResponse = (userInput: string, agentId: string): string => {
    const responses = {
      default: [
        "我理解您的问题，让我来详细解答。首先，我们需要考虑几个关键因素...",
        "这是一个很好的问题。根据最新研究和数据，我可以告诉您...",
        "感谢您的提问。这个问题涉及多个方面，我会尽量清晰地解释...",
      ],
      business: [
        "从商业角度分析，这个问题需要考虑市场趋势、竞争格局和客户需求三个维度...",
        "作为商业顾问，我建议从以下几个方面制定策略：首先，明确目标市场...",
        "您提出的商业问题很有深度。基于当前经济环境和行业状况，我认为...",
      ],
      creative: [
        "从创意角度思考，我们可以打破常规，尝试以下几种创新方法...",
        "创意设计需要平衡美学与功能性。针对您的需求，我建议考虑这些独特的方案...",
        "让我们一起头脑风暴一些创意点子。首先，我们可以从用户体验出发，思考...",
      ],
      tech: [
        "从技术角度来看，这个问题可以通过以下几种方法解决...",
        "这是一个有趣的技术挑战。我建议采用以下步骤来实现您的目标...",
        "作为技术专家，我可以告诉您这个问题的最佳解决方案是...",
      ],
      writer: [
        "从写作角度来看，我建议调整文本结构，使其更加流畅和引人入胜...",
        "这段文字可以通过以下几种方式优化：首先，明确中心思想...",
        "作为写作助手，我可以帮您改进这段文字，使其更加专业和有说服力...",
      ],
      analyst: [
        "根据数据分析，我们可以得出以下几个关键洞察...",
        "从数据的角度来看，这个问题的核心在于...",
        "通过对数据的深入分析，我发现了以下几个值得注意的趋势...",
      ],
    }

    const agentResponses =
      agentId === "business" || agentId === "analyst"
        ? responses.business
        : agentId === "creative" || agentId === "writer"
          ? responses.creative
          : agentId === "tech"
            ? responses.tech
            : responses.default

    return agentResponses[Math.floor(Math.random() * agentResponses.length)]
  }

  // 格式化时间
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  // 格式化日期
  const formatDate = (date: Date): string => {
    const now = new Date()
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffInDays === 0) {
      return `今天`
    } else if (diffInDays === 1) {
      return `昨天`
    } else if (diffInDays < 7) {
      return date.toLocaleDateString([], { weekday: "long" })
    } else {
      return date.toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" })
    }
  }

  // 过滤对话
  const filteredConversations = searchQuery
    ? conversations.filter((conv) => conv.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : conversations

  // 过滤智能体
  const filteredAgents = agentCategory === "all" ? agents : agents.filter((agent) => agent.category === agentCategory)
  const displayedAgents = filteredAgents.slice(0, displayLimit)

  // 返回首页
  const goToHome = () => {
    window.location.href = "/"
  }

  // 处理消息编辑
  const handleEditMessage = (messageId: string, newContent: string) => {
    if (!currentConversation) return

    // 找到要编辑的消息
    const messageIndex = currentConversation.messages.findIndex((msg) => msg.id === messageId)
    if (messageIndex === -1) return

    // 创建更新后的消息
    const updatedMessage = {
      ...currentConversation.messages[messageIndex],
      content: newContent,
    }

    // 创建更新后的消息数组
    const updatedMessages = [...currentConversation.messages]
    updatedMessages[messageIndex] = updatedMessage

    // 更新对话
    const updatedConversation = {
      ...currentConversation,
      messages: updatedMessages,
    }

    setCurrentConversation(updatedConversation)
    setConversations(conversations.map((conv) => (conv.id === currentConversation.id ? updatedConversation : conv)))

    // 播放编辑音效
    if (!isMuted) {
      const audio = new Audio("/sounds/edit-message.mp3")
      audio.volume = 0.3
      audio.play().catch((e) => console.log("Audio play failed:", e))
    }

    toast({
      title: "消息已更新",
      description: "您的消息已成功编辑",
    })
  }

  // 如果显示欢迎屏幕
  if (showWelcomeScreen) {
    return (
      <WelcomeScreen
        onGetStarted={() => setShowWelcomeScreen(false)}
        isDarkMode={isDarkMode}
        toggleTheme={toggleTheme}
      />
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
            className="mr-2 md:hidden text-gray-500 dark:text-gray-400"
            onClick={goToHome}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
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
              <img src="/images/zkteco-mascot.png" alt="ZKTeco" className="h-6 w-6" />
            </div>
            <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-200 hidden md:block">AI 对话助手</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" className="flex items-center gap-2" onClick={() => router.push("/cad-analyzer")}>
            <FileUp className="h-4 w-4" />
            CAD文件分析器
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-500 dark:text-gray-400"
            onClick={toggleMute}
            aria-label={isMuted ? "开启声音" : "静音"}
          >
            {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-500 dark:text-gray-400"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? "退出全屏" : "全屏"}
          >
            {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-500 dark:text-gray-400"
            onClick={toggleTheme}
            aria-label={isDarkMode ? "切换到浅色模式" : "切换到深色模式"}
          >
            {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
          <Avatar className="h-8 w-8">
            <AvatarImage src="/images/user-avatar.png" alt="用户" />
            <AvatarFallback>用户</AvatarFallback>
          </Avatar>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* 侧边栏 */}
        <aside
          className={cn(
            "w-80 border-r border-gray-200/80 dark:border-gray-800/80 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md flex flex-col z-20",
            isMobile ? "fixed inset-y-0 left-0 transform transition-transform duration-300 ease-in-out" : "relative",
            isSidebarOpen ? "translate-x-0" : isMobile ? "-translate-x-full" : "",
          )}
        >
          {/* 标签页 */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="grid grid-cols-2 p-0 bg-transparent border-b border-gray-200/80 dark:border-gray-700/80">
              <TabsTrigger
                value="conversations"
                className="py-3 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-[#6cb33f] data-[state=active]:text-[#6cb33f] data-[state=active]:shadow-none"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                对话
              </TabsTrigger>
              <TabsTrigger
                value="agents"
                className="py-3 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-[#6cb33f] data-[state=active]:text-[#6cb33f] data-[state=active]:shadow-none"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                智能体
              </TabsTrigger>
            </TabsList>

            {/* 对话列表 */}
            <TabsContent value="conversations" className="flex-1 flex flex-col p-0 m-0">
              {/* 搜索框 */}
              <div className="p-4 border-b border-gray-200/80 dark:border-gray-700/80">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="搜索对话..."
                    className="pl-9 bg-gray-100/80 dark:bg-gray-700/80 border-0 focus-visible:ring-[#6cb33f]"
                  />
                </div>
              </div>

              {/* 新建对话按钮 */}
              <div className="p-4">
                <Button
                  className="w-full bg-[#6cb33f] hover:bg-green-600 text-white"
                  onClick={() => setActiveTab("agents")}
                >
                  <Plus className="mr-2 h-4 w-4" /> 新建对话
                </Button>
              </div>

              {/* 对话列表 */}
              <ScrollArea className="flex-1 h-full max-h-[calc(100vh-220px)]">
                {/* 置顶对话 */}
                {filteredConversations.some((conv) => conv.pinned) && (
                  <div className="px-4 py-2">
                    <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      置顶对话
                    </h3>
                    <div className="mt-1 space-y-1">
                      {filteredConversations
                        .filter((conv) => conv.pinned)
                        .map((conversation) => (
                          <button
                            key={conversation.id}
                            onClick={() => handleConversationSelect(conversation.id)}
                            className={cn(
                              "w-full text-left px-3 py-2 rounded-lg transition-colors group relative",
                              currentConversation?.id === conversation.id
                                ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300"
                                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700",
                            )}
                          >
                            <div className="flex items-center">
                              <div className="flex-shrink-0 relative">
                                <Avatar className="h-10 w-10">
                                  <AvatarImage
                                    src={
                                      agents.find((a) => a.id === conversation.agentId)?.avatar ||
                                      "/placeholder.svg?height=40&width=40" ||
                                      "/placeholder.svg" ||
                                      "/placeholder.svg"
                                    }
                                    alt={agents.find((a) => a.id === conversation.agentId)?.name || "AI"}
                                  />
                                  <AvatarFallback>AI</AvatarFallback>
                                </Avatar>
                                {conversation.unread && (
                                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                    {conversation.unread}
                                  </span>
                                )}
                              </div>
                              <div className="ml-3 flex-1 overflow-hidden">
                                <div className="text-sm font-medium truncate">{conversation.title}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 truncate flex items-center">
                                  <Clock className="h-3 w-3 mr-1 inline" />
                                  {formatDate(conversation.timestamp)}
                                </div>
                              </div>
                              <Star className="h-4 w-4 text-yellow-400 ml-2" />
                            </div>
                          </button>
                        ))}
                    </div>
                  </div>
                )}

                {/* 其他对话 */}
                <div className="px-4 py-2">
                  <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    所有对话
                  </h3>
                  <div className="mt-1 space-y-1">
                    {filteredConversations
                      .filter((conv) => !conv.pinned)
                      .map((conversation) => (
                        <button
                          key={conversation.id}
                          onClick={() => handleConversationSelect(conversation.id)}
                          className={cn(
                            "w-full text-left px-3 py-2 rounded-lg transition-colors group relative",
                            currentConversation?.id === conversation.id
                              ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300"
                              : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700",
                          )}
                        >
                          <div className="flex items-center">
                            <div className="flex-shrink-0 relative">
                              <Avatar className="h-10 w-10">
                                <AvatarImage
                                  src={
                                    agents.find((a) => a.id === conversation.agentId)?.avatar ||
                                    "/placeholder.svg?height=40&width=40" ||
                                    "/placeholder.svg" ||
                                    "/placeholder.svg"
                                  }
                                  alt={agents.find((a) => a.id === conversation.agentId)?.name || "AI"}
                                />
                                <AvatarFallback>AI</AvatarFallback>
                              </Avatar>
                              {conversation.unread && (
                                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                  {conversation.unread}
                                </span>
                              )}
                            </div>
                            <div className="ml-3 flex-1 overflow-hidden">
                              <div className="text-sm font-medium truncate">{conversation.title}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 truncate flex items-center">
                                <Clock className="h-3 w-3 mr-1 inline" />
                                {formatDate(conversation.timestamp)}
                              </div>
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="icon" className="h-6 w-6">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </button>
                      ))}
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            {/* 智能体列表 */}
            <TabsContent value="agents" className="flex-1 flex flex-col p-0 m-0 mt-2">
              {/* 分类筛选 */}
              <div className="p-4 border-b border-gray-200/80 dark:border-gray-700/80">
                <div className="grid grid-cols-5 gap-2 h-10">
                  <Button
                    variant={agentCategory === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAgentCategory("all")}
                    className={`w-full h-full box-border ${agentCategory === "all" ? "bg-[#6cb33f] hover:bg-green-600" : ""}`}
                  >
                    全部
                  </Button>
                  <Button
                    variant={agentCategory === "general" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAgentCategory("general")}
                    className={`w-full h-full box-border ${agentCategory === "general" ? "bg-[#6cb33f] hover:bg-green-600" : ""}`}
                  >
                    通用
                  </Button>
                  <Button
                    variant={agentCategory === "business" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAgentCategory("business")}
                    className={`w-full h-full box-border ${agentCategory === "business" ? "bg-[#6cb33f] hover:bg-green-600" : ""}`}
                  >
                    商业
                  </Button>
                  <Button
                    variant={agentCategory === "creative" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAgentCategory("creative")}
                    className={`w-full h-full box-border ${agentCategory === "creative" ? "bg-[#6cb33f] hover:bg-green-600" : ""}`}
                  >
                    创意
                  </Button>
                  <Button
                    variant={agentCategory === "technical" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAgentCategory("technical")}
                    className={`w-full h-full box-border ${agentCategory === "technical" ? "bg-[#6cb33f] hover:bg-green-600" : ""}`}
                  >
                    技术
                  </Button>
                </div>
              </div>

              {/* 智能体卡片列表 */}
              <ScrollArea className="flex-1 p-4 h-full max-h-[calc(100vh-220px)]">
                <div className="grid grid-cols-1 gap-4">
                  {displayedAgents.map((agent) => (
                    <AgentCard
                      key={agent.id}
                      agent={agent}
                      onSelect={() => createNewConversation(agent)}
                      onViewDetails={() => {
                        setSelectedAgent(agent)
                        setShowAgentDetails(true)
                      }}
                    />
                  ))}
                  {filteredAgents.length > displayLimit && (
                    <Button
                      onClick={() => setDisplayLimit((prev) => prev + 4)}
                      variant="outline"
                      className="w-full mt-2"
                    >
                      查看更多 ({filteredAgents.length - displayLimit})
                    </Button>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>

          {/* 侧边栏底部 */}
          <div className="p-4 border-t border-gray-200/80 dark:border-gray-700/80">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" className="text-gray-500 dark:text-gray-400">
                <Settings className="h-4 w-4 mr-2" />
                设置
              </Button>
              {currentUser && (
                <Button variant="ghost" size="sm" className="text-gray-500 dark:text-gray-400" onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  退出
                </Button>
              )}
            </div>
          </div>
        </aside>

        {/* 主聊天区域 */}
        <main className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
          {currentConversation ? (
            <>
              {/* 聊天头部 */}
              <div className="p-4 border-b border-gray-200/80 dark:border-gray-800/80 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md flex items-center justify-between">
                <div className="flex items-center">
                  <Avatar className="h-10 w-10 mr-3">
                    <AvatarImage
                      src={selectedAgent?.avatar || "/placeholder.svg?height=40&width=40"}
                      alt={selectedAgent?.name || "AI"}
                    />
                    <AvatarFallback>AI</AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="font-medium text-gray-800 dark:text-gray-200">{selectedAgent?.name}</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                      <span
                        className={`inline-block w-2 h-2 rounded-full mr-1 ${selectedAgent?.status === "online" ? "bg-green-500" : "bg-gray-400"}`}
                      ></span>
                      {selectedAgent?.status === "online" ? "在线" : "离线"}
                      {selectedAgent?.model && <span className="ml-2 text-[#6cb33f]">· {selectedAgent.model}</span>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="text-gray-500 dark:text-gray-400">
                    <MoreHorizontal className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* 消息区域 */}
              <div
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto p-4 space-y-6 bg-gradient-to-br from-gray-50/50 to-white/50 dark:from-gray-900/50 dark:to-gray-800/50"
              >
                {/* 在渲染消息的部分，添加 onEdit 属性 */}
                {currentConversation.messages.map((message, index) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    agent={agents.find((a) => a.id === currentConversation.agentId)}
                    index={index}
                    onLike={() => handleMessageFeedback(message.id, "like")}
                    onDislike={() => handleMessageFeedback(message.id, "dislike")}
                    onCopy={() => copyToClipboard(message.content)}
                    onFavorite={() => handleMessageFavorite(message.id)}
                    onShare={() => {
                      toast({
                        title: "分享功能",
                        description: "分享功能即将推出",
                      })
                    }}
                    onEdit={message.role === "user" ? handleEditMessage : undefined}
                    formatTime={formatTime}
                  />
                ))}

                {/* 打字指示器 */}
                {isLoading && (
                  <div className="flex items-start animate-in fade-in-0 slide-in-from-bottom-3">
                    <Avatar className="h-8 w-8 mr-2 mt-1">
                      <AvatarImage
                        src={selectedAgent?.avatar || "/placeholder.svg?height=32&width=32"}
                        alt={selectedAgent?.name || "AI"}
                      />
                      <AvatarFallback>AI</AvatarFallback>
                    </Avatar>
                    <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl rounded-tl-none p-4 shadow-sm">
                      <div className="flex space-x-2">
                        <div
                          className="w-2 h-2 rounded-full bg-[#6cb33f]/40 animate-bounce"
                          style={{ animationDelay: "0ms" }}
                        ></div>
                        <div
                          className="w-2 h-2 rounded-full bg-[#6cb33f]/60 animate-bounce"
                          style={{ animationDelay: "150ms" }}
                        ></div>
                        <div
                          className="w-2 h-2 rounded-full bg-[#6cb33f]/80 animate-bounce"
                          style={{ animationDelay: "300ms" }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* 输入区域 */}
              <ChatInput onSubmit={handleSubmit} isLoading={isLoading} isMuted={isMuted} />
            </>
          ) : (
            // 选择助手开始对话
            <div className="flex-1 flex flex-col items-center justify-center p-4">
              <div className="text-center max-w-md">
                <div className="mb-6 relative">
                  <ThreeDAvatar />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">开始一个新对话</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-8">
                  选择一个AI助手开始对话，或者从左侧边栏选择一个已有的对话继续。
                </p>
                <Button
                  onClick={() => setActiveTab("agents")}
                  className="bg-[#6cb33f] hover:bg-green-600 text-white px-6 py-2"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  浏览智能体
                </Button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* 通知提示 */}
      <div
        className={cn(
          "fixed bottom-5 left-1/2 transform -translate-x-1/2 bg-gray-800/90 dark:bg-gray-700/90 backdrop-blur-sm text-white px-4 py-2 rounded-lg shadow-lg transition-opacity duration-300",
          showNotification ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
      >
        {notificationMessage}
      </div>
    </div>
  )
}
