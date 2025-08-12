"use client"

import { createContext, type FC,type ReactNode, useContext, useEffect, useState } from "react"
// FastGPTApi default client removed from direct usage in context; calls go through server routes
import React from "react"

import { DEFAULT_AGENT } from "@/config/default-agent"
import { ERROR_MESSAGES,STORAGE_KEYS } from "@/config/fastgpt"
import { useToast } from "@/hooks/use-toast"
import type { ApiConfig,ChatSession, FastGPTApp, User } from "@/types/fastgpt"

// FastGPTContextType interface with pagination methods
interface FastGPTContextType {
  isConfigured: boolean
  isLoading: boolean
  currentUser: User | null
  applications: FastGPTApp[]
  selectedApp: FastGPTApp | null
  chatSessions: ChatSession[]
  selectedSession: ChatSession | null
  configureApi: (baseUrl: string, apiKey: string, useProxy?: boolean) => Promise<boolean>
  fetchApplications: () => Promise<void>
  selectApplication: (appId: string) => Promise<void>
  fetchChatSessions: (appId?: string, page?: number, limit?: number) => Promise<ChatSession[]>
  selectChatSession: (sessionId: string) => Promise<void>
  createChatSession: (appId: string, title?: string) => Promise<ChatSession>
  setCurrentUser: (user: User | null) => void
  initializeDefaultAgent: () => Promise<void>
  hasMoreSessions: boolean
  currentPage: number
  apiKey?: string
  setApiKey: (key: string) => void
}

const FastGPTContext = createContext<FastGPTContextType | undefined>(undefined)

// Local storage helpers
const getLocalItem = (key: string) => {
  try {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : null
  } catch (e) {
    console.error(`Failed to get local storage item (${key}):`, e)
    return null
  }
}

const setLocalItem = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    console.error(`Failed to set local storage item (${key}):`, e)
  }
}

// Error message helper
const toErrorMessage = (err: unknown, fallback: string): string => {
  if (typeof err === 'string' && err.length > 0) return err
  if (err && typeof err === 'object') {
    const anyErr = err as { message?: unknown; details?: unknown }
    if (typeof anyErr.message === 'string' && anyErr.message.length > 0) return anyErr.message
    if (typeof anyErr.details === 'string' && anyErr.details.length > 0) return anyErr.details
  }
  return fallback
}

