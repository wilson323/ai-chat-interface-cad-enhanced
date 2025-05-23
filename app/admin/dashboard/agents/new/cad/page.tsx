"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { AdminLayout } from "@/components/admin/layout";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileSpreadsheet, Save, ArrowLeft } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAgentStore } from "@/lib/stores/agent-store";

// 表单验证schema
const formSchema = z.object({
  name: z.string().min(2, { message: "名称不能少于2个字符" }),
  description: z.string().min(10, { message: "描述不能少于10个字符" }),
  apiEndpoint: z.string().url({ message: "必须是有效的URL" }),
  apiKey: z.string().min(1, { message: "API密钥不能为空" }),
  modelId: z.string().optional(),
  promptTemplate: z.string().optional(),
  maxFileSize: z.coerce.number().min(1, { message: "文件大小限制必须大于0" }),
  allowedFileTypes: z.string().min(1, { message: "必须指定允许的文件类型" }),
  isActive: z.boolean().default(true),
  supportedAnalysisTypes: z.array(z.string()).min(1, { message: "至少选择一种分析类型" }),
  showInGallery: z.boolean().default(true),
  galleryIconUrl: z.string().optional(),
  priority: z.coerce.number().default(0),
});

export default function NewCADAgentPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { createAgent } = useAgentStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedAnalysisTypes, setSelectedAnalysisTypes] = useState<string[]>(["standard"]);

  // 初始化表单
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "CAD解读助手",
      description: "上传CAD文件，获取专业解读和3D可视化",
      apiEndpoint: "https://api.example.com/v1/cad-analysis",
      apiKey: "",
      modelId: "",
      promptTemplate: "请分析这个CAD文件并提取关键特征和尺寸信息。详细描述模型的结构和组成部分。",
      maxFileSize: 50,
      allowedFileTypes: ".dwg,.dxf,.step,.stp,.iges,.igs,.stl,.obj",
      isActive: true,
      supportedAnalysisTypes: ["standard"],
      showInGallery: true,
      galleryIconUrl: "/images/cad-icon.svg",
      priority: 5,
    },
  });

  // 提交表单
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    
    try {
      // 添加支持的分析类型
      values.supportedAnalysisTypes = selectedAnalysisTypes;
      
      // 创建CAD智能体
      await createAgent({
        type: "cad",
        name: values.name,
        description: values.description,
        configuration: {
          apiEndpoint: values.apiEndpoint,
          apiKey: values.apiKey,
          modelId: values.modelId,
          promptTemplate: values.promptTemplate,
          maxFileSize: values.maxFileSize,
          allowedFileTypes: values.allowedFileTypes.split(","),
          supportedAnalysisTypes: values.supportedAnalysisTypes,
        },
        isActive: values.isActive,
        metadata: {
          showInGallery: values.showInGallery,
          galleryIconUrl: values.galleryIconUrl,
          priority: values.priority,
        }
      });
      
      toast({
        title: "创建成功",
        description: `CAD智能体 "${values.name}" 创建成功`,
      });
      
      // 重定向到智能体管理页面
      router.push("/admin/dashboard?tab=agents");
    } catch (error) {
      console.error("创建CAD智能体失败:", error);
      toast({
        title: "创建失败",
        description: "创建CAD智能体时发生错误",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAnalysisTypeChange = (type: string, checked: boolean) => {
    if (checked) {
      setSelectedAnalysisTypes(prev => [...prev, type]);
    } else {
      setSelectedAnalysisTypes(prev => prev.filter(t => t !== type));
    }
    
    // 更新表单值
    form.setValue("supportedAnalysisTypes", 
      checked 
        ? [...selectedAnalysisTypes, type]
        : selectedAnalysisTypes.filter(t => t !== type)
    );
  };

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
            <h1 className="text-3xl font-bold">添加 CAD 智能体</h1>
          </div>
          <FileSpreadsheet className="h-10 w-10 text-green-500" />
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">基本信息</TabsTrigger>
                <TabsTrigger value="api">API配置</TabsTrigger>
                <TabsTrigger value="advanced">高级设置</TabsTrigger>
              </TabsList>
              
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
                            <Input placeholder="CAD解读助手" {...field} />
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
                            <Textarea 
                              placeholder="上传CAD文件，获取专业解读和3D可视化" 
                              {...field} 
                              rows={3}
                            />
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
              
              <TabsContent value="api" className="space-y-4 mt-4">
                <Card className="p-6">
                  <div className="space-y-6">
                    <FormField
                      control={form.control}
                      name="apiEndpoint"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>API 端点</FormLabel>
                          <FormControl>
                            <Input placeholder="https://api.example.com/v1/cad-analysis" {...field} />
                          </FormControl>
                          <FormDescription>
                            CAD分析服务的API端点
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="apiKey"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>API 密钥</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="sk-xxxxxxxxxxxxxxxx" {...field} />
                          </FormControl>
                          <FormDescription>
                            用于访问CAD分析服务的API密钥
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="modelId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>模型ID (可选)</FormLabel>
                          <FormControl>
                            <Input placeholder="cad-analysis-v2" {...field} />
                          </FormControl>
                          <FormDescription>
                            如果API支持多模型，可以指定特定模型ID
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="promptTemplate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>提示词模板 (可选)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="请分析这个CAD文件并提取关键特征和尺寸信息..." 
                              {...field} 
                              rows={4}
                            />
                          </FormControl>
                          <FormDescription>
                            用于指导AI分析CAD文件的提示词模板
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </Card>
              </TabsContent>
              
              <TabsContent value="advanced" className="space-y-4 mt-4">
                <Card className="p-6">
                  <div className="space-y-6">
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
                            onCheckedChange={(checked) => 
                              handleAnalysisTypeChange("standard", checked)
                            }
                          />
                          <label htmlFor="standard" className="cursor-pointer">标准分析</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch 
                            id="detailed"
                            checked={selectedAnalysisTypes.includes("detailed")}
                            onCheckedChange={(checked) => 
                              handleAnalysisTypeChange("detailed", checked)
                            }
                          />
                          <label htmlFor="detailed" className="cursor-pointer">详细分析</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch 
                            id="professional"
                            checked={selectedAnalysisTypes.includes("professional")}
                            onCheckedChange={(checked) => 
                              handleAnalysisTypeChange("professional", checked)
                            }
                          />
                          <label htmlFor="professional" className="cursor-pointer">专业分析</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch 
                            id="measurement"
                            checked={selectedAnalysisTypes.includes("measurement")}
                            onCheckedChange={(checked) => 
                              handleAnalysisTypeChange("measurement", checked)
                            }
                          />
                          <label htmlFor="measurement" className="cursor-pointer">尺寸测量</label>
                        </div>
                      </div>
                      {form.formState.errors.supportedAnalysisTypes && (
                        <p className="text-sm text-red-500 mt-2">
                          {form.formState.errors.supportedAnalysisTypes.message}
                        </p>
                      )}
                    </div>
                    
                    <Separator />
                    
                    <FormField
                      control={form.control}
                      name="maxFileSize"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>最大文件大小 (MB)</FormLabel>
                          <FormControl>
                            <Input type="number" min="1" {...field} />
                          </FormControl>
                          <FormDescription>
                            允许上传的最大文件大小，单位为MB
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="allowedFileTypes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>允许的文件类型</FormLabel>
                          <FormControl>
                            <Input placeholder=".dwg,.dxf,.step,.stp,.iges,.igs" {...field} />
                          </FormControl>
                          <FormDescription>
                            允许上传的文件类型，以逗号分隔的扩展名列表
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Separator />
                    
                    <FormField
                      control={form.control}
                      name="showInGallery"
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
                      name="galleryIconUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>图标URL</FormLabel>
                          <FormControl>
                            <Input placeholder="/images/cad-icon.svg" {...field} />
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
                      name="priority"
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
                {isSubmitting ? "保存中..." : "保存智能体"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </AdminLayout>
  );
} 