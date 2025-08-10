/**
 * FastGPT API Configuration
 */

// Default API configuration
export const DEFAULT_API_CONFIG = {
  // API endpoint URL - using public URL, not sensitive
  baseUrl: "https://zktecoaihub.com/api",

  // Whether to use proxy - default enabled
  useProxy: true,

  // Retry count
  maxRetries: 3,

  // Request timeout (milliseconds)
  timeout: 60000,

  // Test connection timeout (milliseconds)
  testTimeout: 15000,
}

export const FastGPTConfig = {
  apiUrl: "https://api.fastgpt.in",
  apiKey: "", // Empty string, will be filled by server-side code
  defaultModel: "qwen-turbo",
  defaultAgentId: "", // Default agent ID
  useProxy: true, // Whether to use proxy
  maxTokens: 2048,
  temperature: 0.7,
}

// Local storage key names
export const STORAGE_KEYS = {
  API_CONFIG: "fastgpt_api_config",
  AGENTS: "fastgpt_agents",
  CHAT_SESSIONS: "fastgpt_chat_sessions",
  API_URL: "ai_chat_api_url",
  API_KEY: "ai_chat_api_key",
  USE_PROXY: "ai_chat_use_proxy",
  CURRENT_USER: "fastgpt_current_user",
  CHAT_HISTORY: "ai_chat_history",
  SETTINGS: "ai_chat_settings",
  THEME: "ai_chat_theme",
  LANGUAGE: "ai_chat_language",
  DEFAULT_AGENT_INITIALIZED: "default_agent_initialized",
} as const;

// Proxy configuration
export const PROXY_CONFIG = {
  // Proxy route
  route: "/api/proxy",

  // Get proxy URL
  getProxyUrl: (url: string) => {
    // If already a relative URL, return directly
    if (url.startsWith("/api/")) return url

    // Convert external URL to access through local proxy
    // Remove protocol part
    const urlWithoutProtocol = url.replace(/^https?:\/\//, "")
    return `/api/proxy?url=${encodeURIComponent(urlWithoutProtocol)}`
  },
}

// Error messages
export const ERROR_MESSAGES = {
  CONNECTION_FAILED: "API connection failed",
  NETWORK_ERROR: "Network error, cannot connect to server",
  TIMEOUT: "Connection timeout, server response time too long",
  UNAUTHORIZED: "API key is invalid or expired",
  FORBIDDEN: "You don't have permission to access this resource",
  NOT_FOUND: "API endpoint does not exist",
  INVALID_URL: "API endpoint URL format is incorrect",
  UNKNOWN: "Unknown error",

  // Suggested actions
  SUGGESTIONS: {
    ENABLE_PROXY: "Enabling proxy mode may solve CORS issues",
    CHECK_API_KEY: "Update API key",
    CHECK_PERMISSIONS: "Check API key permissions",
    CHECK_URL: "Check API endpoint URL",
    CHECK_NETWORK: "Check network connection",
    TRY_PROXY: "Try using proxy mode or check network connection",
  },
}

// Model types
export const MODEL_TYPES = {
  FASTGPT: "fastgpt",
  CUSTOM: "custom",
  OPENAI: "openai",
}

// Agent status
export const AGENT_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
}

// Helper functions for client-side
export const fastGPTConfig = {
  // Default to using proxy to avoid CORS issues
  useProxy: true,

  // Default API URL - this is not sensitive as it's just a domain
  defaultApiUrl: "https://zktecoaihub.com",

  // Function to get the API URL from storage or default
  getApiUrl: () => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(STORAGE_KEYS.API_URL) || "https://zktecoaihub.com"
    }
    return "https://zktecoaihub.com"
  },

  // Function to check if proxy is enabled
  isProxyEnabled: () => {
    if (typeof window !== "undefined") {
      const value = localStorage.getItem(STORAGE_KEYS.USE_PROXY)
      return value === null ? true : value === "true"
    }
    return true
  },

  // Function to set proxy status
  setProxyEnabled: (enabled: boolean) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.USE_PROXY, enabled.toString())
    }
  },

  // Function to set API URL
  setApiUrl: (url: string) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.API_URL, url)
    }
  },
}

export const getFastGPTConfig = () => ({
  apiKey: process.env.FASTGPT_API_KEY,
  endpoint: process.env.FASTGPT_ENDPOINT,
  timeout: parseInt(process.env.FASTGPT_TIMEOUT || '30000'),
  retries: parseInt(process.env.FASTGPT_RETRIES || '3'),
  circuitBreaker: {
    threshold: 0.5,
    interval: 60000
  }
});
