"use client"

import React, { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Switch } from "@/components/ui/switch"
import {
  Loader2,
  Send,
  ImageIcon,
  RefreshCw,
  Sparkles,
  Info,
  Zap,
  Settings,
  History,
  Palette,
  Layout,
  Tag,
  FileText,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { ImageUploader } from "@/components/poster/image-uploader"

// 海报风格选项
const POSTER_STYLES = [
  { value: "modern", label: "现代简约", icon: <Layout className="h-4 w-4 mr-2" /> },
  { value: "tech", label: "科技感", icon: <Zap className="h-4 w-4 mr-2" /> },
  { value: "retro", label: "复古风", icon: <History className="h-4 w-4 mr-2" /> },
  { value: "corporate", label: "商务专业", icon: <FileText className="h-4 w-4 mr-2" /> },
  { value: "creative", label: "创意艺术", icon: <Palette className="h-4 w-4 mr-2" /> },
  { value: "luxury", label: "奢华", icon: <Sparkles className="h-4 w-4 mr-2" /> },
  { value: "bold", label: "醒目", icon: <AlertCircle className="h-4 w-4 mr-2" /> },
  { value: "festive", label: "喜庆", icon: <Sparkles className="h-4 w-4 mr-2" /> },
  { value: "elegant", label: "典雅", icon: <Palette className="h-4 w-4 mr-2" /> },
  { value: "minimalist", label: "极简", icon: <Layout className="h-4 w-4 mr-2" /> },
]

// 行业选项
const INDUSTRIES = [
  { value: "security", label: "安防行业", icon: <CheckCircle2 className="h-4 w-4 mr-2" /> },
  { value: "education", label: "教育培训", icon: <FileText className="h-4 w-4 mr-2" /> },
  { value: "healthcare", label: "医疗健康", icon: <CheckCircle2 className="h-4 w-4 mr-2" /> },
  { value: "technology", label: "科技IT", icon: <Zap className="h-4 w-4 mr-2" /> },
  { value: "finance", label: "金融服务", icon: <FileText className="h-4 w-4 mr-2" /> },
  { value: "retail", label: "零售商业", icon: <Tag className="h-4 w-4 mr-2" /> },
  { value: "manufacturing", label: "制造业", icon: <Settings className="h-4 w-4 mr-2" /> },
  { value: "realestate", label: "房地产", icon: <Layout className="h-4 w-4 mr-2" /> },
  { value: "hospitality", label: "酒店餐饮", icon: <FileText className="h-4 w-4 mr-2" /> },
  { value: "general", label: "通用", icon: <Tag className="h-4 w-4 mr-2" /> },
]

// 组件属性
interface PosterGeneratorInterfaceProps {
  className?: string
  onPosterGenerated?: (result: any) => void
}

// 示例海报模板
const POSTER_TEMPLATES = [
  {
    id: "template1",
    title: "安防技术峰会",
    description: "探讨前沿安防技术与解决方案",
    thumbnail: "/security-tech-summit-poster.png",
    industry: "security",
    style: "tech",
  },
  {
    id: "template2",
    title: "智能监控系统",
    description: "全方位保障您的安全",
    thumbnail: "/intelligent-monitoring-system-poster.png",
    industry: "security",
    style: "modern",
  },
  {
    id: "template3",
    title: "数据安全研讨会",
    description: "保护企业数据资产，防范网络威胁",
    thumbnail: "/data-security-seminar-poster.png",
    industry: "security",
    style: "corporate",
  },
]

/**
 * 海报生成器界面组件
 */
export function PosterGeneratorInterface({
  className,
  onPosterGenerated,
}: PosterGeneratorInterfaceProps) {
  // 状态
  const [activeTab, setActiveTab] = useState("simple")
  const [input, setInput] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressStage, setProgressStage] = useState<string>("")
  const [showTemplates, setShowTemplates] = useState(true)
  const [autoOptimize, setAutoOptimize] = useState(true)

  // 表单状态
  const [posterForm, setPosterForm] = useState({
    title: "",
    description: "",
    industry: "security", // 默认为安防行业
    style: "modern",
    additionalRequirements: "",
  })

  // 图片状态
  const [selectedImage, setSelectedImage] = useState<string>("")

  // 处理输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value)
  }

  // 处理表单变化
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setPosterForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  // 处理选择变化
  const handleSelectChange = (name: string, value: string) => {
    setPosterForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  // 处理简单模式提交
  const handleSimpleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!input.trim() || isSubmitting) return

    await generatePoster(input)
  }

  // 处理高级模式提交
  const handleAdvancedSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (isSubmitting) return

    // 构建输入文本
    let inputText = ""

    if (posterForm.title) {
      inputText += `标题: ${posterForm.title}\n`
    }

    if (posterForm.description) {
      inputText += `描述: ${posterForm.description}\n`
    }

    if (posterForm.industry && posterForm.industry !== "general") {
      inputText += `行业: ${INDUSTRIES.find((i) => i.value === posterForm.industry)?.label || posterForm.industry}\n`
    }

    if (posterForm.style) {
      inputText += `风格: ${POSTER_STYLES.find((s) => s.value === posterForm.style)?.label || posterForm.style}\n`
    }

    if (posterForm.additionalRequirements) {
      inputText += `其他要求: ${posterForm.additionalRequirements}\n`
    }

    await generatePoster(inputText)
  }

  // 生成海报
  const generatePoster = async (inputText: string) => {
    setIsSubmitting(true)
    setIsGenerating(true)
    setProgress(10)
    setProgressStage("准备中...")
    setShowTemplates(false)

    try {
      // 模拟进度
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + 10
        })
        
        // 更新生成阶段
        if (progress < 30) {
          setProgressStage("分析需求...")
        } else if (progress < 60) {
          setProgressStage("设计内容...")
        } else {
          setProgressStage("生成海报...")
        }
      }, 800)

      // 调用海报智能体API
      const response = await fetch(`/api/ag-ui/poster-generator`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: inputText,
          options: {
            imageUrl: selectedImage,
            autoOptimize: autoOptimize,
          },
        }),
      })

      clearInterval(progressInterval)
      
      if (!response.ok) {
        throw new Error(`API请求失败: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.type === "error") {
        throw new Error(data.content.error || "生成海报失败")
      }

      // 更新进度
      setProgress(100)
      setProgressStage("完成！")

      // 执行回调
      if (onPosterGenerated) {
        onPosterGenerated(data.content)
      }
    } catch (error) {
      console.error("生成海报失败:", error)
      toast({
        title: "生成失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
      setTimeout(() => {
        setIsGenerating(false)
        setProgress(0)
      }, 1000)
    }
  }

  // 处理选择图片
  const handleSelectImage = (imageUrl: string) => {
    setSelectedImage(imageUrl)
  }

  // 应用模板
  const applyTemplate = (template: (typeof POSTER_TEMPLATES)[0]) => {
    setPosterForm({
      title: template.title,
      description: template.description,
      industry: template.industry,
      style: template.style,
      additionalRequirements: "",
    })
    setActiveTab("advanced")
  }

  return (
    <div className={cn("space-y-4", className)}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="simple">简单模式</TabsTrigger>
          <TabsTrigger value="advanced">高级模式</TabsTrigger>
        </TabsList>

        <TabsContent value="simple" className="space-y-4 pt-4">
          <form onSubmit={handleSimpleSubmit} className="space-y-4">
            <div className="space-y-2">
              <div className="relative">
                <Input
                  placeholder="描述您想要的海报，例如：一张关于网络安全的企业宣传海报"
                  value={input}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  className="pr-20"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          type="button" 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8" 
                          onClick={() => setInput("")}
                          disabled={!input || isSubmitting}
                        >
                          <RefreshCw className="h-4 w-4" />
                          <span className="sr-only">清除</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>清除输入</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          type="button" 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8" 
                          onClick={() => setSelectedImage("")}
                          disabled={!selectedImage || isSubmitting}
                        >
                          <ImageIcon className="h-4 w-4" />
                          <span className="sr-only">清除图片</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>清除图片</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>

              {/* 图片上传区域 */}
              <ImageUploader 
                onImageSelected={handleSelectImage} 
                selectedImage={selectedImage}
                disabled={isSubmitting}
              />

              <div className="flex items-center space-x-2 mt-2">
                <Switch
                  id="auto-optimize"
                  checked={autoOptimize}
                  onCheckedChange={setAutoOptimize}
                  disabled={isSubmitting}
                />
                <Label htmlFor="auto-optimize" className="text-sm cursor-pointer flex items-center">
                  <Sparkles className="h-3.5 w-3.5 mr-1.5 text-blue-500" />
                  自动优化设计
                </Label>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={!input.trim() || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  生成海报
                </>
              )}
            </Button>
          </form>

          {/* 生成进度 */}
          {isGenerating && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                <span>{progressStage}</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* 推荐模板 */}
          {showTemplates && (
            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">推荐模板</h3>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setActiveTab("advanced")}>
                  查看全部
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {POSTER_TEMPLATES.map((template) => (
                  <Card 
                    key={template.id} 
                    className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => applyTemplate(template)}
                  >
                    <div className="aspect-[3/4] bg-gray-100 dark:bg-gray-800 relative">
                      {template.thumbnail ? (
                        <img 
                          src={template.thumbnail} 
                          alt={template.title} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FileText className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <CardContent className="p-3">
                      <h3 className="font-medium text-sm truncate">{template.title}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">
                        {template.description}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4 pt-4">
          <form onSubmit={handleAdvancedSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">标题</Label>
                <Input
                  id="title"
                  name="title"
                  placeholder="输入海报标题"
                  value={posterForm.title}
                  onChange={handleFormChange}
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">描述</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="输入海报内容描述"
                  value={posterForm.description}
                  onChange={handleFormChange}
                  disabled={isSubmitting}
                  className="min-h-[80px]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="industry">行业</Label>
                  <Select
                    value={posterForm.industry}
                    onValueChange={(value) => handleSelectChange("industry", value)}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger id="industry">
                      <SelectValue placeholder="选择行业" />
                    </SelectTrigger>
                    <SelectContent>
                      {INDUSTRIES.map((industry) => (
                        <SelectItem key={industry.value} value={industry.value}>
                          <div className="flex items-center">
                            {industry.icon}
                            {industry.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="style">风格</Label>
                  <Select
                    value={posterForm.style}
                    onValueChange={(value) => handleSelectChange("style", value)}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger id="style">
                      <SelectValue placeholder="选择风格" />
                    </SelectTrigger>
                    <SelectContent>
                      {POSTER_STYLES.map((style) => (
                        <SelectItem key={style.value} value={style.value}>
                          <div className="flex items-center">
                            {style.icon}
                            {style.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="additionalRequirements">其他要求</Label>
                <Textarea
                  id="additionalRequirements"
                  name="additionalRequirements"
                  placeholder="其他额外要求或建议"
                  value={posterForm.additionalRequirements}
                  onChange={handleFormChange}
                  disabled={isSubmitting}
                  className="min-h-[80px]"
                />
              </div>

              {/* 图片上传区域 */}
              <ImageUploader 
                onImageSelected={handleSelectImage} 
                selectedImage={selectedImage}
                disabled={isSubmitting}
              />

              <div className="flex items-center space-x-2">
                <Switch
                  id="auto-optimize-advanced"
                  checked={autoOptimize}
                  onCheckedChange={setAutoOptimize}
                  disabled={isSubmitting}
                />
                <Label htmlFor="auto-optimize-advanced" className="text-sm cursor-pointer flex items-center">
                  <Sparkles className="h-3.5 w-3.5 mr-1.5 text-blue-500" />
                  自动优化设计
                </Label>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={(!posterForm.title && !posterForm.description) || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  生成海报
                </>
              )}
            </Button>
          </form>

          {/* 生成进度 */}
          {isGenerating && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                <span>{progressStage}</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* 提示信息 */}
      <div className="flex items-start space-x-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
        <Info className="h-5 w-5 flex-shrink-0 mt-0.5 text-blue-500" />
        <p>
          提示：提供详细的描述和选择合适的风格可以帮助AI生成更好的海报。
          {!selectedImage && "您还可以上传图片以融入海报设计中。"}
        </p>
      </div>
    </div>
  )
} 