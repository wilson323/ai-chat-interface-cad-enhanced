"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { FastGPTAgent } from '@/lib/agents/fastgpt-agent';
import { AgentConfig, AgentType } from '@/lib/agents/base-agent';
import { 
  MessageSquare, 
  FileSpreadsheet, 
  Image,
  Info,
  ChevronRight
} from 'lucide-react';
import { useAgentStore } from '@/lib/stores/agent-store';

const AgentTypeIcons = {
  'fastgpt': <MessageSquare className="h-5 w-5" />,
  'cad': <FileSpreadsheet className="h-5 w-5" />,
  'poster': <Image className="h-5 w-5" />
};

export function AgentSelector() {
  const { agents, activeAgent, setActiveAgent } = useAgentStore();
  const [selectedType, setSelectedType] = useState<AgentType | 'all'>('all');
  const [filteredAgents, setFilteredAgents] = useState<AgentConfig[]>([]);
  const router = useRouter();
  
  // 根据选择的类型过滤智能体
  useEffect(() => {
    if (selectedType === 'all') {
      setFilteredAgents(agents);
    } else {
      setFilteredAgents(agents.filter(agent => agent.type === selectedType));
    }
  }, [selectedType, agents]);
  
  // 选择智能体
  const handleSelectAgent = (agent: AgentConfig) => {
    setActiveAgent(agent);
    
    // 根据智能体类型跳转到相应页面
    switch (agent.type) {
      case 'cad':
        router.push('/cad-analyzer');
        break;
      case 'poster':
        router.push('/poster-generator');
        break;
      case 'fastgpt':
      default:
        router.push('/chat');
        break;
    }
  };
  
  return (
    <div className="mb-6 p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">智能体</h2>
        
        <Select 
          value={selectedType} 
          onValueChange={(value) => setSelectedType(value as AgentType | 'all')}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="所有类型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">所有类型</SelectItem>
            <SelectItem value="fastgpt">对话智能体</SelectItem>
            <SelectItem value="cad">CAD智能体</SelectItem>
            <SelectItem value="poster">海报智能体</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <ScrollArea className="h-[600px] pr-4">
        <div className="space-y-3">
          {filteredAgents.map((agent) => (
            <Card 
              key={agent.id} 
              className={`cursor-pointer transition-all hover:shadow-md ${
                activeAgent?.id === agent.id ? 'border-blue-500 shadow-sm' : ''
              }`}
              onClick={() => handleSelectAgent(agent)}
            >
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Avatar className="h-10 w-10 mr-4">
                    <div className="flex items-center justify-center h-full bg-gray-100 text-gray-600">
                      {AgentTypeIcons[agent.type] || <Info className="h-5 w-5" />}
                    </div>
                  </Avatar>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">{agent.name}</h3>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-500 line-clamp-2">{agent.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {filteredAgents.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              没有找到匹配的智能体
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
} 