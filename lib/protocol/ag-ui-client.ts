import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { filter, map, tap } from 'rxjs/operators';

// AG-UI 协议事件类型
export enum EventType {
  TEXT_MESSAGE_START = 'TEXT_MESSAGE_START',
  TEXT_MESSAGE_CONTENT = 'TEXT_MESSAGE_CONTENT',
  TEXT_MESSAGE_END = 'TEXT_MESSAGE_END',
  TEXT_MESSAGE_CHUNK = 'TEXT_MESSAGE_CHUNK',
  TOOL_CALL_START = 'TOOL_CALL_START',
  TOOL_CALL_ARGS = 'TOOL_CALL_ARGS',
  TOOL_CALL_END = 'TOOL_CALL_END',
  TOOL_CALL_CHUNK = 'TOOL_CALL_CHUNK',
  STATE_SNAPSHOT = 'STATE_SNAPSHOT',
  STATE_DELTA = 'STATE_DELTA',
  MESSAGES_SNAPSHOT = 'MESSAGES_SNAPSHOT',
  RAW = 'RAW',
  CUSTOM = 'CUSTOM',
  RUN_STARTED = 'RUN_STARTED',
  RUN_FINISHED = 'RUN_FINISHED',
  RUN_ERROR = 'RUN_ERROR',
  STEP_STARTED = 'STEP_STARTED',
  STEP_FINISHED = 'STEP_FINISHED'
}

// 角色类型
export type Role = 'user' | 'assistant' | 'system' | 'tool' | 'developer';

// 基础事件接口
export interface BaseEvent {
  type: EventType;
  timestamp: number;
}

// 消息事件接口
export interface TextMessageStartEvent extends BaseEvent {
  type: EventType.TEXT_MESSAGE_START;
  messageId: string;
  role: Role;
}

export interface TextMessageContentEvent extends BaseEvent {
  type: EventType.TEXT_MESSAGE_CONTENT;
  messageId: string;
  delta: string;
}

export interface TextMessageEndEvent extends BaseEvent {
  type: EventType.TEXT_MESSAGE_END;
  messageId: string;
}

export interface TextMessageChunkEvent extends BaseEvent {
  type: EventType.TEXT_MESSAGE_CHUNK;
  messageId: string;
  role: Role;
  delta: string;
}

// 工具调用事件接口
export interface ToolCallStartEvent extends BaseEvent {
  type: EventType.TOOL_CALL_START;
  toolCallId: string;
  toolCallName: string;
  parentMessageId: string;
}

export interface ToolCallArgsEvent extends BaseEvent {
  type: EventType.TOOL_CALL_ARGS;
  toolCallId: string;
  delta: string;
}

export interface ToolCallEndEvent extends BaseEvent {
  type: EventType.TOOL_CALL_END;
  toolCallId: string;
}

export interface ToolCallChunkEvent extends BaseEvent {
  type: EventType.TOOL_CALL_CHUNK;
  toolCallId: string;
  toolCallName: string;
  parentMessageId: string;
  delta: string;
}

// 状态事件接口
export interface StateSnapshotEvent extends BaseEvent {
  type: EventType.STATE_SNAPSHOT;
  snapshot: Record<string, any>;
}

export interface StateDeltaEvent extends BaseEvent {
  type: EventType.STATE_DELTA;
  delta: Array<{
    op: 'add' | 'remove' | 'replace' | 'move' | 'copy' | 'test';
    path: string;
    value?: any;
    from?: string;
  }>;
}

export interface MessagesSnapshotEvent extends BaseEvent {
  type: EventType.MESSAGES_SNAPSHOT;
  messages: Array<Message>;
}

// 运行事件接口
export interface RunStartedEvent extends BaseEvent {
  type: EventType.RUN_STARTED;
  threadId: string;
  runId: string;
}

export interface RunFinishedEvent extends BaseEvent {
  type: EventType.RUN_FINISHED;
  threadId: string;
  runId: string;
}

export interface RunErrorEvent extends BaseEvent {
  type: EventType.RUN_ERROR;
  message: string;
  code: string;
}

