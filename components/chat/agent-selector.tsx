"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useFastGPT } from "@/contexts/FastGPTContext"
import { Skeleton } from "@/components/ui/skeleton"
import { Search, Bot } from "lucide-react"
import { Input } from "@/components/ui/input"
import { motion } from "framer-motion"

export function AgentSelector() {
  const { applications, selectApplication, selectedApp, isLoading } = useFastGPT()
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearchFocused, setIsSearchFocused] = useState(false)

  // 过滤智能体
  const filteredAgents = applications.filter(
    (app) =>
      app.status === "active" &&
      (app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.description.toLowerCase().includes(searchQuery.toLowerCase())),
  )

  // 处理智能体选择
  const handleSelectAgent = (appId: string) => {
    selectApplication(appId)
  }

  // 获取智能体头像
  const getAgentAvatar = (agent: any) => {
    if (agent.avatar) return agent.avatar

    // 根据智能体类型返回不同的默认头像
    if (agent.type === "fastgpt") {
      return "/tech-expert-avatar.png"
    } else if (agent.type === "openai") {
      return "/abstract-geometric-shapes.png"
    }

    return "/abstract-ai-network.png"
  }

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="h-8 w-full" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 p-2">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-1 flex-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <div
        className={`flex items-center gap-2 p-1 rounded-md transition-all ${
          isSearchFocused ? "ring-2 ring-green-500 bg-white dark:bg-gray-800" : "bg-gray-100 dark:bg-gray-800"
        }`}
      >
        <Search className="h-4 w-4 text-gray-500 dark:text-gray-400 ml-2" />
        <Input
          type="text"
          placeholder="搜索智能体..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsSearchFocused(true)}
          onBlur={() => setIsSearchFocused(false)}
          className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent"
        />
      </div>

      <ScrollArea className="flex-1 h-[500px] pr-2">
        <div className="space-y-2">
          {filteredAgents.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Bot className="h-12 w-12 mx-auto mb-2 text-gray-400 dark:text-gray-500" />
              <p>未找到智能体</p>
              <p className="text-sm">请检查搜索条件或创建新智能体</p>
            </div>
          ) : (
            filteredAgents.map((agent) => (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                layout={false}
              >
                <Button
                  variant={selectedApp?.id === agent.id ? "default" : "ghost"}
                  className={`w-full justify-start gap-3 h-auto py-3 px-3 ${
                    selectedApp?.id === agent.id
                      ? "bg-green-500 hover:bg-green-600 text-white"
                      : "hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                  onClick={() => handleSelectAgent(agent.id)}
                >
                  <Avatar className="h-10 w-10 border">
                    <AvatarImage src={getAgentAvatar(agent) || "/placeholder.svg"} alt={agent.name} />
                    <AvatarFallback className="text-xs">
                      {agent.name
                        .split(" ")
                        .map((n: string) => n[0])
                        .join("")
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start text-left">
                    <span className="font-medium">{agent.name}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                      {agent.description || "无描述"}
                    </span>
                  </div>
                </Button>
              </motion.div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
