"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, Mic, ImageIcon, Paperclip, Smile, Sparkles, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useMobile } from "@/hooks/use-mobile"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CADFileUploader } from "@/components/cad/cad-file-uploader"

type ChatInputProps = {
  onSubmit: (message: string) => void
  isLoading: boolean
  isMuted: boolean
}

export function ChatInput({ onSubmit, isLoading, isMuted }: ChatInputProps) {
  const [input, setInput] = useState("")
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [showFileUpload, setShowFileUpload] = useState(false)
  const [showCADUpload, setShowCADUpload] = useState(false)
  const [attachments, setAttachments] = useState<File[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const recordingInterval = useRef<NodeJS.Timeout | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isMobile = useMobile()

  // Auto-adjust height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [input])

  // Focus textarea on desktop
  useEffect(() => {
    if (!isMobile && textareaRef.current && !isLoading) {
      textareaRef.current.focus()
    }
  }, [isMobile, isLoading])

  // Handle keyboard events
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (input.trim()) {
        handleSubmit()
      }
    }
  }

  // Handle submit
  const handleSubmit = () => {
    if (!input.trim() || isLoading) return
    onSubmit(input)
    setInput("")
    setAttachments([])
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
    }
  }

  // Handle voice input
  const handleVoiceInput = () => {
    if (isRecording) {
      // Stop recording
      setIsRecording(false)
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current)
        recordingInterval.current = null
      }
      setRecordingTime(0)

      // Play stop recording sound effect
      if (!isMuted) {
        const audio = new Audio("/sounds/recording-stop.mp3")
        audio.volume = 0.3
        audio.play().catch((e) => console.log("Audio play failed:", e))
      }

      // Simulate voice recognition result
      setTimeout(() => {
        setInput((prev) => prev + "这是通过语音输入的文字。")
      }, 500)
    } else {
      // Start recording
      setIsRecording(true)

      // Play start recording sound effect
      if (!isMuted) {
        const audio = new Audio("/sounds/recording-start.mp3")
        audio.volume = 0.3
        audio.play().catch((e) => console.log("Audio play failed:", e))
      }

      // Timer
      recordingInterval.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
    }
  }

  // Format recording time
  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // Handle file selection
  const handleFileSelect = () => {
    fileInputRef.current?.click()
  }

  // Handle file change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files)

      // Check if any CAD files are selected
      const cadFiles = files.filter((file) => {
        const ext = file.name.split(".").pop()?.toLowerCase()
        return ext === "dxf" || ext === "dwg" || ext === "step" || ext === "stp" || ext === "iges" || ext === "igs"
      })

      if (cadFiles.length > 0) {
        // If CAD files are selected, open CAD upload dialog
        setShowCADUpload(true)
      } else {
        // Otherwise, add files as regular attachments
        setAttachments((prev) => [...prev, ...files])
      }
    }
  }

  // Handle CAD file processed
  const handleCADFileProcessed = (fileData: any) => {
    setShowCADUpload(false)
    // Add a message about the CAD file
    setInput((prev) => prev + `\n\n我上传了一个CAD文件 "${fileData.name}"，请帮我分析一下这个文件。`)
  }

  // Remove attachment
  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <>
      <div className="p-2 md:p-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-t border-gray-200/80 dark:border-gray-700/80">
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {attachments.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-full px-3 py-1 text-xs"
              >
                <Paperclip className="h-3 w-3" />
                <span className="truncate max-w-[100px]">{file.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 rounded-full"
                  onClick={() => removeAttachment(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end space-x-2">
          <div className="flex-1 bg-gray-100/80 dark:bg-gray-700/80 backdrop-blur-sm rounded-2xl p-2 transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-700 focus-within:ring-2 focus-within:ring-primary-500/50">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isRecording ? "正在录音..." : "输入消息..."}
              className="min-h-[40px] max-h-[200px] w-full resize-none bg-transparent border-0 focus:ring-0 p-2 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 text-sm md:text-base"
              rows={1}
              disabled={isRecording}
            />

            {isRecording && (
              <div className="flex items-center justify-between px-2 py-1">
                <div className="flex items-center">
                  <span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-2 animate-pulse"></span>
                  <span className="text-sm text-red-500">{formatRecordingTime(recordingTime)}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsRecording(false)
                    if (recordingInterval.current) {
                      clearInterval(recordingInterval.current)
                      recordingInterval.current = null
                    }
                    setRecordingTime(0)
                  }}
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 py-1 h-7"
                >
                  取消
                </Button>
              </div>
            )}

            <div className="flex justify-between items-center px-2 pt-2">
              <div className="flex space-x-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-8 w-8 rounded-full",
                    isRecording ? "text-red-500 bg-red-100 dark:bg-red-900/30" : "text-gray-500 hover:text-primary-500",
                  )}
                  onClick={handleVoiceInput}
                >
                  <Mic className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full text-gray-500 hover:text-primary-500"
                >
                  <ImageIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full text-gray-500 hover:text-primary-500"
                  onClick={handleFileSelect}
                >
                  <Paperclip className="h-4 w-4" />
                  <input type="file" ref={fileInputRef} className="hidden" multiple onChange={handleFileChange} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full text-gray-500 hover:text-primary-500"
                >
                  <Smile className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full text-gray-500 hover:text-primary-500"
                  title="AI建议"
                >
                  <Sparkles className="h-4 w-4" />
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!input.trim() || isLoading || isRecording}
                  className={cn(
                    "bg-primary-500 hover:bg-primary-600 text-white rounded-full h-8 w-8 p-0 transition-all duration-200",
                    (!input.trim() || isLoading || isRecording) && "opacity-50 cursor-not-allowed",
                  )}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CAD文件上传对话框 */}
      <Dialog open={showCADUpload} onOpenChange={setShowCADUpload}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>上传CAD文件</DialogTitle>
          </DialogHeader>
          <CADFileUploader
            onFileProcessed={handleCADFileProcessed}
            maxFileSize={50}
            allowedFileTypes={[".dxf", ".dwg", ".step", ".stp", ".iges", ".igs"]}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
