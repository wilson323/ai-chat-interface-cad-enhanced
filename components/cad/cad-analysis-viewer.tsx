"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  DownloadCloud,
  FileText,
  FilePdf,
  Share2,
  Maximize2,
  BarChart3,
  Layers,
  Info,
  Eye,
  Copy,
  ChevronRight,
  AlertTriangle,
  Clock,
  Calendar,
  User,
  Tag,
  Loader2,
  View3d,
  Image as ImageIcon,
  Check
} from "lucide-react"
import { CADAnalysisResult } from "@/lib/types/cad"
import { formatFileSize } from "@/lib/utils"
import { is3DFileType, is2DFileType } from "@/lib/utils/cad-file-utils-browser"
import { LayerInfo } from "@/lib/types/cad"

interface CADAnalysisViewerProps {
  analysisResult: CADAnalysisResult
  fileId: string
  onGenerateReport: (format: 'html' | 'pdf') => Promise<string>
  onShare?: () => void
  className?: string
  enableFullscreen?: boolean
  enableReportGeneration?: boolean
}

export function CADAnalysisViewer({
  analysisResult,
  fileId,
  onGenerateReport,
  onShare,
  className,
  enableFullscreen = true,
  enableReportGeneration = true
}: CADAnalysisViewerProps) {
  const [activeTab, setActiveTab] = useState("overview")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null)
  const [copySuccess, setCopySuccess] = useState(false)
  
  // 确定文件类型是2D还是3D
  const fileExt = analysisResult.fileType.toLowerCase()
  const is3D = is3DFileType(fileExt)
  const is2D = is2DFileType(fileExt)
  
  // 生成报告并下载
  const handleGenerateReport = async (format: 'html' | 'pdf') => {
    setIsLoading(true)
    setError(null)
    
    try {
      const reportUrl = await onGenerateReport(format)
      
      // 创建下载链接
      const link = document.createElement('a')
      link.href = reportUrl
      link.download = `CAD_Analysis_${analysisResult.fileName.split('.')[0]}.${format}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      console.error('报告生成失败:', err)
      setError('报告生成失败，请稍后再试')
    } finally {
      setIsLoading(false)
    }
  }
  
  // 复制分析结果文本
  const copyAnalysisText = () => {
    const text = `
CAD文件分析结果:
文件名: ${analysisResult.fileName}
文件类型: ${analysisResult.fileType}
文件大小: ${formatFileSize(analysisResult.fileSize)}
尺寸: ${analysisResult.dimensions.width} x ${analysisResult.dimensions.height} ${analysisResult.dimensions.unit}
实体总数: ${Object.values(analysisResult.entities).reduce((a, b) => a + b, 0)}
图层数: ${analysisResult.layers.length}

${analysisResult.aiSummary ? `AI分析概要: ${analysisResult.aiSummary}` : ''}
`.trim()

    navigator.clipboard.writeText(text)
      .then(() => {
        setCopySuccess(true)
        setTimeout(() => setCopySuccess(false), 2000)
      })
      .catch(err => {
        console.error('复制失败:', err)
        setError('复制失败，请手动选择并复制')
      })
  }
  
  // 清除错误消息
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [error])
  
  // 计算总实体数
  const totalEntities = Object.values(analysisResult.entities).reduce((a, b) => a + b, 0)
  
  // 获取主要实体类型（按数量排序）
  const mainEntityTypes = Object.entries(analysisResult.entities)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([type]) => type)
  
  return (
    <div className={className}>
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>错误</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <Card className="w-full">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>CAD文件分析结果</CardTitle>
              <CardDescription>
                {analysisResult.fileName} ({formatFileSize(analysisResult.fileSize)})
                {is3D && <Badge variant="outline" className="ml-2">3D模型</Badge>}
                {is2D && <Badge variant="outline" className="ml-2">2D图纸</Badge>}
              </CardDescription>
            </div>
            {enableReportGeneration && (
              <div className="flex space-x-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleGenerateReport('html')}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <FileText className="mr-2 h-4 w-4" />
                        )}
                        HTML报告
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>生成HTML格式的详细分析报告</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleGenerateReport('pdf')}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <FilePdf className="mr-2 h-4 w-4" />
                        )}
                        PDF报告
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>生成PDF格式的详细分析报告</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                {onShare && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={onShare}
                        >
                          <Share2 className="mr-2 h-4 w-4" />
                          分享
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>创建可分享的分析结果链接</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="px-6">
            <TabsList className="grid grid-cols-4">
              <TabsTrigger value="overview">
                <Info className="mr-2 h-4 w-4" />
                概览
              </TabsTrigger>
              <TabsTrigger value="entities">
                <BarChart3 className="mr-2 h-4 w-4" />
                实体分析
              </TabsTrigger>
              <TabsTrigger value="layers">
                <Layers className="mr-2 h-4 w-4" />
                图层信息
              </TabsTrigger>
              <TabsTrigger value="metadata">
                <Tag className="mr-2 h-4 w-4" />
                元数据
              </TabsTrigger>
            </TabsList>
          </div>
          
          <CardContent className="pt-6">
            <TabsContent value="overview" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">基本信息</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <dl className="space-y-2">
                      <div className="flex justify-between">
                        <dt className="text-sm text-muted-foreground">文件类型</dt>
                        <dd><Badge variant="outline">{analysisResult.fileType.toUpperCase()}</Badge></dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm text-muted-foreground">文件大小</dt>
                        <dd>{formatFileSize(analysisResult.fileSize)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm text-muted-foreground">尺寸</dt>
                        <dd>
                          {analysisResult.dimensions.width} x {analysisResult.dimensions.height} {analysisResult.dimensions.unit}
                          {analysisResult.dimensions.depth && ` x ${analysisResult.dimensions.depth}`}
                        </dd>
                      </div>
                    </dl>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">实体统计</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <dl className="space-y-2">
                      <div className="flex justify-between">
                        <dt className="text-sm text-muted-foreground">总实体数</dt>
                        <dd>{totalEntities}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm text-muted-foreground">图层数</dt>
                        <dd>{analysisResult.layers.length}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm text-muted-foreground">主要实体</dt>
                        <dd className="flex gap-1">
                          {mainEntityTypes.map(type => (
                            <Badge key={type} variant="secondary">{type}</Badge>
                          ))}
                        </dd>
                      </div>
                    </dl>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">创建信息</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <dl className="space-y-2">
                      {analysisResult.metadata?.author && (
                        <div className="flex">
                          <dt className="text-sm text-muted-foreground flex items-center w-20">
                            <User className="mr-2 h-4 w-4" />作者
                          </dt>
                          <dd className="flex-1 truncate">{analysisResult.metadata.author}</dd>
                        </div>
                      )}
                      {analysisResult.metadata?.createdAt && (
                        <div className="flex">
                          <dt className="text-sm text-muted-foreground flex items-center w-20">
                            <Calendar className="mr-2 h-4 w-4" />创建
                          </dt>
                          <dd>{analysisResult.metadata.createdAt}</dd>
                        </div>
                      )}
                      {analysisResult.metadata?.modifiedAt && (
                        <div className="flex">
                          <dt className="text-sm text-muted-foreground flex items-center w-20">
                            <Clock className="mr-2 h-4 w-4" />修改
                          </dt>
                          <dd>{analysisResult.metadata.modifiedAt}</dd>
                        </div>
                      )}
                    </dl>
                  </CardContent>
                </Card>
              </div>
              
              {analysisResult.aiSummary && (
                <Card className="mt-4">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">AI分析概要</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{analysisResult.aiSummary}</p>
                  </CardContent>
                </Card>
              )}
              
              {analysisResult.thumbnail && (
                <Card className="mt-4">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">缩略图预览</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="relative">
                      <img 
                        src={analysisResult.thumbnail} 
                        alt={`${analysisResult.fileName} 预览`}
                        className="max-w-full rounded-md border"
                      />
                      <Button 
                        variant="secondary" 
                        size="icon" 
                        className="absolute top-2 right-2"
                        onClick={() => setFullscreenImage(analysisResult.thumbnail || null)}
                      >
                        <Maximize2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            
            <TabsContent value="entities" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">实体类型分布</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(analysisResult.entities)
                        .sort((a, b) => b[1] - a[1])
                        .map(([entityType, count]) => (
                          <div key={entityType} className="flex items-center justify-between">
                            <div className="flex items-center">
                              <span className="text-sm font-medium">{entityType}</span>
                            </div>
                            <div className="flex items-center">
                              <span className="text-sm text-muted-foreground mr-2">{count}</span>
                              <div className="w-32 h-2 rounded-full bg-muted overflow-hidden">
                                <div 
                                  className="h-full bg-primary rounded-full" 
                                  style={{ width: `${(count / totalEntities) * 100}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        ))
                      }
                    </div>
                  </CardContent>
                </Card>
                
                {analysisResult.entityDetails && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">实体详情</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {analysisResult.entityDetails.map((detail, index) => (
                          <div key={index} className="border rounded-md p-3">
                            <div className="font-medium">{detail.type}</div>
                            <div className="text-sm text-muted-foreground mt-1">
                              {Object.entries(detail.properties || {}).map(([key, value]) => (
                                <div key={key} className="flex justify-between">
                                  <span>{key}:</span>
                                  <span>{value}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )).slice(0, 5)}
                        
                        {analysisResult.entityDetails.length > 5 && (
                          <Button variant="link" className="px-0 text-sm">
                            查看更多实体详情 <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
              
              {analysisResult.issues && analysisResult.issues.length > 0 && (
                <Card className="mt-4">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">检测到的问题</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {analysisResult.issues.map((issue, index) => (
                        <Alert key={index} variant={issue.severity === 'critical' ? 'destructive' : 'default'}>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertTitle>{issue.title}</AlertTitle>
                          <AlertDescription>{issue.description}</AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            
            <TabsContent value="layers" className="mt-0">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">图层信息</CardTitle>
                  <CardDescription>
                    共 {analysisResult.layers.length} 个图层
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {(analysisResult.layers || []).map((layer: LayerInfo | string, index: number) => (
                      <div key={index} className="flex items-center justify-between border-b pb-2 last:border-0">
                        <div className="flex items-center gap-2">
                          {typeof layer !== 'string' && (
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: (layer as LayerInfo).color || '#888' }} />
                          )}
                          <span className="font-medium">{typeof layer === 'string' ? layer : (layer as LayerInfo).name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {typeof layer !== 'string' ? ((layer as LayerInfo).visible === false ? '隐藏' : '可见') : ''}
                          </Badge>
                          {typeof layer !== 'string' && (layer as LayerInfo).locked && <Badge variant="secondary">锁定</Badge>}
                          {typeof layer !== 'string' && (layer as LayerInfo).entityCount && (
                            <span className="text-sm text-muted-foreground">
                              {(layer as LayerInfo).entityCount} 个实体
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="metadata" className="mt-0">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">元数据</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {analysisResult.metadata && Object.entries(analysisResult.metadata).map(([key, value]) => (
                      <div key={key} className="flex justify-between border-b pb-2 last:border-0">
                        <span className="text-sm font-medium">{key}</span>
                        <span className="text-sm">{value}</span>
                      </div>
                    ))}
                    
                    {(!analysisResult.metadata || Object.keys(analysisResult.metadata).length === 0) && (
                      <p className="text-sm text-muted-foreground">没有可用的元数据</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </CardContent>
        </Tabs>
        
        <CardFooter className="flex justify-between">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={copyAnalysisText}
                  className="relative"
                >
                  {copySuccess ? (
                    <Check className="mr-2 h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="mr-2 h-4 w-4" />
                  )}
                  复制分析结果
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>复制分析结果文本到剪贴板</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="default" size="sm" asChild>
                  <a href={`/cad-analyzer/${fileId}`} target="_blank" rel="noopener noreferrer">
                    {is3D ? (
                      <View3d className="mr-2 h-4 w-4" />
                    ) : (
                      <Eye className="mr-2 h-4 w-4" />
                    )}
                    完整分析详情
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>在新页面中查看完整的分析结果</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardFooter>
      </Card>
      
      {/* 全屏图片查看对话框 */}
      {enableFullscreen && (
        <Dialog open={!!fullscreenImage} onOpenChange={(open) => !open && setFullscreenImage(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>CAD文件预览</DialogTitle>
              <DialogDescription>
                {analysisResult.fileName}
              </DialogDescription>
            </DialogHeader>
            
            <div className="mt-4">
              {fullscreenImage && (
                <img 
                  src={fullscreenImage} 
                  alt={`${analysisResult.fileName} 预览`}
                  className="max-w-full max-h-[70vh] mx-auto rounded-md"
                  loading="lazy"
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
} 