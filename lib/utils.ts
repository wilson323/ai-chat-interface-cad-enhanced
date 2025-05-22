import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export const STORAGE_KEYS = {
  API_URL: "fastgpt_api_url",
  API_KEY: "fastgpt_api_key",
  USE_PROXY: "fastgpt_use_proxy",
  CURRENT_USER: "currentUser",
  DEFAULT_AGENT_INITIALIZED: "default_agent_initialized",
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
