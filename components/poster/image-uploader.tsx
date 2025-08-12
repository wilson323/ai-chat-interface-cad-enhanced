"use client"

import { ImageIcon, Upload,X } from "lucide-react"
import React, { useRef,useState } from "react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"

interface ImageUploaderProps {
  onImageSelected: (imageUrl: string) => void
  selectedImage?: string
  disabled?: boolean
  maxSize?: number // MB
  className?: string
}

export function ImageUploader({
  onImageSelected,
  selectedImage,
  disabled = false,
  maxSize = 5, // Default 5MB
  className,
}: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 处理拖拽进入
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) {
      setIsDragging(true)
    }
  }

  // 处理拖拽离开
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  // 处理拖拽
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) {
      setIsDragging(true)
    }
  }

  // 处理释放
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    
    if (disabled) return
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleImageUpload(files[0])
    }
  }

  // 处理文件选择
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleImageUpload(files[0])
    }
  }

  // 处理图片上传
  const handleImageUpload = async (file: File) => {
    // 验证文件类型
    if (!file.type.startsWith("image/")) {
      toast({
        title: "文件类型错误",
        description: "请上传图片文件（JPG、PNG等格式）",
        variant: "destructive",
      })
      return
    }

    // 验证文件大小
    if (file.size > maxSize * 1024 * 1024) {
      toast({
        title: "文件太大",
        description: `图片大小不能超过${maxSize}MB`,
        variant: "destructive",
      })
      return
    }

    setIsUploading(true)

    try {
      // 创建FormData
      const formData = new FormData()
      formData.append("file", file)

      // 上传文件到服务器
      const response = await fetch("/api/images/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`上传失败: ${response.statusText}`)
      }

      const data = await response.json()

      // 调用回调函数
      onImageSelected(data.imageUrl)
    } catch (error) {
      console.error("图片上传失败:", error)
      toast({
        title: "上传失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
      // 清除input value，允许重新上传相同的文件
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  // 处理清除图片
  const handleClearImage = () => {
    onImageSelected("")
  }

  // 处理点击上传区域
  const handleUploadClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  return (
    <div className={className}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/*"
        className="hidden"
        disabled={disabled || isUploading}
      />

      {selectedImage ? (
        <Card className="relative overflow-hidden">
          <img
            src={selectedImage}
            alt="Selected"
            className="w-full h-[140px] object-cover"
          />
          <Button
            size="icon"
            variant="destructive"
            className="absolute top-2 right-2 h-7 w-7 rounded-full opacity-80 hover:opacity-100"
            onClick={handleClearImage}
            disabled={disabled || isUploading}
          >
            <X className="h-4 w-4" />
          </Button>
        </Card>
      ) : (
        <div
          className={`border-2 border-dashed rounded-lg p-4 transition-colors ${
            isDragging ? "border-primary bg-primary/5" : "border-gray-300 dark:border-gray-600"
          } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-primary hover:bg-primary/5"}`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={handleUploadClick}
        >
          <div className="flex flex-col items-center justify-center gap-2 py-2">
            {isUploading ? (
              <div className="h-10 w-10 rounded-full border-2 border-gray-300 border-t-primary animate-spin" />
            ) : (
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <ImageIcon className="h-5 w-5 text-primary" />
              </div>
            )}
            <div className="text-center">
              <p className="text-sm font-medium">
                {isUploading ? "上传中..." : "拖放图片或点击上传"}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                支持JPG、PNG格式，最大{maxSize}MB
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 