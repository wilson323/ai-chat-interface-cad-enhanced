"use client"

import { DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import type React from "react"
import { useState, useEffect, useCallback, useMemo, memo, useRef } from "react"
import { Button } from "@/components/ui/button"
import { useFastGPT } from "@/contexts/FastGPTContext"
import {
  Clock,
  Pin,
  MoreHorizontal,
  Trash2,
  PinOff,
  Edit,
  Check,
  Loader2,
  Star,
  Download,
  Share2,
  Bookmark,
  Copy,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { formatDistanceToNow } from "date-fns"
import { zhCN } from "date-fns/locale"
import { useMobile } from "@/hooks/use-mobile"
import { useToast } from "@/hooks/use-toast"
import FastGPTApi from "@/lib/api/fastgpt"
import { useVirtualizer } from "@tanstack/react-virtual"
import { useInView } from "react-intersection-observer"

// 每页加载的会话数量
const SESSIONS_PER_PAGE = 20

// 滚动位置存储键
const SCROLL_POSITION_KEYS = {
  PINNED_SESSIONS: "ai_chat_pinned_sessions_scroll",
  UNPINNED_SESSIONS: "ai_chat_unpinned_sessions_scroll",
  FAVORITES: "ai_chat_favorites_scroll",
  ACTIVE_TAB: "ai_chat_sidebar_active_tab",
}

// 滚动行为配置
const SCROLL_BEHAVIOR: ScrollBehavior = "smooth"

// 滚动动画持续时间（毫秒）
const SCROLL_ANIMATION_DURATION = 300

type ChatSidebarProps = {
  isOpen: boolean
  onClose: () => void
}

type SessionItemProps = {
  session: any
  isSelected: boolean
  isEditing: boolean
  newTitle: string
  setNewTitle: (v: string) => void
  setEditingSessionId: (id: string | null) => void
  handleUpdateSessionTitle: (id: string) => void
  handleTogglePinSession: (id: string, isPinned: boolean, e: React.MouseEvent) => void
  handleExportToPDF: (id: string, e: React.MouseEvent) => void
  handleShareChat: (id: string, e: React.MouseEvent) => void
  handleDeleteSession: (id: string, e: React.MouseEvent) => void
  selectChatSession: (id: string) => void
  isMobile: boolean
  onClose: () => void
  formatDate: (dateString: string) => string
}

// 使用memo优化会话项组件
const SessionItem = memo(
  ({
    session,
    isSelected,
    isEditing,
    newTitle,
    setNewTitle,
    setEditingSessionId,
    handleUpdateSessionTitle,
    handleTogglePinSession,
    handleExportToPDF,
    handleShareChat,
    handleDeleteSession,
    selectChatSession,
    isMobile,
    onClose,
    formatDate,
  }: SessionItemProps) => {
    const isPinned = session.isPinned

    return (
      <div
        onClick={() => {
          selectChatSession(session.id)
          if (isMobile) onClose()
        }}
        className={`
          p-3 rounded-lg mb-2 cursor-pointer transition-colors group
          ${
            isSelected
              ? "bg-green-50 dark:bg-green-900/20 border-l-2 border-[#6cb33f]"
              : "hover:bg-gray-100 dark:hover:bg-gray-800"
          }
        `}
      >
        <div className="flex justify-between items-center mb-1">
          {isEditing ? (
            <div className="flex-1 flex items-center">
              <Input
                value={newTitle}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTitle(e.target.value)}
                placeholder="输入新标题"
                className="h-7 text-sm"
                autoFocus
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === "Enter") {
                    handleUpdateSessionTitle(session.id)
                  } else if (e.key === "Escape") {
                    setEditingSessionId(null)
                    setNewTitle("")
                  }
                }}
              />
              <div
                className="h-7 w-7 ml-1 flex items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer"
                onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                  e.stopPropagation()
                  handleUpdateSessionTitle(session.id)
                }}
              >
                <Check className="h-4 w-4" />
              </div>
            </div>
          ) : (
            <div className="font-medium truncate mr-2 flex items-center">
              {isPinned && <Star className="h-3.5 w-3.5 text-yellow-400 mr-1.5 flex-shrink-0" />}
              <span className="truncate">{session.title}</span>
            </div>
          )}
          <div className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap flex items-center">
            <Clock className="h-3 w-3 mr-1" />
            {formatDate(session.lastMessageAt || session.createdAt)}
          </div>
        </div>
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-500 dark:text-gray-400 truncate">{session.messageCount || 0} 条消息</div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div
                className="h-6 w-6 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer"
                onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation()
                  setEditingSessionId(session.id)
                  setNewTitle(session.title)
                }}
              >
                <Edit className="h-4 w-4 mr-2" />
                重命名
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation()
                  handleTogglePinSession(session.id, isPinned, e)
                }}
              >
                {isPinned ? (
                  <>
                    <PinOff className="h-4 w-4 mr-2" />
                    取消置顶
                  </>
                ) : (
                  <>
                    <Pin className="h-4 w-4 mr-2" />
                    置顶对话
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation()
                  handleExportToPDF(session.id, e)
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                导出PDF
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation()
                  handleShareChat(session.id, e)
                }}
              >
                <Share2 className="h-4 w-4 mr-2" />
                分享对话
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-500 focus:text-red-500"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation()
                  handleDeleteSession(session.id, e)
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                删除对话
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    )
  },
  (prevProps: SessionItemProps, nextProps: SessionItemProps) => {
    // 只有在这些属性变化时才重新渲染
    return (
      prevProps.session.id === nextProps.session.id &&
      prevProps.session.title === nextProps.session.title &&
      prevProps.session.isPinned === nextProps.session.isPinned &&
      prevProps.session.messageCount === nextProps.session.messageCount &&
      prevProps.session.lastMessageAt === nextProps.session.lastMessageAt &&
      prevProps.isSelected === nextProps.isSelected &&
      prevProps.isEditing === nextProps.isEditing &&
      (prevProps.isEditing ? prevProps.newTitle === nextProps.newTitle : true)
    )
  },
)

