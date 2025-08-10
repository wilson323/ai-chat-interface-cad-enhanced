import axios, { AxiosResponse, AxiosRequestConfig } from "axios"
import { DEFAULT_API_CONFIG, STORAGE_KEYS, PROXY_CONFIG, ERROR_MESSAGES, MODEL_TYPES } from "@/config/fastgpt"
// This is a client-side file, so we don't use any sensitive environment variables here
import { v4 as uuidv4 } from "uuid"

// FastGPT API 响应类型
export interface FastGPTResponse {
  id: string
  object: string
  created: number
  model: string
  choices: {
    index: number
    message: {
      role: string
      content: string
    }
    finish_reason: string
  }[]
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
  detail?: any
  responseData?: any[]
}

// FastGPT API 错误响应类型
export interface FastGPTErrorResponse {
  error: {
    code: number
    message: string
  }
}

// Define types for the API responses
interface ChatResponse {
  id: string
  choices: Array<{
    message: {
      role: string
      content: string
    }
  }>
  // Add other fields as needed
}

// FastGPT API 客户端类
export class FastGPTClient {
  private apiKey: string
  private baseUrl: string
  private useProxy: boolean

  constructor(apiKey: string, baseUrl?: string, useProxy = true) {
    this.apiKey = apiKey
    this.baseUrl = baseUrl || ""
    this.useProxy = useProxy
  }

  // 获取API URL
  private getApiUrl(endpoint: string): string {
    if (this.useProxy) {
      return `/api/proxy${endpoint}`
    }
    return `${this.baseUrl}${endpoint}`
  }

  // 发送聊天请求
  async chat(params: {
    model: string
    messages: {
      role: string
      content:
        | string
        | Array<{
            type: string
            text?: string
            image_url?: { url: string }
            file_url?: string
            name?: string
            url?: string
          }>
    }[]
    stream?: boolean
    temperature?: number
    max_tokens?: number
    tools?: any[]
    tool_choice?: string | object
    files?: any[]
    detail?: boolean
    system?: string
    user?: string
    chatId?: string
    responseChatItemId?: string
    variables?: Record<string, any>
  }): Promise<FastGPTResponse | ReadableStream> {
    // Use server-side API route instead of direct API call
    const url = "/api/fastgpt/chat"

    try {
      console.log("FastGPT API Request:", {
        method: "POST",
        body: { ...params, apiKey: "***" }, // Hide API key in logs
      })

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...params,
          baseUrl: this.baseUrl,
          useProxy: this.useProxy,
        }),
      })

      if (!response.ok) {
        let errorData: FastGPTErrorResponse
        try {
          errorData = await response.json()
        } catch (e) {
          // If response is not JSON format
          const text = await response.text()
          throw new Error(`FastGPT API Error: ${response.status} ${response.statusText} - ${text}`)
        }
        throw new Error(
          `FastGPT API Error: ${errorData.error?.message || response.statusText} (${errorData.error?.code || response.status})`,
        )
      }

      if (params.stream) {
        return response.body as ReadableStream
      }

      return (await response.json()) as FastGPTResponse
    } catch (error) {
      console.error("FastGPT API request failed:", error)
      throw error
    }
  }

  // 初始化聊天
  async initChat(params: {
    model?: string
    agent_id?: string
    knowledge_id?: string
    user?: string
  }): Promise<any> {
    // Use server-side API route
    const url = "/api/fastgpt/init-chat"

    try {
      console.log("FastGPT Init Chat Request:", {
        method: "POST",
        body: params,
      })

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...params,
          baseUrl: this.baseUrl,
          useProxy: this.useProxy,
        }),
      })

      if (!response.ok) {
        let errorData
        try {
          errorData = await response.json()
        } catch (e) {
          // If response is not JSON format
          const text = await response.text()
          throw new Error(`FastGPT API Error: ${response.status} ${response.statusText} - ${text}`)
        }
        throw new Error(
          `FastGPT API Error: ${errorData.error?.message || response.statusText} (${errorData.error?.code || response.status})`,
        )
      }

      return await response.json()
    } catch (error) {
      console.error("FastGPT init chat request failed:", error)
      throw error
    }
  }

  // 获取历史对话
  async getHistories(params: {
    appId: string
    offset?: number
    pageSize?: number
    source?: string
  }): Promise<any> {
    const url = this.getApiUrl("/api/core/chat/getHistories")

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(params),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(
          `FastGPT API Error: ${errorData.error?.message || response.statusText} (${errorData.error?.code || response.status})`,
        )
      }

      return await response.json()
    } catch (error) {
      console.error("FastGPT get histories request failed:", error)
      throw error
    }
  }

  // 获取对话记录
  async getChatRecords(params: {
    appId: string
    chatId: string
    offset?: number
    pageSize?: number
    loadCustomFeedbacks?: boolean
  }): Promise<any> {
    const url = this.getApiUrl("/api/core/chat/getPaginationRecords")

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(params),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(
          `FastGPT API Error: ${errorData.error?.message || response.statusText} (${errorData.error?.code || response.status})`,
        )
      }

      return await response.json()
    } catch (error) {
      console.error("FastGPT get chat records request failed:", error)
      throw error
    }
  }
}