// Local storage operations
const localStorageDB = {
  // API config
  getApiConfig: (): ApiConfig | null => {
    return getLocalItem(STORAGE_KEYS.API_CONFIG)
  },

  saveApiConfig: (config: ApiConfig): void => {
    setLocalItem(STORAGE_KEYS.API_CONFIG, config)
  },

  // Agents operations
  getAgents: (): FastGPTApp[] => {
    return getLocalItem(STORAGE_KEYS.AGENTS) || []
  },

  getAgentById: (id: string): FastGPTApp | null => {
    const agents = localStorageDB.getAgents()
    return agents.find((agent) => agent.id === id) || null
  },

  createAgent: (agent: Omit<FastGPTApp, "id" | "createdAt" | "updatedAt">): FastGPTApp => {
    const agents = localStorageDB.getAgents()
    const id = `agent_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    const now = new Date().toISOString()

    const newAgent = {
      ...agent,
      id,
      createdAt: now,
      updatedAt: now,
    }

    agents.push(newAgent)
    setLocalItem(STORAGE_KEYS.AGENTS, agents)

    return newAgent
  },

  updateAgent: (id: string, agent: Partial<FastGPTApp>): void => {
    const agents = localStorageDB.getAgents()
    const index = agents.findIndex((a) => a.id === id)

    if (index !== -1) {
      agents[index] = {
        ...agents[index],
        ...agent,
        config: {
          ...agents[index].config,
          ...agent.config,
        },
        updatedAt: new Date().toISOString(),
      }

      setLocalItem(STORAGE_KEYS.AGENTS, agents)
    }
  },

  deleteAgent: (id: string): void => {
    const agents = localStorageDB.getAgents()
    const filteredAgents = agents.filter((agent) => agent.id !== id)
    setLocalItem(STORAGE_KEYS.AGENTS, filteredAgents)
  },

  // Chat sessions operations
  getChatSessions: (agentId: string): ChatSession[] => {
    return getLocalItem(`${STORAGE_KEYS.CHAT_SESSIONS}_${agentId}`) || []
  },

  createChatSession: (agentId: string, title?: string): ChatSession => {
    const sessions = localStorageDB.getChatSessions(agentId)
    const id = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    const now = new Date().toISOString()
    const sessionTitle = title || `对话 ${new Date().toLocaleString()}`

    const newSession = {
      id,
      appId: agentId,
      title: sessionTitle,
      createdAt: now,
      updatedAt: now,
      lastMessageAt: now,
      messageCount: 0,
      isPinned: false,
    }

    sessions.unshift(newSession)
    setLocalItem(`${STORAGE_KEYS.CHAT_SESSIONS}_${agentId}`, sessions)

    return newSession
  },

  // Initialize default agent
  initializeDefaultAgent: (): FastGPTApp => {
    const agents = localStorageDB.getAgents()
    const existingAgent = agents.find((agent) => agent.name === DEFAULT_AGENT.name)

    if (existingAgent) {
      return existingAgent
    }

    return localStorageDB.createAgent(DEFAULT_AGENT)
  },
}

// FastGPTProvider component with pagination state
const FastGPTProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [isConfigured, setIsConfigured] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [applications, setApplications] = useState<FastGPTApp[]>([])
  const [selectedApp, setSelectedApp] = useState<FastGPTApp | null>(null)
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([])
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null)
  const [hasMoreSessions, setHasMoreSessions] = useState<boolean>(true)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [apiKey, setApiKey] = useState<string>()
  const { toast } = useToast()

  // Initialize
  useEffect(() => {
    const init = async () => {
      try {
        console.log("Initializing application...")

        // Get API configuration from local storage
        const apiConfig = localStorageDB.getApiConfig()
        console.log("Local storage API configuration:", apiConfig)

        if (
          apiConfig !== null &&
          typeof apiConfig.baseUrl === 'string' && apiConfig.baseUrl.length > 0 &&
          typeof apiConfig.apiKey === 'string' && apiConfig.apiKey.length > 0
        ) {
          // Ensure proxy mode is enabled by default
          const useProxy = apiConfig.useProxy === undefined ? true : apiConfig.useProxy
          console.log(`Setting API config with proxy mode: ${useProxy}`)

          // Mark configured (actual calls will use server routes)
          setIsConfigured(true)
        }

        // Load user information
        const userJson = localStorage.getItem(STORAGE_KEYS.CURRENT_USER)
        if (userJson) {
          try {
            setCurrentUser(JSON.parse(userJson))
          } catch (e) {
            console.error("Error parsing user data:", e)
          }
        }

        // Get application list
        const hasApiCfg = apiConfig !== null && typeof apiConfig.baseUrl === 'string' && apiConfig.baseUrl.length > 0 && typeof apiConfig.apiKey === 'string' && apiConfig.apiKey.length > 0
        if (hasApiCfg || isConfigured === true) {
          try {
            await fetchApplications()
          } catch (error: unknown) {
            console.error("Failed to get applications during initialization:", error)

            if (!hasApiCfg) {
              setIsConfigured(false)
            }

            toast({
              title: "API Connection Failed",
              description: toErrorMessage(error, "Please check if your API configuration is correct"),
              variant: "destructive",
            })
          }
        } else {
          // If API is not configured, use default agent's API configuration
          if (DEFAULT_AGENT.config?.apiKey && DEFAULT_AGENT.config?.baseUrl) {
            try {
              // Always enable proxy mode by default for better reliability
              const success = await configureApi(DEFAULT_AGENT.config.baseUrl, DEFAULT_AGENT.config.apiKey, true)

              if (success) {
                // Initialize default agent
                await initializeDefaultAgent()
              }
            } catch (error: unknown) {
              console.error("Failed to initialize API with default configuration:", error)
            }
          }
        }
      } catch (error: unknown) {
        console.error("Initialization failed:", error)
        toast({
          title: "Initialization Failed",
          description: "An error occurred during application initialization, switched to local storage mode",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    init()
  }, [])

  // Initialize default agent
  const initializeDefaultAgent = async () => {
    try {
      console.log("Starting to initialize default agent...")

      // Check if agent with same name already exists
      const agents = localStorageDB.getAgents()
      const existingAgent = agents.find((app) => app.name === DEFAULT_AGENT.name)

      if (existingAgent) {
        console.log("Default agent already exists, no need to create", existingAgent)
        // Update applications list
        setApplications(agents)
        // Select existing agent
        setSelectedApp(existingAgent)
        return
      }

      // Create default agent
      const newAgent = localStorageDB.initializeDefaultAgent()
      console.log("Default agent created successfully:", newAgent)

      // Refresh applications list
      await fetchApplications()

      toast({
        title: "Default agent initialized successfully",
        description: `Successfully created "${DEFAULT_AGENT.name}" agent`,
      })
    } catch (error: unknown) {
      console.error("Failed to initialize default agent:", error)

      toast({
        title: "Failed to initialize default agent",
        description: toErrorMessage(error, "Error creating default agent"),
        variant: "destructive",
      })
    }
  }

  // Configure API
  const configureApi = async (baseUrl: string, apiKey: string, useProxy = false): Promise<boolean> => {
    try {
      setIsLoading(true)

      if (!baseUrl || !apiKey) {
        toast({
          title: "API configuration failed",
          description: "API endpoint URL and API key cannot be empty",
          variant: "destructive",
        })
        return false
      }

      if (!baseUrl.startsWith("http://") && !baseUrl.startsWith("https://")) {
        toast({
          title: "API configuration failed",
          description: "API endpoint URL must start with http:// or https://",
          variant: "destructive",
        })
        return false
      }

      try {
        new URL(baseUrl)
      } catch (e) {
        toast({
          title: "API configuration failed",
          description: "API endpoint URL format is invalid",
          variant: "destructive",
        })
        return false
      }

      // Save to local storage，带默认/原则模型（若已有）
      const localCfgRaw = localStorage.getItem(STORAGE_KEYS.API_CONFIG)
      let prevExtra: { defaultModel?: string; principleModel?: string } = {}
      try {
        const parsed = localCfgRaw ? JSON.parse(localCfgRaw) : {}
        if (parsed && typeof parsed === 'object') {
          const obj = parsed as Record<string, unknown>
          const defaultModel = typeof obj.defaultModel === 'string' ? obj.defaultModel : undefined
          const principleModel = typeof obj.principleModel === 'string' ? obj.principleModel : undefined
          prevExtra = { defaultModel, principleModel }
        }
      } catch { /* noop */ }
      const config: ApiConfig = {
        baseUrl,
        apiKey,
        useProxy: useProxy === undefined ? true : useProxy,
        defaultModel: prevExtra.defaultModel,
        principleModel: prevExtra.principleModel,
      }
      localStorageDB.saveApiConfig(config)

      // Test connection via server route
      try {
        const resp = await fetch("/api/fastgpt/test-connection", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ baseUrl, useProxy }),
        })
        const result = await resp.json()

        if (result?.success) {
          toast({
            title: "API configuration successful",
            description: "Successfully connected to FastGPT API",
          })

          setIsConfigured(true)

          try {
            await fetchApplications()
          } catch (appError: unknown) {
            console.error("Failed to get applications list:", appError)
            toast({
              title: "Warning",
              description: "API connection successful, but failed to get applications list. Please refresh the page later.",
              variant: "warning",
            })
          }

          return true
        } else {
          throw new Error(result?.error?.message || "Connection test failed")
        }
      } catch (error: unknown) {
        console.error("API connection test failed:", error)
        const errorMessage = toErrorMessage(error, ERROR_MESSAGES.CONNECTION_FAILED)

        toast({
          title: "API configuration failed",
          description: errorMessage + "\n\nBut configuration has been saved to local storage",
          variant: "destructive",
        })
        return false
      }
    } catch (error: unknown) {
      console.error("API configuration failed:", error)
      toast({
        title: "API configuration failed",
        description: toErrorMessage(error, ERROR_MESSAGES.UNKNOWN),
        variant: "destructive",
      })
      return false
    } finally {
      setIsLoading(false)
    }
  }

  // Get applications list
  const fetchApplications = async () => {
    try {
      setIsLoading(true)
      console.log("Starting to fetch applications list...")

      // Get applications from local storage
      let agents = localStorageDB.getAgents()

      // If no agents in local storage, initialize default agent
      if (agents.length === 0) {
        console.log("No agents in local storage, initializing default agent")
        await initializeDefaultAgent()
        agents = localStorageDB.getAgents()
      }

      // Try to load agents from admin configuration
      try {
        const adminAgents = localStorage.getItem("admin_agents")
        if (adminAgents) {
          const parsedAdminAgents = JSON.parse(adminAgents)
          if (Array.isArray(parsedAdminAgents) && parsedAdminAgents.length > 0) {
            console.log("Loading agents from admin configuration:", parsedAdminAgents.length)

            // Merge agents, avoid duplicates
            const mergedAgents = [...agents]

            parsedAdminAgents.forEach((adminAgent) => {
              // Check if agent with same ID already exists
              const existingIndex = mergedAgents.findIndex((a) => a.id === adminAgent.id)
              if (existingIndex >= 0) {
                // Update existing agent
                mergedAgents[existingIndex] = {
                  ...mergedAgents[existingIndex],
                  ...adminAgent,
                  updatedAt: new Date().toISOString(),
                }
              } else {
                // Add new agent
                mergedAgents.push({
                  ...adminAgent,
                  createdAt: adminAgent.createdAt || new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                })
              }
            })

            // Update local storage
            setLocalItem(STORAGE_KEYS.AGENTS, mergedAgents)
            agents = mergedAgents
          }
        }
      } catch (adminError: unknown) {
        console.error("Failed to load agents from admin configuration:", adminError)
      }

      console.log("Retrieved applications list:", agents)
      setApplications(agents)
      console.log("Applications list updated, count:", agents.length)

      // If there are applications and none selected, select the first one
      if (agents.length > 0 && selectedApp === null) {
        await selectApplication(agents[0].id)
      }
    } catch (error: unknown) {
      console.error("Failed to get applications list:", error)
      const errorMessage = toErrorMessage(error, "Please check network connection or API configuration")

      toast({
        title: "Failed to get applications list",
        description: errorMessage,
        variant: "destructive",
      })

      throw error
    } finally {
      setIsLoading(false)
    }
  }

  // Select application
  const selectApplication = async (appId: string) => {
    try {
      setIsLoading(true)
      const app = applications.find((app) => app.id === appId)

      if (!app) {
        // Get application details from local storage
        const appDetail = localStorageDB.getAgentById(appId)
        if (appDetail) {
          setSelectedApp(appDetail)
        } else {
          throw new Error("Cannot find specified agent")
        }
      } else {
        setSelectedApp(app)
      }

      // Get chat sessions for this application
      await fetchChatSessions(appId)
    } catch (error) {
      console.error("Failed to select application:", error)
      toast({
        title: "Failed to select application",
        description: "Cannot get application details",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Modified fetchChatSessions method to support pagination
  const fetchChatSessions = async (appId?: string, page = 1, limit = 20): Promise<ChatSession[]> => {
    try {
      setIsLoading(true)
      const targetAppId = (typeof appId === 'string' && appId.length > 0)
        ? appId
        : (selectedApp?.id ?? '')

      if (targetAppId.length === 0) {
        setChatSessions([])
        setHasMoreSessions(false)
        return []
      }

      // Get chat sessions from local storage
      const allSessions = localStorageDB.getChatSessions(targetAppId)

      // Simulate pagination
      const startIndex = (page - 1) * limit
      const endIndex = startIndex + limit
      const paginatedSessions = allSessions.slice(startIndex, endIndex)

      // Update state
      if (page === 1) {
        setChatSessions(paginatedSessions)
      } else {
        setChatSessions((prev) => [...prev, ...paginatedSessions])
      }

      setCurrentPage(page)
      setHasMoreSessions(endIndex < allSessions.length)

      // If there are sessions and none selected, select the first one (only on first page)
      if (paginatedSessions.length > 0 && page === 1 && !selectedSession) {
        await selectChatSession(paginatedSessions[0].id)
      } else if (page === 1) {
        setSelectedSession(null)
      }

      return paginatedSessions
    } catch (error: unknown) {
      console.error("Failed to get chat sessions list:", error)
      toast({
        title: "Failed to get chat sessions",
        description: "Please check network connection or API configuration",
        variant: "destructive",
      })
      return []
    } finally {
      setIsLoading(false)
    }
  }

  // Select chat session
  const selectChatSession = async (sessionId: string) => {
    const session = chatSessions.find((session) => session.id === sessionId)
    if (session) {
      setSelectedSession(session)
    }
  }

  // Create chat session
  const createChatSession = async (appId: string, title?: string): Promise<ChatSession> => {
    try {
      setIsLoading(true)

      // Create chat session
      const newSession = localStorageDB.createChatSession(appId, title)

      // Update sessions list
      setChatSessions((prev) => [newSession, ...prev])

      // Select new session
      setSelectedSession(newSession)

      return newSession
    } catch (error: unknown) {
      console.error("Failed to create chat session:", error)
      toast({
        title: "Failed to create chat session",
        description: "Please check network connection or API configuration",
        variant: "destructive",
      })
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  // Set current user and save to localStorage
  const handleSetCurrentUser = (user: User | null) => {
    setCurrentUser(user)
    if (user) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user))
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER)
    }
  }

  // Add new state and methods to value object
  const value = {
    isConfigured,
    isLoading,
    currentUser,
    applications,
    selectedApp,
    chatSessions,
    selectedSession,
    configureApi,
    fetchApplications,
    selectApplication,
    fetchChatSessions,
    selectChatSession,
    createChatSession,
    setCurrentUser: handleSetCurrentUser,
    initializeDefaultAgent,
    hasMoreSessions,
    currentPage,
    apiKey,
    setApiKey,
  }

  return <FastGPTContext.Provider value={value}>{children}</FastGPTContext.Provider>
}

export { FastGPTProvider }

export const useFastGPT = () => {
  const context = useContext(FastGPTContext)
  if (context === undefined) {
    throw new Error("useFastGPT must be used within a FastGPTProvider")
  }
  return context
}
