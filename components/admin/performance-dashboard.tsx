"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { getEnhancedFastGPTClient } from "@/lib/api/enhanced-fastgpt-client"
import { getFastGPTOptimizer } from "@/lib/api/fastgpt-optimizer"
import { getCacheManager } from "@/lib/cache/cache-manager"
import { getPrefetchService } from "@/lib/prefetch/prefetch-service"
import { getBatchProcessor } from "@/lib/batch/batch-processor"
import { getRetryManager } from "@/lib/retry/retry-manager"
import { getPreloadManager } from "@/lib/preload/preload-manager"
import { getFallbackManager } from "@/lib/fallback/fallback-manager"
import { Activity, AlertTriangle, RefreshCw, Wifi } from "lucide-react"

export function PerformanceDashboard() {
  const [activeTab, setActiveTab] = useState("overview")
  const [stats, setStats] = useState<any>({
    client: null,
    optimizer: null,
    cache: null,
    prefetch: null,
    batch: null,
    retry: null,
    preload: null,
    fallback: null,
    system: {
      cpu: 0,
      memory: 0,
      network: 0,
      uptime: 0,
    },
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshInterval, setRefreshInterval] = useState(5000) // 5秒
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [timeRange, setTimeRange] = useState("1h") // 1小时

  // 获取统计信息
  const fetchStats = async () => {
    try {
      setLoading(true)
      setError(null)

      // 获取客户端统计信息
      const client = getEnhancedFastGPTClient()
      const clientStats = client.getStats()

      // 获取优化器统计信息
      const optimizer = getFastGPTOptimizer()
      const optimizerStats = optimizer.getStats()

      // 获取缓存统计信息
      const cacheManager = getCacheManager()
      const cacheStats = await cacheManager.getStats()

      // 获取预取服务统计信息
      const prefetchService = getPrefetchService()
      const prefetchStats = prefetchService.getStats()

      // 获取批处理统计信息
      const batchProcessor = getBatchProcessor()
      const summary = (batchProcessor as any).getJobSummary ? (batchProcessor as any).getJobSummary('default') : { totalTasks: 0, completedTasks: 0, failedTasks: 0, pendingTasks: 0, runningTasks: 0, progress: 0 }

      // 获取重试管理器统计信息
      const retryManager = getRetryManager()
      const retryStats = retryManager.getStats()

      // 获取预加载管理器统计信息
      const preloadManager = getPreloadManager()
      const preloadStats = preloadManager.getStats()

      // 获取降级管理器统计信息
      const fallbackManager = getFallbackManager()
      const fallbackStats = fallbackManager.getStats()

      // 模拟系统统计信息（在实际应用中，这些数据应该从服务器获取）
      const systemStats = {
        cpu: Math.random() * 100,
        memory: Math.random() * 100,
        network: Math.random() * 100,
        uptime: Date.now() - performance.timing.navigationStart,
      }

      setStats({
        client: clientStats,
        optimizer: optimizerStats,
        cache: cacheStats,
        prefetch: prefetchStats,
        batch: summary,
        retry: retryStats,
        preload: preloadStats,
        fallback: fallbackStats,
        system: systemStats,
      })
    } catch (err) {
      setError(`获取统计信息失败: ${err instanceof Error ? err.message : String(err)}`)
      console.error("获取统计信息失败:", err)
    } finally {
      setLoading(false)
    }
  }

  // 格式化时间
  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) {
      return `${days}天 ${hours % 24}小时`
    } else if (hours > 0) {
      return `${hours}小时 ${minutes % 60}分钟`
    } else if (minutes > 0) {
      return `${minutes}分钟 ${seconds % 60}秒`
    } else {
      return `${seconds}秒`
    }
  }

  // 格式化数字
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(Math.round(num))
  }

  // 格式化百分比
  const formatPercent = (num: number) => {
    return `${Math.round(num * 100) / 100}%`
  }

  // 自动刷新
  useEffect(() => {
    fetchStats()

    if (autoRefresh) {
      const interval = setInterval(fetchStats, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [autoRefresh, refreshInterval, timeRange])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">性能监控仪表盘</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchStats} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            刷新
          </Button>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="autoRefresh"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="mr-1"
            />
            <label htmlFor="autoRefresh" className="text-sm">
              自动刷新
            </label>
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              className="text-sm border rounded p-1"
              disabled={!autoRefresh}
            >
              <option value={2000}>2秒</option>
              <option value={5000}>5秒</option>
              <option value={10000}>10秒</option>
              <option value={30000}>30秒</option>
            </select>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <span className="text-sm">时间范围:</span>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="text-sm border rounded p-1"
            >
              <option value="15m">15分钟</option>
              <option value="1h">1小时</option>
              <option value="6h">6小时</option>
              <option value="24h">24小时</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>错误</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-8 w-full">
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="cache">缓存</TabsTrigger>
          <TabsTrigger value="optimizer">优化器</TabsTrigger>
          <TabsTrigger value="prefetch">预取</TabsTrigger>
          <TabsTrigger value="batch">批处理</TabsTrigger>
          <TabsTrigger value="retry">重试</TabsTrigger>
          <TabsTrigger value="preload">预加载</TabsTrigger>
          <TabsTrigger value="fallback">降级</TabsTrigger>
        </TabsList>

        {/* 概览标签 */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 请求统计 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">请求统计</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.client ? formatNumber(stats.client.requestCount) : "-"}</div>
                <p className="text-xs text-muted-foreground">
                  成功率: {stats.client ? formatPercent(stats.client.successRate * 100) : "-"}
                </p>
                <div className="mt-2">
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${stats.client ? stats.client.successRate * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 缓存命中率 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">缓存命中率</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.cache?.memory ? formatPercent(stats.cache.memory.hitRatio * 100) : "-"}
                </div>
                <p className="text-xs text-muted-foreground">
                  缓存项: {stats.cache?.memory ? formatNumber(stats.cache.memory.size) : "-"}
                </p>
                <div className="mt-2">
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${stats.cache?.memory ? stats.cache.memory.hitRatio * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 批处理效率 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">批处理效率</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.batch ? formatPercent(stats.batch.efficiency * 100) : "-"}
                </div>
                <p className="text-xs text-muted-foreground">
                  节省请求: {stats.batch ? formatNumber(stats.batch.savedRequestsCount) : "-"}
                </p>
                <div className="mt-2">
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${stats.batch ? stats.batch.efficiency * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 系统状态 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">系统状态</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <div
                    className={`h-4 w-4 rounded-full mr-2 ${stats.client?.isOnline ? "bg-green-500" : "bg-red-500"}`}
                  ></div>
                  <div className="text-xl font-bold">{stats.client?.isOnline ? "在线" : "离线"}</div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  运行时间: {stats.client ? formatDuration(stats.client.uptime) : "-"}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <Wifi className="h-4 w-4" />
                  <div className="h-2 bg-muted rounded-full overflow-hidden flex-1">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${stats.system ? stats.system.network : 0}%` }}
                    ></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {/* 性能指标 */}
            <Card>
              <CardHeader>
                <CardTitle>性能指标</CardTitle>
                <CardDescription>关键性能指标</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium">平均响应时间</span>
                      <span className="text-sm">
                        {stats.optimizer ? `${Math.round(stats.optimizer.averageResponseTime)}ms` : "-"}
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{
                          width: `${stats.optimizer ? Math.min(100, stats.optimizer.averageResponseTime / 10) : 0}%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium">缓存命中率</span>
                      <span className="text-sm">
                        {stats.cache?.memory ? formatPercent(stats.cache.memory.hitRatio * 100) : "-"}
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${stats.cache?.memory ? stats.cache.memory.hitRatio * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium">预取成功率</span>
                      <span className="text-sm">
                        {stats.prefetch ? formatPercent(stats.prefetch.successRate * 100) : "-"}
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${stats.prefetch ? stats.prefetch.successRate * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium">降级成功率</span>
                      <span className="text-sm">
                        {stats.fallback ? formatPercent(stats.fallback.successRate * 100) : "-"}
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${stats.fallback ? stats.fallback.successRate * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium">重试率</span>
                      <span className="text-sm">{stats.retry ? formatPercent(stats.retry.retryRate * 100) : "-"}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-500"
                        style={{ width: `${stats.retry ? stats.retry.retryRate * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 系统健康状态 */}
            <Card>
              <CardHeader>
                <CardTitle>系统健康状态</CardTitle>
                <CardDescription>系统各组件健康状态</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>客户端状态:</span>
                    <Badge variant={stats.client?.isOnline ? "success" : "destructive"}>
                      {stats.client?.isOnline ? "在线" : "离线"}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>断路器状态:</span>
                    <Badge variant={stats.optimizer?.circuitBreakerOpen ? "destructive" : "success"}>
                      {stats.optimizer?.circuitBreakerOpen ? "开启" : "关闭"}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Redis连接:</span>
                    <Badge variant={stats.cache?.redis?.connected ? "success" : "destructive"}>
                      {stats.cache?.redis?.connected ? "已连接" : "未连接"}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>网络状态:</span>
                    <Badge variant={stats.prefetch?.isNetworkSuitable ? "success" : "warning"}>
                      {stats.prefetch?.isNetworkSuitable ? "良好" : "受限"}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>电池状态:</span>
                    <Badge variant={stats.prefetch?.isBatterySuitable ? "success" : "warning"}>
                      {stats.prefetch?.isBatterySuitable ? "良好" : "低电量"}
                    </Badge>
                  </div>

                  <Separator />

                  <div className="pt-2">
                    <Alert>
                      <Activity className="h-4 w-4" />
                      <AlertTitle>系统状态</AlertTitle>
                      <AlertDescription>
                        {loading ? (
                          "正在加载..."
                        ) : (
                          <>
                            系统运行正常。当前有 {stats.optimizer?.activeRequests || 0} 个活动请求， 队列中有{" "}
                            {stats.optimizer?.queueSize || 0} 个等待请求， 离线队列中有{" "}
                            {stats.client?.offlineQueueSize || 0} 个请求。
                          </>
                        )}
                      </AlertDescription>
                    </Alert>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 其他标签内容 */}
        <TabsContent value="cache">
          {/* 缓存标签内容 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>内存缓存</CardTitle>
                <CardDescription>内存中的缓存统计信息</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>缓存项数量:</span>
                    <Badge variant="outline">{stats.cache?.memory ? formatNumber(stats.cache.memory.size) : "-"}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>命中次数:</span>
                    <Badge variant="outline">{stats.cache?.memory ? formatNumber(stats.cache.memory.hits) : "-"}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>未命中次数:</span>
                    <Badge variant="outline">
                      {stats.cache?.memory ? formatNumber(stats.cache.memory.misses) : "-"}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>命中率:</span>
                    <Badge variant="outline">
                      {stats.cache?.memory ? formatPercent(stats.cache.memory.hitRatio * 100) : "-"}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>重新验证次数:</span>
                    <Badge variant="outline">
                      {stats.cache?.memory ? formatNumber(stats.cache.memory.revalidations) : "-"}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>预取次数:</span>
                    <Badge variant="outline">
                      {stats.cache?.memory ? formatNumber(stats.cache.memory.prefetches) : "-"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Redis缓存</CardTitle>
                <CardDescription>Redis中的缓存统计信息</CardDescription>
              </CardHeader>
              <CardContent>
                {stats.cache?.redis ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>缓存项数量:</span>
                      <Badge variant="outline">{formatNumber(stats.cache.redis.size)}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>内存使用:</span>
                      <Badge variant="outline">{formatNumber(stats.cache.redis.memory / 1024 / 1024)} MB</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>命中率:</span>
                      <Badge variant="outline">
                        {stats.cache.redis.hitRate ? formatPercent(stats.cache.redis.hitRate * 100) : "未知"}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>操作次数:</span>
                      <Badge variant="outline">{formatNumber(stats.cache.redis.operations)}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>连接状态:</span>
                      <Badge variant={stats.cache.redis.connected ? "success" : "destructive"}>
                        {stats.cache.redis.connected ? "已连接" : "未连接"}
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">Redis缓存未配置或无法连接</div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="batch">
          {/* 批处理标签内容 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>批处理统计</CardTitle>
                <CardDescription>批处理系统统计信息</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>组数量:</span>
                    <Badge variant="outline">{stats.batch ? formatNumber(stats.batch.groupCount) : "-"}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>处理中数量:</span>
                    <Badge variant="outline">{stats.batch ? formatNumber(stats.batch.processingCount) : "-"}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>批处理项数:</span>
                    <Badge variant="outline">{stats.batch ? formatNumber(stats.batch.batchedCount) : "-"}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>节省请求数:</span>
                    <Badge variant="outline">{stats.batch ? formatNumber(stats.batch.savedRequestsCount) : "-"}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>效率:</span>
                    <Badge variant="outline">{stats.batch ? formatPercent(stats.batch.efficiency * 100) : "-"}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>批处理效率图表</CardTitle>
                <CardDescription>批处理效率可视化</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-end gap-1">
                  {/* 模拟批处理效率图表 */}
                  {Array.from({ length: 24 }).map((_, i) => (
                    <div
                      key={i}
                      className="bg-primary/80 w-full rounded-t"
                      style={{
                        height: `${Math.max(4, Math.sin(i / 3) * 50 + 50)}%`,
                      }}
                    />
                  ))}
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                  <span>0时</span>
                  <span>6时</span>
                  <span>12时</span>
                  <span>18时</span>
                  <span>24时</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="retry">
          {/* 重试标签内容 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>重试统计</CardTitle>
                <CardDescription>重试系统统计信息</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>重试次数:</span>
                    <Badge variant="outline">{stats.retry ? formatNumber(stats.retry.retryCount) : "-"}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>成功次数:</span>
                    <Badge variant="outline">{stats.retry ? formatNumber(stats.retry.successCount) : "-"}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>失败次数:</span>
                    <Badge variant="outline">{stats.retry ? formatNumber(stats.retry.failureCount) : "-"}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>重试率:</span>
                    <Badge variant="outline">{stats.retry ? formatPercent(stats.retry.retryRate * 100) : "-"}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>重试历史</CardTitle>
                <CardDescription>最近的重试历史记录</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <table className="min-w-full divide-y divide-border">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">时间</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">端点</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">重试次数</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">结果</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {/* 模拟重试历史数据 */}
                      <tr>
                        <td className="px-4 py-2 text-xs">10:15:32</td>
                        <td className="px-4 py-2 text-xs truncate max-w-[200px]">/api/fastgpt/chat</td>
                        <td className="px-4 py-2 text-xs">2</td>
                        <td className="px-4 py-2">
                          <Badge variant="success">成功</Badge>
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 text-xs">10:14:28</td>
                        <td className="px-4 py-2 text-xs truncate max-w-[200px]">/api/fastgpt/init-chat</td>
                        <td className="px-4 py-2 text-xs">1</td>
                        <td className="px-4 py-2">
                          <Badge variant="success">成功</Badge>
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 text-xs">10:12:15</td>
                        <td className="px-4 py-2 text-xs truncate max-w-[200px]">/api/core/chat/getHistories</td>
                        <td className="px-4 py-2 text-xs">3</td>
                        <td className="px-4 py-2">
                          <Badge variant="destructive">失败</Badge>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="preload">
          {/* 预加载标签内容 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>预加载统计</CardTitle>
                <CardDescription>预加载系统统计信息</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>队列大小:</span>
                    <Badge variant="outline">{stats.preload ? formatNumber(stats.preload.queueSize) : "-"}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>加载中数量:</span>
                    <Badge variant="outline">{stats.preload ? formatNumber(stats.preload.loadingCount) : "-"}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>已加载数量:</span>
                    <Badge variant="outline">{stats.preload ? formatNumber(stats.preload.loadedCount) : "-"}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>失败数量:</span>
                    <Badge variant="outline">{stats.preload ? formatNumber(stats.preload.failedCount) : "-"}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>总预加载数:</span>
                    <Badge variant="outline">{stats.preload ? formatNumber(stats.preload.totalPreloaded) : "-"}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>平均加载时间:</span>
                    <Badge variant="outline">
                      {stats.preload ? `${Math.round(stats.preload.averageLoadTime)}ms` : "-"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>资源类型分布</CardTitle>
                <CardDescription>预加载资源类型分布</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  {/* 模拟资源类型分布图表 */}
                  <div className="h-full flex flex-col justify-center">
                    <div className="flex items-center mb-4">
                      <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                      <span className="text-sm flex-1">图片</span>
                      <span className="text-sm font-medium">65%</span>
                    </div>
                    <div className="h-4 bg-muted rounded-full overflow-hidden mb-6">
                      <div className="h-full bg-blue-500" style={{ width: "65%" }}></div>
                    </div>

                    <div className="flex items-center mb-4">
                      <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                      <span className="text-sm flex-1">脚本</span>
                      <span className="text-sm font-medium">15%</span>
                    </div>
                    <div className="h-4 bg-muted rounded-full overflow-hidden mb-6">
                      <div className="h-full bg-green-500" style={{ width: "15%" }}></div>
                    </div>

                    <div className="flex items-center mb-4">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                      <span className="text-sm flex-1">样式</span>
                      <span className="text-sm font-medium">10%</span>
                    </div>
                    <div className="h-4 bg-muted rounded-full overflow-hidden mb-6">
                      <div className="h-full bg-yellow-500" style={{ width: "10%" }}></div>
                    </div>

                    <div className="flex items-center mb-4">
                      <div className="w-3 h-3 bg-purple-500 rounded-full mr-2"></div>
                      <span className="text-sm flex-1">字体</span>
                      <span className="text-sm font-medium">5%</span>
                    </div>
                    <div className="h-4 bg-muted rounded-full overflow-hidden mb-6">
                      <div className="h-full bg-purple-500" style={{ width: "5%" }}></div>
                    </div>

                    <div className="flex items-center mb-4">
                      <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                      <span className="text-sm flex-1">数据</span>
                      <span className="text-sm font-medium">5%</span>
                    </div>
                    <div className="h-4 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-red-500" style={{ width: "5%" }}></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="fallback">
          {/* 降级标签内容 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>降级统计</CardTitle>
                <CardDescription>降级系统统计信息</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>注册键数量:</span>
                    <Badge variant="outline">
                      {stats.fallback ? formatNumber(stats.fallback.registeredKeys) : "-"}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>总降级数量:</span>
                    <Badge variant="outline">
                      {stats.fallback ? formatNumber(stats.fallback.totalFallbacks) : "-"}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>活动降级数量:</span>
                    <Badge variant="outline">
                      {stats.fallback ? formatNumber(stats.fallback.activeFallbacks) : "-"}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>降级触发次数:</span>
                    <Badge variant="outline">{stats.fallback ? formatNumber(stats.fallback.fallbackCount) : "-"}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>成功次数:</span>
                    <Badge variant="outline">{stats.fallback ? formatNumber(stats.fallback.successCount) : "-"}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>失败次数:</span>
                    <Badge variant="outline">{stats.fallback ? formatNumber(stats.fallback.failureCount) : "-"}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>成功率:</span>
                    <Badge variant="outline">
                      {stats.fallback ? formatPercent(stats.fallback.successRate * 100) : "-"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>活动降级</CardTitle>
                <CardDescription>当前活动的降级策略</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <table className="min-w-full divide-y divide-border">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">资源键</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">降级策略</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">状态</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {/* 模拟活动降级数据 */}
                      <tr>
                        <td className="px-4 py-2 text-xs">api.chat</td>
                        <td className="px-4 py-2 text-xs">本地缓存响应</td>
                        <td className="px-4 py-2">
                          <Badge variant="success">活动</Badge>
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 text-xs">images.avatar</td>
                        <td className="px-4 py-2 text-xs">默认头像</td>
                        <td className="px-4 py-2">
                          <Badge variant="success">活动</Badge>
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 text-xs">fonts.main</td>
                        <td className="px-4 py-2 text-xs">系统字体</td>
                        <td className="px-4 py-2">
                          <Badge variant="success">活动</Badge>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
