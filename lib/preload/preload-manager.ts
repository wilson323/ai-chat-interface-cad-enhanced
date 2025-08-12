/**
 * 智能预加载系统 - 提前加载可能需要的资源
 * Smart Preloading System - Load resources that might be needed in advance
 */
import { RequestPriority } from "../api/fastgpt-optimizer"

// 预加载配置
export interface PreloadConfig {
  enabled: boolean
  maxConcurrent: number
  resourceTypes: {
    images: boolean
    scripts: boolean
    styles: boolean
    fonts: boolean
    data: boolean
  }
  priority: RequestPriority
  onProgress?: (loaded: number, total: number) => void
  debug: boolean
  logLevel: "error" | "warn" | "info" | "debug"
}

// 预加载项
interface PreloadItem {
  id: string
  url: string
  type: "image" | "script" | "style" | "font" | "data"
  priority: number
  status: "pending" | "loading" | "loaded" | "error"
  load: () => Promise<unknown>
}

// 默认配置
const DEFAULT_CONFIG: PreloadConfig = {
  enabled: true,
  maxConcurrent: 3,
  resourceTypes: {
    images: true,
    scripts: true,
    styles: true,
    fonts: true,
    data: true,
  },
  priority: RequestPriority.LOW,
  debug: false,
  logLevel: "error",
}

export class PreloadManager {
  private config: PreloadConfig
  private queue: PreloadItem[] = []
  private loading: Set<string> = new Set()
  private loaded: Set<string> = new Set()
  private failed: Set<string> = new Set()
  private resourceCache: Map<string, unknown> = new Map()
  private loadStartTime: Map<string, number> = new Map()
  private totalPreloaded = 0
  private totalFailed = 0
  private totalTime = 0

  constructor(config: Partial<PreloadConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }

