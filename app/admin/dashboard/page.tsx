"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AdminLayout } from "@/components/admin/layout"
import { AgentList } from "@/components/admin/agent-list"
import { ApiConfig } from "@/components/admin/api-config"
import { UserFeedback } from "@/components/admin/user-feedback"
import { useToast } from "@/hooks/use-toast"
import { useFastGPT } from "@/contexts/FastGPTContext"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { AgentConfig, AgentType } from '@/lib/agents/base-agent'
import { useAgentStore } from '@/lib/stores/agent-store'
import { Button } from '@/components/ui/button'
import { MessageSquare, FileSpreadsheet, Image, Plus, Edit, Trash } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Avatar } from '@/components/ui/avatar'

export default function AdminDashboard() {
  const router = useRouter()
  const { toast } = useToast()
  const { isConfigured, isLoading, apiKey, setApiKey } = useFastGPT()
  const [isClient, setIsClient] = useState(false)
  const [activeTab, setActiveTab] = useState("agents")
  const { agents, loadAgents, isLoading: agentLoading, error, deleteAgent } = useAgentStore()
  const [selectedTab, setSelectedTab] = useState<AgentType | 'all'>('all')
  const [filteredAgents, setFilteredAgents] = useState<AgentConfig[]>([])

  useEffect(() => {
    setIsClient(true)
    // 检查管理员是否登录
    const token = localStorage.getItem("adminToken")
    if (!token) {
      toast({
        title: "需要认证",
        description: "请登录以访问管理员仪表板",
        variant: "destructive",
      })
      router.push("/admin")
    }
  }, [router, toast])

  // 处理URL查询参数中的标签
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      const tab = params.get("tab")
      if (tab && ["agents", "api", "feedback"].includes(tab)) {
        setActiveTab(tab)
      }
    }
  }, [])

  useEffect(() => {
    loadAgents()
  }, [loadAgents])

  useEffect(() => {
    if (selectedTab === 'all') {
      setFilteredAgents(agents)
    } else {
      setFilteredAgents(agents.filter(agent => agent.type === selectedTab))
    }
  }, [selectedTab, agents])

  const handleEditAgent = (agentId: string) => {
    router.push(`/admin/dashboard/agents/edit/${agentId}`)
  }

  const handleDeleteAgent = async (agentId: string) => {
    if (confirm('确定要删除此智能体吗？此操作不可撤销。')) {
      try {
        await deleteAgent(agentId)
      } catch (error) {
        console.error('删除智能体失败:', error)
      }
    }
  }

  const getAgentIcon = (type: AgentType) => {
    switch (type) {
      case 'fastgpt':
        return <MessageSquare className="h-5 w-5" />
      case 'cad':
        return <FileSpreadsheet className="h-5 w-5" />
      case 'poster':
        return <Image className="h-5 w-5" />
      default:
        return <MessageSquare className="h-5 w-5" />
    }
  }

  const getAgentTypeName = (type: AgentType) => {
    switch (type) {
      case 'fastgpt':
        return '对话智能体'
      case 'cad':
        return 'CAD智能体'
      case 'poster':
        return '海报智能体'
      default:
        return '未知类型'
    }
  }

  if (!isClient) {
    return null // 防止水合错误
  }

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="container mx-auto p-4 flex items-center justify-center min-h-[80vh]">
          <Card className="w-full max-w-md p-6">
            <CardContent className="flex flex-col items-center justify-center">
              <Loader2 className="h-12 w-12 animate-spin text-[#6cb33f] mb-4" />
              <p className="text-center text-gray-600 dark:text-gray-400">加载中，请稍候...</p>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    )
  }

  // 如果API未配置，显示API配置页面
  if (!isConfigured) {
    return (
      <AdminLayout>
        <div className="container mx-auto p-4 space-y-6">
          <h1 className="text-3xl font-bold text-green-700">管理员仪表板</h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">请先配置FastGPT API以继续使用管理功能</p>
          <ApiConfig />
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="container mx-auto p-4 space-y-6">
        <h1 className="text-3xl font-bold text-green-700">管理员仪表板</h1>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-green-50 dark:bg-green-900/20">
            <TabsTrigger value="agents" className="data-[state=active]:bg-[#6cb33f] data-[state=active]:text-white">
              AI 智能体
            </TabsTrigger>
            <TabsTrigger value="api" className="data-[state=active]:bg-[#6cb33f] data-[state=active]:text-white">
              API 配置
            </TabsTrigger>
            <TabsTrigger value="feedback" className="data-[state=active]:bg-[#6cb33f] data-[state=active]:text-white">
              用户反馈
            </TabsTrigger>
          </TabsList>

          <TabsContent value="agents" className="mt-4">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold">智能体管理</h1>
              
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    新增智能体
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>选择智能体类型</DialogTitle>
                    <DialogDescription>
                      请选择要创建的智能体类型
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <Button 
                      variant="outline" 
                      className="h-auto p-4 flex flex-col items-center justify-center"
                      onClick={() => router.push('/admin/dashboard/agents/new/fastgpt')}
                    >
                      <MessageSquare className="h-10 w-10 mb-2 text-blue-500" />
                      <span className="font-medium">对话智能体</span>
                      <span className="text-xs text-gray-500 mt-1">基于FastGPT或OpenAI的对话模型</span>
                    </Button>
                    
                    <Button 
                      variant="outline"
                      className="h-auto p-4 flex flex-col items-center justify-center"
                      onClick={() => router.push('/admin/dashboard/agents/new/cad')}
                    >
                      <FileSpreadsheet className="h-10 w-10 mb-2 text-green-500" />
                      <span className="font-medium">CAD智能体</span>
                      <span className="text-xs text-gray-500 mt-1">分析CAD文件并提供专业解读</span>
                    </Button>
                    
                    <Button 
                      variant="outline"
                      className="h-auto p-4 flex flex-col items-center justify-center"
                      onClick={() => router.push('/admin/dashboard/agents/new/poster')}
                    >
                      <Image className="h-10 w-10 mb-2 text-purple-500" />
                      <span className="font-medium">海报智能体</span>
                      <span className="text-xs text-gray-500 mt-1">根据描述生成精美海报</span>
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            
            <Tabs value={selectedTab} onValueChange={(value) => setSelectedTab(value as AgentType | 'all')}>
              <TabsList className="mb-6 flex-wrap">
                <TabsTrigger value="all">所有智能体</TabsTrigger>
                <TabsTrigger value="fastgpt">对话智能体</TabsTrigger>
                <TabsTrigger value="cad">CAD智能体</TabsTrigger>
                <TabsTrigger value="poster">海报智能体</TabsTrigger>
              </TabsList>
              
              <TabsContent value={selectedTab}>
                {agentLoading ? (
                  <div className="flex justify-center items-center min-h-[400px]">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                  </div>
                ) : error ? (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center text-red-500">
                        <p>{error}</p>
                        <Button onClick={loadAgents} className="mt-4">重试</Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : filteredAgents.length === 0 ? (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center text-gray-500 py-12">
                        <p className="mb-4">没有找到符合条件的智能体</p>
                        <Button onClick={() => setSelectedTab('all')}>查看所有智能体</Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <ScrollArea className="h-[600px]">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredAgents.map((agent) => (
                        <Card key={agent.id} className="overflow-hidden">
                          <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                              <div className="flex items-center">
                                <Avatar className="h-10 w-10 mr-3">
                                  <div className="flex items-center justify-center h-full bg-gray-100 text-gray-600">
                                    {getAgentIcon(agent.type)}
                                  </div>
                                </Avatar>
                                <div>
                                  <CardTitle>{agent.name}</CardTitle>
                                  <Badge variant="outline" className="mt-1">
                                    {getAgentTypeName(agent.type)}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <CardDescription className="line-clamp-2 h-10 mb-4">
                              {agent.description || '没有描述'}
                            </CardDescription>
                            
                            <div className="flex justify-between items-center mt-4">
                              <div className="text-sm text-gray-500">
                                {agent.createdAt ? new Date(agent.createdAt).toLocaleDateString() : '未知时间'}
                              </div>
                              
                              <div className="flex space-x-2">
                                <Button variant="outline" size="sm" onClick={() => handleEditAgent(agent.id)}>
                                  <Edit className="h-4 w-4 mr-1" />
                                  编辑
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => handleDeleteAgent(agent.id)}>
                                  <Trash className="h-4 w-4 mr-1" />
                                  删除
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="api" className="mt-4">
            <ApiConfig />
          </TabsContent>

          <TabsContent value="feedback" className="mt-4">
            <UserFeedback />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  )
}
