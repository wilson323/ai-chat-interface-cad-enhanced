import { Observable } from 'rxjs';
import { AgUIEvent, AgUIEventEmitter } from '../protocol/ag-ui-protocol';

export type AgentType = 'fastgpt' | 'cad' | 'poster';

export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  type: AgentType;
  modelId?: string;
  apiKey?: string;
  systemPrompt?: string;
  baseUrl?: string;
  icon?: string;
  // Admin 扩展配置
  isActive?: boolean;
  configuration?: Record<string, any>;
  metadata?: {
    showInGallery?: boolean;
    galleryIconUrl?: string;
    priority?: number;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

export abstract class BaseAgent {
  protected config: AgentConfig;
  protected eventEmitter: AgUIEventEmitter;
  
  constructor(config: AgentConfig) {
    this.config = config;
    this.eventEmitter = new AgUIEventEmitter();
  }
  
  getConfig(): AgentConfig {
    return { ...this.config };
  }
  
  getId(): string {
    return this.config.id;
  }
  
  getName(): string {
    return this.config.name;
  }
  
  getType(): AgentType {
    return this.config.type;
  }
  
  abstract initialize(): Promise<void>;
  abstract processMessage(message: string): Promise<void>;
  
  getEventStream(): Observable<AgUIEvent> {
    return this.eventEmitter.getEventStream();
  }
} 