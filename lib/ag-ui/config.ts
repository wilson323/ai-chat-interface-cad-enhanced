/**
 * AG-UI配置 - 定义AG-UI集成的配置选项
 * AG-UI Configuration - Defines configuration options for AG-UI integration
 *
 * 本文件包含AG-UI集成的配置选项和默认值
 * 调用关系: 被lib/ag-ui/core-adapter.ts引用
 */

export interface AgUIConfig {
  // API端点配置
  endpoints: {
    chat: string
    initChat: string
    history: string
    feedback: string
    generateImage: string
    batchForward: string
    suggestedQuestions: string
    cadAnalysis: string
  }

  // 调试选项
  debug: boolean

  // 默认线程ID前缀
  threadIdPrefix: string

  // 默认运行ID前缀
  runIdPrefix: string

  // 默认消息ID前缀
  messageIdPrefix: string

  // 重试选项
  retry: {
    maxRetries: number
    initialDelay: number
    maxDelay: number
  }

  // 超时选项（毫秒）
  timeouts: {
    request: number
    connection: number
  }
}

// 默认配置
export const defaultConfig: AgUIConfig = {
  endpoints: {
    chat: "/api/ag-ui/chat",
    initChat: "/api/ag-ui/init-chat",
    history: "/api/ag-ui/history",
    feedback: "/api/ag-ui/feedback",
    generateImage: "/api/ag-ui/generate-image",
    batchForward: "/api/ag-ui/batch-forward",
    suggestedQuestions: "/api/ag-ui/suggested-questions",
    cadAnalysis: "/api/ag-ui/cad-analysis",
  },
  debug: process.env.NODE_ENV === "development",
  threadIdPrefix: "thread_",
  runIdPrefix: "run_",
  messageIdPrefix: "msg_",
  retry: {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 5000,
  },
  timeouts: {
    request: 30000,
    connection: 60000,
  },
}

// 合并用户配置和默认配置
export function mergeConfig(userConfig: Partial<AgUIConfig> = {}): AgUIConfig {
  return {
    ...defaultConfig,
    ...userConfig,
    endpoints: {
      ...defaultConfig.endpoints,
      ...(userConfig.endpoints || {}),
    },
    retry: {
      ...defaultConfig.retry,
      ...(userConfig.retry || {}),
    },
    timeouts: {
      ...defaultConfig.timeouts,
      ...(userConfig.timeouts || {}),
    },
  }
}
