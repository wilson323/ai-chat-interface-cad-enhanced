"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Loader2, Copy, Check, Info, AlertCircle } from "lucide-react"
import { FastGPTConfig } from "@/config/fastgpt"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useToast } from "@/hooks/use-toast"

interface TestResult {
  success: boolean
  message: string
  data?: any
  error?: any
  time?: number
}

export default function FastGPTConnectionTest() {
  const [apiKey, setApiKey] = useState(FastGPTConfig.apiKey || "")
  const [apiUrl, setApiUrl] = useState(FastGPTConfig.apiUrl || "https://zktecoaihub.com")
  const [useProxy, setUseProxy] = useState(FastGPTConfig.useProxy)
  const [appId, setAppId] = useState(FastGPTConfig.defaultAgentId || "")
  const [chatId, setChatId] = useState(`chat_${Date.now()}`)
  const [testMessage, setTestMessage] = useState("你好，请简单介绍一下FastGPT")
  const [detail, setDetail] = useState(true)
  const [stream, setStream] = useState(false)
  const [variables, setVariables] = useState("{}")
  const [responseChatItemId, setResponseChatItemId] = useState(`resp_${Date.now()}`)

  const [initResult, setInitResult] = useState<TestResult | null>(null)
  const [chatResult, setChatResult] = useState<TestResult | null>(null)
  const [isTestingInit, setIsTestingInit] = useState(false)
  const [isTestingChat, setIsTestingChat] = useState(false)
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  // 测试初始化接口
  const testInitConnection = async () => {
    setIsTestingInit(true)
    setInitResult(null)

    const startTime = Date.now()

    try {
      const url = useProxy ? `/api/proxy/api/v1/chat/init` : `${apiUrl}/api/v1/chat/init`

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          agent_id: appId || undefined,
          user: "test-user",
        }),
      })

      const endTime = Date.now()
      const responseTime = endTime - startTime

      if (!response.ok) {
        const errorData = await response.json()
        setInitResult({
          success: false,
          message: `初始化失败: ${errorData.error?.message || response.statusText}`,
          error: errorData,
          time: responseTime,
        })
        return
      }

      const data = await response.json()
      setInitResult({
        success: true,
        message: "初始化成功",
        data,
        time: responseTime,
      })
    } catch (error) {
      setInitResult({
        success: false,
        message: `初始化请求异常: ${(error as Error).message}`,
        error,
      })
    } finally {
      setIsTestingInit(false)
    }
  }

  // 测试聊天接口
  const testChatConnection = async () => {
    setIsTestingChat(true)
    setChatResult(null)

    const startTime = Date.now()

    try {
      const url = useProxy ? `/api/proxy/api/v1/chat/completions` : `${apiUrl}/api/v1/chat/completions`

      // 解析variables
      let parsedVariables = {}
      try {
        if (variables && variables.trim() !== "") {
          parsedVariables = JSON.parse(variables)
        }
      } catch (e) {
        toast({
          title: "变量解析错误",
          description: "请确保variables是有效的JSON格式",
          variant: "destructive",
        })
        setIsTestingChat(false)
        return
      }

      const requestBody: any = {
        model: appId || "gpt-3.5-turbo",
        messages: [{ role: "user", content: testMessage }],
        stream: stream,
        detail: detail,
        user: "test-user",
      }

      // 只有在有值时才添加这些字段
      if (chatId) requestBody.chatId = chatId
      if (responseChatItemId) requestBody.responseChatItemId = responseChatItemId
      if (Object.keys(parsedVariables).length > 0) requestBody.variables = parsedVariables

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      })

      const endTime = Date.now()
      const responseTime = endTime - startTime

      if (!response.ok) {
        let errorData
        try {
          errorData = await response.json()
        } catch (e) {
          errorData = { error: { message: await response.text() } }
        }

        setChatResult({
          success: false,
          message: `聊天请求失败: ${errorData.error?.message || response.statusText}`,
          error: errorData,
          time: responseTime,
        })
        return
      }

      if (stream) {
        // 处理流式响应
        setChatResult({
          success: true,
          message: "聊天请求成功（流式响应）",
          data: { note: "流式响应无法在此显示完整内容，请查看控制台" },
          time: responseTime,
        })

        const reader = response.body?.getReader()
        if (reader) {
          let accumulated = ""
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = new TextDecoder().decode(value)
            console.log("Stream chunk:", chunk)
            accumulated += chunk
          }
          console.log("Complete stream response:", accumulated)
        }
      } else {
        // 处理普通响应
        const data = await response.json()
        setChatResult({
          success: true,
          message: "聊天请求成功",
          data,
          time: responseTime,
        })
      }
    } catch (error) {
      setChatResult({
        success: false,
        message: `聊天请求异常: ${(error as Error).message}`,
        error,
      })
    } finally {
      setIsTestingChat(false)
    }
  }

  const copyAppId = () => {
    if (appId) {
      navigator.clipboard.writeText(appId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)

      toast({
        title: "已复制",
        description: "AppID已复制到剪贴板",
      })
    }
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">FastGPT 连接诊断工具</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>API 配置</CardTitle>
          <CardDescription>设置 FastGPT API 的连接参数</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="apiKey">
                API Key <span className="text-red-500">*</span>
              </Label>
              <Input
                id="apiKey"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="输入 FastGPT API Key"
                type="password"
              />
              <p className="text-xs text-gray-500">必填，用于API认证</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="apiUrl">
                API URL <span className="text-red-500">*</span>
              </Label>
              <Input
                id="apiUrl"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="例如: https://zktecoaihub.com"
              />
              <p className="text-xs text-gray-500">必填，您的FastGPT服务地址</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center">
                <Label htmlFor="appId">智能体 ID (AppId)</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 ml-2 text-gray-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">
                        AppId可在应用详情页URL中获取，例如：
                        <br />
                        https://zktecoaihub.com/app/detail/<strong>app_xxx</strong>
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex gap-2">
                <Input
                  id="appId"
                  value={appId}
                  onChange={(e) => setAppId(e.target.value)}
                  placeholder="例如: app_xxxxxx"
                />
                <Button variant="outline" size="icon" onClick={copyAppId} disabled={!appId}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-gray-500">应用ID，可选，不填则使用默认模型</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="chatId">对话 ID (ChatId)</Label>
              <Input
                id="chatId"
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                placeholder="例如: chat_xxxxxx"
              />
              <p className="text-xs text-gray-500">用于多轮对话，可选，建议保持唯一</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="responseChatItemId">响应消息 ID</Label>
              <Input
                id="responseChatItemId"
                value={responseChatItemId}
                onChange={(e) => setResponseChatItemId(e.target.value)}
                placeholder="例如: resp_xxxxxx"
              />
              <p className="text-xs text-gray-500">可选，用于标识本次响应的唯一ID</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="variables">变量 (Variables)</Label>
              <Textarea
                id="variables"
                value={variables}
                onChange={(e) => setVariables(e.target.value)}
                placeholder='{"key1": "value1", "key2": "value2"}'
                className="h-[80px]"
              />
              <p className="text-xs text-gray-500">可选，JSON格式的变量对象</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="testMessage">
              测试消息 <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="testMessage"
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              placeholder="输入测试消息"
              className="h-[80px]"
            />
            <p className="text-xs text-gray-500">必填，发送给AI的测试内容</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-2">
            <div className="flex items-center space-x-2">
              <Switch id="useProxy" checked={useProxy} onCheckedChange={setUseProxy} />
              <Label htmlFor="useProxy">使用代理 (通过服务端转发请求)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="detail" checked={detail} onCheckedChange={setDetail} />
              <Label htmlFor="detail">返回详细信息 (detail=true)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="stream" checked={stream} onCheckedChange={setStream} />
              <Label htmlFor="stream">流式响应 (stream=true)</Label>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row gap-4">
          <Button
            onClick={testInitConnection}
            disabled={isTestingInit || !apiKey || !apiUrl}
            className="w-full sm:w-auto"
          >
            {isTestingInit ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                测试初始化中...
              </>
            ) : (
              "测试初始化接口"
            )}
          </Button>
          <Button
            onClick={testChatConnection}
            disabled={isTestingChat || !apiKey || !apiUrl || !testMessage}
            className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
          >
            {isTestingChat ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                测试聊天中...
              </>
            ) : (
              "测试聊天接口"
            )}
          </Button>
        </CardFooter>
      </Card>

      <Tabs defaultValue="chat" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="chat">聊天接口测试结果</TabsTrigger>
          <TabsTrigger value="init">初始化接口测试结果</TabsTrigger>
        </TabsList>

        <TabsContent value="chat">
          <Card>
            <CardHeader>
              <CardTitle>聊天接口测试结果</CardTitle>
              <CardDescription>{chatResult?.time ? `响应时间: ${chatResult.time}ms` : "尚未测试"}</CardDescription>
            </CardHeader>
            <CardContent>
              {chatResult ? (
                <div className="space-y-4">
                  <div className={`p-3 rounded-md ${chatResult.success ? "bg-green-100" : "bg-red-100"}`}>
                    <p className="font-medium">{chatResult.message}</p>
                  </div>

                  {chatResult.data && (
                    <div className="space-y-2">
                      {chatResult.data.choices && chatResult.data.choices[0] && (
                        <div className="border rounded-md p-3 bg-blue-50">
                          <h3 className="font-medium mb-2">AI 回复:</h3>
                          <p>{chatResult.data.choices[0].message?.content}</p>
                        </div>
                      )}

                      <div className="border rounded-md p-3 overflow-auto max-h-96">
                        <h3 className="font-medium mb-2">完整响应:</h3>
                        <pre className="text-sm">{JSON.stringify(chatResult.data, null, 2)}</pre>
                      </div>
                    </div>
                  )}

                  {chatResult.error && (
                    <div className="border rounded-md p-3 overflow-auto max-h-96 bg-red-50">
                      <h3 className="font-medium mb-2">错误详情:</h3>
                      <pre className="text-sm">{JSON.stringify(chatResult.error, null, 2)}</pre>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <AlertCircle className="h-12 w-12 text-gray-300 mb-4" />
                  <p className="text-gray-500">点击"测试聊天接口"按钮开始测试</p>
                  <p className="text-sm text-gray-400 mt-2">确保填写了必要的API Key、API URL和测试消息</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="init">
          <Card>
            <CardHeader>
              <CardTitle>初始化接口测试结果</CardTitle>
              <CardDescription>{initResult?.time ? `响应时间: ${initResult.time}ms` : "尚未测试"}</CardDescription>
            </CardHeader>
            <CardContent>
              {initResult ? (
                <div className="space-y-4">
                  <div className={`p-3 rounded-md ${initResult.success ? "bg-green-100" : "bg-red-100"}`}>
                    <p className="font-medium">{initResult.message}</p>
                  </div>

                  {initResult.data && (
                    <div className="border rounded-md p-3 overflow-auto max-h-96">
                      <pre className="text-sm">{JSON.stringify(initResult.data, null, 2)}</pre>
                    </div>
                  )}

                  {initResult.error && (
                    <div className="border rounded-md p-3 overflow-auto max-h-96 bg-red-50">
                      <h3 className="font-medium mb-2">错误详情:</h3>
                      <pre className="text-sm">{JSON.stringify(initResult.error, null, 2)}</pre>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <AlertCircle className="h-12 w-12 text-gray-300 mb-4" />
                  <p className="text-gray-500">点击"测试初始化接口"按钮开始测试</p>
                  <p className="text-sm text-gray-400 mt-2">确保填写了必要的API Key和API URL</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
