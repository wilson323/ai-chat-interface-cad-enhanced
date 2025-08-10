"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { CADAnalysisViewer } from "@/components/cad/cad-analysis-viewer"
import { ThreeViewer } from "@/components/cad/renderer/ThreeViewer"
import { CADAnalysisResult } from "@/lib/types/cad"
import { formatFileSize } from "@/lib/utils"
import { LayerInfo } from "@/lib/types/cad"
import { is3DFileType, is2DFileType } from "@/lib/utils/cad-file-utils"
import { 
  Loader2, 
  AlertTriangle, 
  View3d, 
  Image as ImageIcon, 
  Info, 
  Tag,
  Copy,
  Check,
  Home,
  ExternalLink
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function SharedCADAnalysisPage() {
  const params = useParams<{ shareId: string }>()
  const shareId = params.shareId
  const { toast } = useToast()
  
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [analysisResult, setAnalysisResult] = useState<CADAnalysisResult | null>(null)
  const [fileId, setFileId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("viewer")
  const [copySuccess, setCopySuccess] = useState(false)
  
  // 确定文件类型是2D还是3D
  const fileExt = analysisResult?.fileType?.toLowerCase() || ""
  const is3D = is3DFileType(fileExt)
  const is2D = is2DFileType(fileExt)

  // 加载共享分析结果
  useEffect(() => {
    async function loadSharedAnalysis() {
      try {
        setIsLoading(true)
        setError(null)
        
        const response = await fetch(`/api/cad/shared/${shareId}`)
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || '加载共享分析结果失败')
        }
        
        const data = await response.json()
        
        if (data.analysisResult) {
          setAnalysisResult(data.analysisResult)
          setFileId(data.fileId)
        } else {
          throw new Error('无法获取分析结果')
        }
      } catch (error) {
        setError(error instanceof Error ? error.message : '获取共享分析结果时出错')
        
        toast({
          title: "加载失败",
          description: error instanceof Error ? error.message : '获取共享分析结果时出错',
          variant: "destructive"
        })
      } finally {
        setIsLoading(false)
      }
    }
    
    if (shareId) {
      loadSharedAnalysis()
    }
  }, [shareId, toast])
  
  // 复制分享链接
  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(typeof window !== 'undefined' ? window.location.href : '')
      setCopySuccess(true)
      
      toast({
        title: "链接已复制",
        description: "分享链接已复制到剪贴板",
      })
      
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (error) {
      toast({
        title: "复制失败",
        description: "无法复制链接，请手动复制浏览器地址",
        variant: "destructive"
      })
    }
  }
  
  // 加载中UI
  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex flex-col space-y-4 items-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">加载共享CAD文件分析结果...</p>
        </div>
        
        <div className="mt-8 space-y-6">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    )
  }
  
  // 错误UI
  if (error || !analysisResult) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive" className="mb-8">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>共享链接错误</AlertTitle>
          <AlertDescription>{error || '无法加载共享的CAD分析结果'}</AlertDescription>
        </Alert>
        
        <Button variant="default" asChild>
          <a href="/">返回主页</a>
        </Button>
      </div>
    )
  }
  
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">共享CAD文件分析</h1>
            <div className="flex items-center space-x-2">
              <p className="text-muted-foreground">{analysisResult.fileName}</p>
              <Badge variant={is3D ? "secondary" : "outline"}>
                {is3D ? "3D模型" : "2D图纸"}
              </Badge>
              <Badge variant="outline">{analysisResult.fileType.toUpperCase()}</Badge>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={copyShareLink}
            >
              {copySuccess ? (
                <Check className="mr-2 h-4 w-4 text-green-500" />
              ) : (
                <Copy className="mr-2 h-4 w-4" />
              )}
              复制链接
            </Button>
            
            <Button variant="default" size="sm" asChild>
              <a href="/">
                <Home className="mr-2 h-4 w-4" />
                返回主页
              </a>
            </Button>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 主要内容区域 */}
        <div className="lg:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="viewer">
                {is3D ? <View3d className="mr-2 h-4 w-4" /> : <ImageIcon className="mr-2 h-4 w-4" />}
                {is3D ? "3D查看器" : "2D查看器"}
              </TabsTrigger>
              <TabsTrigger value="analysis">
                <Info className="mr-2 h-4 w-4" />
                详细分析
              </TabsTrigger>
              <TabsTrigger value="metadata">
                <Tag className="mr-2 h-4 w-4" />
                元数据
              </TabsTrigger>
            </TabsList>
            
            <Card>
              <TabsContent value="viewer" className="m-0">
                <div className="min-h-[500px] border-b">
                  {is3D ? (
                    // 3D模型查看器
                    <ThreeViewer
                      fileUrl={`/api/cad/file/${fileId}`}
                      fileType={analysisResult.fileType}
                    />
                  ) : (
                    // 2D图纸查看器（目前显示缩略图，后续可优化为交互式2D查看器）
                    <div className="flex justify-center items-center h-[500px] bg-muted/30">
                      {analysisResult.thumbnail ? (
                        <img 
                          src={analysisResult.thumbnail} 
                          alt={analysisResult.fileName}
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : (
                        <div className="text-center p-8">
                          <ImageIcon className="h-16 w-16 mx-auto text-muted-foreground/50" />
                          <p className="mt-4 text-muted-foreground">无法显示2D图纸预览</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <CardContent className="p-6">
                  <h3 className="text-lg font-medium mb-2">文件概览</h3>
                  <div className="text-sm text-muted-foreground">
                    <p>文件名: {analysisResult.fileName}</p>
                    <p>文件大小: {formatFileSize(analysisResult.fileSize)}</p>
                    <p>
                      尺寸: {analysisResult.dimensions?.width} x {analysisResult.dimensions?.height} {analysisResult.dimensions?.unit}
                      {analysisResult.dimensions?.depth && ` x ${analysisResult.dimensions?.depth} ${analysisResult.dimensions?.unit}`}
                    </p>
                    <p>实体总数: {Object.values(analysisResult.entities || {}).reduce((a: number, b: number) => a + b, 0)}</p>
                    <p>图层数: {(analysisResult.layers || []).length}</p>
                  </div>
                </CardContent>
              </TabsContent>
              
              <TabsContent value="analysis" className="space-y-6 p-6 m-0">
                <div>
                  <h3 className="text-lg font-medium mb-2">AI分析概要</h3>
                  <p className="text-sm">{analysisResult.aiSummary || "无AI分析概要"}</p>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-lg font-medium mb-2">实体分析</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(analysisResult.entities).map(([type, count]) => (
                      <Card key={type} className="p-4">
                        <p className="font-medium">{type}</p>
                        <p className="text-2xl font-bold">{count}</p>
                      </Card>
                    ))}
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-lg font-medium mb-2">图层信息</h3>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {(analysisResult.layers || []).map((layer: LayerInfo | string, index: number) => (
                      <div key={index} className="p-3 border rounded-md">
                        <div className="flex justify-between">
                          <p className="font-medium">{typeof layer === 'string' ? layer : layer.name}</p>
                          <Badge variant="outline">{typeof layer === 'string' ? 0 : (layer.entityCount || 0)}个实体</Badge>
                        </div>
                        {typeof layer !== 'string' && layer.color && (
                          <div className="flex items-center mt-1">
                            <div 
                              className="w-3 h-3 rounded-full mr-2" 
                              style={{ backgroundColor: (layer as LayerInfo).color! }}
                            />
                            <span className="text-xs text-muted-foreground">
                              {(layer as LayerInfo).color}
                            </span>
                          </div>
                        )}
                        {typeof layer !== 'string' && (layer as LayerInfo).description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {(layer as LayerInfo).description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="metadata" className="space-y-6 p-6 m-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="p-4">
                    <h3 className="font-medium mb-2">基本信息</h3>
                    <div className="space-y-1 text-sm">
                      <p><span className="text-muted-foreground">创建日期: </span>{analysisResult.metadata?.creationDate ? new Date(analysisResult.metadata.creationDate).toLocaleString() : ''}</p>
                      <p><span className="text-muted-foreground">修改日期: </span>{analysisResult.metadata?.modificationDate ? new Date(analysisResult.metadata.modificationDate).toLocaleString() : ''}</p>
                      <p><span className="text-muted-foreground">作者: </span>{analysisResult.metadata?.author || "未知"}</p>
                      <p><span className="text-muted-foreground">软件: </span>{analysisResult.metadata?.software || "未知"}</p>
                      <p><span className="text-muted-foreground">版本: </span>{analysisResult.metadata?.version || "未知"}</p>
                    </div>
                  </Card>
                  
                  <Card className="p-4">
                    <h3 className="font-medium mb-2">高级属性</h3>
                    <div className="space-y-1 text-sm">
                      <p><span className="text-muted-foreground">单位: </span>{analysisResult.metadata?.units || "未指定"}</p>
                      <p><span className="text-muted-foreground">比例: </span>{analysisResult.metadata?.scale || "未指定"}</p>
                      <p><span className="text-muted-foreground">坐标系: </span>{analysisResult.metadata?.coordinateSystem || "未指定"}</p>
                      <p><span className="text-muted-foreground">投影: </span>{analysisResult.metadata?.projection || "未指定"}</p>
                    </div>
                  </Card>
                </div>
              </TabsContent>
            </Card>
          </Tabs>
        </div>
        
        {/* 侧边栏 */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>分析摘要</CardTitle>
              <CardDescription>设计的关键指标</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-sm font-medium">文件统计</h3>
                <ul className="mt-2 space-y-1 text-sm">
                  <li className="flex justify-between">
                    <span className="text-muted-foreground">文件类型:</span>
                    <span>{analysisResult.fileType.toUpperCase()}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-muted-foreground">文件大小:</span>
                    <span>{formatFileSize(analysisResult.fileSize)}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-muted-foreground">实体总数:</span>
                    <span>{Object.values(analysisResult.entities).reduce((a, b) => a + b, 0)}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-muted-foreground">图层数:</span>
                    <span>{analysisResult.layers.length}</span>
                  </li>
                </ul>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="text-sm font-medium">主要特征</h3>
                <ul className="mt-2 space-y-1 text-sm">
                  {Object.entries(analysisResult.entities)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([type, count]) => (
                      <li key={type} className="flex justify-between">
                        <span className="text-muted-foreground">{type}:</span>
                        <span>{count}</span>
                      </li>
                    ))}
                </ul>
              </div>
              
              {analysisResult.aiAnalysis && (
                <>
                  <Separator />
                  
                  <div>
                    <h3 className="text-sm font-medium">AI见解</h3>
                    <div className="mt-2 p-3 bg-primary/5 rounded-md text-sm">
                      {analysisResult.aiAnalysis}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
            <CardFooter className="flex flex-col space-y-2">
              <Button variant="default" className="w-full" asChild>
                <a href={`/cad-analyzer/${fileId}`}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  完整分析详情
                </a>
              </Button>
              <Button variant="outline" className="w-full" asChild>
                <a href="/chat">
                  <Home className="mr-2 h-4 w-4" />
                  返回主页
                </a>
              </Button>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>共享信息</CardTitle>
              <CardDescription>此分析的共享链接</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-3 border rounded-md break-all">{typeof window !== 'undefined' ? window.location.href : ''}</div>
              <p className="mt-4 text-sm text-muted-foreground">
                此链接允许任何人查看该CAD文件的分析结果，无需登录
              </p>
            </CardContent>
            <CardFooter>
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={copyShareLink}
              >
                {copySuccess ? (
                  <Check className="mr-2 h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="mr-2 h-4 w-4" />
                )}
                复制链接
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}
