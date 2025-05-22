/**
 * AG-UI类型定义 - 定义AG-UI协议中使用的所有类型和接口
 * AG-UI Type Definitions - Defines all types and interfaces used in AG-UI protocol
 *
 * 本文件包含AG-UI事件类型、消息格式、工具调用等类型定义
 * 调用关系: 被lib/ag-ui/core-adapter.ts和hooks/use-ag-ui.tsx引用
 */

// 基础事件类型
export type BaseEvent = {
  type: string
  timestamp: number
  [key: string]: any
}

// 事件类型枚举
export enum EventType {
  RUN_STARTED = "RUN_STARTED",
  RUN_FINISHED = "RUN_FINISHED",
  RUN_ERROR = "RUN_ERROR",
  TEXT_MESSAGE_START = "TEXT_MESSAGE_START",
  TEXT_MESSAGE_CONTENT = "TEXT_MESSAGE_CONTENT",
  TEXT_MESSAGE_END = "TEXT_MESSAGE_END",
  TOOL_CALL_START = "TOOL_CALL_START",
  TOOL_CALL_ARGS = "TOOL_CALL_ARGS",
  TOOL_CALL_END = "TOOL_CALL_END",
  STATE_SNAPSHOT = "STATE_SNAPSHOT",
  STATE_DELTA = "STATE_DELTA",
  CUSTOM = "CUSTOM",
}

// 运行开始事件
export interface RunStartedEvent extends BaseEvent {
  type: EventType.RUN_STARTED
  threadId: string
  runId: string
}

// 运行结束事件
export interface RunFinishedEvent extends BaseEvent {
  type: EventType.RUN_FINISHED
  threadId: string
  runId: string
}

// 运行错误事件
export interface RunErrorEvent extends BaseEvent {
  type: EventType.RUN_ERROR
  message: string
  code: number
}

// 文本消息开始事件
export interface TextMessageStartEvent extends BaseEvent {
  type: EventType.TEXT_MESSAGE_START
  messageId: string
  role: "assistant" | "user" | "system" | "tool"
}

// 文本消息内容事件
export interface TextMessageContentEvent extends BaseEvent {
  type: EventType.TEXT_MESSAGE_CONTENT
  messageId: string
  delta: string
}

// 文本消息结束事件
export interface TextMessageEndEvent extends BaseEvent {
  type: EventType.TEXT_MESSAGE_END
  messageId: string
}

// 文本消息块事件（优化版）
export interface TextMessageChunkEvent extends BaseEvent {
  type: "TEXT_MESSAGE_CHUNK"
  messageId: string
  role: string
  delta: string
}

// 工具调用开始事件
export interface ToolCallStartEvent extends BaseEvent {
  type: EventType.TOOL_CALL_START
  toolCallId: string
  toolCallName: string
  parentMessageId: string
}

// 工具调用参数事件
export interface ToolCallArgsEvent extends BaseEvent {
  type: EventType.TOOL_CALL_ARGS
  toolCallId: string
  delta: string
}

// 工具调用结束事件
export interface ToolCallEndEvent extends BaseEvent {
  type: EventType.TOOL_CALL_END
  toolCallId: string
}

// 工具调用块事件（优化版）
export interface ToolCallChunkEvent extends BaseEvent {
  type: "TOOL_CALL_CHUNK"
  toolCallId: string
  toolCallName: string
  parentMessageId: string
  delta: string
}

// 状态快照事件
export interface StateSnapshotEvent extends BaseEvent {
  type: EventType.STATE_SNAPSHOT
  snapshot: Record<string, any>
}

// 状态增量事件
export interface StateDeltaEvent extends BaseEvent {
  type: EventType.STATE_DELTA
  delta: Record<string, any>
}

// 消息快照事件
export interface MessagesSnapshotEvent extends BaseEvent {
  type: "MESSAGES_SNAPSHOT"
  messages: Message[]
}

// 原始事件
export interface RawEvent extends BaseEvent {
  type: "RAW"
  event: any
  source: string
}