// 步骤事件接口
export interface StepStartedEvent extends BaseEvent {
  type: EventType.STEP_STARTED;
  stepName: string;
}

export interface StepFinishedEvent extends BaseEvent {
  type: EventType.STEP_FINISHED;
  stepName: string;
}

// 自定义事件接口
export interface CustomEvent extends BaseEvent {
  type: EventType.CUSTOM;
  name: string;
  value: any;
}

export interface RawEvent extends BaseEvent {
  type: EventType.RAW;
  event: any;
  source: string;
}

// 消息类型
export interface Message {
  id: string;
  role: Role;
  content: string;
  name?: string;
  toolCalls?: Array<ToolCall>;
  createdAt?: number;
}

// 工具类型
export interface Tool {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

// 上下文信息
export interface ContextItem {
  description: string;
  value: any;
}

// Agent 执行输入
export interface RunAgentInput {
  threadId: string;
  runId: string;
  state: Record<string, any>;
  messages: Array<Message>;
  tools: Array<Tool>;
  context?: Array<ContextItem>;
  forwardedProps?: Record<string, any>;
}

// 通用 Agent 配置
export interface AgentConfig {
  agentId: string;
  description?: string;
  threadId?: string;
  initialMessages?: Array<Message>;
  initialState?: Record<string, any>;
  debug?: boolean;
}

// HTTP Agent 配置
export interface HttpAgentConfig extends AgentConfig {
  url: string;
  headers?: Record<string, string>;
}

// 所有事件类型联合
export type AgentEvent =
  | TextMessageStartEvent
  | TextMessageContentEvent
  | TextMessageEndEvent
  | TextMessageChunkEvent
  | ToolCallStartEvent
  | ToolCallArgsEvent
  | ToolCallEndEvent
  | ToolCallChunkEvent
  | StateSnapshotEvent
  | StateDeltaEvent
  | MessagesSnapshotEvent
  | RunStartedEvent
  | RunFinishedEvent
  | RunErrorEvent
  | StepStartedEvent
  | StepFinishedEvent
  | CustomEvent
  | RawEvent;

// 抽象 Agent 基类
export abstract class AbstractAgent {
  protected agentId: string;
  protected description: string;
  protected threadId: string;
  protected debug: boolean;
  protected eventSubject: Subject<AgentEvent> = new Subject<AgentEvent>();
  protected messagesSubject: BehaviorSubject<Array<Message>>;
  protected stateSubject: BehaviorSubject<Record<string, any>>;
  protected runningSubject: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  
  // 暴露 Observable 接口
  public events$: Observable<AgentEvent> = this.eventSubject.asObservable();
  public messages$: Observable<Array<Message>>;
  public state$: Observable<Record<string, any>>;
  public running$: Observable<boolean> = this.runningSubject.asObservable();
  
  constructor(config: AgentConfig) {
    this.agentId = config.agentId;
    this.description = config.description || '';
    this.threadId = config.threadId || `thread-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    this.debug = config.debug || false;
    
    // 初始化消息和状态
    this.messagesSubject = new BehaviorSubject<Array<Message>>(config.initialMessages || []);
    this.stateSubject = new BehaviorSubject<Record<string, any>>(config.initialState || {});
    
    this.messages$ = this.messagesSubject.asObservable();
    this.state$ = this.stateSubject.asObservable();
    
    // 调试日志
    if (this.debug) {
      this.events$.subscribe(event => {
        console.debug(`[AG-UI] Event:`, event);
      });
    }
  }
  
  // 获取/设置消息列表
  get messages(): Array<Message> {
    return this.messagesSubject.getValue();
  }
  
  set messages(messages: Array<Message>) {
    this.messagesSubject.next(messages);
  }
  
  // 获取/设置状态
  get state(): Record<string, any> {
    return this.stateSubject.getValue();
  }
  
  set state(state: Record<string, any>) {
    this.stateSubject.next(state);
  }
  
  // 准备执行输入
  protected prepareRunAgentInput(parameters: any = {}): RunAgentInput {
    const runId = parameters.runId || `run-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    
    return {
      threadId: this.threadId,
      runId,
      state: this.state,
      messages: this.messages,
      tools: parameters.tools || [],
      context: parameters.context || [],
      forwardedProps: parameters.forwardedProps || {}
    };
  }
  
