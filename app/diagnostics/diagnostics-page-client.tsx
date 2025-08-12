"use client"

import type React from "react"
import { useEffect,useState } from "react"

import { useFastGPT } from "@/contexts/FastGPTContext"
import { useToast } from "@/hooks/use-toast"

import FastGPTConnectionDiagnostic from "./fastgpt-connection"

export default function DiagnosticsPageClient() {
  const [localStorageData, setLocalStorageData] = useState<Record<string, any>>({})
  const [activeTab, setActiveTab] = useState("overview")
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const { fetchApplications } = useFastGPT()

  // 获取所有本地存储数据
  const loadLocalStorageData = () => {
    setIsLoading(true)
    try {
      const data: Record<string, any> = {}

      // 遍历所有localStorage项
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key) {
          try {
            // 尝试解析JSON
            const value = localStorage.getItem(key)
            data[key] = value ? JSON.parse(value) : null
          } catch (e) {
            // 如果不是JSON，保存原始字符串
            data[key] = localStorage.getItem(key)
          }
        }
      }

      setLocalStorageData(data)
    } catch (error) {
      console.error("加载本地存储数据失败:", error)
      toast({
        title: "加载数据失败",
        description: "无法读取本地存储数据",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 初始加载
  useEffect(() => {
    loadLocalStorageData()
  }, [])

  // 导出所有数据
  const exportData = () => {
    try {
      const dataStr = JSON.stringify(localStorageData, null, 2)
      const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`

      const exportFileDefaultName = `ai-chat-backup-${new Date().toISOString().slice(0, 10)}.json`

      const linkElement = document.createElement("a")
      linkElement.setAttribute("href", dataUri)
      linkElement.setAttribute("download", exportFileDefaultName)
      linkElement.click()

      toast({
        title: "导出成功",
        description: "数据已成功导出为JSON文件",
      })
    } catch (error) {
      console.error("导出数据失败:", error)
      toast({
        title: "导出失败",
        description: "无法导出数据",
        variant: "destructive",
      })
    }
  }

  // 导入数据
  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const data = JSON.parse(content)

        // 确认导入
        if (window.confirm("导入将覆盖现有数据，确定要继续吗？")) {
          // 清除现有数据
          localStorage.clear()

          // 导入新数据
          Object.entries(data).forEach(([key, value]) => {
            localStorage.setItem(key, JSON.stringify(value))
          })

          // 重新加载数据
          loadLocalStorageData()

          // 刷新应用列表
          fetchApplications()

          toast({
            title: "导入成功",
            description: "数据已成功导入",
          })
        }
      } catch (error) {
        console.error("导入数据失败:", error)
        toast({
          title: "导入失败",
          description: "无法解析导入的文件",
          variant: "destructive",
        })
      }
    }
    reader.readAsText(file)

    // 重置文件输入
    event.target.value = ""
  }

  // 清除所有数据
  const clearAllData = () => {
    if (window.confirm("确定要清除所有本地存储数据吗？此操作无法撤销！")) {
      try {
        localStorage.clear()
        setLocalStorageData({})

        toast({
          title: "数据已清除",
          description: "所有本地存储数据已被删除",
        })

        // 刷新应用列表
        fetchApplications()
      } catch (error) {
        console.error("清除数据失败:", error)
        toast({
          title: "清除失败",
          description: "无法清除本地存储数据",
          variant: "destructive",
        })
      }
    }
  }

  return (
    <div className="container py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">System Diagnostics</h1>
        <p className="text-muted-foreground">
          Use these tools to diagnose and troubleshoot issues with the application.
        </p>
      </div>

      <div className="space-y-8">
        <FastGPTConnectionDiagnostic />

        {/* Other diagnostic components can be added here */}
      </div>
    </div>
  )
}
