"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { AvatarColorPicker } from "@/components/admin/avatar-color-picker"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { FastGPTApp, FastGPTModel, VoiceModel } from "@/types/fastgpt"
import { Copy, Check, ExternalLink } from "lucide-react"

type AgentFormProps = {
  initialData?: FastGPTApp
  onSubmit: (agent: any) => void
  onCancel: () => void
  models: FastGPTModel[]
  voiceModels: VoiceModel[]
  isLoadingModels: boolean
}

export function AgentForm({ initialData, onSubmit, onCancel, models, voiceModels, isLoadingModels }: AgentFormProps) {
  const [formData, setFormData] = useState<any>({
    name: initialData?.name || "",
    description: initialData?.description || "",
    modelId: initialData?.modelId || (models.length > 0 ? models[0].id : ""),
    status: initialData?.status || "active",
    type: initialData?.type || "custom",
    config: {
      systemPrompt: initialData?.config?.systemPrompt || "",
      temperature: initialData?.config?.temperature || 0.7,
      maxTokens: initialData?.config?.maxTokens || 2000,
      fileUpload: initialData?.config?.fileUpload || false,
      speechToText: initialData?.config?.speechToText || false,
      textToSpeech: initialData?.config?.textToSpeech || false,
      apiKey: initialData?.config?.apiKey || "",
      baseUrl: initialData?.config?.baseUrl || "",
      useProxy: initialData?.config?.useProxy === undefined ? true : initialData?.config?.useProxy,
      avatarColor: initialData?.config?.avatarColor || "#6cb33f",
    },
  })
  const [activeTab, setActiveTab] = useState("basic")
  const [copied, setCopied] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  const handleConfigChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      config: {
        ...formData.config,
        [name]: value,
      },
    })
  }

  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormData({
      ...formData,
      config: {
        ...formData.config,
        [name]: checked,
      },
    })
  }

    const handleColorChange = (color: string) => {
        setFormData({
            ...formData,
            config: {
                ...formData.config,
                avatarColor: color,
            },
        });
    };

  const handleModelChange = (modelId: string) => {
    setFormData({
      ...formData,
      modelId,
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const processedData = {
      ...formData,
      config: {
        ...formData.config,
        temperature: Number.parseFloat(formData.config.temperature),
        maxTokens: Number.parseInt(formData.config.maxTokens, 10),
        useProxy: formData.config.useProxy === undefined ? true : formData.config.useProxy,
      },
    }

    if (formData.type === "fastgpt") {
      delete processedData.config.systemPrompt
      delete processedData.config.temperature
      delete processedData.config.maxTokens
      processedData.modelId = ""
    }

    if (initialData) {
      onSubmit({ ...initialData, ...processedData })
    } else {
      onSubmit(processedData)
    }
  }

  const copyAppId = () => {
    if (initialData?.id) {
      navigator.clipboard.writeText(initialData.id)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
          <TabsTrigger value="api">API Config</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4">
          {initialData?.id && (
            <div className="space-y-2">
              <Label className="text-base">Agent ID (AppId)</Label>
              <div className="flex items-center space-x-2">
                <Input value={initialData.id} readOnly className="bg-gray-50" />
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button type="button" variant="outline" size="icon" onClick={copyAppId}>
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Copy AppId</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button type="button" variant="outline" size="icon" asChild>
                        <a
                          href={`/diagnostics/fastgpt-connection?appId=${initialData.id}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Test this Agent's API</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">This is the unique identifier for API calls and integrations.</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name" className="text-base">
              Agent Name
            </Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., Customer Support Assistant"
              className="border-gray-300 focus:border-green-500 focus:ring-green-500"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-base">
              Description
            </Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe what this agent does"
              className="border-gray-300 focus:border-green-500 focus:ring-green-500"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type" className="text-base">
              Agent Type
            </Label>
            <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
              <SelectTrigger className="border-gray-300 focus:border-green-500 focus:ring-green-500">
                <SelectValue placeholder="Select agent type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fastgpt">FastGPT (Uses FastGPT defaults)</SelectItem>
                <SelectItem value="custom">Custom (Configure all parameters)</SelectItem>
                <SelectItem value="openai">OpenAI (Directly use OpenAI API)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 dark:text-gray-400">
             Choosing FastGPT will use its default settings, no need to configure system prompt, model, etc.
            </p>
          </div>

          <div className="space-y-2 mt-4">
            <AvatarColorPicker
              value={formData.config?.avatarColor}
              onChange={handleColorChange}
            />
          </div>

          {formData.type !== "fastgpt" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="modelId" className="text-base">
                  Select Model
                </Label>
                {isLoadingModels ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Select value={formData.modelId} onValueChange={handleModelChange}>
                    <SelectTrigger className="border-gray-300 focus:border-green-500 focus:ring-green-500">
                      <SelectValue placeholder="Select a model" />
                    </SelectTrigger>
                    <SelectContent>
                      {models.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.name} {model.available ? "" : "(Unavailable)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="systemPrompt" className="text-base">
                  System Prompt
                </Label>
                <Textarea
                  id="systemPrompt"
                  name="systemPrompt"
                  value={formData.config.systemPrompt}
                  onChange={handleConfigChange}
                  placeholder="Set the agent's behavior and role"
                  className="border-gray-300 focus:border-green-500 focus:ring-green-500"
                  rows={4}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Defines the agent's behavior, knowledge scope, and response style.
                </p>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4">
          {formData.type !== "fastgpt" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="temperature" className="text-base">
                  Temperature
                </Label>
                <Input
                  id="temperature"
                  name="temperature"
                  type="number"
                  min="0"
                  max="2"
                  step="0.1"
                  value={formData.config.temperature}
                  onChange={handleConfigChange}
                  className="border-gray-300 focus:border-green-500 focus:ring-green-500"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Controls randomness (0-2). Lower is more deterministic.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxTokens" className="text-base">
                  Max Tokens
                </Label>
                <Input
                  id="maxTokens"
                  name="maxTokens"
                  type="number"
                  min="100"
                  max="8000"
                  step="100"
                  value={formData.config.maxTokens}
                  onChange={handleConfigChange}
                  className="border-gray-300 focus:border-green-500 focus:ring-green-500"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">Limits the max length of the response.</p>
              </div>
            </div>
          )}

          <div className="space-y-4 pt-2">
            <Label className="text-base">Features</Label>

            <div className="flex items-center space-x-2">
              <Switch
                id="fileUpload"
                checked={formData.config.fileUpload}
                onCheckedChange={(checked) => handleSwitchChange("fileUpload", checked)}
                className="data-[state=checked]:bg-[#6cb33f]"
              />
              <Label htmlFor="fileUpload" className="cursor-pointer">
                Enable File Upload
              </Label>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 pl-7">Allows users to upload files (off by default).</p>

            <div className="flex items-center space-x-2">
              <Switch
                id="speechToText"
                checked={formData.config.speechToText}
                onCheckedChange={(checked) => handleSwitchChange("speechToText", checked)}
                className="data-[state=checked]:bg-[#6cb33f]"
              />
              <Label htmlFor="speechToText" className="cursor-pointer">
                Enable Speech-to-Text
              </Label>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 pl-7">Allows users to input via voice (off by default).</p>

            <div className="flex items-center space-x-2">
              <Switch
                id="textToSpeech"
                checked={formData.config.textToSpeech}
                onCheckedChange={(checked) => handleSwitchChange("textToSpeech", checked)}
                className="data-[state=checked]:bg-[#6cb33f]"
              />
              <Label htmlFor="textToSpeech" className="cursor-pointer">
                Enable Text-to-Speech
              </Label>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 pl-7">Allows AI responses to be played as audio (off by default).</p>

            {formData.config.textToSpeech && (
              <div className="space-y-2 mt-4 pl-6">
                <Label htmlFor="voiceModel" className="text-base">
                  Select Voice Model
                </Label>
                {isLoadingModels ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Select
                    value={formData.config.voiceId || ""}
                    onValueChange={(value) => handleSwitchChange("voiceId", value)}
                  >
                    <SelectTrigger className="border-gray-300 focus:border-green-500 focus:ring-green-500">
                      <SelectValue placeholder="Select a voice model" />
                    </SelectTrigger>
                    <SelectContent>
                      {voiceModels.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.name} ({model.gender === "male" ? "Male" : "Female"})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="api" className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="apiKey" className="text-base">
              Dedicated API Key
            </Label>
            <Input
              id="apiKey"
              name="apiKey"
              value={formData.config.apiKey}
              onChange={handleConfigChange}
              placeholder="Enter dedicated API key for this agent"
              className="border-gray-300 focus:border-green-500 focus:ring-green-500"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              If set, this key will be used instead of the global API key.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="baseUrl" className="text-base">
              API Endpoint (Optional)
            </Label>
            <Input
              id="baseUrl"
              name="baseUrl"
              value={formData.config.baseUrl}
              onChange={handleConfigChange}
              placeholder="e.g., https://api.example.com/v1"
              className="border-gray-300 focus:border-green-500 focus:ring-green-500"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              If empty, the global API endpoint will be used.
            </p>
          </div>

          <div className="flex items-center space-x-2 mt-4">
            <Switch
              id="useProxy"
              checked={formData.config.useProxy === undefined ? true : formData.config.useProxy}
              onCheckedChange={(checked) => handleSwitchChange("useProxy", checked)}
              className="data-[state=checked]:bg-[#6cb33f]"
            />
            <Label htmlFor="useProxy" className="cursor-pointer">
              Use Proxy Mode
            </Label>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 pl-7">Enables proxy mode to solve CORS issues (on by default).</p>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="bg-[#6cb33f] hover:bg-green-600 transition-colors">
          {initialData ? "Update Agent" : "Add Agent"}
        </Button>
      </div>
    </form>
  )
}