  // 处理事件流，自动同步消息和状态
  protected processApplyEvents(input: RunAgentInput, events$: Observable<AgentEvent>): Observable<AgentEvent> {
    return events$.pipe(
      tap(event => {
        // 更新运行状态
        if (event.type === EventType.RUN_STARTED) {
          this.runningSubject.next(true);
        } else if (event.type === EventType.RUN_FINISHED || event.type === EventType.RUN_ERROR) {
          this.runningSubject.next(false);
        }
        
        // 同步消息
        if (event.type === EventType.MESSAGES_SNAPSHOT) {
          const messagesEvent = event as MessagesSnapshotEvent;
          this.messages = messagesEvent.messages;
        }
        
        // 同步状态
        if (event.type === EventType.STATE_SNAPSHOT) {
          const stateEvent = event as StateSnapshotEvent;
          this.state = stateEvent.snapshot;
        } else if (event.type === EventType.STATE_DELTA) {
          const deltaEvent = event as StateDeltaEvent;
          this.applyStateDelta(deltaEvent.delta);
        }
        
        // 发布事件
        this.eventSubject.next(event);
      })
    );
  }
  
  // 应用状态增量更新
  private applyStateDelta(delta: StateDeltaEvent['delta']): void {
    const currentState = this.state;
    
    for (const operation of delta) {
      const pathParts = operation.path.split('/').filter(p => p !== '');
      
      switch (operation.op) {
        case 'add':
        case 'replace':
          this.setNestedValue(currentState, pathParts, operation.value);
          break;
        case 'remove':
          this.removeNestedValue(currentState, pathParts);
          break;
        // 其他操作暂不实现
      }
    }
    
    this.state = { ...currentState };
  }
  
  // 设置嵌套属性值
  private setNestedValue(obj: any, path: string[], value: any): void {
    if (path.length === 0) return;
    
    if (path.length === 1) {
      obj[path[0]] = value;
      return;
    }
    
    const key = path[0];
    if (!(key in obj) || typeof obj[key] !== 'object') {
      obj[key] = {};
    }
    
    this.setNestedValue(obj[key], path.slice(1), value);
  }
  
  // 删除嵌套属性
  private removeNestedValue(obj: any, path: string[]): void {
    if (path.length === 0) return;
    
    if (path.length === 1) {
      delete obj[path[0]];
      return;
    }
    
    const key = path[0];
    if (!(key in obj) || typeof obj[key] !== 'object') {
      return;
    }
    
    this.removeNestedValue(obj[key], path.slice(1));
  }
  
  // 中断当前执行
  public abstract abortRun(): void;
  
  // 启动执行
  public abstract runAgent(parameters?: any): Promise<void>;
}

// HTTP Agent 实现
export class HttpAgent extends AbstractAgent {
  private url: string;
  private headers: Record<string, string>;
  private controller: AbortController | null = null;
  
  constructor(config: HttpAgentConfig) {
    super(config);
    this.url = config.url;
    this.headers = config.headers || {};
  }
  
  // 执行 Agent
  public async runAgent(parameters: any = {}): Promise<void> {
    // 如果已经在运行，则中断之前的执行
    if (this.runningSubject.getValue()) {
      this.abortRun();
    }
    
    // 准备输入
    const input = this.prepareRunAgentInput(parameters);
    
    // 创建 AbortController
    this.controller = new AbortController();
    
    try {
      // 执行 HTTP 请求
      const events$ = this.run(input, this.controller.signal);
      
      // 处理事件流
      events$.subscribe({
        error: (error) => {
          // 发送错误事件
          this.eventSubject.next({
            type: EventType.RUN_ERROR,
            message: error.message,
            code: 'http_error',
            timestamp: Date.now()
          });
          
          // 更新运行状态
          this.runningSubject.next(false);
          
          if (this.debug) {
            console.error('[AG-UI] HTTP执行错误:', error);
          }
        },
        complete: () => {
          // 清理
          this.controller = null;
        }
      });
    } catch (error: any) {
      // 发送错误事件
      this.eventSubject.next({
        type: EventType.RUN_ERROR,
        message: error.message,
        code: 'execution_error',
        timestamp: Date.now()
      });
      
      // 更新运行状态
      this.runningSubject.next(false);
      
      if (this.debug) {
        console.error('[AG-UI] 执行错误:', error);
      }
    }
  }
  
