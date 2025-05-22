"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Copy, Download, ArrowLeft, Loader2 } from "lucide-react"
import FastGPTApi from "@/lib/api/fastgpt"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { motion } from "framer-motion"

export default function SharedChatPage() {
  const params = useParams()
  const shareId = params.shareId as string
  const [sharedChat, setSharedChat] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const fetchSharedChat = async () => {
      try {
        setIsLoading(true)
        const data = await FastGPTApi.getSharedChat(shareId)
        setSharedChat(data)
      } catch (error) {
        console.error("获取分享对话失败:", error)
        setError("无法加载分享的对话，可能链接已过期或不存在")
      } finally {
        setIsLoading(false)
      }
    }

    if (shareId) {
      fetchSharedChat()
    }
  }, [shareId])

  // 复制消息到剪贴板
  const copyToClipboard = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        toast({
          title: "已复制",
          description: "消息已复制到剪贴板",
        })
      })
      .catch((err) => {
        console.error("复制失败:", err)
        toast({
          title: "复制失败",
          description: "无法复制消息",
          variant: "destructive",
        })
      })
  }

  // 导出对话为PDF
  const handleExportToPDF = async () => {
    if (!sharedChat) return

    try {
      setIsExporting(true)

      const pdfBlob = await FastGPTApi.exportChatToPDF(sharedChat.chatId)

      // 创建下载链接
      const url = URL.createObjectURL(pdfBlob)
      const a = document.createElement("a")
      a.href = url
      a.download = `分享对话-${sharedChat.title || new Date().toLocaleString()}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({
        title: "导出成功",
        description: "对话已导出为PDF文件",
      })
    } catch (error) {
      console.error("导出对话失败:", error)
      toast({
        title: "导出失败",
        description: "无法导出对话，请稍后重试",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  // 格式化时间
  const formatTime = (timestamp: string): string => {
    return new Date(timestamp).toLocaleString()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-[#6cb33f] mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">加载分享对话...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-500">加载失败</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardFooter>
            <Link href="/" className="w-full">
              <Button className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                返回首页
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }

  if (!sharedChat) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <Card className="mb-6 shadow-md">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-xl text-[#6cb33f]">{sharedChat.title || "分享对话"}</CardTitle>
                <CardDescription>分享时间: {formatTime(sharedChat.createdAt)}</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleExportToPDF} disabled={isExporting}>
                  {isExporting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  导出PDF
                </Button>
                <Link href="/">
                  <Button variant="outline">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    返回首页
                  </Button>
                </Link>
              </div>
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6">
            <div className="space-y-6">
              {sharedChat.messages.map((message: any, index: number) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {message.role !== "user" && (
                    <Avatar className="h-8 w-8 mr-2 mt-1">
                      <AvatarImage
                        src={sharedChat.appAvatar || "/placeholder.svg?height=32&width=32"}
                        alt={sharedChat.appName || "AI"}
                      />
                      <AvatarFallback>{(sharedChat.appName || "AI").charAt(0)}</AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl p-4 shadow-sm relative group ${
                      message.role === "user"
                        ? "bg-[#6cb33f] text-white rounded-tr-none ml-auto"
                        : "bg-white dark:bg-gray-800 rounded-tl-none"
                    }`}
                  >
                    <div
                      className={`text-sm ${message.role === "user" ? "text-white" : "text-gray-800 dark:text-gray-200"}`}
                    >
                      {message.content}
                    </div>
                    <div className="mt-1 flex justify-between items-center text-xs">
                      <span className={message.role === "user" ? "text-green-100" : "text-gray-500 dark:text-gray-400"}>
                        {formatTime(message.timestamp)}
                      </span>

                      {message.role === "assistant" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          onClick={() => copyToClipboard(message.content)}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                  {message.role === "user" && (
                    <Avatar className="h-8 w-8 ml-2 mt-1">
                      <AvatarImage src="/images/user-avatar.png" alt="用户" />
                      <AvatarFallback>用户</AvatarFallback>
                    </Avatar>
                  )}
                </motion.div>
              ))}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between border-t pt-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">由 {sharedChat.appName || "AI助手"} 提供支持</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">共 {sharedChat.messages.length} 条消息</p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