    this.log("info", "PreloadManager initialized with config:", this.config)
  }

  /**
   * 预加载图片
   * @param url 图片URL
   * @param priority 优先级
   * @returns 图片元素Promise
   */
  public preloadImage(url: string, priority = 0): Promise<HTMLImageElement> {
    if (this.config.enabled !== true || this.config.resourceTypes.images !== true) {
      return Promise.resolve(new Image())
    }

    // 检查是否已加载
    if (this.loaded.has(url)) {
      return Promise.resolve(this.resourceCache.get(url) as HTMLImageElement)
    }

    // 检查是否正在加载
    if (this.loading.has(url)) {
      return new Promise((resolve, reject) => {
        const checkInterval = setInterval(() => {
          if (this.loaded.has(url)) {
            clearInterval(checkInterval)
            resolve(this.resourceCache.get(url) as HTMLImageElement)
          } else if (this.failed.has(url)) {
            clearInterval(checkInterval)
            reject(new Error(`Failed to preload image: ${url}`))
          }
        }, 100)
      })
    }

    // 创建预加载项
    const item: PreloadItem = {
      id: `image-${url}`,
      url,
      type: "image",
      priority,
      status: "pending",
      load: () => {
        return new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image()
          img.crossOrigin = "anonymous"

          img.onload = () => {
            this.resourceCache.set(url, img)
            this.loaded.add(url)
            this.loading.delete(url)
            item.status = "loaded"

            // 记录加载时间
            const startTime = this.loadStartTime.get(url) || 0
            const loadTime = Date.now() - startTime
            this.totalTime += loadTime
            this.totalPreloaded++

            this.log("debug", `Image preloaded: ${url} (${loadTime}ms)`)

            // 触发进度回调
            this.triggerProgressCallback()

            resolve(img)
            this.processQueue()
          }

          img.onerror = () => {
            this.failed.add(url)
            this.loading.delete(url)
            item.status = "error"
            this.totalFailed++

            this.log("error", `Failed to preload image: ${url}`)

            // 触发进度回调
            this.triggerProgressCallback()

            reject(new Error(`Failed to preload image: ${url}`))
            this.processQueue()
          }

          // 记录开始时间
          this.loadStartTime.set(url, Date.now())
          this.loading.add(url)
          item.status = "loading"

          img.src = url
        })
      },
    }

    // 添加到队列
    this.queue.push(item)
    this.sortQueue()
    this.processQueue()

    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        if (this.loaded.has(url)) {
          clearInterval(checkInterval)
          resolve(this.resourceCache.get(url) as HTMLImageElement)
        } else if (this.failed.has(url)) {
          clearInterval(checkInterval)
          reject(new Error(`Failed to preload image: ${url}`))
        }
      }, 100)
    })
  }

  /**
   * 预加载脚本
   * @param url 脚本URL
   * @param priority 优先级
   * @returns 脚本元素Promise
   */
  public preloadScript(url: string, priority = 0): Promise<HTMLScriptElement> {
    if (this.config.enabled !== true || this.config.resourceTypes.scripts !== true) {
      return Promise.resolve(document.createElement("script"))
    }

    // 检查是否已加载
    if (this.loaded.has(url)) {
      return Promise.resolve(this.resourceCache.get(url) as HTMLScriptElement)
    }

    // 检查是否正在加载
    if (this.loading.has(url)) {
      return new Promise((resolve, reject) => {
        const checkInterval = setInterval(() => {
          if (this.loaded.has(url)) {
            clearInterval(checkInterval)
            resolve(this.resourceCache.get(url) as HTMLScriptElement)
          } else if (this.failed.has(url)) {
            clearInterval(checkInterval)
            reject(new Error(`Failed to preload script: ${url}`))
          }
        }, 100)
      })
    }

    // 创建预加载项
    const item: PreloadItem = {
      id: `script-${url}`,
      url,
      type: "script",
      priority,
      status: "pending",
      load: () => {
        return new Promise<HTMLScriptElement>((resolve, reject) => {
          const script = document.createElement("script")
          script.type = "text/javascript"

          script.onload = () => {
            this.resourceCache.set(url, script)
            this.loaded.add(url)
            this.loading.delete(url)
            item.status = "loaded"

            // 记录加载时间
            const startTime = this.loadStartTime.get(url) || 0
            const loadTime = Date.now() - startTime
            this.totalTime += loadTime
            this.totalPreloaded++

            this.log("debug", `Script preloaded: ${url} (${loadTime}ms)`)

            // 触发进度回调
            this.triggerProgressCallback()

            resolve(script)
            this.processQueue()
          }

          script.onerror = () => {
            this.failed.add(url)
            this.loading.delete(url)
            item.status = "error"
            this.totalFailed++

            this.log("error", `Failed to preload script: ${url}`)

            // 触发进度回调
            this.triggerProgressCallback()

            reject(new Error(`Failed to preload script: ${url}`))
            this.processQueue()
          }

          // 记录开始时间
          this.loadStartTime.set(url, Date.now())
          this.loading.add(url)
          item.status = "loading"

          script.src = url
          document.head.appendChild(script)
        })
      },
    }

    // 添加到队列
    this.queue.push(item)
    this.sortQueue()
    this.processQueue()

    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        if (this.loaded.has(url)) {
          clearInterval(checkInterval)
          resolve(this.resourceCache.get(url) as HTMLScriptElement)
        } else if (this.failed.has(url)) {
          clearInterval(checkInterval)
          reject(new Error(`Failed to preload script: ${url}`))
        }
      }, 100)
    })
  }

  /**
   * 预加载样式
   * @param url 样式URL
   * @param priority 优先级
   * @returns 样式元素Promise
   */
  public preloadStyle(url: string, priority = 0): Promise<HTMLLinkElement> {
    if (this.config.enabled !== true || this.config.resourceTypes.styles !== true) {
      return Promise.resolve(document.createElement("link"))
    }

    // 检查是否已加载
    if (this.loaded.has(url)) {
      return Promise.resolve(this.resourceCache.get(url) as HTMLLinkElement)
    }

    // 检查是否正在加载
    if (this.loading.has(url)) {
      return new Promise((resolve, reject) => {
        const checkInterval = setInterval(() => {
          if (this.loaded.has(url)) {
            clearInterval(checkInterval)
            resolve(this.resourceCache.get(url) as HTMLLinkElement)
          } else if (this.failed.has(url)) {
            clearInterval(checkInterval)
            reject(new Error(`Failed to preload style: ${url}`))
          }
        }, 100)
      })
    }

    // 创建预加载项
    const item: PreloadItem = {
      id: `style-${url}`,
      url,
      type: "style",
      priority,
      status: "pending",
      load: () => {
        return new Promise<HTMLLinkElement>((resolve, reject) => {
          const link = document.createElement("link")
          link.rel = "stylesheet"

          link.onload = () => {
            this.resourceCache.set(url, link)
            this.loaded.add(url)
            this.loading.delete(url)
            item.status = "loaded"

            // 记录加载时间
            const startTime = this.loadStartTime.get(url) || 0
            const loadTime = Date.now() - startTime
            this.totalTime += loadTime
            this.totalPreloaded++

            this.log("debug", `Style preloaded: ${url} (${loadTime}ms)`)

            // 触发进度回调
            this.triggerProgressCallback()

            resolve(link)
            this.processQueue()
          }

          link.onerror = () => {
            this.failed.add(url)
            this.loading.delete(url)
            item.status = "error"
            this.totalFailed++

            this.log("error", `Failed to preload style: ${url}`)

            // 触发进度回调
            this.triggerProgressCallback()

            reject(new Error(`Failed to preload style: ${url}`))
            this.processQueue()
          }

          // 记录开始时间
          this.loadStartTime.set(url, Date.now())
          this.loading.add(url)
          item.status = "loading"

          link.href = url
          document.head.appendChild(link)
        })
      },
    }

    // 添加到队列
    this.queue.push(item)
    this.sortQueue()
    this.processQueue()

    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        if (this.loaded.has(url)) {
          clearInterval(checkInterval)
          resolve(this.resourceCache.get(url) as HTMLLinkElement)
        } else if (this.failed.has(url)) {
          clearInterval(checkInterval)
          reject(new Error(`Failed to preload style: ${url}`))
        }
      }, 100)
    })
  }

  /**
   * 预加载字体
   * @param url 字体URL
   * @param fontFamily 字体族
   * @param priority 优先级
   * @returns 字体Promise
   */
  public preloadFont(url: string, fontFamily: string, priority = 0): Promise<FontFace> {
    if (this.config.enabled !== true || this.config.resourceTypes.fonts !== true) {
      return Promise.resolve(new FontFace(fontFamily, `url(${url})`))
    }

    // 检查是否已加载
    if (this.loaded.has(url)) {
      return Promise.resolve(this.resourceCache.get(url) as FontFace)
    }

    // 检查是否正在加载
    if (this.loading.has(url)) {
      return new Promise((resolve, reject) => {
        const checkInterval = setInterval(() => {
          if (this.loaded.has(url)) {
            clearInterval(checkInterval)
            resolve(this.resourceCache.get(url) as FontFace)
          } else if (this.failed.has(url)) {
            clearInterval(checkInterval)
            reject(new Error(`Failed to preload font: ${url}`))
          }
        }, 100)
      })
    }

    // 创建预加载项
    const item: PreloadItem = {
      id: `font-${url}`,
      url,
      type: "font",
      priority,
      status: "pending",
      load: () => {
        return new Promise<FontFace>((resolve, reject) => {
          const font = new FontFace(fontFamily, `url(${url})`)

          // 记录开始时间
          this.loadStartTime.set(url, Date.now())
          this.loading.add(url)
          item.status = "loading"

          font
            .load()
            .then(() => {
              // 添加到字体集
              if (typeof document !== "undefined" && "fonts" in document) {
                ;(document as any).fonts.add(font)
              }

              this.resourceCache.set(url, font)
              this.loaded.add(url)
              this.loading.delete(url)
              item.status = "loaded"

              // 记录加载时间
              const startTime = this.loadStartTime.get(url) || 0
              const loadTime = Date.now() - startTime
              this.totalTime += loadTime
              this.totalPreloaded++

              this.log("debug", `Font preloaded: ${url} (${loadTime}ms)`)

              // 触发进度回调
              this.triggerProgressCallback()

              resolve(font)
              this.processQueue()
            })
            .catch((error) => {
              this.failed.add(url)
              this.loading.delete(url)
              item.status = "error"
              this.totalFailed++

              this.log("error", `Failed to preload font: ${url}`, error)

              // 触发进度回调
              this.triggerProgressCallback()

              reject(error)
              this.processQueue()
            })
        })
      },
    }

    // 添加到队列
    this.queue.push(item)
    this.sortQueue()
    this.processQueue()

    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        if (this.loaded.has(url)) {
          clearInterval(checkInterval)
          resolve(this.resourceCache.get(url) as FontFace)
        } else if (this.failed.has(url)) {
          clearInterval(checkInterval)
          reject(new Error(`Failed to preload font: ${url}`))
        }
      }, 100)
    })
  }

  /**
   * 预加载数据
   * @param url 数据URL
   * @param priority 优先级
   * @returns 数据Promise
   */
  public preloadData(url: string, priority = 0): Promise<unknown> {
    if (this.config.enabled !== true || this.config.resourceTypes.data !== true) {
      return Promise.resolve(null)
    }

    // 检查是否已加载
    if (this.loaded.has(url)) {
      return Promise.resolve(this.resourceCache.get(url))
    }

    // 检查是否正在加载
    if (this.loading.has(url)) {
      return new Promise((resolve, reject) => {
        const checkInterval = setInterval(() => {
          if (this.loaded.has(url)) {
            clearInterval(checkInterval)
            resolve(this.resourceCache.get(url))
          } else if (this.failed.has(url)) {
            clearInterval(checkInterval)
            reject(new Error(`Failed to preload data: ${url}`))
          }
        }, 100)
      })
    }

    // 创建预加载项
    const item: PreloadItem = {
      id: `data-${url}`,
      url,
      type: "data",
      priority,
      status: "pending",
      load: () => {
        return new Promise<unknown>((resolve, reject) => {
          // 记录开始时间
          this.loadStartTime.set(url, Date.now())
          this.loading.add(url)
          item.status = "loading"

          fetch(url)
            .then((response) => {
              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
              }
              return response.json()
            })
            .then((data) => {
              this.resourceCache.set(url, data)
              this.loaded.add(url)
              this.loading.delete(url)
              item.status = "loaded"

              // 记录加载时间
              const startTime = this.loadStartTime.get(url) || 0
              const loadTime = Date.now() - startTime
              this.totalTime += loadTime
              this.totalPreloaded++

              this.log("debug", `Data preloaded: ${url} (${loadTime}ms)`)

              // 触发进度回调
              this.triggerProgressCallback()

              resolve(data)
              this.processQueue()
            })
            .catch((error) => {
              this.failed.add(url)
              this.loading.delete(url)
              item.status = "error"
              this.totalFailed++

              this.log("error", `Failed to preload data: ${url}`, error)

              // 触发进度回调
              this.triggerProgressCallback()

              reject(error)
              this.processQueue()
            })
        })
      },
    }

    // 添加到队列
    this.queue.push(item)
    this.sortQueue()
    this.processQueue()

    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        if (this.loaded.has(url)) {
          clearInterval(checkInterval)
          resolve(this.resourceCache.get(url))
        } else if (this.failed.has(url)) {
          clearInterval(checkInterval)
          reject(new Error(`Failed to preload data: ${url}`))
        }
      }, 100)
    })
  }

  /**
   * 预加载多个资源
   * @param resources 资源列表
   * @returns 是否全部加载成功
   */
  public async preloadAll(
    resources: Array<{
      url: string
      type: "image" | "script" | "style" | "font" | "data"
      priority?: number
      fontFamily?: string
    }>,
  ): Promise<boolean> {
    if (this.config.enabled !== true) {
      return true
    }

    const promises = resources.map((resource) => {
      const priority = resource.priority ?? 0

      switch (resource.type) {
        case "image":
          return this.preloadImage(resource.url, priority)
            .then(() => true)
            .catch(() => false)
        case "script":
          return this.preloadScript(resource.url, priority)
            .then(() => true)
            .catch(() => false)
        case "style":
          return this.preloadStyle(resource.url, priority)
            .then(() => true)
            .catch(() => false)
        case "font":
          return this.preloadFont(resource.url, resource.fontFamily ?? "preloaded-font", priority)
            .then(() => true)
            .catch(() => false)
        case "data":
          return this.preloadData(resource.url, priority)
            .then(() => true)
            .catch(() => false)
        default:
          return Promise.resolve(false)
      }
    })

    const results = await Promise.all(promises)
    return results.every(Boolean)
  }

  /**
   * 获取已加载的资源
   * @param url 资源URL
   * @returns 资源
   */
  public getResource(url: string): unknown {
    return this.resourceCache.get(url)
  }

  /**
   * 检查资源是否已加载
   * @param url 资源URL
   * @returns 是否已加载
   */
  public isLoaded(url: string): boolean {
    return this.loaded.has(url)
  }

  /**
   * 获取统计信息
   */
  public getStats(): {
    queueSize: number
    loadingCount: number
    loadedCount: number
    failedCount: number
    totalPreloaded: number
    totalFailed: number
    averageLoadTime: number
    cacheSize: number
  } {
    return {
      queueSize: this.queue.length,
      loadingCount: this.loading.size,
      loadedCount: this.loaded.size,
      failedCount: this.failed.size,
      totalPreloaded: this.totalPreloaded,
      totalFailed: this.totalFailed,
      averageLoadTime: this.totalPreloaded > 0 ? this.totalTime / this.totalPreloaded : 0,
      cacheSize: this.resourceCache.size,
    }
  }

  /**
   * 清除资源缓存
   * @param url 资源URL（如果不提供，清除所有缓存）
   */
  public clearCache(url?: string): void {
    if (typeof url === 'string' && url.length > 0) {
      this.resourceCache.delete(url)
      this.loaded.delete(url)
      this.failed.delete(url)
      this.loading.delete(url)
      this.loadStartTime.delete(url)
    } else {
      this.resourceCache.clear()
      this.loaded.clear()
      this.failed.clear()
      this.loading.clear()
      this.loadStartTime.clear()
    }
  }

  /**
   * 处理队列
   */
  private processQueue(): void {
    // 如果已达到最大并发数，不处理
    if (this.loading.size >= this.config.maxConcurrent) {
      return
    }

    // 获取下一个待处理项
    const nextItem = this.queue.find((item) => item.status === "pending")
    if (nextItem == null) {
      return
    }

    // 加载资源
    nextItem.load().catch((error) => {
      this.log("error", `Error loading resource: ${nextItem.url}`, error)
    })
  }

  /**
   * 排序队列
   */
  private sortQueue(): void {
    // 按优先级排序（高优先级在前）
    this.queue.sort((a, b) => b.priority - a.priority)
  }

  /**
   * 触发进度回调
   */
  private triggerProgressCallback(): void {
    if (typeof this.config.onProgress === 'function') {
      const total = this.loaded.size + this.failed.size + this.loading.size + this.queue.length
      const loaded = this.loaded.size + this.failed.size
      this.config.onProgress(loaded, total)
    }
  }

  /**
   * 记录日志
   * @param level 日志级别
   * @param message 日志消息
   * @param data 附加数据
   */
  private log(level: "error" | "warn" | "info" | "debug", message: string, data?: unknown): void {
    // 根据配置的日志级别过滤日志
    const levelPriority = { error: 0, warn: 1, info: 2, debug: 3 }
    if (levelPriority[level] > levelPriority[this.config.logLevel]) {
      return
    }

    // 只有在调试模式下或错误日志才输出
    if (this.config.debug || level === "error") {
      const timestamp = new Date().toISOString()
      const formattedMessage = `[${timestamp}] [PreloadManager] [${level.toUpperCase()}] ${message}`

      switch (level) {
        case "error":
          console.error(formattedMessage, data)
          break
        case "warn":
          console.warn(formattedMessage, data)
          break
        case "info":
          console.info(formattedMessage, data)
          break
        case "debug":
          console.debug(formattedMessage, data)
          break
      }
    }
  }
}