// 自定义事件
export interface CustomEvent extends BaseEvent {
  type: EventType.CUSTOM
  name: string
  value: any
}

// 步骤开始事件
export interface StepStartedEvent extends BaseEvent {
  type: "STEP_STARTED"
  stepName: string
}

// 步骤结束事件
export interface StepFinishedEvent extends BaseEvent {
  type: "STEP_FINISHED"
  stepName: string
}

// 消息类型
export interface Message {
  id: string
  role: "user" | "assistant" | "tool" | "developer" | "system"
  content: string
  name?: string
  toolCalls?: ToolCall[]
  timestamp?: number | Date
  metadata?: Record<string, any>
  feedback?: MessageFeedback
}

// 消息反馈
export interface MessageFeedback {
  type: "like" | "dislike"
  comment?: string
  timestamp?: number | Date
  userId?: string
}

// 工具调用
export interface ToolCall {
  id: string
  type: "function"
  function: {
    name: string
    arguments: string
  }
  result?: string
}

// 工具定义
export interface Tool {
  name: string
  description: string
  parameters: Record<string, any> // JSON Schema
}

// Agent执行输入
export interface RunAgentInput {
  threadId: string
  runId: string
  state: Record<string, any>
  messages: Message[]
  tools: Tool[]
  context: any[]
  forwardedProps: Record<string, any>
}

// 聊天会话
export interface ChatSession {
  id: string
  appId: string
  title?: string
  createdAt: number | Date
  updatedAt: number | Date
  messages: Message[]
  metadata?: Record<string, any>
  variables?: Record<string, any>
}

// 聊天完成请求
export interface ChatCompletionRequest {
  appId: string
  chatId?: string
  messages: Array<{ role: string; content: string }>
  systemPrompt?: string
  variables?: Record<string, any>
  threadId?: string
  runId?: string
  tools?: Tool[]
}

// 聊天完成响应
export interface ChatCompletionResponse {
  id: string
  chatId: string
  message: Message
  suggestedQuestions?: string[]
  variables?: Record<string, any>
}

// 初始化会话请求
export interface InitSessionRequest {
  appId: string
  chatId?: string
  threadId?: string
  variables?: Record<string, any>
}

// 初始化会话响应
export interface InitSessionResponse {
  chatId: string
  welcomeMessage?: string
  variables?: Record<string, any>
  suggestedQuestions?: string[]
}

// 反馈请求
export interface FeedbackRequest {
  appId: string
  chatId: string
  messageId: string
  feedback: "like" | "dislike"
  comment?: string
  userId?: string
}

// 反馈响应
export interface FeedbackResponse {
  success: boolean
  messageId: string
}

// 批量转发请求
export interface BatchForwardRequest {
  appId: string
  chatId: string
  targetAppIds: string[]
  messageIds: string[]
}

// 批量转发响应
export interface BatchForwardResponse {
  success: boolean
  results: Array<{
    appId: string
    chatId: string
    success: boolean
    error?: string
  }>
}

// CAD分析请求
export interface CadAnalysisRequest {
  file: File
  threadId: string
  runId: string
  metadata?: Record<string, any>
}

// CAD分析响应
export interface CadAnalysisResponse {
  threadId: string
  runId: string
  state: Record<string, any>
  status: "completed" | "failed"
  error?: string
}

// 所有事件类型的联合类型
export type AgUIEvent =
  | RunStartedEvent
  | RunFinishedEvent
  | RunErrorEvent
  | TextMessageStartEvent
  | TextMessageContentEvent
  | TextMessageEndEvent
  | ToolCallStartEvent
  | ToolCallArgsEvent
  | ToolCallEndEvent
  | StateSnapshotEvent
  | StateDeltaEvent
  | CustomEvent
  | TextMessageChunkEvent
  | ToolCallChunkEvent
  | MessagesSnapshotEvent
  | RawEvent
  | StepStartedEvent
  | StepFinishedEvent
