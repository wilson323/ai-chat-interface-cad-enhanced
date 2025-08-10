"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useFastGPT } from "@/contexts/FastGPTContext"
import { DEFAULT_API_CONFIG } from "@/config/fastgpt"
import { DEFAULT_AGENT } from "@/config/default-agent"
import { AlertCircle, CheckCircle2, RefreshCw, Key, Globe, Shield } from "lucide-react"
import { motion } from "framer-motion"
import { useModelFetcher } from "@/hooks/use-model-fetcher"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function ApiConfig() {
  const { configureApi, isConfigured, isLoading, initializeDefaultAgent } = useFastGPT()
  const { models } = useModelFetcher()
  const [apiUrl, setApiUrl] = useState("")
  const [apiKey, setApiKey] = useState("")
  const [useProxy, setUseProxy] = useState(true) // 默认开启代理
  const [defaultModel, setDefaultModel] = useState<string>("qwen-turbo")
  const [principleModel, setPrincipleModel] = useState<string>("qwen-turbo")
  const [testStatus, setTestStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [testMessage, setTestMessage] = useState("")
  const [activeTab, setActiveTab] = useState("config")

  // 从本地存储加载配置
  useEffect(() => {
    const loadConfig = async () => {
      try {
        // 从本地存储加载
        const localConfig = localStorage.getItem("ai_chat_api_config")
        if (localConfig) {
          try {
            const config = JSON.parse(localConfig)
            console.log("从本地存储加载API配置:", config)
            setApiUrl(config.baseUrl || DEFAULT_API_CONFIG.baseUrl)
            setApiKey(config.apiKey || "")
            // 如果明确设置了useProxy，则使用该值，否则默认为true
            setUseProxy(config.useProxy === undefined ? true : config.useProxy)
            if (config.defaultModel) setDefaultModel(config.defaultModel)
            if (config.principleModel) setPrincipleModel(config.principleModel)
          } catch (e) {
            console.error("解析本地存储的API配置失败:", e)
            setApiUrl(DEFAULT_API_CONFIG.baseUrl)
            setApiKey("")
            setUseProxy(true) // 默认开启代理
          }
        } else {
          setApiUrl(DEFAULT_API_CONFIG.baseUrl)
          setApiKey("")
          setUseProxy(true) // 默认开启代理
        }
      } catch (error) {
        console.error("加载API配置失败:", error)
        setApiUrl(DEFAULT_API_CONFIG.baseUrl)
        setApiKey("")
        setUseProxy(true) // 默认开启代理
      }
    }

    loadConfig()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTestStatus("loading")
    setTestMessage("正在测试API连接...")

    try {
      // 保存到本地存储
      const config = { baseUrl: apiUrl, apiKey, useProxy, defaultModel, principleModel }
      localStorage.setItem("ai_chat_api_config", JSON.stringify(config))
      console.log("API配置已保存到本地存储")

      // 尝试保存到服务器文件
      try {
        await fetch("/api/db/api-config", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(config),
        })
        console.log("API配置已保存到服务器文件")
      } catch (error) {
        console.error("保存API配置到服务器文件失败:", error)
      }

      const success = await configureApi(apiUrl, apiKey, useProxy)
      if (success) {
        setTestStatus("success")
        setTestMessage("API连接成功！配置已保存")
      } else {
        setTestStatus("error")
        setTestMessage("API连接失败，但配置已保存到本地存储")
      }
    } catch (error: any) {
      setTestStatus("error")
      setTestMessage(`API连接失败: ${error.message || "未知错误"}，但配置已保存到本地存储`)
    }
  }

  const handleInitializeDefaultAgent = async () => {
    try {
      await initializeDefaultAgent()
    } catch (error) {
      console.error("手动初始化默认智能体失败:", error)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-green-700 dark:text-green-400">API 配置</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleInitializeDefaultAgent}
            disabled={isLoading}
            className="flex items-center gap-1"
          >
            <RefreshCw className="h-4 w-4" />
            初始化默认智能体
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2">
          <TabsTrigger value="config">API 配置</TabsTrigger>
          <TabsTrigger value="info">默认智能体信息</TabsTrigger>
        </TabsList>

        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle>FastGPT API 配置</CardTitle>
              <CardDescription>配置您的FastGPT API密钥和端点，以便应用程序可以与FastGPT服务通信。</CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="apiUrl" className="flex items-center gap-1">
                    <Globe className="h-4 w-4" />
                    API 端点 URL
                  </Label>
                  <Input
                    id="apiUrl"
                    placeholder="例如: https://zktecoaihub.com/api"
                    value={apiUrl}
                    onChange={(e) => setApiUrl(e.target.value)}
                    required
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-400">FastGPT API的基础URL，通常以/api结尾</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apiKey" className="flex items-center gap-1">
                    <Key className="h-4 w-4" />
                    API 密钥
                  </Label>
                  <Input
                    id="apiKey"
                    type="password"
                    placeholder="您的FastGPT API密钥"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    required
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    用于验证API请求的密钥，格式通常为fastgpt-xxxxxxxx
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">默认模型</Label>
                    <Select value={defaultModel} onValueChange={setDefaultModel}>
                      <SelectTrigger>
                        <SelectValue placeholder="选择默认模型" />
                      </SelectTrigger>
                      <SelectContent>
                        {models.map((m) => (
                          <SelectItem key={m.id} value={m.id}>{m.name} ({m.provider})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">原则模型</Label>
                    <Select value={principleModel} onValueChange={setPrincipleModel}>
                      <SelectTrigger>
                        <SelectValue placeholder="选择原则模型" />
                      </SelectTrigger>
                      <SelectContent>
                        {models.map((m) => (
                          <SelectItem key={m.id} value={m.id}>{m.name} ({m.provider})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch id="useProxy" checked={useProxy} onCheckedChange={setUseProxy} />
                  <Label htmlFor="useProxy" className="flex items-center gap-1 cursor-pointer">
                    <Shield className="h-4 w-4" />
                    使用代理模式
                  </Label>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 pl-7">
                  如果遇到CORS或网络问题，启用代理模式可能会有所帮助（默认开启）
                </p>

                {testStatus === "success" && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-md">
                    <CheckCircle2 className="h-5 w-5" />
                    <span>{testMessage}</span>
                  </div>
                )}

                {testStatus === "error" && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-md">
                    <AlertCircle className="h-5 w-5" />
                    <span>{testMessage}</span>
                  </div>
                )}
              </CardContent>

              <CardFooter className="flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setApiUrl(DEFAULT_API_CONFIG.baseUrl)
                    setApiKey("")
                    setUseProxy(true) // 重置为默认开启代理
                    setDefaultModel("qwen-turbo")
                    setPrincipleModel("qwen-turbo")
                    // 重置时也保存到本地存储
                    localStorage.setItem(
                      "ai_chat_api_config",
                      JSON.stringify({
                        baseUrl: DEFAULT_API_CONFIG.baseUrl,
                        apiKey: "",
                        useProxy: true, // 默认开启代理
                        defaultModel: "qwen-turbo",
                        principleModel: "qwen-turbo",
                      }),
                    )
                  }}
                >
                  重置
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="bg-[#6cb33f] hover:bg-green-600 transition-colors"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      测试中...
                    </>
                  ) : (
                    "测试并保存"
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="info">
          <Card>
            <CardHeader>
              <CardTitle>默认智能体信息</CardTitle>
              <CardDescription>系统将自动初始化以下默认智能体，您也可以手动触发初始化</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="font-medium">智能体名称</Label>
                <p className="text-gray-700 dark:text-gray-300">{DEFAULT_AGENT.name}</p>
              </div>

              <div className="space-y-2">
                <Label className="font-medium">描述</Label>
                <p className="text-gray-700 dark:text-gray-300 text-sm">{DEFAULT_AGENT.description}</p>
              </div>

              <div className="space-y-2">
                <Label className="font-medium">API 密钥</Label>
                <p className="text-gray-700 dark:text-gray-300">
                  <span className="font-mono text-sm">
                    fastgpt-cgGzHhtbpU872CbxzTyi4t2k6BnhO8DKZTdaz4ELH7Z2r6ItEGVThiBh9FsQ
                  </span>
                </p>
              </div>

              <div className="space-y-2">
                <Label className="font-medium">API 端点</Label>
                <p className="text-gray-700 dark:text-gray-300">
                  <span className="font-mono text-sm">https://zktecoaihub.com/api</span>
                </p>
              </div>

              <div className="space-y-2">
                <Label className="font-medium">功能</Label>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs rounded-full">
                    文件上传（默认关闭）
                  </span>
                  <span className="px-2 py-1 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs rounded-full">
                    语音转文字（默认关闭）
                  </span>
                  <span className="px-2 py-1 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs rounded-full">
                    文字转语音（默认关闭）
                  </span>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                onClick={handleInitializeDefaultAgent}
                disabled={isLoading}
                className="w-full bg-[#6cb33f] hover:bg-green-600 transition-colors"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    初始化中...
                  </>
                ) : (
                  "初始化默认智能体"
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  )
}
