"use client"

import React, { useState, useRef } from "react"
import { Upload, FileUp, X, Check, AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { cn } from "@/lib/utils"

// Add JSX type declarations
declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

/// <reference types="react/next" />
/// <reference types="react-dom/next" />

interface CADFileUploaderProps {
  onFileProcessed: (fileData: File) => Promise<void> | void
  maxFileSize?: number // 以MB为单位
  allowedFileTypes?: string[]
  className?: string
  isUploading?: boolean
  uploadProgress?: number
  uploadStage?: "uploading" | "processing" | "completed"
}

export function CADFileUploader({
  onFileProcessed,
  maxFileSize = 50, // 默认最大50MB
  allowedFileTypes = [".dxf", ".dwg", ".step", ".stp", ".iges", ".igs"],
  className,
  isUploading = false,
  uploadProgress = 0,
  uploadStage = "uploading",
}: CADFileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 处理拖放事件
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      validateAndSetFile(files[0])
    }
  }

  // 验证文件类型和大小
  const validateAndSetFile = (file: File) => {
    setUploadError(null)
    setUploadSuccess(false)

    const fileExtension = `.${file.name.split(".").pop()?.toLowerCase()}`
    if (!allowedFileTypes?.includes(fileExtension)) {
      setUploadError(`不支持的文件类型。请上传以下格式: ${allowedFileTypes?.join(", ")}`)
      return false
    }

    if (file.size > (maxFileSize || 50) * 1024 * 1024) {
      setUploadError(`文件过大。最大允许大小: ${maxFileSize}MB`)
      return false
    }

    setFile(file)
    return true
  }

  // 处理文件选择
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0])
    }
  }

  // 处理文件上传
  const handleUpload = async () => {
    if (!file) return

    try {
      // 直接调用传入的处理函数
      await onFileProcessed(file)
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "上传过程中发生错误")
    }
  }

  // 取消上传
  const handleCancel = () => {
    setFile(null)
    setUploadError(null)
    setUploadSuccess(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <div className={cn("w-full", className)}>
      {/* 拖放区域 */}
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-6 transition-colors text-center",
          isDragging ? "border-primary bg-primary/5" : "border-gray-300 dark:border-gray-700",
          file ? "bg-gray-50 dark:bg-gray-800/50" : "bg-white dark:bg-gray-900",
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {!file ? (
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="p-3 rounded-full bg-primary/10 text-primary">
              <Upload className="h-8 w-8" />
            </div>
            <div>
              <p className="text-lg font-medium">拖放CAD文件到此处</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">支持的格式: {allowedFileTypes.join(", ")}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">最大文件大小: {maxFileSize}MB</p>
            </div>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="mt-2">
              <FileUp className="mr-2 h-4 w-4" />
              选择文件
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept={allowedFileTypes.join(",")}
              className="hidden"
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-md bg-primary/10 text-primary">
                  <FileUp className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium truncate max-w-[200px]">{file.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={handleCancel} disabled={isUploading}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* 上传进度 */}
            {(isUploading || uploadSuccess) && (
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span>{uploadSuccess ? "完成" : `${uploadProgress}%`}</span>
                  {isUploading && <span>{uploadStage || "上传中..."}</span>}
                </div>
                <Progress value={uploadProgress} className="h-1" />
              </div>
            )}

            {/* 上传按钮 */}
            {!uploadSuccess && !isUploading && (
              <Button onClick={handleUpload} className="w-full" disabled={!file || isUploading}>
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    处理中...
                  </>
                ) : (
                  <>
                    <FileUp className="mr-2 h-4 w-4" />
                    上传并解析
                  </>
                )}
              </Button>
            )}

            {/* 上传成功提示 */}
            {uploadSuccess && (
              <div className="flex items-center text-green-500 text-sm">
                <Check className="mr-2 h-4 w-4" />
                文件上传成功，正在解析...
              </div>
            )}
          </div>
        )}
      </div>

      {/* 错误提示 */}
      {uploadError && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>上传失败</AlertTitle>
          <AlertDescription>{uploadError}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
