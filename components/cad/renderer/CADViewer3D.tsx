"use client";

import { useState } from 'react';
import { ThreeViewer } from './ThreeViewer';
import { CADAnalysisResult } from '@/lib/services/cad-analyzer-service';
import { useTheme } from 'next-themes';
import { Loader2, Maximize2, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CADViewer3DProps {
  result: CADAnalysisResult;
}

export function CADViewer3D({ result }: CADViewer3DProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [isLoading, setIsLoading] = useState(true);
  const [viewerConfig, setViewerConfig] = useState({
    showGrid: true,
    showAxes: true,
    backgroundColor: isDark ? 0x1a1a1a : 0xf0f0f0,
    materialColor: 0x4caf50
  });
  
  // 创建虚拟URL以便ThreeViewer可以显示模型
  // 在实际项目中这里应该使用result中的真实模型URL
  const getModelURL = () => {
    // 这是一个模拟，实际项目中应该从result中获取真实URL
    return result.thumbnail || '/api/cad/generate-thumbnail?fileId=' + result.fileId;
  };
  
  // 获取合适的文件类型
  const getModelType = () => {
    // 从fileId对应的原始文件中提取类型
    // 这是一个模拟，实际项目中应该从result中获取真实类型
    const fileType = result.metadata?.format || 'stl';
    return fileType;
  };
  
  // 获取模型尺寸
  const getModelDimensions = () => {
    const boundingBox = result.metadata?.boundingBox;
    if (boundingBox) {
      return {
        width: Math.abs(boundingBox.max[0] - boundingBox.min[0]),
        height: Math.abs(boundingBox.max[1] - boundingBox.min[1]),
        depth: Math.abs(boundingBox.max[2] - boundingBox.min[2]),
        unit: result.metadata?.units || 'mm'
      };
    }
    
    // 默认尺寸
    return {
      width: 100,
      height: 100,
      depth: 100,
      unit: 'mm'
    };
  };
  
  // 切换网格显示
  const toggleGrid = () => {
    setViewerConfig(prev => ({
      ...prev,
      showGrid: !prev.showGrid
    }));
  };
  
  // 切换坐标轴显示
  const toggleAxes = () => {
    setViewerConfig(prev => ({
      ...prev,
      showAxes: !prev.showAxes
    }));
  };
  
  // 处理加载状态
  const handleLoadStart = () => {
    setIsLoading(true);
  };
  
  const handleLoadComplete = () => {
    setIsLoading(false);
  };
  
  const handleLoadError = (error: Error) => {
    console.error('CAD模型加载错误:', error);
    setIsLoading(false);
  };
  
  return (
    <div className="relative w-full h-full">
      <ThreeViewer
        fileUrl={getModelURL()}
        fileType={getModelType()}
        modelData={result.components} // 直接传递组件数据
        dimensions={getModelDimensions()}
        viewerConfig={viewerConfig}
        onLoadStart={handleLoadStart}
        onLoadComplete={handleLoadComplete}
        onLoadError={handleLoadError}
      />
      
      {/* 控制按钮 */}
      <div className="absolute top-2 right-2 flex flex-col gap-2">
        <Button 
          size="sm" 
          variant="outline" 
          className="bg-white/80 dark:bg-gray-800/80 h-8 w-8 p-0" 
          onClick={toggleGrid}
          title="切换网格线"
        >
          <RotateCw size={14} />
        </Button>
        <Button 
          size="sm" 
          variant="outline" 
          className="bg-white/80 dark:bg-gray-800/80 h-8 w-8 p-0" 
          onClick={toggleAxes}
          title="切换坐标轴"
        >
          <Maximize2 size={14} />
        </Button>
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
  );
} 