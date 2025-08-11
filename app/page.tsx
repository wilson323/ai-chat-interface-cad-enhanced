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
  FileSpreadsheet,
  Image,
} from "lucide-react"
import { ChatMessage } from "@/components/chat/chat-message"
import { ChatInput } from "@/components/chat/chat-input"
import { AgentCard } from "@/components/chat/agent-card"
import { WelcomeScreen } from "@/components/chat/welcome-screen"
import { ThreeDAvatar } from "@/components/chat/three-d-avatar"
import { AgentSelector } from '@/components/chat/agent-selector'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { useAgentStore } from '@/lib/stores/agent-store'

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

export default function HomePage() {
  const { loadAgents, isLoading, error } = useAgentStore();
  
  useEffect(() => {
    loadAgents();
  }, [loadAgents]);
  
  return (
    <div className="container mx-auto py-12 px-4">
      <h1 className="text-4xl font-bold mb-2 text-center">AI助手</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-10 text-center">
        选择您需要的智能助手，开始对话或文件处理
      </p>
      
      {isLoading ? (
        <div className="flex justify-center items-center min-h-[300px]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-red-500">加载失败</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
          </CardContent>
          <CardFooter>
            <button 
              className="px-4 py-2 bg-blue-500 text-white rounded-md"
              onClick={() => loadAgents()}
            >
              重试
            </button>
          </CardFooter>
        </Card>
      ) : (
        <>
          <AgentSelector />
          
          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-6">智能体类型</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  icon: MessageSquare,
                  title: "FastGPT对话智能体",
                  description: "基于大语言模型的智能对话助手，支持多种对话模式和知识库集成。",
                  color: "blue"
                },
                {
                  icon: FileSpreadsheet,
                  title: "CAD解读智能体",
                  description: "上传CAD文件（DWG、DXF、STEP等）获取专业分析和3D可视化。",
                  color: "green"
                },
                {
                  icon: Image,
                  title: "海报生成智能体",
                  description: "根据文字描述自动生成精美海报，支持多种风格定制和排版优化。",
                  color: "purple"
                }
              ].map((item, index) => (
                <Card key={index}>
                  <CardHeader>
                    <div className={`w-12 h-12 rounded-full bg-${item.color}-100 flex items-center justify-center mb-4`}>
                      <item.icon className={`h-6 w-6 text-${item.color}-600`} />
                    </div>
                    <CardTitle>{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{item.description}</CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
