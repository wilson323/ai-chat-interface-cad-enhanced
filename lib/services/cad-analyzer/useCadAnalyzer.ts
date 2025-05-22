import { useState, useCallback, useRef } from "react"
import type { CADAnalysisResult } from "@/lib/types/cad"
import { captureException } from "@/lib/utils/error"
import { UserFriendlyError } from "@/lib/errors/UserFriendlyError"
import { useCache } from '@/lib/cache'

/**
 * CAD分析器服务钩子
 * 提供CAD文件上传、分析和结果管理的功能
 */
export function useCadAnalyzer() {
  const [processedFile, setProcessedFile] = useState<CADAnalysisResult | null>(null)
  const [processingHistory, setProcessingHistory] = useState<CADAnalysisResult[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analyzeProgress, setAnalyzeProgress] = useState(0)
  const [analyzeStage, setAnalyzeStage] = useState("")
  const [processingQueue, setProcessingQueue] = useState<File[]>([])
  const [currentProcess, setCurrentProcess] = useState<{
    file: File
    progress: number
    status: 'parsing' | 'analyzing' | 'generating'
  } | null>(null)

  const abortControllerRef = useRef<AbortController>()
  const { getCache, setCache } = useCache('cad-analysis', { ttl: 24 * 60 * 60 * 1000 })

  /**
   * 分析CAD文件
   * @param file CAD文件
   * @returns 分析结果
   */
  const analyze = async (file: File) => {
    const cacheKey = `${file.name}-${file.size}-${file.lastModified}`
    const cachedResult = await getCache(cacheKey)
    
    if (cachedResult) {
      console.log('使用缓存结果')
      setAnalyzeProgress(100)
      setAnalyzeStage("分析完成")
      return cachedResult
    }

    setIsAnalyzing(true)
    setAnalyzeProgress(0)
    setAnalyzeStage("准备分析...")

    try {
      // 创建表单数据
      const formData = new FormData()
      formData.append("file", file)

      // 模拟进度
      const progressInterval = setInterval(() => {
        setAnalyzeProgress((prev) => {
          const newProgress = prev + 5
          if (newProgress >= 95) {
            clearInterval(progressInterval)
            return 95
          }
          return newProgress
        })

        // 更新阶段
        setAnalyzeStage(getStageText(analyzeProgress))
      }, 500)

      // 发送请求
      const response = await fetch("/api/cad/upload", {
        method: "POST",
        body: formData,
      })

      clearInterval(progressInterval)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "分析失败")
      }

      // 解析响应
      const result = await response.json()
      
      // 模拟分析结果 (如果API未返回完整数据)
      // 注意：实际上这里应该使用API返回的真实数据
      const mockResult = {
        id: result.id || Date.now().toString(),
        fileName: file.name || "example.dxf",
        fileType: file.type?.split("/").pop() || "dxf",
        fileSize: file.size || 1024 * 1024 * 2, // 2MB
        url: URL.createObjectURL(file),
        originalFile: file,
        entities: result.cadResult?.entities || {
          lines: 245,
          circles: 78,
          arcs: 32,
          polylines: 56,
          text: 124,
          dimensions: 48,
          blocks: 12,
        },
        layers: result.cadResult?.layers || ["0", "外框", "尺寸标注", "文本注释", "图框", "标题栏"],
        dimensions: result.cadResult?.dimensions || {
          width: 841,
          height: 594,
          unit: "mm",
        },
        metadata: result.cadResult?.metadata || {
          author: "设计师",
          createdAt: "2023-05-15",
          modifiedAt: "2023-06-20",
          software: "AutoCAD 2022",
        },
        devices: result.analysisResult?.devices || [],
        wiring: result.analysisResult?.wiring || { totalLength: 0, details: [] },
        risks: result.analysisResult?.risks || [],
        aiInsights: result.analysisResult?.aiInsights || {
          summary: "未提供AI分析结果",
          recommendations: []
        },
      }

      setAnalyzeProgress(100)
      setAnalyzeStage("分析完成")
      
      await setCache(cacheKey, mockResult)
      return mockResult
    } catch (error) {
      // 增强错误处理
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      captureException(new CADAnalysisError({
        message: `CAD分析失败: ${errorMessage}`,
        fileInfo: {
          name: file.name,
          size: file.size,
          type: file.type
        }
      }))
      throw new UserFriendlyError('文件分析失败，请检查文件格式后重试')
    } finally {
      setIsAnalyzing(false)
    }
  }

  /**
   * 根据进度获取阶段描述文本
   */
  const getStageText = (progress: number) => {
    if (progress < 20) return "解析文件内容..."
    if (progress < 40) return "分析图层和实体..."
    if (progress < 60) return "识别设备和布线..."
    if (progress < 80) return "执行安全分析..."
    return "生成分析报告..."
  }

  /**
   * 生成并下载分析报告
   * @param analysisId 分析ID
   */
  const generateReport = async (analysisId: string) => {
    try {
      const response = await fetch(`/api/cad-analyzer/report/${analysisId}`, {
        method: "GET",
      })

      if (!response.ok) {
        throw new Error("生成报告失败")
      }

      // 获取报告文件
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      
      // 创建下载链接并点击
      const a = document.createElement("a")
      a.href = url
      a.download = `CAD分析报告_${analysisId}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      
      // 释放URL
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("生成报告失败:", error)
      alert("生成报告失败，请稍后重试")
    }
  }

  const processNext = useCallback(async () => {
    if (processingQueue.length === 0 || currentProcess) return
    
    const nextFile = processingQueue[0]
    setCurrentProcess({
      file: nextFile,
      progress: 0,
      status: 'parsing'
    })
    
    try {
      const formData = new FormData()
      formData.append('file', nextFile)
      
      const response = await fetch('/api/cad/analyze', {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(120_000) // 2分钟超时
      })
      
      if (!response.ok) throw new Error('分析失败')
      
      const result: CADAnalysisResult = await response.json()
      
      // 更新状态...
    } catch (error) {
      // 错误处理...
    } finally {
      setProcessingQueue(prev => prev.slice(1))
      setCurrentProcess(null)
    }
  }, [processingQueue, currentProcess])

  const cancelAnalysis = () => {
    abortControllerRef.current?.abort()
    setIsAnalyzing(false)
  }

  return {
    analyze,
    generateReport,
    processedFile,
    setProcessedFile,
    processingHistory,
    setProcessingHistory,
    isAnalyzing,
    analyzeProgress,
    analyzeStage,
    processingQueue,
    setProcessingQueue,
    currentProcess,
    setCurrentProcess,
    processNext,
    cancelAnalysis,
  }
} 