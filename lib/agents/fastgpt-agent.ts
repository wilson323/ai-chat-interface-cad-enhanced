import { BaseAgent, AgentConfig } from './base-agent';
import { v4 as uuidv4 } from 'uuid';

export interface GlobalVariable {
  key: string;
  value: string;
  required: boolean;
  label: string;
  description?: string;
}

export interface FastGPTAgentConfig extends AgentConfig {
  globalVariables?: GlobalVariable[];
  welcomeMessage?: string;
  sessionId?: string;
}

export class FastGPTAgent extends BaseAgent {
  protected config: FastGPTAgentConfig;
  private sessionId: string;
  private messageHistory: any[] = [];
  
  constructor(config: FastGPTAgentConfig) {
    super(config);
    this.config = config;
    this.sessionId = config.sessionId || uuidv4();
  }
  
  async initialize(): Promise<void> {
    // 发送欢迎消息（如果存在）
    if (this.config.welcomeMessage) {
      this.eventEmitter.emit({
        type: 'TEXT_MESSAGE_START',
        messageId: uuidv4(),
        role: 'assistant',
        timestamp: Date.now()
      });
      
      this.eventEmitter.emit({
        type: 'TEXT_MESSAGE_CONTENT',
        messageId: uuidv4(),
        delta: this.config.welcomeMessage,
        timestamp: Date.now()
      });
      
      this.eventEmitter.emit({
        type: 'TEXT_MESSAGE_END',
        messageId: uuidv4(),
        timestamp: Date.now()
      });
    }
    
    this.eventEmitter.emit({
      type: 'RUN_STARTED',
      threadId: this.sessionId,
      runId: uuidv4(),
      timestamp: Date.now()
    });
  }
  
  async processMessage(message: string): Promise<void> {
    try {
      const messageId = uuidv4();
      
      // 将用户消息添加到历史
      this.messageHistory.push({
        role: 'user',
        content: message
      });
      
      // 发送消息开始事件
      this.eventEmitter.emit({
        type: 'TEXT_MESSAGE_START',
        messageId,
        role: 'assistant',
        timestamp: Date.now()
      });
      
      // 这里应该调用FastGPT API
      // 由于实际API调用需要更多配置，这里只是示例
      const response = await this.callFastGPTAPI(message);
      
      // 将助手回复添加到历史
      this.messageHistory.push({
        role: 'assistant',
        content: response
      });
      
      // 模拟流式响应
      for (const chunk of this.chunkString(response, 10)) {
        this.eventEmitter.emit({
          type: 'TEXT_MESSAGE_CONTENT',
          messageId,
          delta: chunk,
          timestamp: Date.now()
        });
        
        // 模拟打字延迟
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      // 发送消息结束事件
      this.eventEmitter.emit({
        type: 'TEXT_MESSAGE_END',
        messageId,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('FastGPT处理消息错误:', error);
      this.eventEmitter.emit({
        type: 'RUN_ERROR',
        message: '处理消息时出错',
        code: 'PROCESS_ERROR',
        timestamp: Date.now()
      });
    }
  }
  
  private async callFastGPTAPI(message: string): Promise<string> {
    // 实际的FastGPT API调用
    // 这里只是模拟返回
    return `这是FastGPT智能体 "${this.config.name}" 的回复: ${message}`;
  }
  
  private chunkString(str: string, size: number): string[] {
    const chunks = [];
    for (let i = 0; i < str.length; i += size) {
      chunks.push(str.slice(i, i + size));
    }
    return chunks;
  }
  
  getSessionId(): string {
    return this.sessionId;
  }
  
  getRequiredVariables(): GlobalVariable[] {
    return this.config.globalVariables?.filter(v => v.required) || [];
  }
} 