// Create default client instance without API key
export const fastgptClient = new FastGPTClient(
  "", // Empty API key - will be provided by server-side
  process.env.NEXT_PUBLIC_FASTGPT_API_URL || "https://zktecoaihub.com",
  true,
)

// Create API client instance
const apiClient = axios.create({
  timeout: DEFAULT_API_CONFIG.timeout,
  headers: {
    "Content-Type": "application/json",
  },
})

// Add request interceptor to log all requests
apiClient.interceptors.request.use(
  (config) => {
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`)
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

// Add response interceptor for better error handling
apiClient.interceptors.response.use(
  (response) => {
    console.log(`[API] Response: ${response.status} ${response.statusText}`)
    return response
  },
  (error) => {
    console.error("[API] Request failed:", error.message)

    // Enhance error with more details
    if (error.response) {
      console.error(`[API] Response error: ${error.response.status} ${error.response.statusText}`)
      if (error.response.data) {
        console.error("[API] Error data:", error.response.data)
      }
    } else if (error.request) {
      console.error("[API] No response received")
    }

    return Promise.reject(error)
  },
)

// Path adapter for FastGPT API
const getApiPath = (path: string) => {
  // Check if current API is FastGPT API
  const baseUrl = apiClient.defaults.baseURL || ""
  const isFastGPTAPI = baseUrl.includes("fastgpt") || baseUrl.includes("zktecoaihub.com")

  // Adjust paths based on API provider
  if (isFastGPTAPI) {
    // Handle FastGPT API paths
    if (path === "/models") {
      return "/api/v1/models"
    }

    if (path === "/apps") {
      return "/api/v1/app/list"
    }

    if (path.includes("/apps/")) {
      return path.replace("/apps/", "/api/v1/app/")
    }

    // Add /api/v1 prefix if not already present
    if (!path.startsWith("/api/v1") && !path.startsWith("/api/core")) {
      return `/api/v1${path.startsWith("/") ? path : `/${path}`}`
    }
  }

  return path
}

// Override axios methods to use path adapter
const originalGet = apiClient.get
apiClient.get = function<T = any, R = AxiosResponse<T, any>, D = any>(url: string, config?: AxiosRequestConfig<D>) : Promise<R> {
  const adaptedUrl = getApiPath(url)
  console.log(`[API] GET: Original path ${url} -> Adapted path ${adaptedUrl}`)
  return originalGet.call(this, adaptedUrl, config) as unknown as Promise<R>
}

const originalPost = apiClient.post
apiClient.post = function<T = any, R = AxiosResponse<T, any>, D = any>(url: string, data?: D, config?: AxiosRequestConfig<D>) : Promise<R> {
  const adaptedUrl = getApiPath(url)
  console.log(`[API] POST: Original path ${url} -> Adapted path ${adaptedUrl}`)
  return originalPost.call(this, adaptedUrl, data, config) as unknown as Promise<R>
}

const originalPut = apiClient.put
apiClient.put = function<T = any, R = AxiosResponse<T, any>, D = any>(url: string, data?: D, config?: AxiosRequestConfig<D>) : Promise<R> {
  const adaptedUrl = getApiPath(url)
  console.log(`[API] PUT: Original path ${url} -> Adapted path ${adaptedUrl}`)
  return originalPut.call(this, adaptedUrl, data, config) as unknown as Promise<R>
}

const originalDelete = apiClient.delete
apiClient.delete = function<T = any, R = AxiosResponse<T, any>, D = any>(url: string, config?: AxiosRequestConfig<D>) : Promise<R> {
  const adaptedUrl = getApiPath(url)
  console.log(`[API] DELETE: Original path ${url} -> Adapted path ${adaptedUrl}`)
  return originalDelete.call(this, adaptedUrl, config) as unknown as Promise<R>
}

// Check if API is configured
export const isApiConfigured = () => {
  return !!apiClient.defaults.baseURL && !!apiClient.defaults.headers.common["Authorization"]
}

// Initialize API config
export const initApiConfig = async () => {
  try {
    // Get API config from local storage
    const configJson = localStorage.getItem(STORAGE_KEYS.API_CONFIG)
    if (configJson) {
      try {
        const config = JSON.parse(configJson)
        if (config && config.baseUrl && config.apiKey) {
          // Use FastGPTApi.setApiConfig method
          FastGPTApi.setApiConfig(
            config.baseUrl,
            config.apiKey,
            config.useProxy === undefined ? true : config.useProxy, // Default to proxy enabled
          )
          return true
        }
      } catch (error) {
        console.error("Failed to parse API config:", error)
      }
    }
    return false
  } catch (error) {
    console.error("Failed to initialize API config:", error)
    return false
  }
}

// Enhanced retry function with better proxy handling
const retryRequest = async (
  requestFn: () => Promise<any>,
  maxRetries = DEFAULT_API_CONFIG.maxRetries,
  useProxy = true, // Default to using proxy
) => {
  let lastError
  let retryCount = 0

  // First try with proxy if enabled
  if (useProxy) {
    try {
      console.log("[API] Using proxy mode for request...")

      // Save current baseURL
      const currentBaseUrl = apiClient.defaults.baseURL

      // If current URL is not a proxy URL, temporarily switch to proxy URL
      if (currentBaseUrl && !currentBaseUrl.startsWith(PROXY_CONFIG.route)) {
        const originalUrl = localStorage.getItem(STORAGE_KEYS.API_URL) || ""
        apiClient.defaults.baseURL = PROXY_CONFIG.getProxyUrl(originalUrl)
      }

      try {
        const result = await requestFn()
        // If successful, keep using proxy
        localStorage.setItem(STORAGE_KEYS.USE_PROXY, "true")
        return result
      } finally {
        // Restore original baseURL
        apiClient.defaults.baseURL = currentBaseUrl
      }
    } catch (proxyError) {
      const proxyErr = proxyError as any
      console.log("[API] Proxy mode failed:", proxyErr?.message)
      lastError = proxyError
    }
  }

  // Try direct request if proxy failed or not enabled
  try {
    return await requestFn()
  } catch (error) {
    lastError = error
    console.log("[API] Direct request failed:", (error as any)?.message)
  }

  // Start retry process
  while (retryCount < maxRetries) {
    try {
      console.log(`[API] Retry ${retryCount + 1}/${maxRetries}...`)

      // Add delay to avoid frequent requests
      await new Promise((resolve) => setTimeout(resolve, 1000 * (retryCount + 1)))

      // Always try with proxy on retries (more reliable)
      const currentBaseUrl = apiClient.defaults.baseURL

      // Switch to proxy URL
      if (currentBaseUrl && !currentBaseUrl.startsWith(PROXY_CONFIG.route)) {
        const originalUrl = localStorage.getItem(STORAGE_KEYS.API_URL) || ""
        apiClient.defaults.baseURL = PROXY_CONFIG.getProxyUrl(originalUrl)
      }

      try {
        return await requestFn()
      } finally {
        // Restore original baseURL
        apiClient.defaults.baseURL = currentBaseUrl
      }
    } catch (error) {
      lastError = error
      retryCount++
      console.log(`[API] Retry ${retryCount}/${maxRetries} failed:`, (error as any)?.message)
    }
  }

  throw lastError
}

// Safe fetch function for handling non-JSON responses
const safeFetch = async (url: string, options: RequestInit = {}) => {
  try {
    const response = await fetch(url, options)

    // Check response status
    if (!response.ok) {
      const errorText = await response.text()
      console.warn(`[API] Request failed (${response.status}): ${errorText.substring(0, 100)}...`)
      return { success: false, error: `Request failed: ${response.status} ${response.statusText}` }
    }

    // Check content type
    const contentType = response.headers.get("content-type")
    if (contentType && contentType.includes("application/json")) {
      // If JSON, parse and return
      return { success: true, data: await response.json() }
    } else {
      // If not JSON, return text
      const text = await response.text()
      console.warn(`[API] Response is not JSON format: ${contentType}, content: ${text.substring(0, 100)}...`)
      return { success: false, error: "Response is not JSON format", text }
    }
  } catch (error) {
    console.error("[API] Request failed:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

// FastGPT API interface
const FastGPTApi = {
  // Set API configuration
  setApiConfig: (baseUrl: string, apiKey: string, useProxy = true) => {
    // Default to proxy enabled
    // Ensure baseUrl ends with /
    const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`

    // If using proxy, transform baseUrl
    const effectiveBaseUrl = useProxy ? PROXY_CONFIG.getProxyUrl(normalizedBaseUrl) : normalizedBaseUrl

    apiClient.defaults.baseURL = effectiveBaseUrl

    // Store API key in localStorage (only for UI state management)
    // The actual API key will be used only on the server side
    localStorage.setItem(STORAGE_KEYS.API_URL, normalizedBaseUrl)
    localStorage.setItem(STORAGE_KEYS.API_KEY, apiKey)
    localStorage.setItem(STORAGE_KEYS.USE_PROXY, useProxy.toString())

    // Save to server file
    fetch("/api/db/api-config", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        baseUrl: normalizedBaseUrl,
        apiKey,
        useProxy,
      }),
    })
      .then((response) => response.json())
      .then((result) => {
        if (result.success) {
          console.log("[API] API configuration saved to server file")
        } else {
          console.warn("[API] Failed to save API configuration to server file:", result.error)
        }
      })
      .catch((error) => {
        console.error("[API] Failed to save API configuration to server file:", error)
      })
  },

  // Test API connection
  testConnection: async (useProxy = true): Promise<{ ok: boolean; message: string }> => {
    try {
      // Validate URL format
      const baseUrl = apiClient.defaults.baseURL
      if (!baseUrl) {
        throw {
          message: ERROR_MESSAGES.CONNECTION_FAILED,
          details: "API endpoint URL not set",
          status: 0,
        }
      }

      // Set shorter timeout for testing
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), DEFAULT_API_CONFIG.testTimeout)

      // If current is not using proxy but need to test with proxy
      const currentUrl = apiClient.defaults.baseURL
      const originalUrl = localStorage.getItem(STORAGE_KEYS.API_URL) || ""

      // Temporarily modify baseURL for testing
      if (useProxy && !currentUrl?.startsWith(PROXY_CONFIG.route)) {
        apiClient.defaults.baseURL = PROXY_CONFIG.getProxyUrl(originalUrl)
      }

      try {
        // First try with /models endpoint
        console.log("[API] Trying to connect to API endpoint:", apiClient.defaults.baseURL)
        const response = await apiClient.get("/models", {
          timeout: DEFAULT_API_CONFIG.testTimeout,
          signal: controller.signal,
        })
        clearTimeout(timeoutId)

        // Restore original baseURL
        if (useProxy && !currentUrl?.startsWith(PROXY_CONFIG.route)) {
          apiClient.defaults.baseURL = currentUrl
        }

        return { ok: true, message: 'ok' }
      } catch (modelError) {
        // If /models endpoint fails, try with root endpoint
        console.log("[API] Trying to test connection with root endpoint...", modelError)

        try {
          const rootResponse = await apiClient.get("/", {
            timeout: DEFAULT_API_CONFIG.testTimeout,
            signal: controller.signal,
          })
          clearTimeout(timeoutId)

          // Restore original baseURL
          if (useProxy && !currentUrl?.startsWith(PROXY_CONFIG.route)) {
            apiClient.defaults.baseURL = currentUrl
          }

          return { ok: true, message: 'ok' }
        } catch (rootError) {
          clearTimeout(timeoutId)

          // Restore original baseURL
          if (useProxy && !currentUrl?.startsWith(PROXY_CONFIG.route)) {
            apiClient.defaults.baseURL = currentUrl
          }

          // If currently not using proxy, try with proxy
          if (!useProxy) {
            console.log("[API] Direct connection failed, trying with proxy...")
            try {
              return await FastGPTApi.testConnection(true)
            } catch (proxyError) {
              console.error("[API] Proxy connection also failed:", proxyError)
              throw rootError // If proxy also fails, throw original error
            }
          }

          throw rootError // If root endpoint also fails, throw error
        }
      }
    } catch (error) {
      console.error("[API] Test API connection failed:", error)

      // Build detailed error information
      let errorDetails = ERROR_MESSAGES.UNKNOWN
      let errorStatus = 0
      let suggestedAction = ""

      const err: any = error as any
      // Handle timeout error
      if (err?.name === "AbortError" || err?.code === "ECONNABORTED") {
        errorDetails = ERROR_MESSAGES.TIMEOUT
        errorStatus = 408 // Request Timeout
        suggestedAction = ERROR_MESSAGES.SUGGESTIONS.TRY_PROXY
      }
      // Handle network error
      else if (err?.message && String(err.message).includes("Network Error")) {
        errorDetails = ERROR_MESSAGES.NETWORK_ERROR
        errorStatus = 0 // Network errors have no HTTP status code
        suggestedAction = ERROR_MESSAGES.SUGGESTIONS.ENABLE_PROXY
      }
      // Handle server returned error
      else if (err?.response) {
        errorStatus = err.response.status
        errorDetails = `Server returned error: ${err.response.status} - ${err.response.statusText}`
        if (err.response.data) {
          if (typeof err.response.data === "string") {
            errorDetails += `\n${err.response.data}`
          } else {
            errorDetails += `\n${JSON.stringify(err.response.data)}`
          }
        }

        // Friendly tips for specific status codes
        if (err.response.status === 401) {
          errorDetails += "\nAPI key is invalid or expired, please check your API key"
          suggestedAction = ERROR_MESSAGES.SUGGESTIONS.CHECK_API_KEY
        } else if (err.response.status === 403) {
          errorDetails += "\nYou don't have permission to access this resource, please check API key permissions"
          suggestedAction = ERROR_MESSAGES.SUGGESTIONS.CHECK_PERMISSIONS
        } else if (err.response.status === 404) {
          errorDetails += "\nAPI endpoint does not exist, please check URL path is correct"
          suggestedAction = ERROR_MESSAGES.SUGGESTIONS.CHECK_URL
        }
      }
      // Handle request error
      else if (err?.request) {
        errorDetails =
          "Request sent but no response received. Possible reasons:\n" +
          "1. Server is not running\n" +
          "2. Network connection issues\n" +
          "3. Firewall or security settings blocking the request"
        suggestedAction = ERROR_MESSAGES.SUGGESTIONS.TRY_PROXY
      }
      // Handle other errors
      else if (err?.details) {
        errorDetails = err.details
      } else if (err?.message) {
        errorDetails = err.message
      }

      // Check URL format
      try {
        const url = apiClient.defaults.baseURL
        if (url && !url.startsWith("http") && !url.startsWith(PROXY_CONFIG.route)) {
          errorDetails += "\nAPI endpoint URL format is incorrect, please ensure it includes http:// or https:// prefix"
          suggestedAction = ERROR_MESSAGES.SUGGESTIONS.CHECK_URL
        }
      } catch (e) {
        // URL parsing error
      }

      throw {
        message: ERROR_MESSAGES.CONNECTION_FAILED,
        details: errorDetails,
        status: errorStatus,
        originalError: (err?.message || ERROR_MESSAGES.UNKNOWN),
        suggestedAction,
      }
    }
  },

  // Get applications list
  getApplications: async () => {
    try {
      // Use safe fetch to get applications list
      const result = await safeFetch("/api/db/agents")

      if (!result.success) {
        throw new Error(`Failed to get applications list: ${result.error}`)
      }

      return result.data
    } catch (error) {
      console.error("Failed to get applications list:", (error as any)?.response?.data || (error as any)?.message)

      // Build more detailed error message
      let errorMessage = "Failed to get applications list"
      let errorDetails = ""

      const err = error as any
      if (err?.message && String(err.message).includes("Network Error")) {
        errorMessage += ": Network error, cannot connect to server"
        errorDetails =
          "Possible reasons:\n" +
          "1. API endpoint URL is incorrect\n" +
          "2. Network connection issues\n" +
          "3. Cross-origin (CORS) restrictions\n" +
          "4. Server is not running or not accessible\n\n" +
          "Suggested solutions:\n" +
          "- Enable proxy mode (in API configuration page)\n" +
          "- Check if API endpoint URL is correct\n" +
          "- Confirm network connection is normal\n" +
          "- Check if API server is running"
      } else if ((error as any)?.response) {
        const resp = (error as any).response
        errorMessage += `: Server returned error ${resp.status}`
        if ((error as any).response?.data) {
          errorDetails =
            typeof (error as any).response.data === "string" ? (error as any).response.data : JSON.stringify((error as any).response.data)
        }
      } else if ((error as any)?.code === "ECONNABORTED") {
        errorMessage += ": Request timeout, server response time too long"
        errorDetails =
          "Suggested solutions:\n" +
          "- Check network connection speed\n" +
          "- Confirm API server load is normal\n" +
          "- Try again later"
      } else {
        const err = error as any
        errorMessage += `: ${err?.message || "Unknown error"}`
      }

      const enhancedError = new Error(errorMessage)
      // @ts-ignore
      enhancedError.details = errorDetails
      throw enhancedError
    }
  },

  // Get application detail
  getApplicationDetail: async (appId: string) => {
    try {
      const result = await safeFetch(`/api/db/agent/${appId}`)

      if (!result.success) {
        throw new Error(`Failed to get application detail: ${result.error}`)
      }

      return result.data
    } catch (error) {
      console.error("Failed to get application detail:", error)
      throw error
    }
  },

  // Create application
  createApplication: async (appData: any) => {
    try {
      // If FastGPT type, remove unnecessary parameters
      const processedData = { ...appData }
      if (processedData.type === MODEL_TYPES.FASTGPT) {
        if (processedData.config) {
          const { systemPrompt, temperature, maxTokens, ...restConfig } = processedData.config
          processedData.config = restConfig
        }
        delete processedData.modelId
      }

      // Ensure proxy mode is enabled by default
      if (processedData.config && processedData.config.useProxy === undefined) {
        processedData.config.useProxy = true
      }

      const result = await safeFetch("/api/db/agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(processedData),
      })

      if (!result.success) {
        throw new Error(`Failed to create application: ${result.error}`)
      }

      return result.data
    } catch (error) {
      console.error("Failed to create application:", error)
      throw error
    }
  },

  // Update application
  updateApplication: async (appId: string, appData: any) => {
    try {
      // If FastGPT type, remove unnecessary parameters
      const processedData = { ...appData }
      if (processedData.type === MODEL_TYPES.FASTGPT) {
        if (processedData.config) {
          const { systemPrompt, temperature, maxTokens, ...restConfig } = processedData.config
          processedData.config = restConfig
        }
        delete processedData.modelId
      }

      // Ensure proxy mode is enabled by default
      if (processedData.config && processedData.config.useProxy === undefined) {
        processedData.config.useProxy = true
      }

      const result = await safeFetch(`/api/db/agent/${appId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(processedData),
      })

      if (!result.success) {
        throw new Error(`Failed to update application: ${result.error}`)
      }

      return result.data
    } catch (error) {
      console.error("Failed to update application:", error)
      throw error
    }
  },

  // Delete application
  deleteApplication: async (appId: string) => {
    try {
      const result = await safeFetch(`/api/db/agent/${appId}`, {
        method: "DELETE",
      })

      if (!result.success) {
        throw new Error(`Failed to delete application: ${result.error}`)
      }

      return result.data
    } catch (error) {
      console.error("Failed to delete application:", error)
      throw error
    }
  },

  // Get models list
  getModels: async () => {
    try {
      const useProxy = localStorage.getItem(STORAGE_KEYS.USE_PROXY) === "false" ? false : true // Default to using proxy
      return await retryRequest(
        async () => {
          const response = await apiClient.get("/models")
          return Array.isArray(response.data) ? response.data : []
        },
        DEFAULT_API_CONFIG.maxRetries,
        useProxy,
      )
    } catch (error) {
      console.error("Failed to get models list:", error)
      return []
    }
  },

  // Get voice models list
  getVoiceModels: async () => {
    try {
      const useProxy = localStorage.getItem(STORAGE_KEYS.USE_PROXY) === "false" ? false : true // Default to using proxy
      return await retryRequest(
        async () => {
          const response = await apiClient.get("/voice/models")
          return Array.isArray(response.data) ? response.data : []
        },
        DEFAULT_API_CONFIG.maxRetries,
        useProxy,
      )
    } catch (error) {
      console.error("Failed to get voice models list:", error)
      return []
    }
  },

  // Get chat sessions list
  getChatSessions: async (appId: string) => {
    try {
      const result = await safeFetch(`/api/db/sessions/${appId}`)

      if (!result.success) {
        throw new Error(`Failed to get chat sessions list: ${result.error}`)
      }

      return result.data
    } catch (error) {
      console.error("Failed to get chat sessions list:", error)
      return []
    }
  },

  // Create chat session
  createChatSession: async (appId: string, title?: string) => {
    try {
      const result = await safeFetch(`/api/db/session/${appId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title }),
      })

      if (!result.success) {
        throw new Error(`Failed to create chat session: ${result.error}`)
      }

      return result.data
    } catch (error) {
      console.error("Failed to create chat session:", error)
      throw error
    }
  },

  // Add pagination parameters to getFavoriteMessages method
  getFavoriteMessages: async (appId: string, page = 1, limit = 20): Promise<any[]> => {
    try {
      // Simulate getting favorite messages from local storage
      const allFavorites = JSON.parse(localStorage.getItem(`favorite_messages_${appId}`) || "[]")

      // Simulate pagination
      const startIndex = (page - 1) * limit
      const endIndex = startIndex + limit
      return allFavorites.slice(startIndex, endIndex)
    } catch (error) {
      console.error("Failed to get favorite messages:", error)
      throw error
    }
  },
}

// Function to call the server-side API route for chat
export async function chatWithFastGPT(params: any): Promise<ChatResponse> {
  try {
    const response = await fetch("/api/fastgpt/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`FastGPT API error: ${response.status} - ${errorText}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error calling FastGPT API:", error)
    throw error
  }
}

// Function to test the FastGPT connection
export async function testFastGPTConnection(baseUrl?: string, useProxy?: boolean): Promise<any> {
  try {
    const response = await fetch("/api/fastgpt/test-connection", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ baseUrl, useProxy }),
    })

    return await response.json()
  } catch (error) {
    console.error("Error testing FastGPT connection:", error)
    throw error
  }
}

// Function to initialize a chat
export async function initFastGPTChat(params: any): Promise<any> {
  try {
    const response = await fetch("/api/fastgpt/init-chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    })

    return await response.json()
  } catch (error) {
    console.error("Error initializing FastGPT chat:", error)
    throw error
  }
}

// Generate a unique chat ID
export function generateChatId(): string {
  return uuidv4()
}

// Other utility functions as needed

export default FastGPTApi
