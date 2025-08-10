import { create } from 'zustand';
import { AgentConfig, AgentType } from '../agents/base-agent';
import { db } from '../database';

// 默认智能体配置
const DEFAULT_AGENTS: AgentConfig[] = [
  {
    id: 'fastgpt-default',
    name: 'FastGPT对话助手',
    description: '基于大语言模型的智能对话助手，可回答各种问题。',
    type: 'fastgpt',
    icon: 'chat',
    systemPrompt: '你是一个有用的AI助手，请尽可能提供有帮助的回答。',
    createdAt: new Date()
  },
  {
    id: 'cad-analyzer',
    name: 'CAD解读智能体',
    description: '分析CAD文件，提取关键信息并生成3D可视化视图。',
    type: 'cad',
    icon: 'file',
    createdAt: new Date()
  },
  {
    id: 'poster-generator',
    name: '海报生成智能体',
    description: '根据描述自动生成精美海报，支持多种风格和自定义。',
    type: 'poster',
    icon: 'image',
    createdAt: new Date()
  }
];

interface AgentStore {
  agents: AgentConfig[];
  activeAgent: AgentConfig | null;
  isLoading: boolean;
  error: string | null;
  
  // 加载所有智能体
  loadAgents: () => Promise<void>;
  
  // 设置活动智能体
  setActiveAgent: (agent: AgentConfig) => void;
  
  // 添加新智能体
  addAgent: (agent: Omit<AgentConfig, 'id' | 'createdAt'>) => Promise<string>;
  createAgent: (agent: Omit<AgentConfig, 'id' | 'createdAt'>) => Promise<string>;
  
  // 更新智能体
  updateAgent: (id: string, updates: Partial<AgentConfig>) => Promise<void>;
  
  // 删除智能体
  deleteAgent: (id: string) => Promise<void>;
  
  // 按类型获取智能体
  getAgentsByType: (type: AgentType) => AgentConfig[];
  getAgentById: (id: string) => Promise<AgentConfig | null>;
}

export const useAgentStore = create<AgentStore>((set, get) => ({
  agents: [],
  activeAgent: null,
  isLoading: false,
  error: null,
  
  loadAgents: async () => {
    try {
      set({ isLoading: true, error: null });
      
      // 从数据库加载所有智能体
      const agents = await db.agents.findAll();
      
      // 如果没有智能体，使用默认值初始化
      if (agents.length === 0) {
        for (const agent of DEFAULT_AGENTS) {
          await db.agents.create(agent);
        }
        set({ agents: DEFAULT_AGENTS });
      } else {
        set({ agents });
      }
      
      // 设置默认活动智能体
      if (get().activeAgent === null && agents.length > 0) {
        set({ activeAgent: agents[0] });
      }
    } catch (error) {
      console.error('加载智能体失败:', error);
      set({ error: '加载智能体失败' });
    } finally {
      set({ isLoading: false });
    }
  },
  
  setActiveAgent: (agent) => {
    set({ activeAgent: agent });
    // 可以在这里保存用户选择到localStorage
    localStorage.setItem('lastActiveAgentId', agent.id);
  },
  
  addAgent: async (agentData) => {
    try {
      set({ isLoading: true, error: null });
      
      const newAgent: AgentConfig = {
        ...agentData,
        id: `${agentData.type}-${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await db.agents.create(newAgent);
      
      set(state => ({
        agents: [...state.agents, newAgent]
      }));
      
      return newAgent.id;
    } catch (error) {
      console.error('添加智能体失败:', error);
      set({ error: '添加智能体失败' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  createAgent: async (agentData) => {
    return get().addAgent(agentData);
  },
  
  updateAgent: async (id, updates) => {
    try {
      set({ isLoading: true, error: null });
      
      // 更新数据库
      await db.agents.update(id, { ...updates, updatedAt: new Date() });
      
      // 更新状态
      set(state => ({
        agents: state.agents.map(agent => 
          agent.id === id ? { ...agent, ...updates, updatedAt: new Date() } : agent
        ),
        // 如果当前活动智能体被更新，也更新它
        activeAgent: state.activeAgent?.id === id 
          ? { ...state.activeAgent, ...updates, updatedAt: new Date() } 
          : state.activeAgent
      }));
    } catch (error) {
      console.error('更新智能体失败:', error);
      set({ error: '更新智能体失败' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  
  deleteAgent: async (id) => {
    try {
      set({ isLoading: true, error: null });
      
      // 从数据库删除
      await db.agents.delete(id);
      
      // 更新状态
      set(state => ({
        agents: state.agents.filter(agent => agent.id !== id),
        // 如果删除的是当前活动智能体，重置为null或第一个可用智能体
        activeAgent: state.activeAgent?.id === id 
          ? (state.agents.length > 1 ? state.agents.find(a => a.id !== id) || null : null) 
          : state.activeAgent
      }));
    } catch (error) {
      console.error('删除智能体失败:', error);
      set({ error: '删除智能体失败' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  
  getAgentsByType: (type) => {
    return get().agents.filter(agent => agent.type === type);
  },
  getAgentById: async (id: string) => {
    const agent = get().agents.find(a => a.id === id)
    if (agent) return agent
    try {
      const fromDb = await db.agents.findById(id)
      return fromDb || null
    } catch {
      return null
    }
  }
})); 