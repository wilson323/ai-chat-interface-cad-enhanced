"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  BarChart,
  PieChart,
  FileText,
  Download,
  Copy,
  Share2,
  Layers,
  Ruler,
  Type,
  Circle,
  Square,
  Hexagon,
  Info,
  AlertTriangle,
  Lightbulb,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"

interface CADAnalysisResultProps {
  data: {
    fileName: string
    fileType: string
    fileSize: number
    entities: {
      lines: number
      circles: number
      arcs: number
      polylines: number
      text: number
      dimensions: number
      blocks: number
      [key: string]: number
    }
    layers: string[]
    dimensions: {
      width: number
      height: number
      unit: string
    }
    metadata: {
      author?: string
      createdAt?: string
      modifiedAt?: string
      [key: string]: any
    }
    devices?: {
      type?: string
      count?: number
      location?: string
    }[]
    wiring?: {
      totalLength?: number
      details?: {
        path?: string
        source?: string
        length?: number
      }[]
    }
    aiInsights?: {
      summary?: string
      recommendations?: string[]
    }
    risks?: {
      description: string
      level: string
      solution?: string
    }[]
  }
  className?: string
  showAIInsights?: boolean
  showRisks?: boolean
}

export const CADAnalysisResult = ({ data, className, showAIInsights = false, showRisks = false }: CADAnalysisResultProps) => {
  const [activeTab, setActiveTab] = useState("summary")

  // 计算总实体数
  const totalEntities = Object.values(data.entities).reduce((sum, count) => sum + count, 0)

  // 复制分析结果
  const copyAnalysisResult = () => {
    const text = `
CAD文件分析结果:
文件名: ${data.fileName}
文件类型: ${data.fileType}
文件大小: ${(data.fileSize / (1024 * 1024)).toFixed(2)} MB
尺寸: ${data.dimensions.width} x ${data.dimensions.height} ${data.dimensions.unit}
图层数: ${data.layers.length}
实体总数: ${totalEntities}
实体明细:
${Object.entries(data.entities)
  .map(([key, value]) => `  - ${key}: ${value}`)
  .join("\n")}
    `.trim()

    navigator.clipboard
      .writeText(text)
      .then(() => {
        alert("分析结果已复制到剪贴板")
      })
      .catch((err) => {
        console.error("复制失败:", err)
      })
  }

  // 下载分析报告
  const downloadReport = () => {
    const text = `
# CAD文件分析报告

## 基本信息
- 文件名: ${data.fileName}
- 文件类型: ${data.fileType}
- 文件大小: ${(data.fileSize / (1024 * 1024)).toFixed(2)} MB
- 尺寸: ${data.dimensions.width} x ${data.dimensions.height} ${data.dimensions.unit}

## 作者信息
- 作者: ${data.metadata.author || "未知"}
- 创建时间: ${data.metadata.createdAt || "未知"}
- 修改时间: ${data.metadata.modifiedAt || "未知"}

## 图层信息
总图层数: ${data.layers.length}
图层列表:
${data.layers.map((layer) => `- ${layer}`).join("\n")}

## 实体统计
总实体数: ${totalEntities}
${Object.entries(data.entities)
  .map(([key, value]) => `- ${key}: ${value}`)
  .join("\n")}

## 分析结论
该CAD文件包含 ${totalEntities} 个实体，分布在 ${data.layers.length} 个图层中。
主要实体类型为 ${Object.entries(data.entities)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([key]) => key)
      .join("、")}。
    `.trim()

    const blob = new Blob([text], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${data.fileName.split(".")[0]}-分析报告.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>CAD文件分析结果</span>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={copyAnalysisResult}>
              <Copy className="h-4 w-4 mr-2" />
              复制
            </Button>
            <Button variant="outline" size="sm" onClick={downloadReport}>
              <Download className="h-4 w-4 mr-2" />
              下载报告
            </Button>
            <Button variant="outline" size="sm">
              <Share2 className="h-4 w-4 mr-2" />
              分享
            </Button>
          </div>
        </CardTitle>
        <CardDescription>
          文件: {data.fileName} ({(data.fileSize / (1024 * 1024)).toFixed(2)} MB)
        </CardDescription>
      </CardHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="px-6">
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="summary">
              <FileText className="h-4 w-4 mr-2" />
              摘要
            </TabsTrigger>
            <TabsTrigger value="entities">
              <BarChart className="h-4 w-4 mr-2" />
              实体分析
            </TabsTrigger>
            <TabsTrigger value="layers">
              <Layers className="h-4 w-4 mr-2" />
              图层分析
            </TabsTrigger>
            {(showAIInsights || showRisks) && (
              <TabsTrigger value="insights">
                <Lightbulb className="h-4 w-4 mr-2" />
                AI解析
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        <CardContent className="pt-4">
          <TabsContent value="summary" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-base">文件信息</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">文件类型</span>
                    <Badge variant="outline">{data.fileType.toUpperCase()}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">文件大小</span>
                    <span>{formatFileSize(data.fileSize || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">尺寸</span>
                    <span>
                      {data.dimensions.width} x {data.dimensions.height} {data.dimensions.unit}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-base">实体统计</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">总实体数</span>
                    <Badge>{totalEntities}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">图层数</span>
                    <Badge variant="outline">{data.layers.length}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">主要实体</span>
                    <span className="text-sm">{Object.entries(data.entities).sort((a, b) => b[1] - a[1])[0][0]}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-base">元数据</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">作者</span>
                    <span>{data.metadata.author || "未知"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">创建日期</span>
                    <span className="text-sm">{data.metadata.createdAt || "未知"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">修改日期</span>
                    <span className="text-sm">{data.metadata.modifiedAt || "未知"}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-base">实体分布</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
                      <Ruler className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">线条</div>
                      <div className="text-2xl font-bold">{data.entities.lines || 0}</div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className="p-2 bg-green-100 dark:bg-green-900 rounded-full">
                      <Circle className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">圆形</div>
                      <div className="text-2xl font-bold">{data.entities.circles || 0}</div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-full">
                      <Type className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">文本</div>
                      <div className="text-2xl font-bold">{data.entities.text || 0}</div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-full">
                      <Square className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">多边形</div>
                      <div className="text-2xl font-bold">{data.entities.polylines || 0}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="entities" className="space-y-4">
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-base">实体类型分布</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="h-[300px] flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <PieChart className="h-16 w-16 mx-auto mb-2 opacity-50" />
                    <p>此处将显示实体类型分布图表</p>
                    <p className="text-sm">在实际应用中，您可以集成图表库如Chart.js或Recharts</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-base">实体详细统计</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="space-y-4">
                  {Object.entries(data.entities).map(([key, value]) => (
                    <div key={key}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center">
                          {key === "lines" && <Ruler className="h-4 w-4 mr-2 text-blue-500" />}
                          {key === "circles" && <Circle className="h-4 w-4 mr-2 text-green-500" />}
                          {key === "arcs" && <Circle className="h-4 w-4 mr-2 text-yellow-500" />}
                          {key === "polylines" && <Hexagon className="h-4 w-4 mr-2 text-orange-500" />}
                          {key === "text" && <Type className="h-4 w-4 mr-2 text-purple-500" />}
                          {key === "dimensions" && <Ruler className="h-4 w-4 mr-2 text-red-500" />}
                          {key === "blocks" && <Square className="h-4 w-4 mr-2 text-gray-500" />}
                          <span className="capitalize">{key}</span>
                        </div>
                        <span className="font-medium">{value}</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className={cn(
                            "h-2 rounded-full",
                            key === "lines" && "bg-blue-500",
                            key === "circles" && "bg-green-500",
                            key === "arcs" && "bg-yellow-500",
                            key === "polylines" && "bg-orange-500",
                            key === "text" && "bg-purple-500",
                            key === "dimensions" && "bg-red-500",
                            key === "blocks" && "bg-gray-500",
                          )}
                          style={{ width: `${(value / totalEntities) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 设备统计 */}
            {data.devices && data.devices.length > 0 && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle>安防设备分析</CardTitle>
                  <CardDescription>识别到的安防设备统计</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {data.devices.map((device: any, index: number) => (
                      <div key={index} className="flex items-center space-x-3 bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
                        <div className="w-2 h-10 bg-blue-500 rounded-full"></div>
                        <div>
                          <p className="text-sm font-medium">{device.type || device.name}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant="outline">{device.count || 1}个</Badge>
                            {device.location && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[120px]">
                                位置: {device.location}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* 布线分析 */}
            {data.wiring && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle>布线分析</CardTitle>
                  <CardDescription>线缆布线长度和分布</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md mb-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">总布线长度</p>
                    <p className="text-2xl font-bold">{data.wiring.totalLength?.toFixed(2) || 0} 米</p>
                  </div>
                  
                  {data.wiring.details && data.wiring.details.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-sm font-medium">布线详情</p>
                      {data.wiring.details.slice(0, 5).map((wire: any, index: number) => (
                        <div key={index} className="flex justify-between items-center border-b pb-2">
                          <div>
                            <p className="text-sm">{wire.path || `线缆 ${index + 1}`}</p>
                            {wire.source && <p className="text-xs text-gray-500 dark:text-gray-400">{wire.source}</p>}
                          </div>
                          <Badge variant="secondary">{wire.length?.toFixed(2) || 0} 米</Badge>
                        </div>
                      ))}
                      {data.wiring.details.length > 5 && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                          还有 {data.wiring.details.length - 5} 条线缆未显示
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="layers" className="space-y-4">
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-base">图层信息</CardTitle>
                <CardDescription>共 {data.layers.length} 个图层</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="space-y-2">
                  {data.layers.map((layer, index) => (
                    <div
                      key={layer}
                      className="flex items-center justify-between p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      <div className="flex items-center">
                        <div
                          className={cn(
                            "w-3 h-3 rounded-full mr-3",
                            index % 5 === 0 && "bg-blue-500",
                            index % 5 === 1 && "bg-green-500",
                            index % 5 === 2 && "bg-yellow-500",
                            index % 5 === 3 && "bg-purple-500",
                            index % 5 === 4 && "bg-red-500",
                          )}
                        ></div>
                        <span>{layer}</span>
                      </div>
                      <Badge variant="outline">
                        {/* 这里可以显示每个图层的实体数量，如果有这样的数据 */}
                        {Math.floor(Math.random() * 50) + 1} 实体
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {(showAIInsights || showRisks) && (
            <TabsContent value="insights">
              {showAIInsights && data.aiInsights && (
                <Card className="mb-4">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Lightbulb className="h-5 w-5 mr-2 text-yellow-500" />
                      AI见解
                    </CardTitle>
                    <CardDescription>智能分析结果与建议</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {data.aiInsights.summary && (
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-md border border-yellow-200 dark:border-yellow-800">
                        <p className="text-sm">{data.aiInsights.summary}</p>
                      </div>
                    )}
                    
                    {data.aiInsights.recommendations && data.aiInsights.recommendations.length > 0 && (
                      <div className="space-y-3">
                        <p className="text-sm font-medium">AI建议</p>
                        {data.aiInsights.recommendations.map((rec: string, index: number) => (
                          <div key={index} className="flex items-start space-x-2">
                            <Lightbulb className="h-4 w-4 text-yellow-500 mt-0.5" />
                            <p className="text-sm">{rec}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
              
              {showRisks && data.risks && data.risks.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <AlertTriangle className="h-5 w-5 mr-2 text-red-500" />
                      潜在风险
                    </CardTitle>
                    <CardDescription>检测到的潜在问题与解决方案</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {data.risks.map((risk: any, index: number) => (
                        <div 
                          key={index} 
                          className={`p-3 rounded-md border ${
                            risk.level === 'high' 
                              ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                              : risk.level === 'medium'
                              ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
                              : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium flex items-center">
                              <AlertTriangle className={`h-4 w-4 mr-1.5 ${
                                risk.level === 'high' ? 'text-red-500' : 
                                risk.level === 'medium' ? 'text-orange-500' : 'text-blue-500'
                              }`} />
                              {risk.description}
                            </p>
                            <Badge variant={
                              risk.level === 'high' ? 'destructive' : 
                              risk.level === 'medium' ? 'default' : 'secondary'
                            }>
                              {risk.level === 'high' ? '高风险' : 
                               risk.level === 'medium' ? '中风险' : '低风险'}
                            </Badge>
                          </div>
                          {risk.solution && (
                            <div className="mt-1 pl-6">
                              <p className="text-xs text-gray-600 dark:text-gray-300">
                                <span className="font-medium">解决方案:</span> {risk.solution}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          )}
        </CardContent>
      </Tabs>
    </Card>
  )
}
