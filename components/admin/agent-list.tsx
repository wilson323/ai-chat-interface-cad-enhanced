"use client"

import type React from "react"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Plus,
  Edit,
  Trash,
  FileUp,
  Mic,
  Volume2,
  Search,
  Filter,
  Key,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react"
import { useFastGPT } from "@/contexts/FastGPTContext"
import type { FastGPTApp, FastGPTModel, VoiceModel } from "@/types/fastgpt"
import FastGPTApi from "@/lib/api/fastgpt"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { motion, AnimatePresence } from "framer-motion"
import { useToast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { STORAGE_KEYS, isApiConfigured } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { AvatarColorPicker } from "@/components/admin/avatar-color-picker"
import { generateAvatarColor } from "@/lib/utils/avatar-utils"

type AgentFormProps = {
  initialData?: FastGPTApp
  onSubmit: (agent: any) => void
  onCancel: () => void
  models: FastGPTModel[]
  voiceModels: VoiceModel[]
  isLoadingModels: boolean
}

function AgentForm({ initialData, onSubmit, onCancel, models, voiceModels, isLoadingModels }: AgentFormProps) {
  const [formData, setFormData] = useState<any>({
    name: initialData?.name || "",
    description: initialData?.description || "",
    modelId: initialData?.modelId || (models.length > 0 ? models[0].id : ""),
    status: initialData?.status || "active",
    type: initialData?.type || "custom", // 添加默认类型
    config: {
      systemPrompt: initialData?.config?.systemPrompt || "",
      temperature: initialData?.config?.temperature || 0.7,
      maxTokens: initialData?.config?.maxTokens || 2000,
      fileUpload: initialData?.config?.fileUpload || false, // 默认关闭
      speechToText: initialData?.config?.speechToText || false, // 默认关闭
      textToSpeech: initialData?.config?.textToSpeech || false, // 默认关闭
      apiKey: initialData?.config?.apiKey || "",
      baseUrl: initialData?.config?.baseUrl || "",
      useProxy: initialData?.config?.useProxy === undefined ? true : initialData?.config?.useProxy, // 默认开启代理
    },
  })
  const [activeTab, setActiveTab] = useState("basic")
  const [copied, setCopied] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  const handleConfigChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      config: {
        ...formData.config,
        [name]: value,
      },
    })
  }

  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormData({
      ...formData,
      config: {
        ...formData.config,
        [name]: checked,
      },
    })
  }

  const handleModelChange = (modelId: string) => {
    setFormData({
      ...formData,
      modelId,
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // 处理数值类型
    const processedData = {
      ...formData,
      config: {
        ...formData.config,
        temperature: Number.parseFloat(formData.config.temperature),
        maxTokens: Number.parseInt(formData.config.maxTokens, 10),
        useProxy: formData.config.useProxy === undefined ? true : formData.config.useProxy, // 确保代理模式默认开启
      },
    }

    // 如果类型是 fastgpt，移除系统提示词、模型选择、温度和最大令牌数
    if (formData.type === "fastgpt") {
      delete processedData.config.systemPrompt
      delete processedData.config.temperature
      delete processedData.config.maxTokens
      processedData.modelId = "" // 清空模型ID
    }

    if (initialData) {
      onSubmit({ ...initialData, ...processedData })
    } else {
      onSubmit(processedData)
    }
  }

  const copyAppId = () => {
    if (initialData?.id) {
      navigator.clipboard.writeText(initialData.id)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="basic">基本信息</TabsTrigger>
          <TabsTrigger value="advanced">高级设置</TabsTrigger>
          <TabsTrigger value="api">API配置</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4">
          {initialData?.id && (
            <div className="space-y-2">
              <Label className="text-base">智能体ID (AppId)</Label>
              <div className="flex items-center space-x-2">
                <Input value={initialData.id} readOnly className="bg-gray-50" />
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon" onClick={copyAppId}>
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>复制AppId</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon" asChild>
                        <a
                          href={`/diagnostics/fastgpt-connection?appId=${initialData.id}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>测试此智能体API</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">这是智能体的唯一标识符，用于API调用和集成</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name" className="text-base">
              智能体名称
            </Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="例如：客户支持助手"
              className="border-gray-300 focus:border-green-500 focus:ring-green-500"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-base">
              描述
            </Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="描述这个智能体的功能"
              className="border-gray-300 focus:border-green-500 focus:ring-green-500"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type" className="text-base">
              智能体类型
            </Label>
            <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
              <SelectTrigger className="border-gray-300 focus:border-green-500 focus:ring-green-500">
                <SelectValue placeholder="选择智能体类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fastgpt">FastGPT（使用FastGPT默认设置）</SelectItem>
                <SelectItem value="custom">自定义（可配置所有参数）</SelectItem>
                <SelectItem value="openai">OpenAI（直接使用OpenAI API）</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              选择FastGPT类型将使用FastGPT的默认设置，无需配置系统提示词、模型等参数
            </p>
          </div>

          <div className="space-y-2 mt-4">
            <AvatarColorPicker
              value={formData.config?.avatarColor || "#6cb33f"}
              onChange={(color) => handleSwitchChange("avatarColor", color)}
            />
          </div>

          {formData.type !== "fastgpt" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="modelId" className="text-base">
                  选择模型
                </Label>
                {isLoadingModels ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Select value={formData.modelId} onValueChange={handleModelChange}>
                    <SelectTrigger className="border-gray-300 focus:border-green-500 focus:ring-green-500">
                      <SelectValue placeholder="选择模型" />
                    </SelectTrigger>
                    <SelectContent>
                      {models.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.name} {model.available ? "" : "(不可用)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="systemPrompt" className="text-base">
                  系统提示词
                </Label>
                <Textarea
                  id="systemPrompt"
                  name="systemPrompt"
                  value={formData.config.systemPrompt}
                  onChange={handleConfigChange}
                  placeholder="设置智能体的行为和角色定位"
                  className="border-gray-300 focus:border-green-500 focus:ring-green-500"
                  rows={4}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  系统提示词用于定义智能体的行为、知识范围和回答风格
                </p>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4">
          {formData.type !== "fastgpt" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="temperature" className="text-base">
                  温度
                </Label>
                <Input
                  id="temperature"
                  name="temperature"
                  type="number"
                  min="0"
                  max="2"
                  step="0.1"
                  value={formData.config.temperature}
                  onChange={handleConfigChange}
                  className="border-gray-300 focus:border-green-500 focus:ring-green-500"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  控制回答的随机性 (0-2)，较低值使回答更确定，较高值使回答更多样化
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxTokens" className="text-base">
                  最大令牌数
                </Label>
                <Input
                  id="maxTokens"
                  name="maxTokens"
                  type="number"
                  min="100"
                  max="8000"
                  step="100"
                  value={formData.config.maxTokens}
                  onChange={handleConfigChange}
                  className="border-gray-300 focus:border-green-500 focus:ring-green-500"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">限制回答的最大长度</p>
              </div>
            </div>
          )}

          <div className="space-y-4 pt-2">
            <Label className="text-base">功能设置</Label>

            <div className="flex items-center space-x-2">
              <Switch
                id="fileUpload"
                checked={formData.config.fileUpload}
                onCheckedChange={(checked) => handleSwitchChange("fileUpload", checked)}
                className="data-[state=checked]:bg-[#6cb33f]"
              />
              <Label htmlFor="fileUpload" className="cursor-pointer">
                启用文件上传
              </Label>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 pl-7">允许用户上传文件（默认关闭）</p>

            <div className="flex items-center space-x-2">
              <Switch
                id="speechToText"
                checked={formData.config.speechToText}
                onCheckedChange={(checked) => handleSwitchChange("speechToText", checked)}
                className="data-[state=checked]:bg-[#6cb33f]"
              />
              <Label htmlFor="speechToText" className="cursor-pointer">
                启用语音转文字
              </Label>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 pl-7">允许用户通过语音输入（默认关闭）</p>

            <div className="flex items-center space-x-2">
              <Switch
                id="textToSpeech"
                checked={formData.config.textToSpeech}
                onCheckedChange={(checked) => handleSwitchChange("textToSpeech", checked)}
                className="data-[state=checked]:bg-[#6cb33f]"
              />
              <Label htmlFor="textToSpeech" className="cursor-pointer">
                启用文字转语音
              </Label>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 pl-7">允许AI回复通过语音播放（默认关闭）</p>

            {formData.config.textToSpeech && (
              <div className="space-y-2 mt-4 pl-6">
                <Label htmlFor="voiceModel" className="text-base">
                  选择语音模型
                </Label>
                {isLoadingModels ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Select
                    value={formData.config.voiceId || ""}
                    onValueChange={(value) => handleSwitchChange("voiceId", value)}
                  >
                    <SelectTrigger className="border-gray-300 focus:border-green-500 focus:ring-green-500">
                      <SelectValue placeholder="选择语音模型" />
                    </SelectTrigger>
                    <SelectContent>
                      {voiceModels.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.name} ({model.gender === "male" ? "男声" : "女声"})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="api" className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="apiKey" className="text-base">
              专用API密钥
            </Label>
            <Input
              id="apiKey"
              name="apiKey"
              value={formData.config.apiKey}
              onChange={handleConfigChange}
              placeholder="输入此智能体专用的API密钥"
              className="border-gray-300 focus:border-green-500 focus:ring-green-500"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              如果设置，将使用此密钥而不是全局API密钥。每个智能体可以使用不同的API密钥。
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="baseUrl" className="text-base">
              API端点 (可选)
            </Label>
            <Input
              id="baseUrl"
              name="baseUrl"
              value={formData.config.baseUrl}
              onChange={handleConfigChange}
              placeholder="例如: https://zktecoaihub.com/api/v1"
              className="border-gray-300 focus:border-green-500 focus:ring-green-500"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              如果留空，将使用全局API端点。每个智能体可以使用不同的API端点。
            </p>
          </div>

          <div className="flex items-center space-x-2 mt-4">
            <Switch
              id="useProxy"
              checked={formData.config.useProxy === undefined ? true : formData.config.useProxy}
              onCheckedChange={(checked) => handleSwitchChange("useProxy", checked)}
              className="data-[state=checked]:bg-[#6cb33f]"
            />
            <Label htmlFor="useProxy" className="cursor-pointer">
              使用代理模式
            </Label>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 pl-7">启用代理模式可以解决CORS跨域问题（默认开启）</p>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          取消
        </Button>
        <Button type="submit" className="bg-[#6cb33f] hover:bg-green-600 transition-colors">
          {initialData ? "更新智能体" : "添加智能体"}
        </Button>
      </div>
    </form>
  )
}

export function AgentList() {
  // Add a check to prevent unnecessary API calls that might cause redirects
  const { applications, fetchApplications, isLoading } = useFastGPT()
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [currentAgent, setCurrentAgent] = useState<FastGPTApp | null>(null)
  const [models, setModels] = useState<FastGPTModel[]>([])
  const [voiceModels, setVoiceModels] = useState<VoiceModel[]>([])
  const [isLoadingModels, setIsLoadingModels] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all")
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const { toast } = useToast()

  // Ensure applications is always an array
  const safeApplications = Array.isArray(applications) ? applications : []

  // Get model list
  useEffect(() => {
    // Add a flag to prevent multiple initialization attempts
    if (isInitialized) return

    const getModels = async () => {
      try {
        setIsLoadingModels(true)

        // Check if we can access the API before making requests
        // This prevents redirects to login page
        const apiConfigured = isApiConfigured()
        if (!apiConfigured) {
          console.log("API not configured, using default models")
          setModels([
            { id: "default-model", name: "Default Model", available: true },
            { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", available: true },
            { id: "gpt-4", name: "GPT-4", available: true },
          ])
          setVoiceModels([
            { id: "default-voice", name: "Default Voice", gender: "female" },
            { id: "male-voice", name: "Male Voice", gender: "male" },
            { id: "female-voice", name: "Female Voice", gender: "female" },
          ])
          return
        }

        // Only fetch models if API is configured
        const modelList = await FastGPTApi.getModels()
        setModels(Array.isArray(modelList) ? modelList : [])

        // Get voice models
        const voiceModelList = await FastGPTApi.getVoiceModels()
        setVoiceModels(Array.isArray(voiceModelList) ? voiceModelList : [])

        setIsInitialized(true)
      } catch (error) {
        console.error("Failed to get model list:", error)
        toast({
          title: "Failed to get model list",
          description: "Unable to get available AI model list, using default models",
          variant: "destructive",
        })
        // Set to empty array to prevent errors
        setModels([
          { id: "default-model", name: "Default Model", available: true },
          { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", available: true },
          { id: "gpt-4", name: "GPT-4", available: true },
        ])
        setVoiceModels([
          { id: "default-voice", name: "Default Voice", gender: "female" },
          { id: "male-voice", name: "Male Voice", gender: "male" },
          { id: "female-voice", name: "Female Voice", gender: "female" },
        ])
      } finally {
        setIsLoadingModels(false)
      }
    }

    getModels()
  }, [toast, isInitialized])

  // Add this function to check authentication status
  const checkAuthentication = () => {
    // Check if user is in localStorage
    const userJson = localStorage.getItem(STORAGE_KEYS.CURRENT_USER)
    if (!userJson) {
      console.warn("User not found in localStorage")
      return false
    }

    try {
      const user = JSON.parse(userJson)
      return !!user
    } catch (e) {
      console.error("Error parsing user data:", e)
      return false
    }
  }

  // 过滤智能体
  const filteredAgents = useMemo(() => {
    // 确保applications是数组
    if (!Array.isArray(safeApplications)) {
      console.error("applications不是数组:", safeApplications)
      return []
    }

    return safeApplications
      .filter(
        (app) =>
          app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          app.description.toLowerCase().includes(searchQuery.toLowerCase()),
      )
      .filter((app) =>
        statusFilter === "all" ? true : statusFilter === "active" ? app.status === "active" : app.status === "inactive",
      )
  }, [safeApplications, searchQuery, statusFilter])

  const handleAddAgent = async (agent: Omit<FastGPTApp, "id" | "createdAt" | "updatedAt">) => {
    try {
      // Check authentication first
      if (!checkAuthentication()) {
        toast({
          title: "Authentication Required",
          description: "Please log in to add an agent",
          variant: "destructive",
        })
        return
      }

      // 直接使用FastGPT上下文中的方法
      const LOCAL_STORAGE_KEYS = {
        AGENTS: "ai_chat_agents",
      }

      // 获取现有智能体
      const agentsStr = localStorage.getItem(LOCAL_STORAGE_KEYS.AGENTS)
      const agents = agentsStr ? JSON.parse(agentsStr) : []

      // Inside handleAddAgent, before creating the new agent:
      if (!agent.config.avatarColor) {
        agent.config.avatarColor = generateAvatarColor(agent.name)
      }

      // 创建新智能体
      const id = `agent_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
      const now = new Date().toISOString()

      const newAgent = {
        ...agent,
        id,
        createdAt: now,
        updatedAt: now,
      }

      // 添加到列表并保存
      agents.push(newAgent)
      localStorage.setItem(LOCAL_STORAGE_KEYS.AGENTS, JSON.stringify(agents))

      // 保存到管理员配置
      const adminAgentsStr = localStorage.getItem("admin_agents")
      const adminAgents = adminAgentsStr ? JSON.parse(adminAgentsStr) : []
      adminAgents.push(newAgent)
      localStorage.setItem("admin_agents", JSON.stringify(adminAgents))

      // 刷新应用列表
      await fetchApplications()
      setIsAddDialogOpen(false)

      toast({
        title: "智能体创建成功",
        description: `${agent.name} 已成功添加到您的智能体列表`,
      })
    } catch (error) {
      console.error("添加智能体失败:", error)
      toast({
        title: "添加智能体失败",
        description: "无法创建新智能体，请稍后重试",
        variant: "destructive",
      })
    }
  }

  const handleEditAgent = async (updatedAgent: FastGPTApp) => {
    try {
      // Check authentication first
      if (!checkAuthentication()) {
        toast({
          title: "Authentication Required",
          description: "Please log in to edit an agent",
          variant: "destructive",
        })
        return
      }

      const LOCAL_STORAGE_KEYS = {
        AGENTS: "ai_chat_agents",
      }

      // 获取现有智能体
      const agentsStr = localStorage.getItem(LOCAL_STORAGE_KEYS.AGENTS)
      const agents = agentsStr ? JSON.parse(agentsStr) : []

      // Similarly, in handleEditAgent, if the avatar color is being removed, generate one:
      // Inside handleEditAgent, before updating the agent:
      if (!updatedAgent.config.avatarColor) {
        updatedAgent.config.avatarColor = generateAvatarColor(updatedAgent.name)
      }

      // 查找并更新智能体
      const index = agents.findIndex((a) => a.id === updatedAgent.id)

      if (index !== -1) {
        agents[index] = {
          ...agents[index],
          ...updatedAgent,
          config: {
            ...agents[index].config,
            ...updatedAgent.config,
          },
          updatedAt: new Date().toISOString(),
        }

        // 保存更新后的列表
        localStorage.setItem(LOCAL_STORAGE_KEYS.AGENTS, JSON.stringify(agents))

        // 更新管理员配置
        const adminAgentsStr = localStorage.getItem("admin_agents")
        const adminAgents = adminAgentsStr ? JSON.parse(adminAgentsStr) : []
        const adminIndex = adminAgents.findIndex((a) => a.id === updatedAgent.id)

        if (adminIndex !== -1) {
          adminAgents[adminIndex] = {
            ...adminAgents[adminIndex],
            ...updatedAgent,
            config: {
              ...adminAgents[adminIndex].config,
              ...updatedAgent.config,
            },
            updatedAt: new Date().toISOString(),
          }
        } else {
          adminAgents.push({
            ...updatedAgent,
            updatedAt: new Date().toISOString(),
          })
        }

        localStorage.setItem("admin_agents", JSON.stringify(adminAgents))
      }

      // 刷新应用列表
      await fetchApplications()
      setIsEditDialogOpen(false)

      toast({
        title: "智能体更新成功",
        description: `${updatedAgent.name} 已成功更新`,
      })
    } catch (error) {
      console.error("更新智能体失败:", error)
      toast({
        title: "更新智能体失败",
        description: "无法更新智能体信息，请稍后重试",
        variant: "destructive",
      })
    }
  }

  const handleDeleteAgent = async (id: string) => {
    try {
      // Check authentication first
      if (!checkAuthentication()) {
        toast({
          title: "Authentication Required",
          description: "Please log in to delete an agent",
          variant: "destructive",
        })
        return
      }

      const LOCAL_STORAGE_KEYS = {
        AGENTS: "ai_chat_agents",
      }

      // 获取现有智能体
      const agentsStr = localStorage.getItem(LOCAL_STORAGE_KEYS.AGENTS)
      const agents = agentsStr ? JSON.parse(agentsStr) : []

      // 过滤掉要删除的智能体
      const filteredAgents = agents.filter((agent) => agent.id !== id)

      // 保存更新后的列表
      localStorage.setItem(LOCAL_STORAGE_KEYS.AGENTS, JSON.stringify(filteredAgents))

      // 更新管理员配置
      const adminAgentsStr = localStorage.getItem("admin_agents")
      if (adminAgentsStr) {
        const adminAgents = JSON.parse(adminAgentsStr)
        const filteredAdminAgents = adminAgents.filter((agent) => agent.id !== id)
        localStorage.setItem("admin_agents", JSON.stringify(filteredAdminAgents))
      }

      // 刷新应用列表
      await fetchApplications()

      toast({
        title: "智能体已删除",
        description: "智能体已成功从您的列表中移除",
      })
    } catch (error) {
      console.error("删除智能体失败:", error)
      toast({
        title: "删除智能体失败",
        description: "无法删除智能体，请稍后重试",
        variant: "destructive",
      })
    }
  }

  const handleToggleAgentStatus = async (id: string, status: "active" | "inactive") => {
    const agent = safeApplications.find((app) => app.id === id)
    if (!agent) return

    try {
      const LOCAL_STORAGE_KEYS = {
        AGENTS: "ai_chat_agents",
      }

      // 获取现有智能体
      const agentsStr = localStorage.getItem(LOCAL_STORAGE_KEYS.AGENTS)
      const agents = agentsStr ? JSON.parse(agentsStr) : []

      // 查找并更新智能体状态
      const index = agents.findIndex((a) => a.id === id)

      if (index !== -1) {
        agents[index] = {
          ...agents[index],
          status,
          updatedAt: new Date().toISOString(),
        }

        // 保存更新后的列表
        localStorage.setItem(LOCAL_STORAGE_KEYS.AGENTS, JSON.stringify(agents))
      }

      // 刷新应用列表
      await fetchApplications()

      toast({
        title: status === "active" ? "智能体已启用" : "智能体已禁用",
        description: status === "active" ? "智能体现在可供用户使用" : "智能体已被禁用，用户将无法访问",
      })
    } catch (error) {
      console.error("更新智能体状态失败:", error)
      toast({
        title: "更新状态失败",
        description: "无法更新智能体状态，请稍后重试",
        variant: "destructive",
      })
    }
  }

  // Use this function before making API calls
  const handleRefresh = async () => {
    try {
      setIsRefreshing(true)

      // Check authentication first
      if (!checkAuthentication()) {
        toast({
          title: "Authentication Required",
          description: "Please log in to access this feature",
          variant: "destructive",
        })
        setIsRefreshing(false)
        return
      }

      await fetchApplications()
      toast({
        title: "Refresh Successful",
        description: "Agent list has been updated",
      })
    } catch (error) {
      console.error("Failed to refresh agent list:", error)
      toast({
        title: "Refresh Failed",
        description: "Unable to refresh agent list, please try again later",
        variant: "destructive",
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleTestAgent = (agent: FastGPTApp) => {
    // 打开测试页面，传递智能体ID
    window.open(`/diagnostics/fastgpt-connection?appId=${agent.id}`, "_blank")
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">AI 智能体</h2>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card
              key={i}
              className="backdrop-blur-md bg-white/70 dark:bg-gray-800/70 border-green-200 dark:border-green-900"
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <Skeleton className="h-7 w-40" />
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-6 w-20" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-4" />
                <Skeleton className="h-4 w-3/4 mb-4" />
                <Skeleton className="h-4 w-1/2 mb-4" />
                <div className="flex justify-end gap-2 mt-4">
                  <Skeleton className="h-9 w-20" />
                  <Skeleton className="h-9 w-20" />
                  <Skeleton className="h-9 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // 添加错误状态显示
  if (!Array.isArray(applications)) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-green-700 dark:text-green-400">AI 智能体</h2>
          <Button onClick={() => fetchApplications()} className="bg-[#6cb33f] hover:bg-green-600 transition-colors">
            重试加载
          </Button>
        </div>
        <Card className="backdrop-blur-md bg-white/90 dark:bg-gray-800/90 border-red-200 dark:border-red-900 shadow-md">
          <CardContent className="flex flex-col items-center justify-center h-40 p-6">
            <p className="text-red-500 dark:text-red-400 mb-4">加载智能体列表时出错</p>
            <p className="text-gray-500 dark:text-gray-400 mb-4 text-center">
              应用列表数据格式不正确。这可能是由于API返回了意外的数据格式或网络错误。
            </p>
            <Button
              variant="outline"
              onClick={() => {
                fetchApplications()
              }}
            >
              重新加载
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-green-700 dark:text-green-400">AI 智能体</h2>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="搜索智能体..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-full sm:w-64 bg-white/80 dark:bg-gray-800/80"
            />
          </div>

          <Select value={statusFilter} onValueChange={(value: "all" | "active" | "inactive") => setStatusFilter(value)}>
            <SelectTrigger className="w-full sm:w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="状态筛选" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有状态</SelectItem>
              <SelectItem value="active">已启用</SelectItem>
              <SelectItem value="inactive">已禁用</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing} className="w-full sm:w-auto">
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            刷新
          </Button>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#6cb33f] hover:bg-green-600 transition-colors w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                添加智能体
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>添加新 AI 智能体</DialogTitle>
              </DialogHeader>
              <AgentForm
                onSubmit={handleAddAgent}
                onCancel={() => setIsAddDialogOpen(false)}
                models={models}
                voiceModels={voiceModels}
                isLoadingModels={isLoadingModels}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {safeApplications.length === 0 ? (
        <Card className="backdrop-blur-md bg-white/90 dark:bg-gray-800/90 border-green-200 dark:border-green-900 shadow-md">
          <CardContent className="flex flex-col items-center justify-center h-60 p-6">
            <div className="w-16 h-16 rounded-full bg-green-50 dark:bg-green-900/30 flex items-center justify-center mb-4">
              <Plus className="h-8 w-8 text-green-500 dark:text-green-400" />
            </div>
            <h3 className="text-xl font-medium text-gray-700 dark:text-gray-300 mb-2">暂无智能体</h3>
            <p className="text-gray-500 dark:text-gray-400 text-center mb-6">创建您的第一个AI智能体，开始与用户对话</p>
            <Button
              className="bg-[#6cb33f] hover:bg-green-600 transition-colors"
              onClick={() => setIsAddDialogOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              添加智能体
            </Button>
          </CardContent>
        </Card>
      ) : filteredAgents.length === 0 ? (
        <Card className="backdrop-blur-md bg-white/90 dark:bg-gray-800/90 border-green-200 dark:border-green-900 shadow-md">
          <CardContent className="flex flex-col items-center justify-center h-40 p-6">
            <p className="text-gray-500 dark:text-gray-400 mb-4">没有找到匹配的智能体</p>
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery("")
                setStatusFilter("all")
              }}
            >
              清除筛选条件
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="flex-1 p-4 max-h-[calc(100vh-200px)] overflow-y-auto">
          <div className="grid gap-4 md:grid-cols-2">
            <AnimatePresence>
              {filteredAgents.map((agent) => (
                <motion.div
                  key={agent.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className="h-full"
                >
                  <Card className="backdrop-blur-md bg-white/90 dark:bg-gray-800/90 border-green-200 dark:border-green-900 shadow-md hover:shadow-lg transition-all duration-300 h-full">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-xl text-green-700 dark:text-green-400">{agent.name}</CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={agent.status === "active" ? "default" : "secondary"}
                            className={`${
                              agent.status === "active"
                                ? "bg-green-500 hover:bg-green-600"
                                : "bg-gray-400 hover:bg-gray-500"
                            } transition-colors`}
                          >
                            {agent.status === "active" ? "已启用" : "已禁用"}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center space-x-2 mb-4">
                        <Label className="text-sm font-medium">AppID:</Label>
                        <div className="flex items-center space-x-1">
                          <span className="text-sm text-gray-500 dark:text-gray-400 font-mono">{agent.id}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => {
                              navigator.clipboard.writeText(agent.id)
                              toast({
                                title: "已复制",
                                description: "AppID已复制到剪贴板",
                              })
                            }}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      <p className="text-gray-600 dark:text-gray-300 mb-4">{agent.description}</p>

                      <div className="flex flex-wrap gap-1 mb-4">
                        {agent.type && (
                          <Badge
                            variant="outline"
                            className="bg-gray-50 dark:bg-gray-900/20 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-800"
                          >
                            {agent.type === "fastgpt" ? "FastGPT" : agent.type === "openai" ? "OpenAI" : "自定义"}
                          </Badge>
                        )}
                        {agent.config?.fileUpload && (
                          <Badge
                            variant="outline"
                            className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800"
                          >
                            <FileUp className="h-3 w-3 mr-1" />
                            文件上传
                          </Badge>
                        )}
                        {agent.config?.speechToText && (
                          <Badge
                            variant="outline"
                            className="bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800"
                          >
                            <Mic className="h-3 w-3 mr-1" />
                            语音转文字
                          </Badge>
                        )}
                        {agent.config?.textToSpeech && (
                          <Badge
                            variant="outline"
                            className="bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800"
                          >
                            <Volume2 className="h-3 w-3 mr-1" />
                            文字转语音
                          </Badge>
                        )}
                        {agent.config?.apiKey && (
                          <Badge
                            variant="outline"
                            className="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800"
                          >
                            <Key className="h-3 w-3 mr-1" />
                            专用API密钥
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-medium">模型:</span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {agent.type === "fastgpt"
                            ? "使用FastGPT默认模型"
                            : models.find((m) => m.id === agent.modelId)?.name || agent.modelId || "未指定"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-medium">启用状态:</span>
                        <Switch
                          checked={agent.status === "active"}
                          onCheckedChange={(checked) =>
                            handleToggleAgentStatus(agent.id, checked ? "active" : "inactive")
                          }
                          className="data-[state=checked]:bg-[#6cb33f]"
                        />
                      </div>

                      <div className="flex justify-end gap-2 mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTestAgent(agent)}
                          className="hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20 dark:hover:text-blue-400 transition-colors"
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          测试
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setCurrentAgent(agent)
                            setIsEditDialogOpen(true)
                          }}
                          className="hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-900/20 dark:hover:text-green-400 transition-colors"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          编辑
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-500 border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            >
                              <Trash className="h-4 w-4 mr-1" />
                              删除
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>确定删除?</AlertDialogTitle>
                              <AlertDialogDescription>
                                这将永久删除该智能体及其所有对话历史记录。此操作无法撤销。
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>取消</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-red-500 hover:bg-red-600"
                                onClick={() => handleDeleteAgent(agent.id)}
                              >
                                删除
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </ScrollArea>
      )}

      {/* 编辑对话框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>编辑 AI 智能体</DialogTitle>
          </DialogHeader>
          {currentAgent && (
            <AgentForm
              initialData={currentAgent}
              onSubmit={handleEditAgent}
              onCancel={() => setIsEditDialogOpen(false)}
              models={models}
              voiceModels={voiceModels}
              isLoadingModels={isLoadingModels}
            />
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
