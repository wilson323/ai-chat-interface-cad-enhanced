"use client";

import { useState, useCallback, useEffect } from 'react';
import { 
  CADAnalysisResult, 
  CADAnalysisProgress, 
  CADAnalysisType, 
  CADAnalysisSession 
} from '@/lib/types/cad';
import { 
  analyzeCADFile, 
  getAnalysisSession, 
  SUPPORTED_CAD_FILE_TYPES
} from '@/lib/services/cad-analyzer/controller';
import { useToast } from '@/components/ui/use-toast';
import { AIMultimodalAnalysisResult } from '@/lib/services/cad-analyzer/ai-analyzer';

interface UseCADAnalyzerOptions {
  onComplete?: (result: CADAnalysisResult) => void;
  onProgress?: (progress: CADAnalysisProgress) => void;
  onError?: (error: Error) => void;
  pollingInterval?: number;
  autoDownloadReport?: boolean;
  reportFormat?: 'html' | 'pdf' | 'json';
}

export function useCADAnalyzerService(options: UseCADAnalyzerOptions = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<CADAnalysisProgress>({ percentage: 0, stage: '准备分析...' });
  const [result, setResult] = useState<CADAnalysisResult | null>(null);
  const [aiResult, setAIResult] = useState<AIMultimodalAnalysisResult | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [currentSession, setCurrentSession] = useState<CADAnalysisSession | null>(null);
  const [pollingTimer, setPollingTimer] = useState<NodeJS.Timeout | null>(null);
  
  const { toast } = useToast();
  
  const pollingInterval = options.pollingInterval || 1000;
  
  // 清理轮询
  const clearPolling = useCallback(() => {
    if (pollingTimer) {
      clearInterval(pollingTimer);
      setPollingTimer(null);
    }
  }, [pollingTimer]);
  
  // 组件卸载时清理轮询
  useEffect(() => {
    return () => {
      clearPolling();
    };
  }, [clearPolling]);
  
  // 开始轮询会话状态
  const startPolling = useCallback((sessionId: string) => {
    clearPolling();
    
    const timer = setInterval(async () => {
      try {
        const session = getAnalysisSession(sessionId);
        
        if (!session) {
          console.error('会话不存在:', sessionId);
          clearPolling();
          return;
        }
        
        setCurrentSession(session);
        setProgress(session.progress);
        
        // 调用进度回调
        options.onProgress?.(session.progress);
        
        // 检查会话状态
        if (session.status === 'completed') {
          clearPolling();
          setIsLoading(false);
          
          if (session.result) {
            setResult(session.result);
            options.onComplete?.(session.result);
            
            // 如果配置了自动下载报告，执行下载
            if (options.autoDownloadReport && session.result) {
              downloadReport(session.result, options.reportFormat || 'html');
            }
          }
        } else if (session.status === 'failed') {
          clearPolling();
          setIsLoading(false);
          
          const errorMessage = session.error || '分析失败，未知错误';
          const analysisError = new Error(errorMessage);
          setError(analysisError);
          options.onError?.(analysisError);
          
          toast({
            title: "分析失败",
            description: errorMessage,
            variant: "destructive"
          });
        }
      } catch (err) {
        console.error('轮询会话状态失败:', err);
      }
    }, pollingInterval);
    
    setPollingTimer(timer);
  }, [clearPolling, options, pollingInterval, toast]);
  
  // 上传并分析CAD文件
  const analyzeFile = useCallback(async (
    file: File, 
    analysisType: CADAnalysisType = 'standard',
    analysisOptions: Record<string, any> = {}
  ) => {
    try {
      // 检查文件类型
      const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
      if (!SUPPORTED_CAD_FILE_TYPES.includes(fileExt as any)) {
        throw new Error(`不支持的文件类型: ${fileExt}。支持的格式: ${SUPPORTED_CAD_FILE_TYPES.join(', ')}`);
      }
      
      // 重置状态
      setIsLoading(true);
      setError(null);
      setProgress({ percentage: 0, stage: '准备分析...' });
      setResult(null);
      setAIResult(null);
      
      // 开始分析
      const session = await analyzeCADFile(file, analysisType, analysisOptions);
      setCurrentSession(session);
      
      // 开始轮询状态
      startPolling(session.sessionId);
      
      return session;
    } catch (err) {
      setIsLoading(false);
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      options.onError?.(error);
      
      toast({
        title: "分析失败",
        description: error.message,
        variant: "destructive"
      });
      
      throw error;
    }
  }, [startPolling, options, toast]);
  
  // 从URL分析CAD文件
  const analyzeUrl = useCallback(async (
    url: string,
    fileName: string,
    analysisType: CADAnalysisType = 'standard',
    analysisOptions: Record<string, any> = {}
  ) => {
    try {
      setIsLoading(true);
      setError(null);
      setProgress({ percentage: 0, stage: '下载文件...' });
      
      // 下载文件
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`文件下载失败: ${response.status} ${response.statusText}`);
      }
      
      const blob = await response.blob();
      const file = new File([blob], fileName, { type: blob.type });
      
      // 分析文件
      return await analyzeFile(file, analysisType, analysisOptions);
    } catch (err) {
      setIsLoading(false);
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      options.onError?.(error);
      
      toast({
        title: "分析失败",
        description: error.message,
        variant: "destructive"
      });
      
      throw error;
    }
  }, [analyzeFile, options, toast]);
  
  // 取消当前分析
  const cancelAnalysis = useCallback(() => {
    clearPolling();
    setIsLoading(false);
    setProgress({ percentage: 0, stage: '已取消' });
  }, [clearPolling]);
  
  // 下载分析报告
  const downloadReport = useCallback(async (
    analysisResult: CADAnalysisResult,
    format: 'html' | 'pdf' | 'json' = 'html'
  ) => {
    try {
      setProgress({ percentage: 0, stage: '生成报告...' });
      
      // 调用报告生成API
      const response = await fetch('/api/cad/generate-report/' + format, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          result: analysisResult,
          aiResult: aiResult
        }),
      });
      
      if (!response.ok) {
        throw new Error(`报告生成失败: ${response.status} ${response.statusText}`);
      }
      
      // 获取报告blob
      const blob = await response.blob();
      
      // 创建下载链接
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${analysisResult.fileName.split('.')[0]}_report.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "报告已生成",
        description: `${format.toUpperCase()} 格式报告已下载。`,
      });
      
      return true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      
      toast({
        title: "报告生成失败",
        description: error.message,
        variant: "destructive"
      });
      
      return false;
    }
  }, [aiResult, toast]);
  
  // AI分析CAD文件
  const performAIAnalysis = useCallback(async (
    analysisResult: CADAnalysisResult,
    options: {
      modelType?: 'general' | 'electrical' | 'mechanical' | 'architecture' | 'plumbing';
      detailLevel?: 'basic' | 'standard' | 'detailed';
      includeVisualAnalysis?: boolean;
      includeTechnicalValidation?: boolean;
      includeOptimizationSuggestions?: boolean;
    } = {}
  ) => {
    try {
      setProgress({ percentage: 0, stage: '执行AI分析...' });
      
      // 生成缩略图URL
      let thumbnailUrl = analysisResult.thumbnail ?? undefined
      if (!thumbnailUrl && analysisResult.fileId) {
        thumbnailUrl = `/api/cad/generate-thumbnail?fileId=${analysisResult.fileId}`
      }
      
      // 调用AI分析API
      const response = await fetch('/api/cad/ai-multimodal-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cadMetadata: analysisResult,
          screenshot: thumbnailUrl,
          options: {
            modelType: options.modelType || 'general',
            detailLevel: options.detailLevel || 'standard',
            includeVisualAnalysis: options.includeVisualAnalysis !== false,
            includeTechnicalValidation: options.includeTechnicalValidation !== false,
            includeOptimizationSuggestions: options.includeOptimizationSuggestions !== false
          }
        }),
      });
      
      if (!response.ok) {
        throw new Error(`AI分析失败: ${response.status} ${response.statusText}`);
      }
      
      const aiAnalysisResult = await response.json();
      setAIResult(aiAnalysisResult);
      
      toast({
        title: "AI分析完成",
        description: "AI分析结果已生成",
      });
      
      return aiAnalysisResult;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      
      toast({
        title: "AI分析失败",
        description: error.message,
        variant: "destructive"
      });
      
      throw error;
    }
  }, [toast]);
  
  return {
    isLoading,
    progress,
    result,
    aiResult,
    error,
    currentSession,
    analyzeFile,
    analyzeUrl,
    cancelAnalysis,
    downloadReport,
    performAIAnalysis,
    supportedFileTypes: SUPPORTED_CAD_FILE_TYPES,
  };
} 