"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LogOut, Menu, Moon, Sparkles, Sun, User } from "lucide-react"

import { useAuth } from "@/hooks/use-auth"
import { useTheme } from "@/hooks/use-theme"
import { useMobile } from "@/hooks/use-mobile"
import { useFastGPT } from "@/contexts/FastGPTContext"
import { AgentSelector } from "@/components/chat/agent-selector"
import { ChatSidebar } from "@/components/chat/chat-sidebar"
import { UnifiedChatInterface } from "@/components/chat/unified-chat-interface"
import { ChatLayout } from "@/components/chat/chat-layout"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default function ChatPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isAgentSelectorOpen, setIsAgentSelectorOpen] = useState(false)
  const isMobile = useMobile()
  const router = useRouter()

  const { theme, toggleTheme } = useTheme()
  const { isConfigured, isLoading, currentUser, logout, login } = useAuth()
  const { selectedApp } = useFastGPT()

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
    <ChatLayout
      isDarkMode={theme === 'dark'}
      header={
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
              aria-label={theme === 'dark' ? "切换到浅色模式" : "切换到深色模式"}
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>

            {currentUser ? (
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-500 dark:text-gray-400 ml-2"
                onClick={logout}
              >
                <LogOut className="h-5 w-5" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-500 dark:text-gray-400 ml-2"
                onClick={login}
              >
                <User className="h-5 w-5" />
              </Button>
            )}
          </div>
        </header>
      }
      sidebar={<ChatSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />}
      agentSelector={<AgentSelector isOpen={isAgentSelectorOpen} onClose={() => setIsAgentSelectorOpen(false)} />}
    >
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
    </ChatLayout>
  )
}
