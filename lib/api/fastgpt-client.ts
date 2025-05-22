/**
 * FastGPT API Client
 * This client handles all interactions with the FastGPT API
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_FASTGPT_API_URL || "https://zktecoaihub.com/api"
const API_KEY = process.env.NEXT_PUBLIC_FASTGPT_API_KEY || ""

class FastGPTClient {
  private apiKey: string
  private baseUrl: string
  private isBrowser: boolean

  constructor(apiKey: string = API_KEY, baseUrl: string = API_BASE_URL) {
    this.apiKey = apiKey
    this.baseUrl = baseUrl
    this.isBrowser = typeof window !== "undefined"
  }

  /**
   * Set API key
   */
  setApiKey(apiKey: string) {
    this.apiKey = apiKey
  }

  /**
   * Set base URL
   */
  setBaseUrl(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  /**
   * Get headers for API requests
   */
  private getHeaders() {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
    }
  }

  /**
   * Make API request
   */
  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`
    const headers = this.getHeaders()

    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    })

    return response
  }

  /**
   * Chat completions API
   */
  async chatCompletions(params: any) {
    // If in browser, use the proxy endpoint
    const endpoint = this.isBrowser ? "/api/fastgpt/api/v1/chat/completions" : "/api/v1/chat/completions"

    return this.request(endpoint, {
      method: "POST",
      body: JSON.stringify(params),
    })
  }

  /**
   * Get chat initialization data
   */
  async getChatInit(appId: string, chatId: string) {
    // If in browser, use the proxy endpoint
    const endpoint = this.isBrowser
      ? `/api/fastgpt/api/core/chat/init?appId=${appId}&chatId=${chatId}`
      : `/api/core/chat/init?appId=${appId}&chatId=${chatId}`

    const response = await this.request(endpoint)
    if (!response.ok) {
      throw new Error(`Failed to get chat init: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Get chat history
   */
  async getChatHistory(appId: string, offset = 0, pageSize = 20, source = "api") {
    // If in browser, use the proxy endpoint
    const endpoint = this.isBrowser ? "/api/fastgpt/api/core/chat/getHistories" : "/api/core/chat/getHistories"

    const response = await this.request(endpoint, {
      method: "POST",
      body: JSON.stringify({
        appId,
        offset,
        pageSize,
        source,
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to get chat history: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Update chat history title
   */
  async updateChatTitle(appId: string, chatId: string, customTitle: string) {
    // If in browser, use the proxy endpoint
    const endpoint = this.isBrowser ? "/api/fastgpt/api/core/chat/updateHistory" : "/api/core/chat/updateHistory"

    const response = await this.request(endpoint, {
      method: "POST",
      body: JSON.stringify({
        appId,
        chatId,
        customTitle,
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to update chat title: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Toggle chat pin status
   */
  async toggleChatPin(appId: string, chatId: string, top: boolean) {
    // If in browser, use the proxy endpoint
    const endpoint = this.isBrowser ? "/api/fastgpt/api/core/chat/updateHistory" : "/api/core/chat/updateHistory"

    const response = await this.request(endpoint, {
      method: "POST",
      body: JSON.stringify({
        appId,
        chatId,
        top,
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to toggle chat pin: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Delete chat history
   */
  async deleteChatHistory(chatId: string, appId: string) {
    // If in browser, use the proxy endpoint
    const endpoint = this.isBrowser
      ? `/api/fastgpt/api/core/chat/delHistory?chatId=${chatId}&appId=${appId}`
      : `/api/core/chat/delHistory?chatId=${chatId}&appId=${appId}`

    const response = await this.request(endpoint, {
      method: "DELETE",
    })

    if (!response.ok) {
      throw new Error(`Failed to delete chat history: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Clear all chat history
   */
  async clearAllChatHistory(appId: string) {
    // If in browser, use the proxy endpoint
    const endpoint = this.isBrowser
      ? `/api/fastgpt/api/core/chat/clearHistories?appId=${appId}`
      : `/api/core/chat/clearHistories?appId=${appId}`

    const response = await this.request(endpoint, {
      method: "DELETE",
    })

    if (!response.ok) {
      throw new Error(`Failed to clear all chat history: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Get chat messages
   */
  async getChatMessages(appId: string, chatId: string, offset = 0, pageSize = 20) {
    // If in browser, use the proxy endpoint
    const endpoint = this.isBrowser
      ? "/api/fastgpt/api/core/chat/getPaginationRecords"
      : "/api/core/chat/getPaginationRecords"

    const response = await this.request(endpoint, {
      method: "POST",
      body: JSON.stringify({
        appId,
        chatId,
        offset,
        pageSize,
        loadCustomFeedbacks: true,
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to get chat messages: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Get message details
   */
  async getMessageDetails(appId: string, chatId: string, dataId: string) {
    // If in browser, use the proxy endpoint
    const endpoint = this.isBrowser
      ? `/api/fastgpt/api/core/chat/getResData?appId=${appId}&chatId=${chatId}&dataId=${dataId}`
      : `/api/core/chat/getResData?appId=${appId}&chatId=${chatId}&dataId=${dataId}`

    const response = await this.request(endpoint)

    if (!response.ok) {
      throw new Error(`Failed to get message details: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Delete message
   */
  async deleteMessage(contentId: string, chatId: string, appId: string) {
    // If in browser, use the proxy endpoint
    const endpoint = this.isBrowser
      ? `/api/fastgpt/api/core/chat/item/delete?contentId=${contentId}&chatId=${chatId}&appId=${appId}`
      : `/api/core/chat/item/delete?contentId=${contentId}&chatId=${chatId}&appId=${appId}`

    const response = await this.request(endpoint, {
      method: "DELETE",
    })

    if (!response.ok) {
      throw new Error(`Failed to delete message: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Update user feedback
   */
  async updateUserFeedback(
    appId: string,
    chatId: string,
    dataId: string,
    feedback: "good" | "bad",
    value: "yes" | "no",
  ) {
    // If in browser, use the proxy endpoint
    const endpoint = this.isBrowser
      ? "/api/fastgpt/api/core/chat/feedback/updateUserFeedback"
      : "/api/core/chat/feedback/updateUserFeedback"

    const body: any = {
      appId,
      chatId,
      dataId,
    }

    if (feedback === "good") {
      body.userGoodFeedback = value
    } else {
      body.userBadFeedback = value
    }

    const response = await this.request(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      throw new Error(`Failed to update user feedback: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Get question suggestions
   */
  async getQuestionSuggestions(appId: string, chatId: string, model = "GPT-4o-mini", customPrompt?: string) {
    // If in browser, use the proxy endpoint
    const endpoint = this.isBrowser
      ? "/api/fastgpt/api/core/ai/agent/v2/createQuestionGuide"
      : "/api/core/ai/agent/v2/createQuestionGuide"

    const response = await this.request(endpoint, {
      method: "POST",
      body: JSON.stringify({
        appId,
        chatId,
        questionGuide: {
          open: true,
          model,
          customPrompt,
        },
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to get question suggestions: ${response.statusText}`)
    }

    return response.json()
  }
}

// Create a singleton instance
const fastGPTClient = new FastGPTClient()

export default fastGPTClient
