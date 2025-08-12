"use client"
import { MoonStar, Sun } from "lucide-react"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type Agent = {
  id: string
  name: string
  icon?: string
  config?: {
    avatarColor?: string
  }
}

type ChatHeaderProps = {
  agents: Agent[]
  selectedAgent: string
  onSelectAgent: (agentId: string) => void
  isDarkMode: boolean
  toggleTheme: () => void
}

export function ChatHeader({ agents, selectedAgent, onSelectAgent, isDarkMode, toggleTheme }: ChatHeaderProps) {
  return (
    <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 flex items-center justify-between">
      <div className="flex-1 max-w-xs">
        <Select value={selectedAgent} onValueChange={onSelectAgent}>
          <SelectTrigger className="border-green-200 focus:ring-[#6cb33f] bg-white/70 dark:bg-gray-800/70 backdrop-blur-md">
            <SelectValue placeholder="选择一个 AI 助手" />
          </SelectTrigger>
          <SelectContent>
            {agents.map((agent) => (
              <SelectItem key={agent.id} value={agent.id}>
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white"
                    style={{ backgroundColor: agent.config?.avatarColor || "#6cb33f" }}
                  >
                    {agent.icon ? <i className={`fas fa-${agent.icon}`}></i> : <i className="fas fa-robot"></i>}
                  </div>
                  <span>{agent.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center space-x-2">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label={isDarkMode ? "切换到浅色模式" : "切换到深色模式"}
        >
          {isDarkMode ? (
            <Sun className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          ) : (
            <MoonStar className="h-5 w-5 text-gray-600" />
          )}
        </button>
      </div>
    </div>
  )
}
