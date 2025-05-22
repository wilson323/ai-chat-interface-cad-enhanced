// Web Worker Hook
import { useState, useEffect, useRef } from 'react';

export function useWorker<T>(workerScript: string) {
  const [result, setResult] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const workerRef = useRef<Worker | null>(null);
  
  useEffect(() => {
    // 只在客户端初始化Worker
    if (typeof window === 'undefined') return;
    
    try {
      workerRef.current = new Worker(workerScript);
      
      workerRef.current.addEventListener('message', (event) => {
        const { type, result, error, progress } = event.data;
        
        switch (type) {
          case 'complete':
            setResult(result);
            setIsProcessing(false);
            break;
            
          case 'progress':
            setProgress(progress);
            break;
            
          case 'error':
            setError(new Error(error));
            setIsProcessing(false);
            break;
        }
      });
      
      workerRef.current.addEventListener('error', (event) => {
        setError(new Error('Worker错误: ' + event.message));
        setIsProcessing(false);
      });
    } catch (err) {
      console.error('初始化Worker失败', err);
      setError(err instanceof Error ? err : new Error(String(err)));
    }
    
    // 清理函数
    return () => {
      workerRef.current?.terminate();
    };
  }, [workerScript]);
  
  const processData = (command: string, data: any) => {
    if (!workerRef.current) {
      setError(new Error('Worker未初始化'));
      return;
    }
    
    setIsProcessing(true);
    setProgress(0);
    setError(null);
    setResult(null);
    
    workerRef.current.postMessage({ command, data });
  };
  
  return {
    result,
    error,
    isProcessing,
    progress,
    processData
  };
} 