"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, FileSpreadsheet, Image, Loader2,MessageSquare, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect,useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { AdminLayout } from "@/components/admin/layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { AgentConfig, AgentType } from "@/lib/agents/base-agent";
import { useAgentStore } from "@/lib/stores/agent-store";

// 表单验证schema
const formSchema = z.object({
  name: z.string().min(2, { message: "名称不能少于2个字符" }),
  description: z.string().min(10, { message: "描述不能少于10个字符" }),
  isActive: z.boolean().default(true),
  // FastGPT 专用字段
  fastgpt: z.object({
    apiEndpoint: z.string().url({ message: "必须是有效的URL" }).optional(),
    apiKey: z.string().optional(),
    modelId: z.string().optional(),
    systemPrompt: z.string().optional(),
  }).optional(),
  // CAD 专用字段
  cad: z.object({
    apiEndpoint: z.string().url({ message: "必须是有效的URL" }).optional(),
    apiKey: z.string().optional(),
    modelId: z.string().optional(),
    promptTemplate: z.string().optional(),
    maxFileSize: z.coerce.number().min(1, { message: "文件大小限制必须大于0" }).optional(),
    allowedFileTypes: z.string().min(1, { message: "必须指定允许的文件类型" }).optional(),
    supportedAnalysisTypes: z.array(z.string()).min(1, { message: "至少选择一种分析类型" }).optional(),
  }).optional(),
  // 海报生成 专用字段
  poster: z.object({
    apiEndpoint: z.string().url({ message: "必须是有效的URL" }).optional(),
    apiKey: z.string().optional(),
    modelId: z.string().optional(),
    defaultPrompt: z.string().optional(),
    maxWidth: z.coerce.number().min(100, { message: "宽度必须大于100px" }).optional(),
    maxHeight: z.coerce.number().min(100, { message: "高度必须大于100px" }).optional(),
  }).optional(),
  // 元数据
  metadata: z.object({
    showInGallery: z.boolean().default(true),
    galleryIconUrl: z.string().optional(),
    priority: z.coerce.number().default(0),
  }).optional(),
});

