"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronRight, Info } from "lucide-react"

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

type AgentCardProps = {
  agent: Agent
  onSelect: () => void
  onViewDetails: () => void
}

export function AgentCard({ agent, onSelect, onViewDetails }: AgentCardProps) {
  return (
    <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200/80 dark:border-gray-700/80 overflow-hidden hover:border-[#6cb33f]/50 dark:hover:border-[#6cb33f]/30 transition-all duration-200 hover:shadow-md group">
      <div className="p-4">
        <div className="flex items-center">
          <div className="relative">
            <Avatar className="h-12 w-12 mr-4 ring-2 ring-[#6cb33f]/20 group-hover:ring-[#6cb33f]/40 transition-all duration-200">
              <AvatarImage src={agent.avatar || "/placeholder.svg"} alt={agent.name} />
              <AvatarFallback style={{ backgroundColor: agent.config?.avatarColor || "#6cb33f" }}>
                {agent.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span
              className={`absolute bottom-0 right-3 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800 ${agent.status === "online" ? "bg-green-500" : "bg-gray-400"}`}
            ></span>
          </div>
          <div className="flex-1">
            <div className="flex items-center">
              <h3 className="font-medium text-gray-900 dark:text-gray-100">{agent.name}</h3>
              {agent.isNew && <Badge className="ml-2 bg-blue-500 hover:bg-blue-600">新</Badge>}
              {agent.isPremium && <Badge className="ml-2 bg-purple-500 hover:bg-purple-600">高级</Badge>}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{agent.description}</p>
          </div>
        </div>

        {/* 能力标签 */}
        {agent.capabilities && agent.capabilities.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {agent.capabilities.map((capability, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                style={{
                  backgroundColor: `${agent.config?.avatarColor || "#6cb33f"}10`,
                  color: agent.config?.avatarColor || "#6cb33f",
                }}
              >
                {capability}
              </span>
            ))}
          </div>
        )}

        <div className="mt-4 flex justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={onViewDetails}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <Info className="h-4 w-4 mr-1" />
            详情
          </Button>
          <Button onClick={onSelect} className="bg-[#6cb33f] hover:bg-green-600 text-white">
            开始对话
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
