import { EnhancedFastGPTClient } from "./fastgpt-enhanced"
export type { FastGPTResponse, FastGPTErrorResponse, FastGPTClientConfig } from "./fastgpt-enhanced"

// 提供命名对齐的导出（保持类名风格同时提供常用工厂函数）
export const createEnhancedFastgptClient = (config: Partial<import("./fastgpt-enhanced").FastGPTClientConfig> = {}) => {
  try {
    return new EnhancedFastGPTClient(config)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to create EnhancedFastgptClient: ${message}`)
  }
}

// 兼容命名（首字母大写GPT缩写），保持与现有代码风格一致
export const createEnhancedFastGPTClient = createEnhancedFastgptClient

let singletonClient: EnhancedFastGPTClient | null = null

export const getEnhancedFastgptClient = (config: Partial<import("./fastgpt-enhanced").FastGPTClientConfig> = {}) => {
  if (singletonClient) return singletonClient
  singletonClient = new EnhancedFastGPTClient(config)
  return singletonClient
}

// 兼容命名（首字母大写GPT缩写），保持与现有代码风格一致
export const getEnhancedFastGPTClient = getEnhancedFastgptClient

// 兼容性命名导出，统一为命名导出而非默认导出
export { EnhancedFastGPTClient as EnhancedFastgptClient } from "./fastgpt-enhanced"
