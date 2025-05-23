"use client"

import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ZoomIn, ZoomOut, RotateCw, Download, Maximize, Minimize, Cube, Network, Image,
  Box, Layers, FileSymlink, Loader2
} from "lucide-react"
import { cn } from "@/lib/utils"
import dynamic from 'next/dynamic'

// 动态导入ThreeJS组件以避免SSR问题
const ThreeViewer = dynamic(() => import('./three-viewer'), { 
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center h-96 bg-gray-100 dark:bg-gray-800 rounded-lg">
      <Loader2 className="h-16 w-16 mb-4 text-gray-400 animate-spin" />
      <p className="text-gray-500 dark:text-gray-400">加载3D查看器...</p>
    </div>
  )
})

// 明确定义设备类型
interface Device {
  id?: string
  type?: string
  name?: string
  count?: number
  position?: [number, number, number]
  location?: string
}

// 使用严格类型替代any
interface CADViewerProps {
  fileUrl: string
  fileType: string
  metadata: Record<string, unknown>
  entities: Record<string, number>
  devices?: Device[]
  wiring?: {
    totalLength?: number
    details?: WireDetail[]
  }
  thumbnail?: string
  className?: string
  dimensions?: {
    width: number
    height: number
    depth?: number
    unit: string
  }
}

interface WireDetail {
  path?: string
  length?: number
  source?: string
}

// 判断是否是3D文件类型
function is3DFileType(fileType: string): boolean {
  const types3D = ['step', 'stp', 'iges', 'igs', 'stl', 'obj', 'fbx', 'gltf', 'glb'];
  return types3D.includes(fileType.toLowerCase());
}