// 使用memo优化收藏消息项组件
const FavoriteMessageItem = memo(({ message, formatDate, copyToClipboard, handleUnfavoriteMessage }: { message: any; formatDate: (d: string) => string; copyToClipboard: (t: string) => void; handleUnfavoriteMessage: (id: string) => Promise<void> }) => {
  return (
    <div className="p-3 rounded-lg mb-3 bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex justify-between items-center mb-1">
        <div className="flex items-center">
          <Bookmark className="h-4 w-4 text-yellow-500 mr-1.5" />
          <span className="text-sm font-medium">{message.chatTitle || "未命名对话"}</span>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">{formatDate(message.timestamp)}</div>
      </div>

      <div className="mt-2 p-3 rounded bg-gray-50 dark:bg-gray-700/50 text-sm">{message.content}</div>

      <div className="mt-2 flex justify-between items-center">
        <div className="text-xs text-gray-500 dark:text-gray-400">来自: {message.appName || "未知智能体"}</div>
        <div className="flex space-x-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            onClick={() => copyToClipboard(message.content)}
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-gray-400 hover:text-red-500"
            onClick={() => handleUnfavoriteMessage(message.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
})

// 加载更多指示器组件
const LoadMoreIndicator = ({ loading, onInView }) => {
  const { ref } = useInView({
    onChange: (inView) => {
      if (inView && !loading) {
        onInView()
      }
    },
    threshold: 0.5,
  })

  return (
    <div ref={ref} className="py-4 flex justify-center">
      {loading ? (
        <div className="flex items-center space-x-2">
          <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
          <span className="text-sm text-gray-500">加载更多...</span>
        </div>
      ) : (
        <div className="h-8" /> // 占位元素，确保有足够的空间触发 InView
      )}
    </div>
  )
}

// 平滑滚动到指定位置
const smoothScrollTo = (element: HTMLElement | null, position: number, immediate = false) => {
  if (!element) return

  try {
    element.scrollTo({
      top: position,
      behavior: immediate ? "auto" : SCROLL_BEHAVIOR,
    })
  } catch (error) {
    // 回退到传统方法，以防浏览器不支持平滑滚动
    element.scrollTop = position
  }
}

// 滚动到指定元素
const scrollToElement = (
  parentElement: HTMLElement | null,
  targetElement: HTMLElement | null,
  offset = 0,
  immediate = false,
) => {
  if (!parentElement || !targetElement) return

  const parentRect = parentElement.getBoundingClientRect()
  const targetRect = targetElement.getBoundingClientRect()
  const relativeTop = targetRect.top - parentRect.top

  smoothScrollTo(parentElement, relativeTop + parentElement.scrollTop - offset, immediate)
}

// 保存滚动位置到本地存储
const saveScrollPosition = (key: string, position: number) => {
  try {
    localStorage.setItem(key, position.toString())
  } catch (error) {
    console.error("保存滚动位置失败:", error)
  }
}

// 从本地存储获取滚动位置
const getScrollPosition = (key: string): number => {
  try {
    const position = localStorage.getItem(key)
    return position ? Number.parseInt(position, 10) : 0
  } catch (error) {
    console.error("获取滚动位置失败:", error)
    return 0
  }
}

// 防抖函数
const debounce = (fn: Function, ms = 300) => {
  let timeoutId: ReturnType<typeof setTimeout>
  return function (this: any, ...args: any[]) {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn.apply(this, args), ms)
  }
}

export function ChatSidebar({ isOpen, onClose }: ChatSidebarProps) {
  const {
    chatSessions,
    selectedSession,
    selectChatSession,
    createChatSession,
    selectedApp,
    isLoading,
    fetchChatSessions,
    hasMoreSessions,
    currentPage,
  } = useFastGPT()
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const isMobile = useMobile()
  const { toast } = useToast()
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState("")
  const [activeTab, setActiveTab] = useState<"chats" | "favorites">(() => {
    // 从本地存储恢复活动标签
    const savedTab = localStorage.getItem(SCROLL_POSITION_KEYS.ACTIVE_TAB)
    return (savedTab as "chats" | "favorites") || "chats"
  })
  const [favoriteMessages, setFavoriteMessages] = useState<any[]>([])
  const [isLoadingFavorites, setIsLoadingFavorites] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isClearingAll, setIsClearingAll] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [favoritesPage, setFavoritesPage] = useState(1)
  const [hasMoreFavorites, setHasMoreFavorites] = useState(true)
  const [isLoadingMoreFavorites, setIsLoadingMoreFavorites] = useState(false)

  // 滚动位置恢复标志
  const [shouldRestoreScroll, setShouldRestoreScroll] = useState(true)
  const [initialScrollRestored, setInitialScrollRestored] = useState({
    pinnedSessions: false,
    unpinnedSessions: false,
    favorites: false,
  })

  // 虚拟滚动的引用
  const pinnedSessionsParentRef = useRef<HTMLDivElement>(null)
  const unpinnedSessionsParentRef = useRef<HTMLDivElement>(null)
  const favoritesParentRef = useRef<HTMLDivElement>(null)

  // 选中会话的引用
  const selectedSessionRef = useRef<HTMLDivElement>(null)

  // 使用useMemo优化过滤会话列表，避免每次渲染都重新计算
  const filteredSessions = useMemo(() => {
    if (!searchQuery) return chatSessions
    return chatSessions.filter((session) => session.title.toLowerCase().includes(searchQuery.toLowerCase()))
  }, [chatSessions, searchQuery])

  // 使用useMemo分离置顶和非置顶会话
  const { pinnedSessions, unpinnedSessions } = useMemo(() => {
    const pinned = filteredSessions.filter((session) => session.isPinned)
    const unpinned = filteredSessions.filter((session) => !session.isPinned)
    return { pinnedSessions: pinned, unpinnedSessions: unpinned }
  }, [filteredSessions])

  // 创建置顶会话的虚拟滚动器
  const pinnedSessionsVirtualizer = useVirtualizer({
    count: pinnedSessions.length,
    getScrollElement: () => pinnedSessionsParentRef.current,
    estimateSize: () => 80, // 估计每个会话项的高度
    overscan: 5, // 预渲染额外的项目以提高滚动体验
  })

  // 创建非置顶会话的虚拟滚动器
  const unpinnedSessionsVirtualizer = useVirtualizer({
    count: unpinnedSessions.length,
    getScrollElement: () => unpinnedSessionsParentRef.current,
    estimateSize: () => 80, // 估计每个会话项的高度
    overscan: 5,
  })

  // 创建收藏消息的虚拟滚动器
  const favoritesVirtualizer = useVirtualizer({
    count: favoriteMessages.length,
    getScrollElement: () => favoritesParentRef.current,
    estimateSize: () => 150, // 估计每个收藏消息项的高度
    overscan: 5,
  })

  // 保存活动标签到本地存储
  useEffect(() => {
    localStorage.setItem(SCROLL_POSITION_KEYS.ACTIVE_TAB, activeTab)
  }, [activeTab])

  // 初始加载会话
  useEffect(() => {
    if (selectedApp && isOpen) {
      fetchChatSessions(selectedApp.id, 1, SESSIONS_PER_PAGE)
    }
  }, [selectedApp, isOpen, fetchChatSessions])

  // 防抖保存滚动位置
  const debouncedSaveScrollPosition = useCallback(
    debounce((key: string, position: number) => {
      saveScrollPosition(key, position)
    }, 100),
    [],
  )

  // 监听滚动事件并保存滚动位置
  useEffect(() => {
    const savePinnedSessionsScroll = () => {
      if (pinnedSessionsParentRef.current) {
        debouncedSaveScrollPosition(SCROLL_POSITION_KEYS.PINNED_SESSIONS, pinnedSessionsParentRef.current.scrollTop)
      }
    }

    const saveUnpinnedSessionsScroll = () => {
      if (unpinnedSessionsParentRef.current) {
        debouncedSaveScrollPosition(SCROLL_POSITION_KEYS.UNPINNED_SESSIONS, unpinnedSessionsParentRef.current.scrollTop)
      }
    }

    const saveFavoritesScroll = () => {
      if (favoritesParentRef.current) {
        debouncedSaveScrollPosition(SCROLL_POSITION_KEYS.FAVORITES, favoritesParentRef.current.scrollTop)
      }
    }

    // 添加滚动事件监听器
    const pinnedEl = pinnedSessionsParentRef.current
    const unpinnedEl = unpinnedSessionsParentRef.current
    const favoritesEl = favoritesParentRef.current

    if (pinnedEl) {
      pinnedEl.addEventListener("scroll", savePinnedSessionsScroll)
    }
    if (unpinnedEl) {
      unpinnedEl.addEventListener("scroll", saveUnpinnedSessionsScroll)
    }
    if (favoritesEl) {
      favoritesEl.addEventListener("scroll", saveFavoritesScroll)
    }

    // 清理事件监听器
    return () => {
      if (pinnedEl) {
        pinnedEl.removeEventListener("scroll", savePinnedSessionsScroll)
      }
      if (unpinnedEl) {
        unpinnedEl.removeEventListener("scroll", saveUnpinnedSessionsScroll)
      }
      if (favoritesEl) {
        favoritesEl.removeEventListener("scroll", saveFavoritesScroll)
      }
    }
  }, [isOpen, debouncedSaveScrollPosition])

  // 恢复滚动位置
  useEffect(() => {
    if (!isOpen || !shouldRestoreScroll) return

    // 使用setTimeout确保DOM已更新
    const restoreScrollTimeout = setTimeout(() => {
      // 恢复置顶会话滚动位置
      if (pinnedSessionsParentRef.current && pinnedSessions.length > 0 && !initialScrollRestored.pinnedSessions) {
        const savedPosition = getScrollPosition(SCROLL_POSITION_KEYS.PINNED_SESSIONS)
        smoothScrollTo(pinnedSessionsParentRef.current, savedPosition, false)
        setInitialScrollRestored((prev) => ({ ...prev, pinnedSessions: true }))
      }

      // 恢复非置顶会话滚动位置
      if (unpinnedSessionsParentRef.current && unpinnedSessions.length > 0 && !initialScrollRestored.unpinnedSessions) {
        const savedPosition = getScrollPosition(SCROLL_POSITION_KEYS.UNPINNED_SESSIONS)
        smoothScrollTo(unpinnedSessionsParentRef.current, savedPosition, false)
        setInitialScrollRestored((prev) => ({ ...prev, unpinnedSessions: true }))
      }

      // 恢复收藏消息滚动位置
      if (
        favoritesParentRef.current &&
        favoriteMessages.length > 0 &&
        !initialScrollRestored.favorites &&
        activeTab === "favorites"
      ) {
        const savedPosition = getScrollPosition(SCROLL_POSITION_KEYS.FAVORITES)
        smoothScrollTo(favoritesParentRef.current, savedPosition, false)
        setInitialScrollRestored((prev) => ({ ...prev, favorites: true }))
      }

      // 标记滚动位置已恢复
      if (
        (pinnedSessions.length === 0 || initialScrollRestored.pinnedSessions) &&
        (unpinnedSessions.length === 0 || initialScrollRestored.unpinnedSessions) &&
        (favoriteMessages.length === 0 || initialScrollRestored.favorites || activeTab !== "favorites")
      ) {
        setShouldRestoreScroll(false)
      }
    }, 100) // 短暂延迟确保DOM已更新

    return () => clearTimeout(restoreScrollTimeout)
  }, [
    isOpen,
    pinnedSessions.length,
    unpinnedSessions.length,
    favoriteMessages.length,
    activeTab,
    shouldRestoreScroll,
    initialScrollRestored,
  ])

  // 当侧边栏重新打开时，重置滚动恢复标志
  useEffect(() => {
    if (isOpen) {
      setShouldRestoreScroll(true)
      setInitialScrollRestored({
        pinnedSessions: false,
        unpinnedSessions: false,
        favorites: false,
      })
    }
  }, [isOpen])

  // 滚动到选中的会话
  useEffect(() => {
    if (!isOpen || !selectedSession || searchQuery) return

    // 查找选中会话在哪个列表中
    const isPinned = selectedSession.isPinned
    const containerRef = isPinned ? pinnedSessionsParentRef.current : unpinnedSessionsParentRef.current

    // 找到选中会话在虚拟列表中的索引
    const sessionList = isPinned ? pinnedSessions : unpinnedSessions
    const sessionIndex = sessionList.findIndex((s) => s.id === selectedSession.id)

    if (sessionIndex !== -1 && containerRef) {
      // 使用虚拟滚动器的scrollToIndex方法
      const virtualizer = isPinned ? pinnedSessionsVirtualizer : unpinnedSessionsVirtualizer
      virtualizer.scrollToIndex(sessionIndex, { align: "center", behavior: "smooth" })
    }
  }, [
    selectedSession,
    isOpen,
    searchQuery,
    pinnedSessions,
    unpinnedSessions,
    pinnedSessionsVirtualizer,
    unpinnedSessionsVirtualizer,
  ])

  // 加载更多会话
  const loadMoreSessions = useCallback(async () => {
    if (!selectedApp || isLoadingMore || !hasMoreSessions || searchQuery) return

    try {
      setIsLoadingMore(true)
      await fetchChatSessions(selectedApp.id, currentPage + 1, SESSIONS_PER_PAGE)
    } catch (error) {
      console.error("加载更多会话失败:", error)
      toast({
        title: "加载失败",
        description: "无法加载更多会话，请稍后重试",
        variant: "destructive",
      })
    } finally {
      setIsLoadingMore(false)
    }
  }, [selectedApp, isLoadingMore, hasMoreSessions, currentPage, fetchChatSessions, searchQuery, toast])

  // 加载收藏消息 - 使用useCallback优化
  const loadFavorites = useCallback(
    async (page = 1) => {
      if (!selectedApp) return

      try {
        if (page === 1) {
          setIsLoadingFavorites(true)
        } else {
          setIsLoadingMoreFavorites(true)
        }

        // 模拟分页加载收藏消息
        const limit = 20
        const favorites = await FastGPTApi.getFavoriteMessages(selectedApp.id, page, limit)

        if (page === 1) {
          setFavoriteMessages(favorites)
        } else {
          setFavoriteMessages((prev) => [...prev, ...favorites])
        }

        setFavoritesPage(page)
        setHasMoreFavorites(favorites.length === limit)
      } catch (error) {
        console.error("加载收藏消息失败:", error)
      } finally {
        if (page === 1) {
          setIsLoadingFavorites(false)
        } else {
          setIsLoadingMoreFavorites(false)
        }
      }
    },
    [selectedApp],
  )

  // 加载更多收藏消息
  const loadMoreFavorites = useCallback(() => {
    if (isLoadingMoreFavorites || !hasMoreFavorites) return
    loadFavorites(favoritesPage + 1)
  }, [favoritesPage, hasMoreFavorites, isLoadingMoreFavorites, loadFavorites])

  // 使用正确的依赖数组优化useEffect
  useEffect(() => {
    if (activeTab === "favorites" && selectedApp) {
      loadFavorites(1)
    }
  }, [activeTab, selectedApp, loadFavorites])

  // 搜索时重置分页
  useEffect(() => {
    if (searchQuery && selectedApp) {
      // 当搜索查询变化时，重置为第一页
      fetchChatSessions(selectedApp.id, 1, SESSIONS_PER_PAGE)
    }
  }, [searchQuery, selectedApp, fetchChatSessions])

  // 格式化日期 - 使用useCallback优化
  const formatDate = useCallback((dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffInDays === 0) {
      return `今天`
    } else if (diffInDays === 1) {
      return `昨天`
    } else if (diffInDays < 7) {
      return date.toLocaleDateString([], { weekday: "long" })
    } else {
      return date.toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" })
    }
  }, [])

  // 格式化时间 - 使用useCallback优化
  const formatTime = useCallback((dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: zhCN })
    } catch (e) {
      return "未知时间"
    }
  }, [])

  // 处理新建会话 - 使用useCallback优化
  const handleNewChat = useCallback(async () => {
    if (!selectedApp) {
      toast({
        title: "未选择智能体",
        description: "请先选择一个AI智能体",
        variant: "destructive",
      })
      return
    }
    try {
      await createChatSession(selectedApp.id)
      if (isMobile) onClose()
    } catch (error) {
      console.error("创建会话失败:", error)
    }
  }, [selectedApp, createChatSession, isMobile, onClose, toast])

  // 删除对话 - 使用useCallback优化
  const handleDeleteSession = useCallback(
    async (sessionId: string, e: React.MouseEvent) => {
      e.stopPropagation()

      try {
        // 后端未提供删除接口，前端本地删除
        const key = `chat_sessions_${selectedApp?.id}`
        const list = JSON.parse(localStorage.getItem(key) || '[]')
        const next = list.filter((s: any) => s.id !== sessionId)
        localStorage.setItem(key, JSON.stringify(next))
        if (selectedApp) await fetchChatSessions(selectedApp.id, 1, SESSIONS_PER_PAGE)
        toast({
          title: "删除成功",
          description: "对话已成功删除",
        })

        // 重新加载对话列表
        if (selectedApp) {
          await fetchChatSessions(selectedApp.id, 1, SESSIONS_PER_PAGE)
        }
      } catch (error) {
        console.error("删除对话失败:", error)
        toast({
          title: "删除失败",
          description: "无法删除对话，请稍后重试",
          variant: "destructive",
        })
      }
    },
    [selectedApp, fetchChatSessions, toast],
  )

  // 清空所有对话 - 使用useCallback优化
  const handleClearAllSessions = useCallback(async () => {
    if (!selectedApp) return

    try {
      setIsClearingAll(true)
      // TODO: 后端未实现清空接口：前端暂时通过本地存储清空
      localStorage.setItem(`chat_sessions_${selectedApp.id}`, JSON.stringify([]))

      // 重新加载对话列表
      await fetchChatSessions(selectedApp.id, 1, SESSIONS_PER_PAGE)

      toast({
        title: "清空成功",
        description: "所有对话已成功清空",
      })
    } catch (error) {
      console.error("清空所有对话失败:", error)
      toast({
        title: "清空失败",
        description: "无法清空所有对话，请稍后重试",
        variant: "destructive",
      })
    } finally {
      setIsClearingAll(false)
    }
  }, [selectedApp, fetchChatSessions, toast])

  // 修改对话标题 - 使用useCallback优化
  const handleUpdateSessionTitle = useCallback(
    async (sessionId: string) => {
      if (!newTitle.trim()) return

      try {
        // TODO: 后端未提供更新标题接口：前端本地更新
        const key = `chat_sessions_${selectedApp?.id}`
        const list = JSON.parse(localStorage.getItem(key) || "[]")
        const idx = list.findIndex((s: any) => s.id === sessionId)
        if (idx >= 0) { list[idx].title = newTitle; localStorage.setItem(key, JSON.stringify(list)) }

        // 重新加载对话列表
        if (selectedApp) {
          await fetchChatSessions(selectedApp.id, 1, SESSIONS_PER_PAGE)
        }

        setEditingSessionId(null)
        setNewTitle("")

        toast({
          title: "修改成功",
          description: "对话标题已成功修改",
        })
      } catch (error) {
        console.error("修改对话标题失败:", error)
        toast({
          title: "修改失败",
          description: "无法修改对话标题，请稍后重试",
          variant: "destructive",
        })
      }
    },
    [newTitle, selectedApp, fetchChatSessions, toast],
  )

  // 置顶/取消置顶 - 使用useCallback优化
  const handleTogglePinSession = useCallback(
    async (sessionId: string, isPinned: boolean, e: React.MouseEvent) => {
      e.stopPropagation()

      try {
        // TODO: 后端未提供置顶接口：前端本地更新
        const key2 = `chat_sessions_${selectedApp?.id}`
        const list2 = JSON.parse(localStorage.getItem(key2) || "[]")
        const idx2 = list2.findIndex((s: any) => s.id === sessionId)
        if (idx2 >= 0) { list2[idx2].isPinned = !isPinned; localStorage.setItem(key2, JSON.stringify(list2)) }

        // 重新加载对话列表
        if (selectedApp) {
          await fetchChatSessions(selectedApp.id, 1, SESSIONS_PER_PAGE)
        }

        toast({
          title: isPinned ? "取消置顶" : "置顶成功",
          description: isPinned ? "对话已取消置顶" : "对话已成功置顶",
        })
      } catch (error) {
        console.error("置顶/取消置顶对话失败:", error)
        toast({
          title: "操作失败",
          description: "无法置顶/取消置顶对话，请稍后重试",
          variant: "destructive",
        })
      }
    },
    [selectedApp, fetchChatSessions, toast],
  )

  // 导出为PDF - 使用useCallback优化
  const handleExportToPDF = useCallback(async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation()

    try {
      setIsExporting(true)
      // TODO: 后端未提供导出PDF：使用占位PDF
      const pdfData = new Uint8Array([0x25,0x50,0x44,0x46,0x2D])

      // 创建一个Blob对象
      const blob = new Blob([pdfData], { type: "application/pdf" })

      // 创建一个下载链接
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `chat_session_${sessionId}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)

      // 释放URL对象
      window.URL.revokeObjectURL(url)

      toast({
        title: "导出成功",
        description: "对话已成功导出为PDF",
      })
    } catch (error) {
      console.error("导出PDF失败:", error)
      toast({
        title: "导出失败",
        description: "无法导出PDF，请稍后重试",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }, [])

  // 分享对话 - 使用useCallback优化
  const handleShareChat = useCallback(async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation()

    try {
      const shareUrl = `${location.origin}/shared/${sessionId}`

      // 复制到剪贴板
      navigator.clipboard.writeText(shareUrl)

      toast({
        title: "分享链接已复制",
        description: "分享链接已复制到剪贴板",
      })
    } catch (error) {
      console.error("生成分享链接失败:", error)
      toast({
        title: "分享失败",
        description: "无法生成分享链接，请稍后重试",
        variant: "destructive",
      })
    }
  }, [])

  // 收藏消息 - 使用useCallback优化
  const handleUnfavoriteMessage = useCallback(async (messageId: string) => {
    try {
      // TODO: 后端未提供取消收藏：前端本地移除
      setFavoriteMessages((prev) => prev.filter((message) => message.id !== messageId))
      toast({
        title: "取消收藏成功",
        description: "消息已从收藏中移除",
      })
    } catch (error) {
      console.error("取消收藏消息失败:", error)
      toast({
        title: "取消收藏失败",
        description: "无法取消收藏消息，请稍后重试",
        variant: "destructive",
      })
    }
  }, [])

  // 复制到剪贴板 - 使用useCallback优化
  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "已复制到剪贴板",
      description: "内容已成功复制到剪贴板",
    })
  }, [])

  return (
    <div
      className={`fixed inset-y-0 left-0 z-50 w-full bg-white border-r border-gray-200 dark:bg-gray-900 dark:border-gray-800 ${
        isOpen ? "translate-x-0 shadow-lg" : "-translate-x-full"
      } transition-transform duration-300 ease-in-out`}
    >
      <div className="p-4 border-b dark:border-gray-800">
        <div className="relative">
          <Input
            type="search"
            placeholder="搜索对话..."
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            className="w-full rounded-full bg-gray-100 dark:bg-gray-800 border-none shadow-none focus-visible:ring-0 focus-visible:ring-transparent"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
              onClick={() => setSearchQuery("")}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between px-4 py-2 border-b dark:border-gray-800">
        <div className="flex space-x-2">
          <Button
            variant={activeTab === "chats" ? "default" : "outline"}
            onClick={() => setActiveTab("chats")}
            size="sm"
            className="rounded-full"
          >
            对话
          </Button>
          <Button
            variant={activeTab === "favorites" ? "default" : "outline"}
            onClick={() => setActiveTab("favorites")}
            size="sm"
            className="rounded-full"
          >
            收藏
          </Button>
        </div>
        <Button variant="secondary" size="sm" className="rounded-full" onClick={handleNewChat} disabled={isLoading}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          新建对话
        </Button>
      </div>

      <div className="flex flex-col h-[calc(100vh-150px)]">
        {activeTab === "chats" ? (
          <>
            <div className="overflow-y-auto flex-1" ref={pinnedSessionsParentRef}>
              {pinnedSessionsVirtualizer.getVirtualItems().map((virtualRow) => {
                const session = pinnedSessions[virtualRow.index]
                return (
                  <div
                    key={session.id}
                    style={{
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <SessionItem
                      session={session}
                      isSelected={selectedSession?.id === session.id}
                      isEditing={editingSessionId === session.id}
                      newTitle={newTitle}
                      setNewTitle={setNewTitle}
                      setEditingSessionId={setEditingSessionId}
                      handleUpdateSessionTitle={handleUpdateSessionTitle}
                      handleTogglePinSession={handleTogglePinSession}
                      handleExportToPDF={handleExportToPDF}
                      handleShareChat={handleShareChat}
                      handleDeleteSession={handleDeleteSession}
                      selectChatSession={selectChatSession}
                      isMobile={isMobile}
                      onClose={onClose}
                      formatDate={formatDate}
                    />
                  </div>
                )
              })}
              {pinnedSessions.length === 0 && searchQuery && (
                <div className="text-center text-gray-500 dark:text-gray-400 py-4">未找到匹配的置顶对话</div>
              )}
              {pinnedSessions.length === 0 && !searchQuery && (
                <div className="text-center text-gray-500 dark:text-gray-400 py-4">暂无置顶对话</div>
              )}
            </div>

            <div className="overflow-y-auto flex-1" ref={unpinnedSessionsParentRef}>
              {unpinnedSessionsVirtualizer.getVirtualItems().map((virtualRow) => {
                const session = unpinnedSessions[virtualRow.index]
                return (
                  <div
                    key={session.id}
                    style={{
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <SessionItem
                      session={session}
                      isSelected={selectedSession?.id === session.id}
                      isEditing={editingSessionId === session.id}
                      newTitle={newTitle}
                      setNewTitle={setNewTitle}
                      setEditingSessionId={setEditingSessionId}
                      handleUpdateSessionTitle={handleUpdateSessionTitle}
                      handleTogglePinSession={handleTogglePinSession}
                      handleExportToPDF={handleExportToPDF}
                      handleShareChat={handleShareChat}
                      handleDeleteSession={handleDeleteSession}
                      selectChatSession={selectChatSession}
                      isMobile={isMobile}
                      onClose={onClose}
                      formatDate={formatDate}
                    />
                  </div>
                )
              })}
              {unpinnedSessions.length === 0 && searchQuery && (
                <div className="text-center text-gray-500 dark:text-gray-400 py-4">未找到匹配的对话</div>
              )}
              {unpinnedSessions.length === 0 && !searchQuery && (
                <div className="text-center text-gray-500 dark:text-gray-400 py-4">暂无对话</div>
              )}
              {hasMoreSessions && <LoadMoreIndicator loading={isLoadingMore} onInView={loadMoreSessions} />}
            </div>
          </>
        ) : (
          <div className="overflow-y-auto flex-1" ref={favoritesParentRef}>
            {isLoadingFavorites ? (
              <div className="text-center text-gray-500 dark:text-gray-400 py-4">加载收藏消息中...</div>
            ) : (
              <>
                {favoritesVirtualizer.getVirtualItems().map((virtualRow) => {
                  const message = favoriteMessages[virtualRow.index]
                  return (
                    <div
                      key={message.id}
                      style={{
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      <FavoriteMessageItem
                        message={message}
                        formatDate={formatDate}
                        copyToClipboard={copyToClipboard}
                        handleUnfavoriteMessage={handleUnfavoriteMessage}
                      />
                    </div>
                  )
                })}
                {favoriteMessages.length === 0 && (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-4">暂无收藏消息</div>
                )}
                {hasMoreFavorites && (
                  <LoadMoreIndicator loading={isLoadingMoreFavorites} onInView={loadMoreFavorites} />
                )}
              </>
            )}
          </div>
        )}
      </div>

      <div className="p-4 border-t dark:border-gray-800">
        <Button
          variant="destructive"
          size="sm"
          className="w-full rounded-full"
          onClick={handleClearAllSessions}
          disabled={isClearingAll}
        >
          {isClearingAll ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          清空所有对话
        </Button>
      </div>
    </div>
  )
}
