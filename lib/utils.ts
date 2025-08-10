import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const STORAGE_KEYS = {
  API_URL: "fastgpt_api_url",
  API_KEY: "fastgpt_api_key",
  USE_PROXY: "fastgpt_use_proxy",
  CURRENT_USER: "currentUser",
  DEFAULT_AGENT_INITIALIZED: "default_agent_initialized",
  AGENTS: "fastgpt_agents",
}

export const isApiConfigured = () => {
  try {
    const configJson = localStorage.getItem("ai_chat_api_config")
    if (!configJson) return false

    const config = JSON.parse(configJson)
    return !!(config && config.baseUrl && config.apiKey)
  } catch (error) {
    console.error("Error checking API configuration:", error)
    return false
  }
}

/**
 * 格式化文件大小为人类可读格式
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
