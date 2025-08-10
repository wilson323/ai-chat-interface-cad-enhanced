"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Loader2,
  UploadCloud,
  FileSymlink,
  AlertTriangle,
  RotateCw,
  FileCode,
  MessageSquarePlus,
  Check,
  X,
  FileWarning
} from "lucide-react"
import { CADAnalysisResult } from "@/lib/types/cad"
import { useDropzone } from "react-dropzone"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { 
  isSupportedFileType, 
  validateFileSize, 
  getFileAcceptString, 
  getFileTypeDescription,
  is3DFileType,
  is2DFileType
} from "@/lib/utils/cad-file-utils"
import { ANALYZER_CONFIG } from "@/config/cad-analyzer.config"
import type React from "react"

interface CADChatUploadProps {
  onAnalysisComplete: (result: CADAnalysisResult) => void
  onSendToChat: (message: string, attachmentId?: string) => void
  onCancel: () => void
  className?: string
  maxFileSizeMB?: number
}

export function CADChatUpload({
  onAnalysisComplete,
  onSendToChat,
  onCancel,
  className,
  maxFileSizeMB = 50
}: CADChatUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [sendTab, setSendTab] = useState<string>("default")
  const [isUploading, setIsUploading] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [analysisResult, setAnalysisResult] = useState<CADAnalysisResult | null>(null)
  const [attachmentId, setAttachmentId] = useState<string | null>(null)
  const [customPrompt, setCustomPrompt] = useState("")
  const [fileValidationMessage, setFileValidationMessage] = useState<string | null>(null)
  const { toast } = useToast()

  // 获取文件接受类型字符串
  const acceptString = getFileAcceptString()

  // 清除错误消息
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [error])

  // 验证文件
  const validateFile = useCallback((file: File): boolean => {
    // 验证文件类型
    const fileExt = file.name.split('.').pop()?.toLowerCase() || ""
    if (!isSupportedFileType(fileExt)) {
      setFileValidationMessage(`不支持的文件类型: ${fileExt}`)
      return false
    }

    // 验证文件大小
    const maxSizeBytes = maxFileSizeMB * 1024 * 1024
    if (!validateFileSize(file.size, maxSizeBytes)) {
      setFileValidationMessage(`文件过大: ${(file.size / (1024 * 1024)).toFixed(2)}MB，超过${maxFileSizeMB}MB限制`)
      return false
    }

    setFileValidationMessage(null)
    return true
  }, [maxFileSizeMB])

  // 文件拖放处理
  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    accept: {
      'application/dxf': ['.dxf'],
      'application/acad': ['.dwg'],
      'application/step': ['.step', '.stp'],
      'application/iges': ['.iges', '.igs'],
      'model/stl': ['.stl'],
      'model/obj': ['.obj'],
      'model/gltf-binary': ['.glb'],
      'model/gltf+json': ['.gltf']
    },
    maxFiles: 1,
    disabled: isUploading || isAnalyzing,
    onDrop: handleFileDrop,
    onDropRejected: () => {
      setError("文件类型不支持，请上传CAD格式文件")
    },
    maxSize: maxFileSizeMB * 1024 * 1024
  })

  // 文件选择处理
  function handleFileDrop(acceptedFiles: File[]) {
    if (acceptedFiles.length === 0) return
    
    const selectedFile = acceptedFiles[0]
    if (validateFile(selectedFile)) {
      setFile(selectedFile)
      setError(null)
      setProgress(0)
    }
  }

  // 上传并分析文件
  async function handleUploadAndAnalyze() {
    if (!file) return
    
    setIsUploading(true)
    setProgress(0)
    setError(null)

    try {
      // 创建FormData对象
      const formData = new FormData()
      formData.append('file', file)
      
      // 添加分析参数
      formData.append('precision', 'standard')

      // 使用AbortController以便可以取消请求
      const controller = new AbortController()
      const signal = controller.signal

      // 上传文件
      const uploadResponse = await fetch('/api/cad/upload', {
        method: 'POST',
        body: formData,
        signal
      })

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json()
        throw new Error(errorData.error || '文件上传失败')
      }

      const uploadResult = await uploadResponse.json()
      if (!uploadResult.success) {
        throw new Error(uploadResult.error || '上传成功但处理失败')
      }
      
      const { fileId } = uploadResult

      // 开始分析
      setIsUploading(false)
      setIsAnalyzing(true)
      setProgress(0)

      // 定义状态检查的间隔时间（毫秒）
      const initialInterval = 500
      const maxInterval = 3000
      let currentInterval = initialInterval
      let lastProgress = 0

      // 每500ms轮询分析状态
      const checkStatus = async () => {
        try {
          const statusResponse = await fetch(`/api/cad/sync?fileId=${fileId}`)
          
          if (!statusResponse.ok) {
            throw new Error('分析状态查询失败')
          }
          
          const statusResult = await statusResponse.json()
          
          // 更新进度
          const newProgress = statusResult.progress || lastProgress
          setProgress(newProgress)
          
          // 根据进度变化调整检查间隔
          if (newProgress > lastProgress) {
            currentInterval = initialInterval
            lastProgress = newProgress
          } else {
            // 如果进度没有变化，逐渐增加间隔时间，但不超过最大值
            currentInterval = Math.min(currentInterval * 1.5, maxInterval)
          }
          
          // 更新分析阶段
          setAnalyzeStage(getStageText(newProgress))
          
          if (statusResult.status === 'completed') {
            // 获取分析结果
            const analysisResponse = await fetch(`/api/cad/sync?fileId=${fileId}&includeResult=true`)
            
            if (!analysisResponse.ok) {
              throw new Error('获取分析结果失败')
            }
            
            const result = await analysisResponse.json()
            setAnalysisResult(result.analysisResult)
            setAttachmentId(fileId)
            
            // 分析完成回调
            onAnalysisComplete(result.analysisResult)
            
            // 成功提示
            toast({
              title: "分析完成",
              description: `成功分析 ${file.name}`,
              variant: "default"
            })
            
            setIsAnalyzing(false)
            setProgress(100)
            
          } else if (statusResult.status === 'failed') {
            throw new Error(statusResult.error || '分析失败')
          } else {
            // 继续检查状态
            setTimeout(checkStatus, currentInterval)
          }
          
        } catch (error) {
          setError(error instanceof Error ? error.message : '分析过程中出错')
          setIsAnalyzing(false)
        }
      }
      
      // 开始检查状态
      setTimeout(checkStatus, initialInterval)

    } catch (error) {
      setError(error instanceof Error ? error.message : '上传或分析过程中出错')
      setIsUploading(false)
      setIsAnalyzing(false)
      
      toast({
        title: "处理失败",
        description: error instanceof Error ? error.message : '上传或分析过程中出错',
        variant: "destructive"
      })
    }
  }

  // 根据进度获取阶段描述文本
  const getStageText = (progress: number) => {
    if (progress < 20) return "解析文件内容..."
    if (progress < 40) return "分析图层和实体..."
    if (progress < 60) return "识别设计特征..."
    if (progress < 80) return "执行安全分析..."
    return "生成分析报告..."
  }
  
  // 分析阶段状态
  const [analyzeStage, setAnalyzeStage] = useState("准备分析...")

  // 重置状态
  function handleReset() {
    setFile(null)
    setIsUploading(false)
    setIsAnalyzing(false)
    setProgress(0)
    setError(null)
    setAnalysisResult(null)
    setAttachmentId(null)
    setCustomPrompt("")
    setFileValidationMessage(null)
  }

  // 发送到聊天
  function handleSendToChat(useCustomPrompt: boolean = false) {
    if (!analysisResult) return
    
    let message = ""
    
    if (useCustomPrompt && customPrompt.trim()) {
      message = customPrompt.trim()
    } else {
      // 根据文件类型生成不同的默认提示
      const fileExt = analysisResult.fileType.toLowerCase()
      const is3D = is3DFileType(fileExt)
      
      if (is3D) {
        message = `我上传了一个3D CAD模型"${analysisResult.fileName}"，请分析这个模型的结构、特点和用途。`
      } else {
        message = `我上传了一个CAD图纸"${analysisResult.fileName}"，请分析这个图纸并告诉我关键信息。`
      }
    }
    
    onSendToChat(message, attachmentId || undefined)
  }

  // 生成文件类型信息
  const getFileTypeInfo = (file: File) => {
    const fileExt = file.name.split('.').pop()?.toLowerCase() || ""
    const typeDescription = getFileTypeDescription(fileExt)
    const is3D = is3DFileType(fileExt)
    
    return (
      <div className="flex items-center mt-1">
        <Badge variant={is3D ? "secondary" : "outline"}>
          {is3D ? "3D模型" : "2D图纸"}
        </Badge>
        <span className="text-xs text-muted-foreground ml-2">
          {typeDescription}
        </span>
      </div>
    )
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle>CAD文件分析</CardTitle>
        <CardDescription>
          上传CAD文件进行分析并与AI讨论
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>错误</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {!analysisResult ? (
          <>
            {/* 文件上传区域 */}
            <div
              {...getRootProps()}
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25",
                isDragReject && "border-destructive bg-destructive/5",
                (isUploading || isAnalyzing) && "pointer-events-none opacity-60"
              )}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center justify-center gap-2">
                <UploadCloud className="h-10 w-10 text-muted-foreground" />
                {isDragActive ? (
                  <p>放开以上传文件</p>
                ) : (
                  <>
                    <p className="text-sm font-medium">
                      拖放CAD文件至此处或点击选择
                    </p>
                    <p className="text-xs text-muted-foreground">
                      支持的格式: DWG, DXF, STEP, STP, IGES, IGS, STL, OBJ, GLTF, GLB
                    </p>
                    <p className="text-xs text-muted-foreground">
                      最大文件大小: {maxFileSizeMB}MB
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* 文件验证消息 */}
            {fileValidationMessage && !file && (
              <Alert variant="warning" className="mt-4">
                <FileWarning className="h-4 w-4" />
                <AlertTitle>文件验证</AlertTitle>
                <AlertDescription>{fileValidationMessage}</AlertDescription>
              </Alert>
            )}

            {/* 选中的文件信息 */}
            {file && (
              <div className="mt-4 p-4 border rounded-md">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <FileSymlink className="h-5 w-5 mr-2 text-primary" />
                    <div>
                      <p className="font-medium truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                      {getFileTypeInfo(file)}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                      e.stopPropagation();
                      handleReset();
                    }}
                    disabled={isUploading || isAnalyzing}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* 上传进度 */}
            {(isUploading || isAnalyzing) && (
              <div className="mt-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">
                    {isUploading ? "上传中..." : analyzeStage}
                  </span>
                  <span className="text-sm text-muted-foreground">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
                <p className="mt-2 text-xs text-muted-foreground">
                  {isUploading
                    ? "正在上传文件，请稍候..."
                    : "正在分析CAD文件，可能需要几分钟时间..."}
                </p>
              </div>
            )}
          </>
        ) : (
          /* 分析完成后的发送到聊天区域 */
          <Tabs value={sendTab} onValueChange={setSendTab}>
            <TabsList className="grid grid-cols-2 mb-4">
              <TabsTrigger value="default">默认提示</TabsTrigger>
              <TabsTrigger value="custom">自定义提示</TabsTrigger>
            </TabsList>
            
            <TabsContent value="default">
              <div className="p-4 border rounded-md">
                <div className="flex items-start gap-3">
                  <div className="bg-primary/10 p-2 rounded">
                    <FileCode className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium">发送默认提示</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      将文件分析结果发送到聊天，请AI助手分析CAD文件并提供关键信息。
                    </p>
                    <div className="mt-2 p-3 bg-muted/50 rounded-md text-sm">
                      {is3DFileType(analysisResult.fileType.toLowerCase()) 
                        ? `我上传了一个3D CAD模型"${analysisResult.fileName}"，请分析这个模型的结构、特点和用途。`
                        : `我上传了一个CAD图纸"${analysisResult.fileName}"，请分析这个图纸并告诉我关键信息。`
                      }
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="custom">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="custom-prompt">自定义提示信息</Label>
                  <textarea
                    id="custom-prompt"
                    className="w-full min-h-[100px] p-3 border rounded-md resize-y"
                    placeholder="请输入您想要问AI关于此CAD文件的具体问题..."
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                  />
                </div>
                <div className="text-xs text-muted-foreground">
                  <p>提示：您可以询问关于文件结构、设计意图、改进建议等具体问题。</p>
                  <p>例如："这个设计中最复杂的部分是什么？" 或 "这个机械装置如何优化？"</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onCancel}>
          取消
        </Button>
        
        <div className="flex gap-2">
          {!file && !analysisResult && (
            <Button 
              variant="outline" 
              onClick={handleReset}
              disabled={!file && !error}
            >
              <RotateCw className="mr-2 h-4 w-4" />
              重置
            </Button>
          )}
          
          {file && !isUploading && !isAnalyzing && !analysisResult && (
            <Button onClick={handleUploadAndAnalyze}>
              {isUploading || isAnalyzing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UploadCloud className="mr-2 h-4 w-4" />
              )}
              上传并分析
            </Button>
          )}
          
          {analysisResult && (
            <Button onClick={() => handleSendToChat(sendTab === 'custom')}>
              <MessageSquarePlus className="mr-2 h-4 w-4" />
              发送到聊天
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  )
} 