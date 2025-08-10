"use client";

import { useState, useEffect } from 'react';
import { CADViewer3D } from './renderer/CADViewer3D';
import { CADResultPanel } from './renderer/CADResultPanel';
import { useCADAnalyzerService } from '@/hooks/useCADAnalyzerService';
import { CADAnalysisResult } from '@/lib/types/cad';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Loader2, 
  Upload, 
  FileText, 
  History,
  Download,
  Share2,
  Info,
  Settings
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';

export function CADAnalyzerContainer() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<CADAnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState('upload');
  const [analysisType, setAnalysisType] = useState('standard');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const service = useCADAnalyzerService();
  const router = useRouter();
  
  const fileFormats = {
    "dwg": "AutoCAD绘图",
    "dxf": "AutoCAD交换格式",
    "step": "STEP 3D格式",
    "stp": "STEP 3D格式",
    "iges": "IGES 3D格式",
    "igs": "IGES 3D格式",
    "stl": "STL格式",
    "obj": "OBJ格式",
  };
  
  const getFileFormat = (filename: string) => {
    const extension = filename.split('.').pop()?.toLowerCase() || '';
    return fileFormats[extension as keyof typeof fileFormats] || '未知格式';
  };
  
  useEffect(() => {
    // 从服务中获取进度信息
    if (isUploading) {
      setUploadProgress(service.progress.upload ?? 0);
    } else if (isAnalyzing) {
      setAnalysisProgress(service.progress.analysis ?? 0);
    }
  }, [service.progress, isUploading, isAnalyzing]);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  };
  
  const handleUploadAndAnalyze = async () => {
    if (!file) return;
    
    try {
      setIsUploading(true);
      // 模拟用户ID
      const userId = 'user123';
      
      // 上传文件，使用进度跟踪
      const uploadedFile = await service.analyzeFile(file, 'standard', {})
      
      setIsUploading(false);
      setIsAnalyzing(true);
      
      // 分析文件 - 传递分析类型和其他选项
      const analysisResult = await service.analyzeFile(
        uploadedFile.id, 
        userId, 
        undefined, 
        { 
          analysisType: analysisType as any,
          includeThumbnail: true
        }
      );
      
      const normalized: any = {
        ...analysisResult,
        fileName: file.name,
        fileType: file.name.split('.').pop()?.toLowerCase() || '',
        fileSize: file.size,
        dimensions: (analysisResult as any).dimensions ?? { width: 0, height: 0, unit: 'mm' },
        layers: (analysisResult as any).layers ?? [],
        components: (analysisResult as any).components ?? [],
        measurements: (analysisResult as any).measures ?? [],
      }
      setResult(normalized as CADAnalysisResult);
      setActiveTab('result');
    } catch (error) {
      console.error('上传和分析文件出错:', error);
      // 实际项目中应显示错误消息
    } finally {
      setIsUploading(false);
      setIsAnalyzing(false);
      service.resetProgress();
    }
  };
  
  const handleViewHistory = () => {
    router.push('/cad-analyzer/history');
  };
  
  const handleGenerateReport = () => {
    if (!result) return;
    
    // 使用服务生成报告
    service.downloadReport(result, 'html')
      .then(reportUrl => {
        window.open(reportUrl, '_blank');
      })
      .catch((error: any) => {
        console.error('生成报告出错:', error);
      });
  };
  
  const handleShare = () => {
    if (!result) return;
    
    // 使用服务分享分析结果
    // TODO: 接入实际分享API
    service.shareAnalysis(result.id)
      .then(shareUrl => {
        navigator.clipboard.writeText(`${window.location.origin}${shareUrl}`)
          .then(() => {
            alert('分享链接已复制到剪贴板');
          })
          .catch(err => {
            console.error('复制失败:', err);
          });
      })
      .catch((error: any) => {
        console.error('分享分析结果出错:', error);
      });
  };
  
  return (
    <div className="container mx-auto p-4">
      <Card className="mb-4 shadow-lg">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>CAD文件分析</CardTitle>
              <CardDescription>
                上传CAD文件，获取智能解析和3D可视化
              </CardDescription>
            </div>
            <Button variant="outline" onClick={handleViewHistory}>
              <History className="mr-2 h-4 w-4" />
              历史记录
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4 grid w-full grid-cols-2">
              <TabsTrigger value="upload">上传文件</TabsTrigger>
              <TabsTrigger value="result" disabled={!result}>分析结果</TabsTrigger>
            </TabsList>
            
            <TabsContent value="upload">
              <div className="flex flex-col items-center gap-4">
                <div 
                  className="border-2 border-dashed rounded-lg p-8 w-full text-center transition-colors hover:bg-gray-50 cursor-pointer"
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById('cad-file-input')?.click()}
                >
                  <input
                    type="file"
                    accept=".dwg,.dxf,.step,.stp,.iges,.igs,.stl,.obj"
                    onChange={handleFileChange}
                    className="hidden"
                    id="cad-file-input"
                  />
                  <Upload className="h-12 w-12 text-gray-400 mb-2 mx-auto" />
                  <p className="text-lg font-medium">点击或拖放文件到此处</p>
                  <p className="text-sm text-gray-500">
                    支持DWG, DXF, STEP, IGES, STL, OBJ等格式
                  </p>
                </div>
                
                {file && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg w-full">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-blue-500" />
                      <span className="font-medium truncate max-w-md">{file.name}</span>
                      <Badge variant="outline">{getFileFormat(file.name)}</Badge>
                      <span className="text-sm text-gray-500 ml-auto">
                        ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                    
                    {(isUploading || isAnalyzing) && (
                      <div className="mt-4">
                        <div className="flex justify-between text-sm mb-1">
                          <span>{isUploading ? '上传进度' : '分析进度'}</span>
                          <span>{isUploading ? uploadProgress : analysisProgress}%</span>
                        </div>
                        <Progress 
                          value={isUploading ? uploadProgress : analysisProgress} 
                          className="h-2"
                        />
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex flex-col sm:flex-row gap-4 mt-4 w-full">
                  <div className="w-full sm:w-1/3">
                    <Select
                      value={analysisType}
                      onValueChange={setAnalysisType}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="分析类型" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">标准分析</SelectItem>
                        <SelectItem value="detailed">详细分析</SelectItem>
                        <SelectItem value="professional">专业分析</SelectItem>
                        <SelectItem value="measurement">尺寸测量</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="w-full sm:w-2/3">
                    <Button
                      className="w-full"
                      onClick={handleUploadAndAnalyze}
                      disabled={!file || isUploading || isAnalyzing}
                    >
                      {(isUploading || isAnalyzing) && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {isUploading ? '上传中...' : isAnalyzing ? '分析中...' : '上传并分析'}
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            {result && (
              <TabsContent value="result">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium">3D预览</h3>
                      <div className="flex space-x-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="sm" variant="outline">
                                <Settings className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>显示设置</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                    <div className="border rounded-lg h-96 bg-gray-50">
                      <CADViewer3D result={result} />
                    </div>
                  </div>
                  
                  <div className="flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium">分析结果</h3>
                      <div className="flex space-x-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="sm" variant="outline" onClick={handleGenerateReport}>
                                <Download className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>生成报告</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="sm" variant="outline" onClick={handleShare}>
                                <Share2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>分享结果</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                    <CADResultPanel result={result} />
                  </div>
                </div>
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
} 