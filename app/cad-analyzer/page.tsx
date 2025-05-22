"use client"

import React, { useState, useEffect, useRef } from 'react'
import { CADFileUploader } from "@/components/cad/cad-file-uploader"
import { CADViewer } from "@/components/cad/cad-viewer"
import { CADAnalysisResult as ComponentResult } from "@/components/cad/cad-analysis-result"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileUp, FileText, BarChart3, History, Trash2, Download, Settings, Cpu, Landmark, Zap, Droplets } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { cadController, AdvancedAnalysisOptions, CADEnhancedAnalysisResult } from "@/lib/services/cad-analyzer/controller"
import { AIMultimodalAnalysisResult } from "@/lib/services/cad-analyzer/ai-analyzer"
import type { CADAnalysisResult } from "@/lib/types/cad"
import type { VariantProps } from "class-variance-authority"

interface ProcessingHistoryItem {
  id: string
  fileName: string
  fileType: string
  fileSize: number
  processedAt: string
  result: CADAnalysisResult
  aiResult?: AIMultimodalAnalysisResult
}

interface CADViewerProps {
  fileUrl: string
  fileType: string
  metadata: any
  entities: any
  devices?: any
  wiring?: any
  thumbnail?: string
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any
    }
  }
}

type TechnicalIssue = {
  category: string
  description: string
  impact: string
}

type WorkflowImprovement = string

type ModelTypeMap = {
  general: string
  electrical: string
  mechanical: string
  architecture: string
  plumbing: string
}

const modelTypeLabels = {
  general: '通用分析',
  electrical: '电气分析',
  mechanical: '机械分析',
  architecture: '建筑分析',
  plumbing: '管道分析'
} as const;