  // 中断执行
  public abortRun(): void {
    if (this.controller) {
      this.controller.abort();
      this.controller = null;
      
      // 更新运行状态
      this.runningSubject.next(false);
      
      if (this.debug) {
        console.debug('[AG-UI] 执行已中断');
      }
    }
  }
  
  // 执行 HTTP 请求
  private run(input: RunAgentInput, signal: AbortSignal): Observable<AgentEvent> {
    return new Observable<AgentEvent>(subscriber => {
      // 发送 RUN_STARTED 事件
      subscriber.next({
        type: EventType.RUN_STARTED,
        threadId: input.threadId,
        runId: input.runId,
        timestamp: Date.now()
      });
      
      // 执行 HTTP 请求
      (async () => {
        try {
          // 准备请求参数
          const init: RequestInit = {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...this.headers
            },
            body: JSON.stringify(input),
            signal
          };
          
          // 发送请求
          const response = await fetch(this.url, init);
          
          if (!response.ok) {
            throw new Error(`HTTP 请求失败: ${response.status} ${response.statusText}`);
          }
          
          // 检查响应类型
          const contentType = response.headers.get('Content-Type') || '';
          
          if (contentType.includes('text/event-stream')) {
            // 处理 SSE 响应
            await this.handleSSEResponse(response, subscriber);
          } else if (contentType.includes('application/json')) {
            // 处理 JSON 响应
            await this.handleJSONResponse(response, subscriber);
          } else {
            throw new Error(`不支持的响应类型: ${contentType}`);
          }
          
          // 发送 RUN_FINISHED 事件
          subscriber.next({
            type: EventType.RUN_FINISHED,
            threadId: input.threadId,
            runId: input.runId,
            timestamp: Date.now()
          });
          
          // 完成订阅
          subscriber.complete();
        } catch (error: any) {
          if (error.name === 'AbortError') {
            // 请求被中断，不触发错误
            subscriber.complete();
          } else {
            // 其他错误
            subscriber.error(error);
          }
        }
      })();
      
      // 清理函数
      return () => {
        if (signal.aborted === false) {
          this.abortRun();
        }
      };
    });
  }
  
  // 处理 SSE 响应
  private async handleSSEResponse(response: Response, subscriber: any): Promise<void> {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('无法读取响应流');
    }
    
    const decoder = new TextDecoder();
    let buffer = '';
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }
        
        // 解码并追加到缓冲区
        buffer += decoder.decode(value, { stream: true });
        
        // 处理缓冲区中的完整事件
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';
        
        for (const eventStr of events) {
          if (eventStr.trim() === '') continue;
          
          // 解析事件
          const lines = eventStr.split('\n');
          let eventType = '';
          let data = '';
          
          for (const line of lines) {
            if (line.startsWith('event:')) {
              eventType = line.substring(6).trim();
            } else if (line.startsWith('data:')) {
              data = line.substring(5).trim();
            }
          }
          
          if (data) {
            try {
              // 解析事件数据
              const eventData = JSON.parse(data);
              
              // 发送事件
              subscriber.next(eventData);
            } catch (error) {
              console.error('[AG-UI] 解析事件数据失败:', error);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
  
  // 处理 JSON 响应
  private async handleJSONResponse(response: Response, subscriber: any): Promise<void> {
    try {
      const data = await response.json();
      
      // 检查是否为事件数组
      if (Array.isArray(data)) {
        // 发送事件数组
        for (const event of data) {
          subscriber.next(event);
        }
      } else if (data.type && Object.values(EventType).includes(data.type)) {
        // 单个事件
        subscriber.next(data);
      } else {
        // 包装为 STATE_SNAPSHOT 事件
        subscriber.next({
          type: EventType.STATE_SNAPSHOT,
          snapshot: data,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      throw new Error(`解析 JSON 响应失败: ${error}`);
    }
  }
} 