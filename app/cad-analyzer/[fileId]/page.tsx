"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { 
  Card, 
  CardContent, 
  CardDescription,
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { 
  ArrowLeft, 
  Download, 
  Share2, 
  FileText, 
  FilePdf,
  RefreshCw,
  AlertTriangle,
  Loader2,
  Info,
  BarChart3,
  Layers,
  Tag,
  View3d,
  Image as ImageIcon,
  AlertCircle
} from "lucide-react"
import { CADAnalysisViewer } from "@/components/cad/cad-analysis-viewer"
import { ThreeViewer } from "@/components/cad/renderer/ThreeViewer"
import { CADAnalysisResult } from "@/lib/types/cad"
import { formatFileSize } from "@/lib/utils"
import { is3DFileType, is2DFileType } from "@/lib/utils/cad-file-utils"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"

export default function CADAnalysisDetailPage() {
  const params = useParams<{ fileId: string }>()
  const router = useRouter()
  const { toast } = useToast()
  const [analysisResult, setAnalysisResult] = useState<CADAnalysisResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)
  const [reportError, setReportError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("viewer")
  const [shareUrl, setShareUrl] = useState<string | null>(null)

  // 获取分析结果
  useEffect(() => {
    const fetchAnalysisResult = async () => {
      if (!params.fileId) return
      
      try {
        setIsLoading(true)
        setError(null)
        
        const response = await fetch(`/api/cad/sync?fileId=${params.fileId}&includeResult=true`)
        
        if (!response.ok) {
          throw new Error('获取分析结果失败')
        }
        
        const data = await response.json()
        
        if (data.status === 'completed' && data.analysisResult) {
          setAnalysisResult(data.analysisResult)
        } else if (data.status === 'processing') {
          setError('分析仍在进行中，请稍后刷新页面')
        } else if (data.status === 'failed') {
          setError(data.error || '分析失败')
        } else {
          setError('无法获取分析结果')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '获取分析结果出错')
        
        toast({
          title: "加载失败",
          description: err instanceof Error ? err.message : '获取分析结果时出错',
          variant: "destructive"
        })
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchAnalysisResult()
  }, [params.fileId, toast])
  
  // 生成报告
  const handleGenerateReport = async (format: 'html' | 'pdf'): Promise<string> => {
    setIsGeneratingReport(true)
    setReportError(null)
    
    try {
      const response = await fetch(`/api/cad/generate-report/${format}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fileId: params.fileId,
          includeAIAnalysis: true
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `生成${format.toUpperCase()}报告失败`)
      }
      
      const result = await response.json()
      return result.reportUrl
    } catch (err) {
      setReportError(err instanceof Error ? err.message : '报告生成失败')
      toast({
        title: `生成${format.toUpperCase()}报告失败`,
        description: err instanceof Error ? err.message : '生成报告时出错',
        variant: "destructive"
      })
      throw err
    } finally {
      setIsGeneratingReport(false)
    }
  }
  
  // 刷新分析结果
  const handleRefresh = async () => {
    if (!params.fileId) return
    
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch(`/api/cad/sync?fileId=${params.fileId}&includeResult=true&refresh=true`)
      
      if (!response.ok) {
        throw new Error('刷新分析结果失败')
      }
      
      const data = await response.json()
      
      if (data.status === 'completed' && data.analysisResult) {
        setAnalysisResult(data.analysisResult)
      } else if (data.status === 'processing') {
        setError('分析仍在进行中，请稍后刷新页面')
      } else if (data.status === 'failed') {
        setError(data.error || '分析失败')
      } else {
        setError('无法获取分析结果')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '刷新分析结果出错')
    } finally {
      setIsLoading(false)
    }
  }
  
  // 分享结果
  const handleShare = async () => {
    try {
      const response = await fetch('/api/cad/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fileId: params.fileId })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '创建分享链接失败')
      }
      
      const data = await response.json()
      const shareUrl = `${window.location.origin}/shared/${data.shareId}`
      setShareUrl(shareUrl)
      
      // 复制到剪贴板
      await navigator.clipboard.writeText(shareUrl)
      
      toast({
        title: "分享链接已创建",
        description: "链接已复制到剪贴板",
        variant: "default"
      })
    } catch (error) {
      toast({
        title: "创建分享链接失败",
        description: error instanceof Error ? error.message : '创建分享链接时出错',
        variant: "destructive"
      })
    }
  }
  
  // 返回上一页
  const handleBack = () => {
    router.back()
  }
  
  // 确定文件类型是2D还是3D
  const fileExt = analysisResult?.fileType?.toLowerCase() || ""
  const is3D = is3DFileType(fileExt)
  const is2D = is2DFileType(fileExt)
  
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={handleBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回
        </Button>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleShare}
            disabled={!analysisResult}
          >
            <Share2 className="mr-2 h-4 w-4" />
            分享
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* 错误提示 */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>错误</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {/* 报告生成错误 */}
          {reportError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>报告生成错误</AlertTitle>
              <AlertDescription>{reportError}</AlertDescription>
            </Alert>
          )}
          
          {/* 加载状态 */}
          {isLoading ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[250px]" />
                  <Skeleton className="h-4 w-[200px]" />
                </div>
              </div>
              <Skeleton className="h-[400px] w-full rounded-lg" />
              <div className="grid grid-cols-3 gap-4">
                <Skeleton className="h-[100px] rounded-lg" />
                <Skeleton className="h-[100px] rounded-lg" />
                <Skeleton className="h-[100px] rounded-lg" />
              </div>
            </div>
          ) : analysisResult ? (
            <>
              {/* 3D查看器 */}
              {(['step', 'stp', 'iges', 'igs', 'stl', 'obj', 'gltf', 'glb'].includes(analysisResult.fileType.toLowerCase())) && (
                <Card>
                  <CardHeader>
                    <CardTitle>3D模型查看器</CardTitle>
                    <CardDescription>
                      交互式3D模型查看器
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="relative aspect-video bg-muted rounded-md overflow-hidden">
                      <ThreeViewer 
                        fileUrl={analysisResult.modelUrl || ''}
                        fileType={analysisResult.fileType}
                      />
                    </div>
                  </CardContent>
                  <CardFooter>
                    <p className="text-sm text-muted-foreground">
                      提示: 使用鼠标拖拽旋转模型，滚轮缩放，右键平移
                    </p>
                  </CardFooter>
                </Card>
              )}
              
              {/* CAD分析结果查看器 */}
              <CADAnalysisViewer 
                analysisResult={analysisResult}
                fileId={params.fileId as string}
                onGenerateReport={handleGenerateReport}
                onShare={handleShare}
              />
            </>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>未找到分析结果</CardTitle>
              </CardHeader>
              <CardContent>
                <p>无法获取指定文件的分析结果，可能文件不存在或已被删除。</p>
              </CardContent>
              <CardFooter>
                <Button onClick={handleBack}>返回</Button>
              </CardFooter>
            </Card>
          )}
        </div>
        
        {/* 右侧边栏 */}
        <div className="space-y-6">
          {/* 文件信息卡片 */}
          {analysisResult && (
            <Card>
              <CardHeader>
                <CardTitle>文件信息</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium">基本信息</h3>
                    <div className="mt-2 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">文件名</span>
                        <span className="text-sm font-medium">{analysisResult.fileName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">类型</span>
                        <span className="text-sm font-medium">{analysisResult.fileType.toUpperCase()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">大小</span>
                        <span className="text-sm font-medium">{formatFileSize(analysisResult.fileSize)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h3 className="font-medium">分析信息</h3>
                    <div className="mt-2 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">分析时间</span>
                        <span className="text-sm font-medium">
                          {analysisResult.analysisTime ? 
                            new Date(analysisResult.analysisTime).toLocaleString() : 
                            '未知'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">处理时长</span>
                        <span className="text-sm font-medium">
                          {analysisResult.processingTimeMs ?
                            `${(analysisResult.processingTimeMs / 1000).toFixed(2)}秒` :
                            '未知'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleGenerateReport('html')}
                  disabled={isGeneratingReport}
                >
                  {isGeneratingReport ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="mr-2 h-4 w-4" />
                  )}
                  HTML报告
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleGenerateReport('pdf')}
                  disabled={isGeneratingReport}
                >
                  {isGeneratingReport ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FilePdf className="mr-2 h-4 w-4" />
                  )}
                  PDF报告
                </Button>
              </CardFooter>
            </Card>
          )}
          
          {/* 历史记录卡片 */}
          {analysisResult && (
            <Card>
              <CardHeader>
                <CardTitle>历史分析</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {analysisResult.previousAnalyses && analysisResult.previousAnalyses.length > 0 ? (
                    analysisResult.previousAnalyses.map((analysis, index) => (
                      <div key={index} className="p-3 border rounded-md">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">版本 {analysis.version}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(analysis.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {analysis.changeDescription || '无变更说明'}
                        </p>
                        {analysis.id && (
                          <Button
                            variant="link"
                            size="sm"
                            className="p-0 h-auto text-xs"
                            onClick={() => router.push(`/cad-analyzer/${analysis.id}`)}
                          >
                            查看此版本
                          </Button>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">没有历史分析记录</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
} 