"use client"

/**
 * AG-UI CAD分析Hook - 提供CAD文件分析的AG-UI协议集成
 * AG-UI CAD Analysis Hook - Provides AG-UI protocol integration for CAD file analysis
 *
 * 本文件提供了一个React Hook，用于在React组件中使用AG-UI协议进行CAD文件分析
 * 调用关系: 被CAD分析相关组件调用，内部调用/api/ag-ui/cad-analysis
 */

import { useState, useCallback } from 'react'
import { FastGptAgUiAdapter } from "@/lib/api/fastgpt-ag-ui-adapter"
import type { CADAnalysisResult } from "@/lib/types/cad"

export function useAgUiCad() {
  const [result, setResult] = useState<CADAnalysisResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const analyzeFile = useCallback(async (file: File) => {
    setIsLoading(true)
    setError(null)

    try {
      const threadId = `thread_${Date.now()}`
      const runId = `run_${crypto?.randomUUID?.() || Date.now()}`
      const agent = new FastGptAgUiAdapter(threadId, runId)

      // 准备表单数据
      const formData = new FormData()
      formData.append("file", file)
      formData.append("threadId", threadId)
      formData.append("runId", runId)

      const resp = await fetch('/api/ag-ui/cad-analysis', { method: 'POST', body: formData })
      const response = await resp.json()

      // 从Agent状态中提取CAD分析结果
      const analysisUnknown = response?.data?.analysisResult ?? response?.analysisResult ?? null
      if (analysisUnknown && typeof analysisUnknown === 'object') {
        setResult(analysisUnknown as CADAnalysisResult)
      } else {
        setResult(null)
      }
    } catch (err) {
      console.error("CAD分析错误:", err)
      setError(err instanceof Error ? err.message : "分析CAD文件时发生未知错误")
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    analyzeFile,
    result,
    isLoading,
    error,
  }
}