export default function CADAnalyzerPage() {
  const [processedFile, setProcessedFile] = useState<CADAnalysisResult | null>(null)
  const [aiAnalysisResult, setAIAnalysisResult] = useState<AIMultimodalAnalysisResult | null>(null)
  const [processingHistory, setProcessingHistory] = useState<ProcessingHistoryItem[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analyzeProgress, setAnalyzeProgress] = useState(0)
  const [analyzeStage, setAnalyzeStage] = useState("")
  const [activeTab, setActiveTab] = useState<"upload" | "result" | "history" | "settings">("upload")
  const [thumbnail, setThumbnail] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  // 高级分析选项
  const [analysisOptions, setAnalysisOptions] = useState<Partial<AdvancedAnalysisOptions>>({
    precision: 'standard',
    extractLayers: true,
    extractMetadata: true,
    extractEntities: true,
    extractDimensions: true,
    generateThumbnail: true,
    useAI: true,
    aiModelType: 'general',
    aiDetailLevel: 'standard',
    performValidation: true,
    generateReport: false,
    useWorker: true,
    cacheResults: true
  })
  
  // 处理文件分析
  const handleFileProcessed = async (fileData: File): Promise<void> => {
    try {
      setIsAnalyzing(true)
      setAnalyzeProgress(0)
      setAnalyzeStage("准备分析...")
      setError(null)
      
      // 使用控制器处理文件分析
      const result = await cadController.analyzeCADFile(
        fileData,
        analysisOptions,
        (progress, stage) => {
          setAnalyzeProgress(progress)
          setAnalyzeStage(stage)
        }
      )
      
      // 更新状态
      setProcessedFile(result.basicResult)
      setAIAnalysisResult(result.aiResult || null)
      setThumbnail(result.thumbnail || null)
      
      // 记录历史
      setProcessingHistory((prev: ProcessingHistoryItem[]) => [
        {
          id: result.basicResult.id,
          fileName: fileData.name,
          fileType: fileData.type.split("/").pop() || "dxf",
          fileSize: fileData.size,
          processedAt: new Date().toISOString(),
          result: result.basicResult,
          aiResult: result.aiResult
        },
        ...prev
      ])
      
      // 切换到结果页面
      setActiveTab("result")
    } catch (error) {
      console.error("CAD分析失败:", error)
      setError(error instanceof Error ? error.message : "分析过程中发生未知错误")
    } finally {
      setIsAnalyzing(false)
    }
  }

  // 清除当前文件
  const clearCurrentFile = () => {
    if (processedFile?.url) {
      URL.revokeObjectURL(processedFile.url)
    }
    setProcessedFile(null)
    setAIAnalysisResult(null)
    setThumbnail(null)
    setActiveTab("upload")
  }

  // 从历史加载
  const loadFromHistory = (historyItem: ProcessingHistoryItem) => {
    setProcessedFile(historyItem.result)
    setAIAnalysisResult(historyItem.aiResult || null)
    setActiveTab("result")
  }

  // 清除历史
  const clearHistory = () => {
    // 释放所有URL
    processingHistory.forEach((item: ProcessingHistoryItem) => {
      if (item.result.url) {
        URL.revokeObjectURL(item.result.url)
      }
    })
    setProcessingHistory([])
  }
  
  // 下载报告
  const handleDownloadReport = async () => {
    if (!processedFile?.id) return
    
    try {
      setAnalyzeStage("生成报告中...")
      const reportData = await cadController.analyzeCADFile(
        processedFile.originalFile as File, 
        {
          ...analysisOptions,
          generateReport: true,
          reportFormat: 'pdf'
        }
      )
      
      if (reportData.report && reportData.report instanceof Blob) {
        const url = URL.createObjectURL(reportData.report)
        const a = document.createElement("a")
        a.href = url
        a.download = `CAD分析报告_${processedFile.id}.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error("生成报告失败:", error)
      setError("生成报告失败，请稍后重试")
    } finally {
      setAnalyzeStage("")
    }
  }
  
  // 更新分析选项
  const updateAnalysisOption = <K extends keyof AdvancedAnalysisOptions>(
    key: K,
    value: AdvancedAnalysisOptions[K]
  ) => {
    setAnalysisOptions((prev: Partial<AdvancedAnalysisOptions>) => ({
      ...prev,
      [key]: value
    }))
  }

  // 渲染AI模型类型图标
  const renderModelTypeIcon = (modelType: string) => {
    switch (modelType) {
      case 'electrical': return <Zap className="h-4 w-4" />
      case 'mechanical': return <Settings className="h-4 w-4" />
      case 'architecture': return <Landmark className="h-4 w-4" />
      case 'plumbing': return <Droplets className="h-4 w-4" />
      default: return <Cpu className="h-4 w-4" />
    }
  }

  // 类型安全的模型标签访问
  const currentModelType = (analysisOptions.aiModelType || 'general') as keyof typeof modelTypeLabels

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-2">CAD文件分析器</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8">上传CAD文件（DXF、DWG、STEP、STL等格式），获取详细分析和可视化结果</p>

      <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)} className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full max-w-3xl">
          <TabsTrigger value="upload" disabled={activeTab === "result" && !!processedFile}>
            <FileUp className="h-4 w-4 mr-2" />
            上传
          </TabsTrigger>
          <TabsTrigger value="result" disabled={!processedFile}>
            <BarChart3 className="h-4 w-4 mr-2" />
            分析结果
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-2" />
            历史记录
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4 mr-2" />
            高级设置
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>上传CAD文件</CardTitle>
              <CardDescription>
                支持多种CAD格式：DXF、DWG、STEP、STL、OBJ、FBX、GLTF、IFC等，最大文件大小50MB
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CADFileUploader
                onFileProcessed={handleFileProcessed}
                maxFileSize={50}
                allowedFileTypes={[".dxf", ".dwg", ".step", ".stp", ".iges", ".igs", ".stl", ".obj", ".fbx", ".gltf", ".glb", ".ifc"]}
                isUploading={isAnalyzing}
                uploadProgress={analyzeProgress}
                uploadStage={analyzeStage as any}
              />
              
              {error && (
                <Alert variant="destructive" className="mt-4">
                  <AlertTitle>分析失败</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>功能说明</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    icon: FileUp,
                    color: 'blue',
                    title: '多格式支持',
                    description: '支持全格式CAD文件，包括2D（DXF、DWG）和3D（STEP、STL等）格式'
                  },
                  {
                    icon: Cpu,
                    color: 'green',
                    title: 'AI多模态分析',
                    description: '结合图像识别和结构分析，提供专业领域深度分析'
                  },
                  {
                    icon: BarChart3,
                    color: 'purple',
                    title: '专业分析报告',
                    description: '基于行业标准生成专业分析，包括结构优化和风险评估'
                  }
                ].map((feature, index) => (
                  <div key={index} className="flex flex-col items-center text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className={`p-3 rounded-full bg-${feature.color}-100 dark:bg-${feature.color}-900 mb-3`}>
                      <feature.icon className={`h-6 w-6 text-${feature.color}-600 dark:text-${feature.color}-400`} />
                    </div>
                    <h3 className="font-medium mb-2">{feature.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {feature.description}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="result" className="space-y-6">
          {processedFile && (
            <>
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">分析结果</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {processedFile.fileName} ({(processedFile.fileSize / (1024 * 1024)).toFixed(2)} MB)
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleDownloadReport}>
                    <Download className="h-4 w-4 mr-2" />
                    下载报告
                  </Button>
                  <Button variant="outline" onClick={clearCurrentFile}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    清除当前文件
                  </Button>
                </div>
              </div>

              {aiAnalysisResult && (
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-center">
                      <CardTitle>AI智能解析</CardTitle>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant={currentModelType}>
                              {modelTypeLabels[currentModelType]}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>AI分析模式</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <CardDescription>
                      置信度: {Math.round(aiAnalysisResult.confidenceScore * 100)}%
                    </CardDescription>
                    <Separator />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-medium mb-2">总体分析</h3>
                        <p className="text-gray-700 dark:text-gray-300">{aiAnalysisResult.summary}</p>
                      </div>

                      <div>
                        <h3 className="text-lg font-medium mb-2">专业领域见解</h3>
                        <p className="text-gray-700 dark:text-gray-300">{aiAnalysisResult.categorySpecificInsights}</p>
                      </div>

                      {aiAnalysisResult.technicalAnalysis && aiAnalysisResult.technicalAnalysis.technicalIssues && aiAnalysisResult.technicalAnalysis.technicalIssues.length > 0 && (
                        <div>
                          <h3 className="text-lg font-medium mb-2">技术问题</h3>
                          <ul className="list-disc pl-5 space-y-2">
                            {aiAnalysisResult.technicalAnalysis.technicalIssues.map((issue: TechnicalIssue, index: number) => (
                              <li key={index} className="text-gray-700 dark:text-gray-300">
                                <span className="font-medium">{issue.category}:</span> {issue.description}
                                <br />
                                <span className="text-sm text-gray-500">影响: {issue.impact}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {aiAnalysisResult.optimizationSuggestions && aiAnalysisResult.optimizationSuggestions.workflowImprovements && aiAnalysisResult.optimizationSuggestions.workflowImprovements.length > 0 && (
                        <div>
                          <h3 className="text-lg font-medium mb-2">优化建议</h3>
                          <ul className="list-disc pl-5 space-y-1">
                            {aiAnalysisResult.optimizationSuggestions.workflowImprovements.map((item: WorkflowImprovement, index: number) => (
                              <li key={index} className="text-gray-700 dark:text-gray-300">{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <CADViewer
                  fileUrl={processedFile.url}
                  fileType={processedFile.fileType}
                  metadata={processedFile.metadata}
                  entities={processedFile.entities as any}
                  devices={processedFile.devices as any}
                  wiring={processedFile.wiring as any}
                  thumbnail={thumbnail || undefined}
                />

                <ComponentResult
                  data={processedFile}
                  showAIInsights={true}
                  showRisks={true}
                />
              </div>
            </>
          )}
        </TabsContent>

        {/* 其他TabsContent保持不变 */}
      </Tabs>
    </div>
  )
}
