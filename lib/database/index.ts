// 根据项目实际情况，这里可能使用Supabase, MongoDB, Firebase等不同的数据库
// 这里提供一个抽象层，可以根据实际使用的数据库进行替换实现

import { AgentConfig, AgentType } from '../agents/base-agent';
import { CADAnalysisResult,CADFile } from '../services/cad-analyzer-service';

// 辅助类型（基础占位，不绑定具体业务字段）
interface PosterRecord { id: string; userId: string; [key: string]: unknown }
interface SessionRecord { id: string; userId: string; [key: string]: unknown }
interface VisitRecord { ip: string; agentId: string; timestamp: Date; [key: string]: unknown }

// 模拟数据存储
const inMemoryDB = {
  agents: [] as AgentConfig[],
  cadFiles: [] as CADFile[],
  cadAnalysis: [] as CADAnalysisResult[],
  posters: [] as PosterRecord[],
  sessions: [] as SessionRecord[],
  analytics: [] as VisitRecord[],
};

// 统一数据库访问层
// 实际项目中应该替换为真实数据库实现
export const db = {
  // 智能体配置表
  agents: {
    async findAll(): Promise<AgentConfig[]> {
      return [...inMemoryDB.agents];
    },
    
    async findById(id: string): Promise<AgentConfig | null> {
      const agent = inMemoryDB.agents.find(a => a.id === id);
      return agent ? { ...agent } : null;
    },
    
    async findByType(type: AgentType): Promise<AgentConfig[]> {
      return inMemoryDB.agents.filter(a => a.type === type).map(a => ({ ...a }));
    },
    
    async create(data: AgentConfig): Promise<void> {
      inMemoryDB.agents.push({ ...data });
    },
    
    async update(id: string, data: Partial<AgentConfig>): Promise<void> {
      const index = inMemoryDB.agents.findIndex(a => a.id === id);
      if (index >= 0) {
        inMemoryDB.agents[index] = { ...inMemoryDB.agents[index], ...data };
      }
    },
    
    async delete(id: string): Promise<void> {
      const index = inMemoryDB.agents.findIndex(a => a.id === id);
      if (index >= 0) {
        inMemoryDB.agents.splice(index, 1);
      }
    }
  },
  
  // CAD文件表
  cadFiles: {
    async findAll(): Promise<CADFile[]> {
      return [...inMemoryDB.cadFiles];
    },
    
    async findById(id: string): Promise<CADFile | null> {
      const file = inMemoryDB.cadFiles.find(f => f.id === id);
      return file ? { ...file } : null;
    },
    
    async create(data: CADFile): Promise<void> {
      inMemoryDB.cadFiles.push({ ...data });
    },
    
    async update(id: string, data: Partial<CADFile>): Promise<void> {
      const index = inMemoryDB.cadFiles.findIndex(f => f.id === id);
      if (index >= 0) {
        inMemoryDB.cadFiles[index] = { ...inMemoryDB.cadFiles[index], ...data };
      }
    },
    
    async delete(id: string): Promise<void> {
      const index = inMemoryDB.cadFiles.findIndex(f => f.id === id);
      if (index >= 0) {
        inMemoryDB.cadFiles.splice(index, 1);
      }
    }
  },
  
  // CAD分析历史
  cadAnalysis: {
    async findAll(): Promise<CADAnalysisResult[]> {
      return [...inMemoryDB.cadAnalysis];
    },
    
    async findById(id: string): Promise<CADAnalysisResult | null> {
      const analysis = inMemoryDB.cadAnalysis.find(a => a.id === id);
      return analysis ? { ...analysis } : null;
    },
    
    async findByUserId(userId: string): Promise<CADAnalysisResult[]> {
      return inMemoryDB.cadAnalysis
        .filter(a => a.userId === userId)
        .map(a => ({ ...a }));
    },
    
    async create(data: CADAnalysisResult): Promise<void> {
      inMemoryDB.cadAnalysis.push({ ...data });
    },
    
    async update(id: string, data: Partial<CADAnalysisResult>): Promise<void> {
      const index = inMemoryDB.cadAnalysis.findIndex(a => a.id === id);
      if (index >= 0) {
        inMemoryDB.cadAnalysis[index] = { ...inMemoryDB.cadAnalysis[index], ...data };
      }
    },
    
    async delete(id: string): Promise<void> {
      const index = inMemoryDB.cadAnalysis.findIndex(a => a.id === id);
      if (index >= 0) {
        inMemoryDB.cadAnalysis.splice(index, 1);
      }
    }
  },
  
  // 海报生成历史
  posters: {
    // 类似于上面的实现
    async findByUserId(userId: string): Promise<PosterRecord[]> {
      return inMemoryDB.posters
        .filter(p => p.userId === userId)
        .map(p => ({ ...p }));
    },
    
    async findById(id: string): Promise<PosterRecord | null> {
      const poster = inMemoryDB.posters.find(p => p.id === id);
      return poster ? { ...poster } : null;
    },
    
    async create(data: PosterRecord): Promise<void> {
      inMemoryDB.posters.push({ ...data });
    },
    
    async delete(id: string): Promise<void> {
      const index = inMemoryDB.posters.findIndex(p => p.id === id);
      if (index >= 0) {
        inMemoryDB.posters.splice(index, 1);
      }
    }
  },
  
  // 用户会话历史
  sessions: {
    // 会话历史实现
    async create(data: SessionRecord): Promise<void> {
      inMemoryDB.sessions.push({ ...data });
    },
    
    async findByUserId(userId: string): Promise<SessionRecord[]> {
      return inMemoryDB.sessions
        .filter(s => s.userId === userId)
        .map(s => ({ ...s }));
    }
  },
  
  // 用户访问统计
  analytics: {
    // 记录访问IP和使用情况
    async recordVisit(data: VisitRecord): Promise<void> {
      inMemoryDB.analytics.push({ ...data });
    },
    
    async getVisitsByTimeRange(startTime: Date, endTime: Date): Promise<VisitRecord[]> {
      return inMemoryDB.analytics
        .filter(a => a.timestamp >= startTime && a.timestamp <= endTime)
        .map(a => ({ ...a }));
    },
    
    async getVisitsByAgentId(agentId: string): Promise<VisitRecord[]> {
      return inMemoryDB.analytics
        .filter(a => a.agentId === agentId)
        .map(a => ({ ...a }));
    },
    
    async getVisitsByIP(ip: string): Promise<VisitRecord[]> {
      return inMemoryDB.analytics
        .filter(a => a.ip === ip)
        .map(a => ({ ...a }));
    }
  }
}; 