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

export default function AdminDashboard() {
  const router = useRouter()
  const { toast } = useToast()
  const { isConfigured, isLoading } = useFastGPT()
  const [isClient, setIsClient] = useState(false)
  const [activeTab, setActiveTab] = useState("agents")

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
            <AgentList />
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
