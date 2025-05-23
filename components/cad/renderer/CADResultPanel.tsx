"use client";

import React, { useState } from 'react';
import { 
  CADAnalysisResult, 
  Component, 
  Measurement 
} from '@/lib/services/cad-analyzer-service';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Download, 
  Clipboard, 
  Share2, 
  ChevronRight, 
  ChevronDown,
  Info,
  Box,
  Ruler,
  FileText,
  ListFilter,
  Search,
  BarChart,
  LayoutGrid,
  Layers,
  List,
  Zap
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { CADAnalysisResult, AIMultimodalAnalysisResult, DomainSpecificAnalysis } from '@/lib/types/cad';
import { formatFileSize } from '@/lib/utils';

interface CADResultPanelProps {
  result: CADAnalysisResult;
  onExport?: (format: 'pdf' | 'html' | 'json') => void;
  onShare?: () => void;
  isLoading?: boolean;
}

export function CADResultPanel({ 
  result, 
  onExport, 
  onShare,
  isLoading = false 
}: CADResultPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedComponents, setExpandedComponents] = useState<string[]>([]);
  const [selectedTab, setSelectedTab] = useState('summary');
  
  if (isLoading) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center space-y-4 p-6">
        <div className="text-xl font-semibold">分析中...</div>
        <Progress value={45} className="w-2/3 h-2" />
        <p className="text-sm text-gray-500">正在处理CAD文件，这可能需要几分钟时间</p>
      </div>
    );
  }
  
  if (!result) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center p-6">
        <div className="text-xl font-semibold">未找到分析结果</div>
        <p className="text-sm text-gray-500">请选择一个CAD文件进行分析</p>
      </div>
    );
  }
  
  // 处理基础数据
  const entityCount = Object.values(result.entities || {}).reduce((sum, count) => sum + Number(count), 0);
  
  // AI分析结果
  const aiAnalysis = result.aiAnalysis as AIMultimodalAnalysisResult;
  
  // 领域分析
  const domainAnalysis = result.domainAnalysis as DomainSpecificAnalysis;
  
  const handleExport = () => {
    // 导出功能实现
    window.open(`/api/cad/generate-report/html?analysisId=${result.id}`, '_blank');
  };
  
  const handleCopy = () => {
    // 复制到剪贴板
    navigator.clipboard.writeText(result.summary)
      .then(() => alert('摘要已复制到剪贴板'))
      .catch(err => console.error('复制失败:', err));
  };
  
  const handleShare = () => {
    // 创建分享链接
    const shareUrl = `${window.location.origin}/shared/cad-analysis/${result.id}`;
    
    // 复制到剪贴板
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        alert('分享链接已复制到剪贴板');
      })
      .catch(err => {
        console.error('复制失败:', err);
      });
  };
  
  const toggleComponentExpand = (componentId: string) => {
    setExpandedComponents(prev => 
      prev.includes(componentId)
        ? prev.filter(id => id !== componentId)
        : [...prev, componentId]
    );
  };
  
  const getAnalysisTypeColor = () => {
    switch (result.analysisType) {
      case 'detailed': return 'bg-blue-100 text-blue-800';
      case 'professional': return 'bg-purple-100 text-purple-800';
      case 'measurement': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  const formatValue = (key: string, value: any): React.ReactNode => {
    if (key === 'creationDate') {
      return new Date(value).toLocaleString();
    }
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return (
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="item-1">
            <AccordionTrigger className="text-sm">查看详情</AccordionTrigger>
            <AccordionContent>
              <div className="pl-4 space-y-2">
                {Object.entries(value).map(([subKey, subValue]) => (
                  <div key={subKey} className="flex justify-between">
                    <span className="text-sm font-medium capitalize">{subKey}</span>
                    <span className="text-sm">{formatValue(subKey, subValue)}</span>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      );
    }
    
    if (Array.isArray(value)) {
      if (value.length === 3 && value.every(v => typeof v === 'number')) {
        // Likely a 3D coordinate
        return `[${value.map(v => v.toFixed(2)).join(', ')}]`;
      }
      
      if (value.length === 0) {
        return '空数组';
      }
      
      return (
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="item-1">
            <AccordionTrigger className="text-sm">查看数组 ({value.length}项)</AccordionTrigger>
            <AccordionContent>
              <div className="pl-4 space-y-2">
                {value.map((item, index) => (
                  <div key={index} className="flex justify-between">
                    <span className="text-sm font-medium">[{index}]</span>
                    <span className="text-sm">{formatValue(`${key}_${index}`, item)}</span>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      );
    }
    
    if (typeof value === 'number') {
      return value.toFixed(2);
    }
    
    if (typeof value === 'boolean') {
      return value ? '是' : '否';
    }
    
    return String(value);
  };
  
  const filteredComponents = result.components.filter(component => 
    component.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    component.type.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const filteredMeasurements = result.measures.filter(measure => 
    (measure.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    measure.type.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const renderComponentTree = (component: Component, depth = 0) => {
    const isExpanded = expandedComponents.includes(component.id);
    const hasSubComponents = component.subComponents && component.subComponents.length > 0;
    
    return (
      <div key={component.id} className="border-b last:border-b-0">
        <div 
          className={`p-3 hover:bg-gray-50 dark:hover:bg-gray-800 ${depth > 0 ? 'pl-' + (depth * 6) : ''}`}
        >
          <div className="flex items-center mb-1">
            {hasSubComponents && (
              <button
                onClick={() => toggleComponentExpand(component.id)}
                className="mr-2 text-gray-500 hover:text-gray-900"
              >
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
            )}
            <div className="flex-1">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">{component.name}</h4>
                <Badge variant="outline">{component.type}</Badge>
              </div>
              <div className="text-sm text-gray-500 mt-1">
                位置: [{component.position.map(p => p.toFixed(2)).join(', ')}]
                {component.material && <span className="ml-2">材料: {component.material}</span>}
              </div>
            </div>
          </div>
          
          {isExpanded && component.metadata && (
            <div className="mt-2 ml-6 p-2 bg-gray-50 dark:bg-gray-800 rounded text-sm">
              {Object.entries(component.metadata).map(([key, value]) => (
                <div key={key} className="flex justify-between items-center">
                  <span className="font-medium capitalize">{key}:</span>
                  <span>{formatValue(key, value)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {isExpanded && hasSubComponents && (
          <div className="border-l-2 ml-3 pl-2">
            {component.subComponents!.map(subComponent => 
              renderComponentTree(subComponent, depth + 1)
            )}
          </div>
        )}
      </div>
    );
  };
  
  const renderMeasurement = (measure: Measurement) => {
    return (
      <div 
        key={measure.id}
        className="p-3 border rounded-lg mb-2 hover:bg-gray-50 dark:hover:bg-gray-800"
      >
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center">
              <h4 className="font-medium capitalize">
                {measure.description || measure.type}
              </h4>
              {measure.entities && measure.entities.length > 0 && (
                <HoverCard>
                  <HoverCardTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 ml-1">
                      <Info className="h-3 w-3" />
                    </Button>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-60">
                    <p className="text-sm">相关组件:</p>
                    <ul className="text-sm mt-1 list-disc pl-4">
                      {measure.entities.map(entity => (
                        <li key={entity}>{entity}</li>
                      ))}
                    </ul>
                  </HoverCardContent>
                </HoverCard>
              )}
            </div>
            {measure.points && (
              <div className="text-xs text-gray-500 mt-1">
                {measure.points.map((point, idx) => (
                  <div key={idx}>
                    点 {idx+1}: [{point.map(p => p.toFixed(2)).join(', ')}]
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="font-medium text-lg">{measure.value.toFixed(2)}</div>
            <div className="text-xs text-gray-500">{measure.unit}</div>
          </div>
        </div>
      </div>
    );
  };
  
  const getMaterialBreakdown = () => {
    if (
      result.metadata && 
      result.metadata.materialBreakdown && 
      typeof result.metadata.materialBreakdown === 'object'
    ) {
      return Object.entries(result.metadata.materialBreakdown).map(([material, percentage]) => ({
        material,
        percentage: typeof percentage === 'number' ? percentage : 0
      }));
    }
    return [];
  };
  
  const materialBreakdown = getMaterialBreakdown();
  
  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="flex items-center justify-between p-4">
          <h2 className="text-lg font-semibold">CAD分析结果</h2>
          <div className="flex space-x-2">
            {onShare && (
              <Button variant="outline" size="sm" onClick={onShare}>
                <Share2 className="h-4 w-4 mr-1" />
                分享
              </Button>
            )}
            {onExport && (
              <div className="flex space-x-1">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onExport('pdf')}
                >
                  <Download className="h-4 w-4 mr-1" />
                  PDF
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onExport('html')}
                >
                  <FileText className="h-4 w-4 mr-1" />
                  HTML
                </Button>
              </div>
            )}
          </div>
        </div>
        
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="summary">概览</TabsTrigger>
            <TabsTrigger value="structure">结构</TabsTrigger>
            <TabsTrigger value="ai-analysis">AI分析</TabsTrigger>
            <TabsTrigger value="measurements">测量</TabsTrigger>
            <TabsTrigger value="expert">专家</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      <div className="p-4">
        <TabsContent value="summary" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">文件信息</CardTitle>
              <CardDescription>基本文件属性和分析结果摘要</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-muted-foreground">文件名</p>
                  <p className="font-medium truncate">{result.fileName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">文件类型</p>
                  <p className="font-medium">{result.fileType.toUpperCase()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">文件大小</p>
                  <p className="font-medium">{formatFileSize(result.fileSize)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">实体总数</p>
                  <p className="font-medium">{entityCount}</p>
                </div>
              </div>
              
              <Separator className="my-4" />
              
              <div className="mb-4">
                <p className="text-sm font-medium mb-2">尺寸</p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-secondary p-2 rounded-md">
                    <p className="text-xs text-muted-foreground">宽度</p>
                    <p className="font-medium">{result.dimensions.width} {result.dimensions.unit}</p>
                  </div>
                  <div className="bg-secondary p-2 rounded-md">
                    <p className="text-xs text-muted-foreground">高度</p>
                    <p className="font-medium">{result.dimensions.height} {result.dimensions.unit}</p>
                  </div>
                  {result.dimensions.depth !== undefined && (
                    <div className="bg-secondary p-2 rounded-md">
                      <p className="text-xs text-muted-foreground">深度</p>
                      <p className="font-medium">{result.dimensions.depth} {result.dimensions.unit}</p>
                    </div>
                  )}
                </div>
              </div>
              
              {aiAnalysis && (
                <>
                  <Separator className="my-4" />
                  <div>
                    <p className="text-sm font-medium mb-2">AI分析摘要</p>
                    <p className="text-sm text-muted-foreground">
                      {aiAnalysis.summary}
                    </p>
                    
                    {aiAnalysis.manufacturingDifficulty && (
                      <div className="mt-3 flex items-center">
                        <Badge variant={
                          aiAnalysis.manufacturingDifficulty.level === '简单' ? 'success' :
                          aiAnalysis.manufacturingDifficulty.level === '中等' ? 'warning' : 'destructive'
                        }>
                          制造难度: {aiAnalysis.manufacturingDifficulty.level}
                        </Badge>
                        <p className="text-xs text-muted-foreground ml-2">
                          {aiAnalysis.manufacturingDifficulty.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {/* 实体统计卡片 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-md">实体统计</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(result.entities || {}).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center">
                      <div className="flex items-center">
                        <span className="text-sm">{key}</span>
                      </div>
                      <span className="text-sm font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            {/* 图层卡片 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-md">图层信息</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                  {result.layers && result.layers.length > 0 ? (
                    result.layers.map((layer, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="text-sm">{layer.name || `图层 ${index + 1}`}</span>
                        <Badge variant="outline" className="text-xs">
                          {layer.entityCount || 0} 个实体
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">无图层数据</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="structure" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>结构分析</CardTitle>
              <CardDescription>CAD模型的组件和结构详情</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="components">
                  <AccordionTrigger>
                    <div className="flex items-center">
                      <LayoutGrid className="h-4 w-4 mr-2" />
                      <span>组件</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    {aiAnalysis && aiAnalysis.components && aiAnalysis.components.length > 0 ? (
                      <div className="space-y-2">
                        {aiAnalysis.components.map((component, idx) => (
                          <div key={idx} className="border rounded-md p-3">
                            <div className="flex justify-between items-center">
                              <h4 className="font-medium">{component.name}</h4>
                              <Badge>{component.count}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {component.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">未检测到组件信息</p>
                    )}
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="hierarchy">
                  <AccordionTrigger>
                    <div className="flex items-center">
                      <Layers className="h-4 w-4 mr-2" />
                      <span>图层结构</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    {result.layers && result.layers.length > 0 ? (
                      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                        {result.layers.map((layer, idx) => (
                          <div key={idx} className="border rounded-md p-2">
                            <p className="font-medium">{layer.name}</p>
                            <div className="flex justify-between mt-1">
                              <span className="text-xs text-muted-foreground">
                                {layer.entityCount || 0} 个实体
                              </span>
                              {layer.color && (
                                <div 
                                  className="w-4 h-4 rounded-full"
                                  style={{ backgroundColor: layer.color }}
                                  title={layer.color}
                                />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">无图层数据</p>
                    )}
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="materials">
                  <AccordionTrigger>
                    <div className="flex items-center">
                      <List className="h-4 w-4 mr-2" />
                      <span>材料估算</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    {aiAnalysis && aiAnalysis.materialEstimation && aiAnalysis.materialEstimation.length > 0 ? (
                      <div className="space-y-1">
                        {aiAnalysis.materialEstimation.map((material, idx) => (
                          <div key={idx} className="flex justify-between py-1 border-b last:border-b-0">
                            <span>{material.material}</span>
                            <span className="font-medium">{material.amount} {material.unit}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">无材料估算数据</p>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
          
          {result.bimData && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>BIM数据</CardTitle>
                <CardDescription>建筑信息模型(BIM)数据</CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="spaces">
                    <AccordionTrigger>空间信息</AccordionTrigger>
                    <AccordionContent>
                      {result.bimData.spaces && result.bimData.spaces.length > 0 ? (
                        <div className="space-y-2">
                          {result.bimData.spaces.map((space, idx) => (
                            <div key={idx} className="border rounded-md p-2">
                              <p className="font-medium">{space.name}</p>
                              <div className="flex justify-between text-sm">
                                <span>面积: {space.area} m²</span>
                                <span>体积: {space.volume} m³</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">无空间数据</p>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                  
                  <AccordionItem value="stories">
                    <AccordionTrigger>楼层信息</AccordionTrigger>
                    <AccordionContent>
                      {result.bimData.stories && result.bimData.stories.length > 0 ? (
                        <div className="space-y-2">
                          {result.bimData.stories.map((story, idx) => (
                            <div key={idx} className="border rounded-md p-2">
                              <p className="font-medium">{story.name}</p>
                              <p className="text-sm">标高: {story.elevation} m</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">无楼层数据</p>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                  
                  <AccordionItem value="elements">
                    <AccordionTrigger>构件信息</AccordionTrigger>
                    <AccordionContent>
                      {result.bimData.elements && result.bimData.elements.length > 0 ? (
                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                          {result.bimData.elements.map((element, idx) => (
                            <div key={idx} className="border rounded-md p-2">
                              <p className="font-medium">{element.type}</p>
                              <p className="text-sm">材料: {element.material}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">无构件数据</p>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="ai-analysis" className="mt-0">
          {aiAnalysis ? (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>AI分析结果</CardTitle>
                  <CardDescription>基于模型智能分析的结果</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <h3 className="text-lg font-medium mb-2">总结</h3>
                    <p className="text-muted-foreground">{aiAnalysis.summary}</p>
                    
                    {aiAnalysis.observations && aiAnalysis.observations.length > 0 && (
                      <>
                        <h3 className="text-lg font-medium mt-4 mb-2">关键观察</h3>
                        <ul className="space-y-1 list-disc pl-5">
                          {aiAnalysis.observations.map((observation, idx) => (
                            <li key={idx}>{observation}</li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              {aiAnalysis.issues && aiAnalysis.issues.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>发现的问题</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {aiAnalysis.issues.map((issue, idx) => (
                        <div key={idx} className="border rounded-md p-3">
                          <div className="flex justify-between items-center">
                            <h4 className="font-medium">{issue.title}</h4>
                            <Badge variant={
                              issue.severity === '严重' ? 'destructive' : 
                              issue.severity === '中等' ? 'warning' : 'secondary'
                            }>
                              {issue.severity}
                            </Badge>
                          </div>
                          <p className="text-sm mt-2">{issue.description}</p>
                          {issue.solution && (
                            <div className="mt-2 bg-secondary p-2 rounded-md">
                              <p className="text-xs font-medium">建议解决方案</p>
                              <p className="text-sm">{issue.solution}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {aiAnalysis.recommendations && aiAnalysis.recommendations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>改进建议</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {aiAnalysis.recommendations.map((recommendation, idx) => (
                        <div key={idx} className="bg-secondary p-3 rounded-md">
                          <div className="flex">
                            <Zap className="h-5 w-5 text-primary mr-2 flex-shrink-0" />
                            <p className="text-sm">{recommendation}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {aiAnalysis.manufacturingDifficulty && (
                <Card>
                  <CardHeader>
                    <CardTitle>制造评估</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center mb-3">
                      <h3 className="font-medium mr-2">制造难度:</h3>
                      <Badge className="uppercase" variant={
                        aiAnalysis.manufacturingDifficulty.level === '简单' ? 'success' :
                        aiAnalysis.manufacturingDifficulty.level === '中等' ? 'warning' : 'destructive'
                      }>
                        {aiAnalysis.manufacturingDifficulty.level}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {aiAnalysis.manufacturingDifficulty.explanation}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-6 bg-background border rounded-lg">
              <Info className="h-10 w-10 text-muted-foreground mb-3" />
              <h3 className="text-lg font-medium">未找到AI分析数据</h3>
              <p className="text-sm text-muted-foreground mt-1">
                AI增强分析不可用或尚未完成
              </p>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="measurements" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>尺寸与测量</CardTitle>
              <CardDescription>模型尺寸和主要测量数据</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-medium text-lg mb-2">基本尺寸</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="border rounded-md p-3">
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-muted-foreground">宽度</p>
                      <Ruler className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="text-lg font-medium mt-1">{result.dimensions.width} {result.dimensions.unit}</p>
                  </div>
                  <div className="border rounded-md p-3">
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-muted-foreground">高度</p>
                      <Ruler className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="text-lg font-medium mt-1">{result.dimensions.height} {result.dimensions.unit}</p>
                  </div>
                  {result.dimensions.depth !== undefined && (
                    <div className="border rounded-md p-3">
                      <div className="flex justify-between items-center">
                        <p className="text-sm text-muted-foreground">深度</p>
                        <Ruler className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <p className="text-lg font-medium mt-1">{result.dimensions.depth} {result.dimensions.unit}</p>
                    </div>
                  )}
                </div>
              </div>
              
              {result.measurements && result.measurements.length > 0 ? (
                <div>
                  <h3 className="font-medium text-lg mb-2">详细测量</h3>
                  <div className="border rounded-md overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-secondary text-secondary-foreground">
                        <tr>
                          <th className="px-4 py-2 text-left text-sm font-medium">名称</th>
                          <th className="px-4 py-2 text-left text-sm font-medium">值</th>
                          <th className="px-4 py-2 text-left text-sm font-medium">单位</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.measurements.map((measurement, idx) => (
                          <tr key={idx} className="border-t">
                            <td className="px-4 py-2 text-sm">{measurement.name}</td>
                            <td className="px-4 py-2 text-sm font-medium">{measurement.value}</td>
                            <td className="px-4 py-2 text-sm">{measurement.unit || result.dimensions.unit}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 border rounded-md bg-secondary/10">
                  <p className="text-muted-foreground">无详细测量数据</p>
                </div>
              )}
              
              {result.volume !== undefined && (
                <div className="border rounded-md p-4">
                  <h3 className="font-medium text-md mb-1">体积估算</h3>
                  <div className="flex items-center">
                    <BarChart className="h-5 w-5 text-primary mr-2" />
                    <p className="text-lg font-medium">
                      {result.volume} {result.dimensions.unit === 'mm' ? 'mm³' : 'm³'}
                    </p>
                  </div>
                  {result.estimatedWeight !== undefined && (
                    <div className="mt-2 pt-2 border-t">
                      <p className="text-sm text-muted-foreground">估计重量</p>
                      <p className="font-medium">{result.estimatedWeight.value} {result.estimatedWeight.unit}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="expert" className="mt-0">
          {domainAnalysis ? (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{getDomainDisplayName(domainAnalysis.domain)}专业分析</CardTitle>
                  <CardDescription>
                    专业领域分析结果和专家建议
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {domainAnalysis.insights && domainAnalysis.insights.length > 0 && (
                      <div>
                        <h3 className="text-md font-medium mb-3">专业见解</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {domainAnalysis.insights.map((insight, idx) => (
                            <div key={idx} className="border rounded-md p-3">
                              <h4 className="font-medium">{insight.title}</h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                {insight.description}
                              </p>
                              <div className="mt-2">
                                <div className="flex justify-between items-center text-xs text-muted-foreground mb-1">
                                  <span>置信度</span>
                                  <span>{Math.round(insight.confidence * 100)}%</span>
                                </div>
                                <div className="w-full bg-secondary rounded-full h-1.5">
                                  <div 
                                    className="bg-primary h-1.5 rounded-full" 
                                    style={{ width: `${insight.confidence * 100}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {domainAnalysis.standards && domainAnalysis.standards.length > 0 && (
                      <div>
                        <h3 className="text-md font-medium mb-3">标准合规性</h3>
                        <div className="border rounded-md overflow-hidden">
                          <table className="w-full">
                            <thead className="bg-secondary text-secondary-foreground">
                              <tr>
                                <th className="px-4 py-2 text-left text-sm font-medium">标准</th>
                                <th className="px-4 py-2 text-left text-sm font-medium">合规状态</th>
                                <th className="px-4 py-2 text-left text-sm font-medium">详情</th>
                              </tr>
                            </thead>
                            <tbody>
                              {domainAnalysis.standards.map((standard, idx) => (
                                <tr key={idx} className="border-t">
                                  <td className="px-4 py-2 text-sm">{standard.name}</td>
                                  <td className="px-4 py-2">
                                    <Badge variant={
                                      standard.compliance === 'compliant' ? 'success' :
                                      standard.compliance === 'warning' ? 'warning' : 'destructive'
                                    }>
                                      {standard.compliance === 'compliant' ? '符合' :
                                       standard.compliance === 'warning' ? '警告' : '不符合'}
                                    </Badge>
                                  </td>
                                  <td className="px-4 py-2 text-sm">{standard.details}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                    
                    {domainAnalysis.metrics && Object.keys(domainAnalysis.metrics).length > 0 && (
                      <div>
                        <h3 className="text-md font-medium mb-3">关键指标</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {Object.entries(domainAnalysis.metrics).map(([key, value], idx) => (
                            <div key={idx} className="border rounded-md p-3">
                              <p className="text-xs text-muted-foreground">{key}</p>
                              <p className="text-lg font-medium mt-1">{value}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              {domainAnalysis.expertRecommendations && domainAnalysis.expertRecommendations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>专家建议</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {domainAnalysis.expertRecommendations.map((recommendation, idx) => (
                        <div key={idx} className="bg-secondary p-3 rounded-md">
                          <div className="flex">
                            <Info className="h-5 w-5 text-primary mr-2 flex-shrink-0" />
                            <p className="text-sm">{recommendation}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-6 bg-background border rounded-lg">
              <Info className="h-10 w-10 text-muted-foreground mb-3" />
              <h3 className="text-lg font-medium">未找到专业分析数据</h3>
              <p className="text-sm text-muted-foreground mt-1">
                专业领域分析不可用或尚未完成
              </p>
            </div>
          )}
        </TabsContent>
      </div>
    </div>
  );
}

/**
 * 获取领域显示名称
 */
function getDomainDisplayName(domain: string): string {
  const domainMap: Record<string, string> = {
    'mechanical': '机械工程',
    'architectural': '建筑工程',
    'electrical': '电气工程',
    'plumbing': '管道工程'
  };
  
  return domainMap[domain as keyof typeof domainMap] || domain;
} 