import { FastGPTAgent, FastGPTAgentConfig } from '../agents/fastgpt-agent';
import { db } from '../database';
import { AgentType } from '../agents/base-agent';
import { BehaviorSubject } from 'rxjs';

export class FastGPTManager {
  private agents: Map<string, FastGPTAgent> = new Map();
  private agentsSubject = new BehaviorSubject<FastGPTAgent[]>([]);
  
  constructor() {
    this.loadAgents().catch(error => {
      console.error('加载FastGPT智能体失败:', error);
    });
  }
  
  async loadAgents() {
    try {
      const agentConfigs = await db.agents.findByType('fastgpt');
      
      // 清空现有智能体
      this.agents.clear();
      
      // 加载新智能体
      for (const config of agentConfigs) {
        const agent = new FastGPTAgent(config as FastGPTAgentConfig);
        this.agents.set(config.id, agent);
      }
      
      // 通知订阅者
      this.notifySubscribers();
    } catch (error) {
      console.error('加载FastGPT智能体出错:', error);
      throw error;
    }
  }
  
  getAgent(id: string): FastGPTAgent | undefined {
    return this.agents.get(id);
  }
  
  getAllAgents(): FastGPTAgent[] {
    return Array.from(this.agents.values());
  }
  
  getAgentsObservable() {
    return this.agentsSubject.asObservable();
  }
  
  private notifySubscribers() {
    this.agentsSubject.next(this.getAllAgents());
  }
  
  async addAgent(config: Omit<FastGPTAgentConfig, 'id' | 'type'>) {
    try {
      const newConfig = {
        ...config,
        id: Date.now().toString(),
        type: 'fastgpt' as AgentType,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await db.agents.create(newConfig);
      
      const agent = new FastGPTAgent(newConfig as FastGPTAgentConfig);
      this.agents.set(newConfig.id, agent);
      
      this.notifySubscribers();
      return newConfig.id;
    } catch (error) {
      console.error('添加FastGPT智能体出错:', error);
      throw error;
    }
  }
  
  async updateAgent(id: string, config: Partial<Omit<FastGPTAgentConfig, 'id' | 'type'>>) {
    try {
      const existingAgent = this.agents.get(id);
      if (!existingAgent) {
        throw new Error(`未找到ID为${id}的智能体`);
      }
      
      const updatedConfig = {
        ...existingAgent.getConfig(),
        ...config,
        updatedAt: new Date()
      };
      
      await db.agents.update(id, config);
      
      const agent = new FastGPTAgent(updatedConfig as FastGPTAgentConfig);
      this.agents.set(id, agent);
      
      this.notifySubscribers();
    } catch (error) {
      console.error('更新FastGPT智能体出错:', error);
      throw error;
    }
  }
  
  async deleteAgent(id: string) {
    try {
      if (!this.agents.has(id)) {
        throw new Error(`未找到ID为${id}的智能体`);
      }
      
      await db.agents.delete(id);
      
      this.agents.delete(id);
      this.notifySubscribers();
    } catch (error) {
      console.error('删除FastGPT智能体出错:', error);
      throw error;
    }
  }
} 