// 创建单例实例
let preloadManagerInstance: PreloadManager | null = null

export function getPreloadManager(config?: Partial<PreloadConfig>): PreloadManager {
  if (typeof window === "undefined") {
    // 服务器端返回一个空实现
    return ({
      preloadImage: () => Promise.resolve(new Image()),
      preloadScript: () => Promise.resolve(document.createElement("script")),
      preloadStyle: () => Promise.resolve(document.createElement("link")),
      preloadFont: (url: string, fontFamily: string) => Promise.resolve(new FontFace(fontFamily, `url(${url})`)),
      preloadData: () => Promise.resolve(null),
      preloadAll: () => Promise.resolve(true),
      getResource: () => null,
      isLoaded: () => false,
      getStats: () => ({
        queueSize: 0,
        loadingCount: 0,
        loadedCount: 0,
        failedCount: 0,
        totalPreloaded: 0,
        totalFailed: 0,
        averageLoadTime: 0,
        cacheSize: 0,
      }),
      clearCache: () => {},
    } as unknown) as PreloadManager
  }

  if (!preloadManagerInstance) {
    preloadManagerInstance = new PreloadManager(config)
  } else if (config) {
    // 如果提供了新配置，创建新实例
    preloadManagerInstance = new PreloadManager(config)
  }

  return preloadManagerInstance
}