export default function EditAgentPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { toast } = useToast();
  const { getAgentById, updateAgent } = useAgentStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [agent, setAgent] = useState<AgentConfig | null>(null);
  const [selectedAnalysisTypes, setSelectedAnalysisTypes] = useState<string[]>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      isActive: true,
      metadata: {
        showInGallery: true,
        galleryIconUrl: "",
        priority: 0,
      },
    },
  });

  // 加载代理数据
  useEffect(() => {
    const fetchAgent = async () => {
      try {
        const agentData = await getAgentById(params.id);
        if (agentData) {
          setAgent(agentData);
          
          // 设置通用字段
          form.setValue("name", agentData.name);
          form.setValue("description", agentData.description);
          form.setValue("isActive", (agentData as any).isActive ?? true);
          
          // 设置元数据
          if ((agentData as any).metadata) {
            form.setValue("metadata.showInGallery", (agentData as any).metadata.showInGallery ?? true);
            form.setValue("metadata.galleryIconUrl", (agentData as any).metadata.galleryIconUrl ?? "");
            form.setValue("metadata.priority", (agentData as any).metadata.priority ?? 0);
          }
          
          // 根据代理类型设置特定字段
          switch (agentData.type) {
            case "fastgpt":
              if ((agentData as any).configuration) {
                form.setValue("fastgpt.apiEndpoint", (agentData as any).configuration.apiEndpoint ?? "");
                form.setValue("fastgpt.apiKey", (agentData as any).configuration.apiKey ?? "");
                form.setValue("fastgpt.modelId", (agentData as any).configuration.modelId ?? "");
                form.setValue("fastgpt.systemPrompt", (agentData as any).configuration.systemPrompt ?? "");
              }
              break;
            case "cad":
              if ((agentData as any).configuration) {
                form.setValue("cad.apiEndpoint", (agentData as any).configuration.apiEndpoint ?? "");
                form.setValue("cad.apiKey", (agentData as any).configuration.apiKey ?? "");
                form.setValue("cad.modelId", (agentData as any).configuration.modelId ?? "");
                form.setValue("cad.promptTemplate", (agentData as any).configuration.promptTemplate ?? "");
                form.setValue("cad.maxFileSize", (agentData as any).configuration.maxFileSize ?? 50);
                form.setValue("cad.allowedFileTypes", Array.isArray((agentData as any).configuration.allowedFileTypes) 
                  ? (agentData as any).configuration.allowedFileTypes.join(",") 
                  : "");
                
                // 处理分析类型
                const analysisTypes = (agentData as any).configuration.supportedAnalysisTypes ?? ["standard"];
                setSelectedAnalysisTypes(analysisTypes);
                form.setValue("cad.supportedAnalysisTypes", analysisTypes);
              }
              break;
            case "poster":
              if ((agentData as any).configuration) {
                form.setValue("poster.apiEndpoint", (agentData as any).configuration.apiEndpoint ?? "");
                form.setValue("poster.apiKey", (agentData as any).configuration.apiKey ?? "");
                form.setValue("poster.modelId", (agentData as any).configuration.modelId ?? "");
                form.setValue("poster.defaultPrompt", (agentData as any).configuration.defaultPrompt ?? "");
                form.setValue("poster.maxWidth", (agentData as any).configuration.maxWidth ?? 1024);
                form.setValue("poster.maxHeight", (agentData as any).configuration.maxHeight ?? 1024);
              }
              break;
          }
        }
      } catch (error) {
        console.error("加载智能体数据失败:", error);
        toast({
          title: "加载失败",
          description: "无法加载智能体数据",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAgent();
  }, [params.id, getAgentById, form, toast]);

  // 处理CAD分析类型选择
  const handleAnalysisTypeChange = (type: string, checked: boolean) => {
    if (checked) {
      setSelectedAnalysisTypes(prev => [...prev, type]);
    } else {
      setSelectedAnalysisTypes(prev => prev.filter(t => t !== type));
    }
    
    // 更新表单值
    form.setValue("cad.supportedAnalysisTypes", 
      checked 
        ? [...selectedAnalysisTypes, type]
        : selectedAnalysisTypes.filter(t => t !== type)
    );
  };

  // 提交表单
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!agent) return;
    
    setIsSubmitting(true);
    
    try {
      // 构建更新配置
      let updatedConfig: any = {};
      
      // 根据智能体类型处理特定配置
      switch (agent.type) {
        case "fastgpt":
          updatedConfig = values.fastgpt;
          break;
        case "cad":
          // 处理CAD分析类型
          const cadValues = values.cad;
          if (cadValues) {
            cadValues.supportedAnalysisTypes = selectedAnalysisTypes;
            
            // 处理允许的文件类型（不直接覆盖字符串字段，转为配置项）
            const allowedTypes = cadValues.allowedFileTypes
              ? (cadValues.allowedFileTypes as unknown as string).split(",")
              : undefined;
            
            updatedConfig = {
              ...cadValues,
              ...(allowedTypes ? { allowedFileTypes: allowedTypes } : {}),
            } as any;
          }
          break;
        case "poster":
          updatedConfig = values.poster;
          break;
      }
      
      // 更新智能体
      await updateAgent(agent.id, {
        name: values.name,
        description: values.description,
        isActive: values.isActive,
        configuration: {
          ...(agent as any).configuration,
          ...updatedConfig
        },
        metadata: values.metadata
      });
      
      toast({
        title: "更新成功",
        description: `智能体 "${values.name}" 已更新`,
      });
      
      // 重定向到智能体管理页面
      router.push("/admin/dashboard?tab=agents");
    } catch (error) {
      console.error("更新智能体失败:", error);
      toast({
        title: "更新失败",
        description: "更新智能体时发生错误",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 获取代理图标
  const getAgentIcon = (type: AgentType) => {
    switch (type) {
      case "fastgpt":
        return <MessageSquare className="h-10 w-10 text-blue-500" />;
      case "cad":
        return <FileSpreadsheet className="h-10 w-10 text-green-500" />;
      case "poster":
        return <Image className="h-10 w-10 text-purple-500" />;
      default:
        return <MessageSquare className="h-10 w-10 text-gray-500" />;
    }
  };

  // 获取代理类型名称
  const getAgentTypeName = (type: AgentType) => {
    switch (type) {
      case "fastgpt":
        return "对话智能体";
      case "cad":
        return "CAD智能体";
      case "poster":
        return "海报智能体";
      default:
        return "未知类型";
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="container mx-auto py-6 px-4 flex items-center justify-center min-h-[80vh]">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-green-600" />
            <p>加载智能体数据...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!agent) {
    return (
      <AdminLayout>
        <div className="container mx-auto py-6 px-4">
          <div className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">未找到智能体</h2>
            <p className="mb-6">无法找到ID为 {params.id} 的智能体</p>
            <Button onClick={() => router.push("/admin/dashboard?tab=agents")}>
              返回智能体列表
            </Button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto py-6 px-4 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => router.push("/admin/dashboard?tab=agents")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-3xl font-bold">编辑 {getAgentTypeName(agent.type)}</h1>
          </div>
          {getAgentIcon(agent.type)}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">基本信息</TabsTrigger>
                <TabsTrigger value="config">配置信息</TabsTrigger>
                <TabsTrigger value="advanced">高级设置</TabsTrigger>
              </TabsList>
              
              {/* 基本信息 */}
              <TabsContent value="basic" className="space-y-4 mt-4">
                <Card className="p-6">
                  <div className="space-y-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>智能体名称</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormDescription>
                            用户界面中显示的名称
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>智能体描述</FormLabel>
                          <FormControl>
                            <Textarea {...field} rows={3} />
                          </FormControl>
                          <FormDescription>
                            简要描述此智能体的功能和用途
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="isActive"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">启用状态</FormLabel>
                            <FormDescription>
                              控制此智能体是否对用户可用
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </Card>
              </TabsContent>
              
              {/* 配置信息 - 根据代理类型显示不同的配置表单 */}
              <TabsContent value="config" className="space-y-4 mt-4">
                <Card className="p-6">
                  {agent.type === "fastgpt" && (
                    <div className="space-y-6">
                      <FormField
                        control={form.control}
                        name="fastgpt.apiEndpoint"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>FastGPT API 端点</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="fastgpt.apiKey"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>API 密钥</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="fastgpt.modelId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>模型ID</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="fastgpt.systemPrompt"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>系统提示词</FormLabel>
                            <FormControl>
                              <Textarea {...field} rows={4} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                  
                  {agent.type === "cad" && (
                    <div className="space-y-6">
                      <FormField
                        control={form.control}
                        name="cad.apiEndpoint"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CAD 分析 API 端点</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="cad.apiKey"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>API 密钥</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="cad.modelId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>模型ID (可选)</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="cad.promptTemplate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>提示词模板</FormLabel>
                            <FormControl>
                              <Textarea {...field} rows={4} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <Separator className="my-4" />
                      
                      <div>
                        <h3 className="text-lg font-medium mb-2">支持的分析类型</h3>
                        <p className="text-sm text-gray-500 mb-4">
                          选择此智能体支持的CAD分析类型
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex items-center space-x-2">
                            <Switch 
                              id="standard" 
                              checked={selectedAnalysisTypes.includes("standard")}
                              onCheckedChange={(checked: boolean) => 
                                handleAnalysisTypeChange("standard", checked)
                              }
                            />
                            <label htmlFor="standard" className="cursor-pointer">标准分析</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch 
                              id="detailed"
                              checked={selectedAnalysisTypes.includes("detailed")}
                              onCheckedChange={(checked: boolean) => 
                                handleAnalysisTypeChange("detailed", checked)
                              }
                            />
                            <label htmlFor="detailed" className="cursor-pointer">详细分析</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch 
                              id="professional"
                              checked={selectedAnalysisTypes.includes("professional")}
                              onCheckedChange={(checked: boolean) => 
                                handleAnalysisTypeChange("professional", checked)
                              }
                            />
                            <label htmlFor="professional" className="cursor-pointer">专业分析</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch 
                              id="measurement"
                              checked={selectedAnalysisTypes.includes("measurement")}
                              onCheckedChange={(checked: boolean) => 
                                handleAnalysisTypeChange("measurement", checked)
                              }
                            />
                            <label htmlFor="measurement" className="cursor-pointer">尺寸测量</label>
                          </div>
                        </div>
                        {form.formState.errors.cad?.supportedAnalysisTypes && (
                          <p className="text-sm text-red-500 mt-2">
                            {form.formState.errors.cad?.supportedAnalysisTypes.message}
                          </p>
                        )}
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="cad.maxFileSize"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>最大文件大小 (MB)</FormLabel>
                            <FormControl>
                              <Input type="number" min="1" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="cad.allowedFileTypes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>允许的文件类型</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormDescription>
                              以逗号分隔的扩展名列表
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                  
                  {agent.type === "poster" && (
                    <div className="space-y-6">
                      <FormField
                        control={form.control}
                        name="poster.apiEndpoint"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>图像生成 API 端点</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="poster.apiKey"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>API 密钥</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="poster.modelId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>模型ID</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="poster.defaultPrompt"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>默认提示词</FormLabel>
                            <FormControl>
                              <Textarea {...field} rows={4} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="poster.maxWidth"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>最大宽度 (px)</FormLabel>
                              <FormControl>
                                <Input type="number" min="100" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="poster.maxHeight"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>最大高度 (px)</FormLabel>
                              <FormControl>
                                <Input type="number" min="100" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  )}
                </Card>
              </TabsContent>
              
              {/* 高级设置 */}
              <TabsContent value="advanced" className="space-y-4 mt-4">
                <Card className="p-6">
                  <div className="space-y-6">
                    <FormField
                      control={form.control}
                      name="metadata.showInGallery"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">显示在智能体库</FormLabel>
                            <FormDescription>
                              是否在用户的智能体选择库中显示此智能体
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="metadata.galleryIconUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>图标URL</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormDescription>
                            智能体在库中显示的图标URL
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="metadata.priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>显示优先级</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" max="100" {...field} />
                          </FormControl>
                          <FormDescription>
                            在智能体库中的显示优先级，数字越大越靠前
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
            
            <div className="flex justify-end space-x-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => router.push("/admin/dashboard?tab=agents")}
              >
                取消
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Save className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? "保存中..." : "保存更改"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </AdminLayout>
  );
} 