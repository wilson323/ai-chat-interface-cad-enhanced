"use client"

import React, { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileUp, Sparkles, History, Trash2, Download, Share2 } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { PosterGeneratorInterface } from "@/components/poster/poster-generator-interface"

export default function PosterGeneratorPage() {
  const [activeTab, setActiveTab] = useState("create")
  const [generatedPoster, setGeneratedPoster] = useState<any>(null)
  const [posterHistory, setPosterHistory] = useState<any[]>([])
  
  // 处理海报生成完成
  const handlePosterGenerated = (posterData: any) => {
    setGeneratedPoster(posterData)
    
    // 添加到历史记录
    setPosterHistory((prev) => [
      {
        id: posterData.id || Date.now().toString(),
        title: posterData.title || "未命名海报",
        createdAt: new Date().toISOString(),
        thumbnail: posterData.thumbnailUrl,
        data: posterData,
      },
      ...prev,
    ])
    
    // 切换到结果标签页
    setActiveTab("result")
  }

  // 清除当前海报
  const clearCurrentPoster = () => {
    setGeneratedPoster(null)
    setActiveTab("create")
  }

  // 从历史记录中加载海报
  const loadFromHistory = (historyItem: any) => {
    setGeneratedPoster(historyItem.data)
    setActiveTab("result")
  }

  // 清除历史记录
  const clearHistory = () => {
    setPosterHistory([])
  }
  
  // 下载海报
  const handleDownloadPoster = async () => {
    if (generatedPoster?.imageUrl) {
      const link = document.createElement('a')
      link.href = generatedPoster.imageUrl
      link.download = `poster-${generatedPoster.id || Date.now()}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-2">海报智能生成器</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8">通过AI智能生成专业海报，支持多种行业和风格定制</p>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="create">
            <Sparkles className="h-4 w-4 mr-2" />
            创建海报
          </TabsTrigger>
          <TabsTrigger value="result" disabled={!generatedPoster}>
            <FileUp className="h-4 w-4 mr-2" />
            生成结果
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-2" />
            历史记录
          </TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>创建新海报</CardTitle>
              <CardDescription>输入描述或填写表单，让AI为您生成专业海报</CardDescription>
            </CardHeader>
            <CardContent>
              <PosterGeneratorInterface onPosterGenerated={handlePosterGenerated} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>功能说明</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col items-center text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900 mb-3">
                    <Sparkles className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="font-medium mb-2">AI生成</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">利用先进的AI技术，根据您的需求自动生成专业海报</p>
                </div>

                <div className="flex flex-col items-center text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="p-3 rounded-full bg-green-100 dark:bg-green-900 mb-3">
                    <FileUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="font-medium mb-2">多种风格</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    支持现代简约、科技感、复古风等多种设计风格，适合不同场景
                  </p>
                </div>

                <div className="flex flex-col items-center text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900 mb-3">
                    <Share2 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="font-medium mb-2">一键分享</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    生成后可一键下载或分享您的海报设计
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="result" className="space-y-6">
          {generatedPoster && (
            <>
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">海报生成结果</h2>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleDownloadPoster}>
                    <Download className="h-4 w-4 mr-2" />
                    下载海报
                  </Button>
                  <Button variant="outline" onClick={clearCurrentPoster}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    清除当前海报
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="aspect-[3/4] relative bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                      {generatedPoster.imageUrl && (
                        <img 
                          src={generatedPoster.imageUrl} 
                          alt={generatedPoster.title || "生成的海报"} 
                          className="w-full h-full object-contain"
                        />
                      )}
                      {generatedPoster.html && (
                        <div 
                          className="w-full h-full p-4 overflow-auto"
                          dangerouslySetInnerHTML={{ __html: generatedPoster.html }}
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>{generatedPoster.title || "海报信息"}</CardTitle>
                    <CardDescription>生成的海报详细信息</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-medium mb-1">标题</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{generatedPoster.title || "未命名海报"}</p>
                      </div>
                      
                      {generatedPoster.description && (
                        <div>
                          <h3 className="text-sm font-medium mb-1">描述</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{generatedPoster.description}</p>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 gap-4">
                        {generatedPoster.style && (
                          <div>
                            <h3 className="text-sm font-medium mb-1">风格</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{generatedPoster.style}</p>
                          </div>
                        )}
                        
                        {generatedPoster.industry && (
                          <div>
                            <h3 className="text-sm font-medium mb-1">行业</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{generatedPoster.industry}</p>
                          </div>
                        )}
                      </div>
                      
                      <Separator />
                      
                      <div>
                        <h3 className="text-sm font-medium mb-2">AI分析</h3>
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {generatedPoster.aiInsights || "这张海报设计风格现代，色彩协调，适合专业场合使用。布局结构清晰，视觉效果突出，能有效传达核心信息。"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle>历史记录</CardTitle>
              {posterHistory.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearHistory}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  清除历史
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {posterHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <History className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium mb-2">暂无历史记录</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    生成的海报将显示在这里
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {posterHistory.map((item) => (
                    <Card key={item.id} className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow" onClick={() => loadFromHistory(item)}>
                      <div className="aspect-video bg-gray-100 dark:bg-gray-800 relative">
                        {item.thumbnail ? (
                          <img 
                            src={item.thumbnail} 
                            alt={item.title} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <FileUp className="h-8 w-8 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <CardContent className="p-3">
                        <h3 className="font-medium text-sm truncate">{item.title}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {new Date(item.createdAt).toLocaleString()}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 