export function CADViewer({
  fileUrl,
  fileType,
  metadata,
  entities,
  devices,
  wiring,
  thumbnail,
  dimensions,
  className
}: CADViewerProps) {
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [activeTab, setActiveTab] = useState(is3DFileType(fileType) ? "3d" : "2d")
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const viewerContainerRef = useRef<HTMLDivElement>(null)

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
      link.download = fileUrl.split("/").pop() || `cad-file.${fileType}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  // 处理全屏
  const handleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
    
    // 如果是全屏，则退出；否则进入全屏
    if (!isFullscreen && viewerContainerRef.current) {
      if (viewerContainerRef.current.requestFullscreen) {
        viewerContainerRef.current.requestFullscreen();
      }
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }
  
  // 监听全屏变化
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // 渲染2D视图
  const render2DView = () => {
    if (!fileUrl && !thumbnail) {
      return (
        <div className="flex flex-col items-center justify-center h-96 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <Image className="h-16 w-16 mb-4 text-gray-400" />
          <p className="text-gray-500 dark:text-gray-400">无2D视图数据</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">未提供预览图</p>
        </div>
      )
    }
    
    // 计算变换样式
    const transformStyle = {
      transform: `scale(${zoom}) rotate(${rotation}deg)`,
      transition: 'transform 0.3s ease',
    };
    
    // 如果有缩略图，显示缩略图；否则尝试直接渲染CAD文件
    return (
      <div className="h-96 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center overflow-hidden">
        {thumbnail ? (
          <img 
            src={thumbnail} 
            alt="CAD预览" 
            className="max-w-full max-h-full object-contain"
            style={transformStyle}
          />
        ) : (
          <iframe 
            src={fileUrl} 
            className="w-full h-full border-0"
            title="CAD文件预览"
          />
        )}
      </div>
    )
  }

  // 渲染3D视图
  const render3DView = () => {
    if (!is3DFileType(fileType)) {
      return (
        <div className="flex flex-col items-center justify-center h-96 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <Cube className="h-16 w-16 mb-4 text-gray-400" />
          <p className="text-gray-500 dark:text-gray-400">不支持的3D格式</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">{fileType.toUpperCase()}文件不支持3D查看</p>
        </div>
      )
    }
    
    return (
      <div className="h-96 bg-gray-100 dark:bg-gray-800 rounded-lg relative">
        <ThreeViewer 
          fileUrl={fileUrl} 
          fileType={fileType}
          dimensions={dimensions}
          onLoadStart={() => setIsLoading(true)}
          onLoadComplete={() => setIsLoading(false)}
        />
        
        {/* 3D模型信息覆盖层 */}
        <div className="absolute top-2 left-2 right-2 flex flex-wrap gap-2 pointer-events-none">
          <Badge variant="outline" className="bg-white/80 dark:bg-gray-800/80 pointer-events-auto">
            <Box className="h-3 w-3 mr-1" /> 
            {entities.solids || entities.shells || 0} 实体
          </Badge>
          <Badge variant="outline" className="bg-white/80 dark:bg-gray-800/80 pointer-events-auto">
            <Layers className="h-3 w-3 mr-1" /> 
            {entities.faces || 0} 面
          </Badge>
          <Badge variant="outline" className="bg-white/80 dark:bg-gray-800/80 pointer-events-auto">
            {fileType.toUpperCase()}
          </Badge>
        </div>
        
        {/* 加载指示器 */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/10 dark:bg-black/30">
            <div className="flex flex-col items-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="mt-2 text-sm font-medium">加载3D模型...</p>
            </div>
          </div>
        )}
      </div>
    )
  }
  
  // 渲染设备视图
  const renderDeviceView = () => {
    if (!devices || devices.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-96 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <Cube className="h-16 w-16 mb-4 text-gray-400" />
          <p className="text-gray-500 dark:text-gray-400">无设备数据</p>
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
                {device.location && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">{device.location}</span>
                )}
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
              {wiring.details && wiring.details.map((wire, index) => (
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

  // 渲染元数据视图
  const renderMetadataView = () => {
    return (
      <div className="h-96 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-auto">
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-medium">基本信息</CardTitle>
            </CardHeader>
            <CardContent className="py-2">
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">文件类型</dt>
                  <dd className="font-medium">{fileType.toUpperCase()}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">尺寸</dt>
                  <dd className="font-medium">
                    {dimensions ? (
                      <>
                        {dimensions.width} × {dimensions.height}
                        {dimensions.depth ? ` × ${dimensions.depth}` : ''} {dimensions.unit}
                      </>
                    ) : (
                      '未知'
                    )}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">软件</dt>
                  <dd className="font-medium">{metadata.software || '未知'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">版本</dt>
                  <dd className="font-medium">{metadata.version || '未知'}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-medium">实体统计</CardTitle>
            </CardHeader>
            <CardContent className="py-2">
              <dl className="space-y-2 text-sm">
                {Object.entries(entities).map(([key, value]) => (
                  value > 0 && (
                    <div key={key} className="flex justify-between">
                      <dt className="text-gray-500 dark:text-gray-400">{key}</dt>
                      <dd className="font-medium">{value}</dd>
                    </div>
                  )
                ))}
              </dl>
            </CardContent>
          </Card>
          
          <Card className="md:col-span-2">
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-medium">作者信息</CardTitle>
            </CardHeader>
            <CardContent className="py-2">
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">作者</dt>
                  <dd className="font-medium">{metadata.author || '未知'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">创建时间</dt>
                  <dd className="font-medium">
                    {metadata.createdAt ? new Date(metadata.createdAt as string).toLocaleString() : '未知'}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">修改时间</dt>
                  <dd className="font-medium">
                    {metadata.modifiedAt ? new Date(metadata.modifiedAt as string).toLocaleString() : '未知'}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <Card className={cn("relative", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center">
          <FileSymlink className="h-5 w-5 mr-2" />
          CAD文件预览
          <Badge variant="outline" className="ml-2">{fileType.toUpperCase()}</Badge>
        </CardTitle>
        <div className="flex items-center space-x-1">
          <Button variant="outline" size="icon" onClick={handleZoomOut} disabled={zoom <= 0.5 || activeTab === "3d"}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleZoomIn} disabled={zoom >= 3 || activeTab === "3d"}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleRotate} disabled={activeTab === "3d"}>
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

      <CardContent className="p-0 overflow-hidden" ref={viewerContainerRef}>
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="h-full"
        >
          <div className="px-6 mb-2">
            <TabsList className="grid grid-cols-5">
              <TabsTrigger value="2d">2D视图</TabsTrigger>
              <TabsTrigger value="3d" disabled={!is3DFileType(fileType)}>3D视图</TabsTrigger>
              <TabsTrigger value="devices">设备</TabsTrigger>
              <TabsTrigger value="wiring">布线</TabsTrigger>
              <TabsTrigger value="metadata">元数据</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="2d" className="m-0 p-6 pt-2">
            {render2DView()}
          </TabsContent>
          <TabsContent value="3d" className="m-0 p-6 pt-2">
            {render3DView()}
          </TabsContent>
          <TabsContent value="devices" className="m-0 p-6 pt-2">
            {renderDeviceView()}
          </TabsContent>
          <TabsContent value="wiring" className="m-0 p-6 pt-2">
            {renderWiringView()}
          </TabsContent>
          <TabsContent value="metadata" className="m-0 p-6 pt-2">
            {renderMetadataView()}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
