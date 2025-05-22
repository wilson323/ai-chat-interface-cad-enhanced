"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ZoomIn, ZoomOut, RotateCw, Download, Maximize, Minimize, Cube, Network, Image
} from "lucide-react"
import { cn } from "@/lib/utils"

// 明确定义设备类型
interface Device {
  id: string
  type: string
  name: string
  count: number
  position: [number, number, number]
}

// 使用严格类型替代any
interface CADViewerProps {
  fileUrl: string
  fileType: string
  metadata: Record<string, unknown>
  entities: Array<Record<string, unknown>>
  devices?: Device[]
  wiring?: {
    totalLength: number
    details: WireDetail[]
  }
  thumbnail?: string
  className?: string
}

// 添加类型定义
type DeviceInfo = {
  type?: string
  name?: string
  count?: number
}

interface WireDetail {
  path: string
  length: number
  source: string
}

export function CADViewer({
  fileUrl,
  fileType,
  metadata,
  entities,
  devices,
  wiring,
  thumbnail,
  className
}: CADViewerProps) {
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [activeTab, setActiveTab] = useState("2d")
  const [isFullscreen, setIsFullscreen] = useState(false)

  // 处理缩放
  const handleZoomIn = () => setZoom((prev: number) => Math.min(prev + 0.1, 3))
  const handleZoomOut = () => setZoom((prev: number) => Math.max(prev - 0.1, 0.5))

  // 处理旋转
  const handleRotate = () => setRotation((prev: number) => (prev + 90) % 360)

  // 处理下载
  const handleDownload = () => {
    if (fileUrl) {
      const link = document.createElement("a")
      link.href = fileUrl
      link.download = fileUrl.split("/").pop() || "cad-file"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  // 处理全屏
  const handleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
      }

  // 渲染3D视图
  const render3DView = () => {
    if (!devices || devices.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-96 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <Cube className="h-16 w-16 mb-4 text-gray-400" />
          <p className="text-gray-500 dark:text-gray-400">无3D视图数据</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">未检测到可视化设备</p>
        </div>
      )
    }
    
    return (
      <div className="h-96 bg-gray-100 dark:bg-gray-800 rounded-lg relative">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 h-full overflow-auto p-4">
          {Array.isArray(devices) && devices.map((device, index) => (
              <div key={index} className="flex flex-col items-center justify-center p-3 bg-white dark:bg-gray-700 rounded-lg shadow-sm">
              <div className="w-8 h-8 rounded-full mb-2 bg-blue-500 flex items-center justify-center">
                <Cube className="h-4 w-4 text-white" />
              </div>
              <span className="text-xs font-medium text-center">{device.type || device.name || `设备 ${index+1}`}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">{device.count || 1}个</span>
              </div>
            ))}
        </div>
      </div>
    )
  }
  
  // 渲染布线视图
  const renderWiringView = () => {
    const hasWiringDetails = wiring && typeof wiring === 'object' && wiring.details && Array.isArray(wiring.details)
    
    if (!hasWiringDetails) {
      return (
        <div className="flex flex-col items-center justify-center h-96 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <Network className="h-16 w-16 mb-4 text-gray-400" />
          <p className="text-gray-500 dark:text-gray-400">无布线视图数据</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">未检测到布线信息</p>
        </div>
      )
    }
    
    return (
      <div className="h-96 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
        <div className="p-4 h-full flex flex-col">
          <div className="mb-4 bg-white dark:bg-gray-700 p-3 rounded-md shadow-sm">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">总布线长度</span>
              <span className="text-lg font-bold">{wiring.totalLength?.toFixed(2) || 0} 米</span>
            </div>
          </div>
          
          <div className="flex-1 overflow-auto bg-white dark:bg-gray-700 rounded-md shadow-sm p-4">
            <div className="space-y-3">
              {wiring.details.map((wire: any, index: number) => (
                <div key={index} className="flex items-center space-x-3 p-2 border-b border-gray-100 dark:border-gray-600">
                  <div 
                    className="w-2 h-full min-h-[30px]" 
                    style={{ 
                      background: `hsl(${(index * 30) % 360}, 70%, 50%)`,
                      borderRadius: '999px'
                    }}
                  ></div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">{wire.path || `线缆 ${index + 1}`}</span>
                      <span className="text-sm font-bold">{wire.length?.toFixed(2) || 0} 米</span>
                    </div>
                    {wire.source && <p className="text-xs text-gray-500 dark:text-gray-400">{wire.source}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Card className={cn("relative", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>CAD文件预览</CardTitle>
        <div className="flex items-center space-x-1">
          <Button variant="outline" size="icon" onClick={handleZoomOut} disabled={zoom <= 0.5}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleZoomIn} disabled={zoom >= 3}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleRotate}>
            <RotateCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleDownload}>
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleFullscreen}>
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0 overflow-hidden">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="h-full"
        >
          <div className="px-6 mb-2">
            <TabsList className="grid grid-cols-3">
              <TabsTrigger value="2d">2D视图</TabsTrigger>
              <TabsTrigger value="3d">3D视图</TabsTrigger>
              <TabsTrigger value="wiring">布线视图</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="2d" className="h-full m-0 p-0">
            <div className="relative w-full overflow-auto p-6">
                <div
                  className="w-full h-96 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center"
                  style={{
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                    transition: "transform 0.3s ease",
                  }}
                >
                {thumbnail ? (
                  <img
                    src={thumbnail}
                    alt="CAD缩略图"
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <div className="text-center">
                    <Image className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">无可用预览图</p>
                </div>
              )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="3d" className="h-full m-0 p-0">
            <div className="p-6">
              {render3DView()}
            </div>
          </TabsContent>
          
          <TabsContent value="wiring" className="h-full m-0 p-0">
            <div className="p-6">
              {renderWiringView()}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400 border-t">
        <Badge variant="outline">
          {fileType.toUpperCase()} 文件
        </Badge>
        {' '} 
        {metadata?.author && `作者: ${metadata.author}`}
      </div>
    </Card>
  )
}
