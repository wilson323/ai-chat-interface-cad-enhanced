"use client";

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, File, Loader2, UploadCloud, AlertCircle } from 'lucide-react';
import { CADFileType } from '@/lib/types/cad'
import { formatFileSize } from '@/lib/utils';

interface CADFileUploaderProps {
  onUpload: (file: File) => Promise<void>;
  isUploading?: boolean;
  uploadProgress?: number;
  error?: string;
  supportedFormats?: CADFileType[];
  maxSizeMB?: number;
}

export function CADFileUploader({
  onUpload,
  isUploading = false,
  uploadProgress = 0,
  error,
  supportedFormats = [
    'dxf','dwg','step','stp','iges','igs','stl','obj','gltf','glb','ply','dae','3ds','fbx'
  ] as Array<CADFileType>,
  maxSizeMB = 100
}: CADFileUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 处理拖拽事件
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };
  
  // 处理文件放置
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };
  
  // 点击上传按钮
  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };
  
  // 处理文件输入变更
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };
  
  // 处理所选文件
  const handleFile = (file: File) => {
    const fileExtension = file.name.split('.').pop()?.toLowerCase() as CADFileType;
    
    // 检查文件类型是否受支持
    if (!supportedFormats.includes(fileExtension)) {
      setSelectedFile(null);
      return;
    }
    
    // 检查文件大小
    if (file.size > maxSizeMB * 1024 * 1024) {
      setSelectedFile(null);
      return;
    }
    
    setSelectedFile(file);
  };
  
  // 处理文件上传
  const handleUpload = async () => {
    if (selectedFile && !isUploading) {
      await onUpload(selectedFile);
    }
  };
  
  // 根据文件扩展名生成颜色
  const getFileColorClass = (extension: string): string => {
    const colorMap: Record<string, string> = {
      'step': 'bg-blue-500',
      'stp': 'bg-blue-500',
      'iges': 'bg-purple-500',
      'igs': 'bg-purple-500',
      'stl': 'bg-green-500',
      'obj': 'bg-yellow-500',
      'gltf': 'bg-orange-500',
      'glb': 'bg-orange-500',
      'dxf': 'bg-red-500',
      'dwg': 'bg-red-500',
      'ifc': 'bg-pink-500',
      'default': 'bg-gray-500'
    };
    
    return colorMap[extension] || colorMap.default;
  };
  
  // 格式化支持的格式组
  const formatGroups = [
    { title: 'AutoCAD', formats: ['dxf', 'dwg'] },
    { title: '3D参数化', formats: ['step', 'stp', 'iges', 'igs'] },
    { title: '3D网格', formats: ['stl', 'obj', 'gltf', 'glb'] },
    { title: 'BIM格式', formats: ['ifc'] },
    { title: '其他', formats: ['fbx', 'skp', '3ds', 'dae', 'jt', 'ply', 'off'] }
  ];
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>上传CAD文件</CardTitle>
      </CardHeader>
      <CardContent>
        {/* 拖放区域 */}
        <div
          className={`relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
            ${dragActive ? 'border-primary bg-primary/5' : 'border-gray-300 dark:border-gray-600'}
            ${isUploading ? 'pointer-events-none opacity-80' : 'hover:border-primary hover:bg-primary/5'}
          `}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={handleButtonClick}
        >
          <input 
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept={supportedFormats.map(format => `.${format}`).join(',')}
            onChange={handleFileInputChange}
            disabled={isUploading}
          />
          
          {isUploading ? (
            <div className="py-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">正在上传和处理...</h3>
              <Progress value={uploadProgress} className="h-2 w-2/3 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">请耐心等待，大文件可能需要更长时间</p>
            </div>
          ) : selectedFile ? (
            <div className="py-4">
              <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-full bg-primary/10">
                <File className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-medium mb-1">{selectedFile.name}</h3>
              <p className="text-sm text-muted-foreground mb-4">{formatFileSize(selectedFile.size)}</p>
              <Badge variant="outline" className="mx-auto">
                {selectedFile.name.split('.').pop()?.toUpperCase()}
              </Badge>
              <p className="mt-4 text-sm text-muted-foreground">文件已选择，点击"开始分析"按钮继续</p>
            </div>
          ) : (
            <div className="py-8">
              <UploadCloud className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">拖放文件或点击上传</h3>
              <p className="text-sm text-muted-foreground mt-2 mb-4">
                支持 {supportedFormats.slice(0, 5).map(f => f.toUpperCase()).join(', ')} 等格式
                <br />最大文件大小: {maxSizeMB}MB
              </p>
              <Button variant="outline" size="sm" className="mx-auto">
                选择文件
              </Button>
            </div>
          )}
        </div>
        
        {/* 错误提示 */}
        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>上传失败</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {/* 支持的格式列表 */}
        <div className="mt-6">
          <h4 className="text-sm font-medium mb-2">支持的文件格式</h4>
          <div className="space-y-2">
            {formatGroups.map((group) => (
              <div key={group.title}>
                <p className="text-xs text-muted-foreground mb-1">{group.title}</p>
                <div className="flex flex-wrap gap-1">
                  {group.formats
                    .filter(format => supportedFormats.includes(format as CADFileType))
                    .map(format => (
                      <Badge key={format} variant="secondary" className="text-xs">
                        {format.toUpperCase()}
                      </Badge>
                    ))
                  }
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" disabled={isUploading}>
          取消
        </Button>
        <Button 
          disabled={!selectedFile || isUploading} 
          onClick={handleUpload}
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              处理中...
            </>
          ) : (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              开始分析
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
} 