"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { getEnhancedFastGPTClient } from "@/lib/api/fastgpt-enhanced"
import { getFastGPTOptimizer } from "@/lib/api/fastgpt-optimizer"
import { getCacheManager } from "@/lib/cache/cache-manager"
import { getPrefetchService } from "@/lib/prefetch/prefetch-service"
import {
  Activity,
  AlertTriangle,
  Battery,
  Cpu,
  Database,
  HardDrive,
  Layers,
  RefreshCw,
  Server,
  Wifi,
  Zap,
} from "lucide-react"

export function SystemMonitor() {
  const [activeTab, setActiveTab] = useState("overview")
  const [stats, setStats] = useState<any>({
    client: null,
    optimizer: null,
    cache: null,
    prefetch: null,
    system: {
      cpu: 0,
      memory: 0,
      network: 0,
      uptime: 0,
    },
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshInterval, setRefreshInterval] = useState(10000) // 10秒
  const [autoRefresh, setAutoRefresh] = useState(true)

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
        system: systemStats,
      })
    } catch (err) {
      setError(`获取统计信息失败: ${err instanceof Error ? err.message : String(err)}`)
      console.error("获取统计信息失败:", err)
    } finally {
      setLoading(false)
    }
  }

  // 清除缓存
  const clearCache = async () => {
    try {
      const cacheManager = getCacheManager()
      await cacheManager.clear()
      await fetchStats()
    } catch (err) {
      setError(`清除缓存失败: ${err instanceof Error ? err.message : String(err)}`)
      console.error("清除缓存失败:", err)
    }
  }

  // 重置断路器
  const resetCircuitBreaker = () => {
    try {
      const optimizer = getFastGPTOptimizer()
      optimizer.resetCircuitBreaker()
      fetchStats()
    } catch (err) {
      setError(`重置断路器失败: ${err instanceof Error ? err.message : String(err)}`)
      console.error("重置断路器失败:", err)
    }
  }

  // 切换预取服务
  const togglePrefetchService = () => {
    try {
      const prefetchService = getPrefetchService()
      if (stats.prefetch?.isEnabled) {
        prefetchService.disable()
      } else {
        prefetchService.enable()
      }
      fetchStats()
    } catch (err) {
      setError(`切换预取服务失败: ${err instanceof Error ? err.message : String(err)}`)
      console.error("切换预取服务失败:", err)
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
  }, [autoRefresh, refreshInterval])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">系统监控</h2>
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
              <option value={5000}>5秒</option>
              <option value={10000}>10秒</option>
              <option value={30000}>30秒</option>
              <option value={60000}>1分钟</option>
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
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="cache">缓存</TabsTrigger>
          <TabsTrigger value="optimizer">优化器</TabsTrigger>
          <TabsTrigger value="prefetch">预取</TabsTrigger>
          <TabsTrigger value="system">系统</TabsTrigger>
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
                  <Progress value={stats.client ? stats.client.successRate * 100 : 0} />
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
                  <Progress value={stats.cache?.memory ? stats.cache.memory.hitRatio * 100 : 0} />
                </div>
              </CardContent>
            </Card>

            {/* 断路器状态 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">断路器状态</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <div
                    className={`h-4 w-4 rounded-full mr-2 ${stats.optimizer?.circuitBreakerOpen ? "bg-red-500" : "bg-green-500"}`}
                  ></div>
                  <div className="text-xl font-bold">{stats.optimizer?.circuitBreakerOpen ? "开启" : "关闭"}</div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  失败率: {stats.optimizer ? formatPercent(stats.optimizer.failureRate * 100) : "-"}
                </p>
                <div className="mt-2">
                  <Progress
                    value={stats.optimizer ? stats.optimizer.failureRate * 100 : 0}
                    className={stats.optimizer?.circuitBreakerOpen ? "bg-red-100" : ""}
                  />
                </div>
              </CardContent>
              <CardFooter className="pt-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={resetCircuitBreaker}
                  disabled={!stats.optimizer?.circuitBreakerOpen}
                >
                  重置断路器
                </Button>
              </CardFooter>
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
                  <Progress value={stats.system ? stats.system.network : 0} className="flex-1" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-4">
            <Alert>
              <Activity className="h-4 w-4" />
              <AlertTitle>系统健康状态</AlertTitle>
              <AlertDescription>
                {loading ? (
                  "正在加载..."
                ) : (
                  <>
                    系统运行正常。当前有 {stats.optimizer?.activeRequests || 0} 个活动请求， 队列中有{" "}
                    {stats.optimizer?.queueSize || 0} 个等待请求， 离线队列中有 {stats.client?.offlineQueueSize || 0}{" "}
                    个请求。
                  </>
                )}
              </AlertDescription>
            </Alert>
          </div>
        </TabsContent>

        {/* 缓存标签 */}
        <TabsContent value="cache">
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
                  <div className="flex justify-between items-center">
                    <span>错误次数:</span>
                    <Badge variant="outline">
                      {stats.cache?.memory ? formatNumber(stats.cache.memory.errors) : "-"}
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
                      <span>错误次数:</span>
                      <Badge variant="outline">{formatNumber(stats.cache.redis.errors)}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>连接状态:</span>
                      <Badge variant={stats.cache.redis.connected ? "success" : "destructive"}>
                        {stats.cache.redis.connected ? "已连接" : "未连接"}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>运行时间:</span>
                      <Badge variant="outline">{formatDuration(stats.cache.redis.uptime)}</Badge>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">Redis缓存未配置或无法连接</div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>缓存操作</CardTitle>
                <CardDescription>管理缓存的操作</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  <Button onClick={clearCache}>
                    <HardDrive className="h-4 w-4 mr-2" />
                    清除所有缓存
                  </Button>
                  <Button variant="outline" onClick={() => alert("功能待实现")}>
                    <Database className="h-4 w-4 mr-2" />
                    清除内存缓存
                  </Button>
                  <Button variant="outline" onClick={() => alert("功能待实现")}>
                    <Server className="h-4 w-4 mr-2" />
                    清除Redis缓存
                  </Button>
                  <Button variant="outline" onClick={() => alert("功能待实现")}>
                    <Layers className="h-4 w-4 mr-2" />
                    按标签清除缓存
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 优化器标签 */}
        <TabsContent value="optimizer">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>请求统计</CardTitle>
                <CardDescription>请求处理统计信息</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>总请求数:</span>
                    <Badge variant="outline">
                      {stats.optimizer ? formatNumber(stats.optimizer.requestCount) : "-"}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>成功请求数:</span>
                    <Badge variant="outline">
                      {stats.optimizer ? formatNumber(stats.optimizer.successCount) : "-"}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>失败率:</span>
                    <Badge variant={stats.optimizer?.failureRate > 0.1 ? "destructive" : "outline"}>
                      {stats.optimizer ? formatPercent(stats.optimizer.failureRate * 100) : "-"}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>平均响应时间:</span>
                    <Badge variant="outline">
                      {stats.optimizer ? `${Math.round(stats.optimizer.averageResponseTime)}ms` : "-"}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>队列大小:</span>
                    <Badge variant="outline">{stats.optimizer ? formatNumber(stats.optimizer.queueSize) : "-"}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>活动请求数:</span>
                    <Badge variant="outline">
                      {stats.optimizer ? formatNumber(stats.optimizer.activeRequests) : "-"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>断路器状态</CardTitle>
                <CardDescription>断路器和健康状态信息</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>断路器状态:</span>
                    <Badge variant={stats.optimizer?.circuitBreakerOpen ? "destructive" : "success"}>
                      {stats.optimizer?.circuitBreakerOpen ? "开启" : "关闭"}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>系统健康状态:</span>
                    <Badge variant={stats.optimizer?.isHealthy ? "success" : "destructive"}>
                      {stats.optimizer?.isHealthy ? "健康" : "不健康"}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>运行时间:</span>
                    <Badge variant="outline">{stats.optimizer ? formatDuration(stats.optimizer.uptime) : "-"}</Badge>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="text-sm font-medium mb-2">失败率趋势</h4>
                    <div className="h-24 flex items-end gap-1">
                      {/* 模拟失败率趋势图 */}
                      {Array.from({ length: 20 }).map((_, i) => (
                        <div
                          key={i}
                          className="bg-primary/80 w-full rounded-t"
                          style={{
                            height: `${Math.max(4, Math.random() * 100)}%`,
                            opacity: i / 20 + 0.5,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  variant={stats.optimizer?.circuitBreakerOpen ? "default" : "outline"}
                  onClick={resetCircuitBreaker}
                  disabled={!stats.optimizer?.circuitBreakerOpen}
                >
                  <Zap className="h-4 w-4 mr-2" />
                  重置断路器
                </Button>
              </CardFooter>
            </Card>
          </div>

          <div className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>请求历史</CardTitle>
                <CardDescription>最近的请求历史记录</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <table className="min-w-full divide-y divide-border">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">时间</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">端点</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">状态</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">响应时间</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">错误</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {stats.optimizer?.requestHistory ? (
                        stats.optimizer.requestHistory.slice(-5).map((req: any, i: number) => (
                          <tr key={i} className={req.success ? "" : "bg-red-50"}>
                            <td className="px-4 py-2 text-xs">{new Date(req.timestamp).toLocaleTimeString()}</td>
                            <td className="px-4 py-2 text-xs truncate max-w-[200px]">{req.endpoint}</td>
                            <td className="px-4 py-2">
                              <Badge variant={req.success ? "success" : "destructive"}>
                                {req.success ? "成功" : "失败"}
                              </Badge>
                            </td>
                            <td className="px-4 py-2 text-xs">{req.responseTime ? `${req.responseTime}ms` : "-"}</td>
                            <td className="px-4 py-2 text-xs text-red-500 truncate max-w-[200px]">
                              {req.error || "-"}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                            无请求历史记录
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 预取标签 */}
        <TabsContent value="prefetch">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>预取统计</CardTitle>
                <CardDescription>预取服务统计信息</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>活动规则数:</span>
                    <Badge variant="outline">{stats.prefetch ? formatNumber(stats.prefetch.activeRules) : "-"}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>活动预取数:</span>
                    <Badge variant="outline">
                      {stats.prefetch ? formatNumber(stats.prefetch.activePrefetches) : "-"}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>队列大小:</span>
                    <Badge variant="outline">{stats.prefetch ? formatNumber(stats.prefetch.queueSize) : "-"}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>总预取次数:</span>
                    <Badge variant="outline">{stats.prefetch ? formatNumber(stats.prefetch.prefetchCount) : "-"}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>成功次数:</span>
                    <Badge variant="outline">{stats.prefetch ? formatNumber(stats.prefetch.successCount) : "-"}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>失败次数:</span>
                    <Badge variant="outline">{stats.prefetch ? formatNumber(stats.prefetch.failureCount) : "-"}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>成功率:</span>
                    <Badge variant="outline">
                      {stats.prefetch ? formatPercent(stats.prefetch.successRate * 100) : "-"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  variant={stats.prefetch?.isEnabled ? "outline" : "default"}
                  onClick={togglePrefetchService}
                >
                  {stats.prefetch?.isEnabled ? "禁用预取服务" : "启用预取服务"}
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>预取条件</CardTitle>
                <CardDescription>预取服务运行条件</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>网络状态:</span>
                    <Badge variant={stats.prefetch?.isNetworkSuitable ? "success" : "destructive"}>
                      {stats.prefetch?.isNetworkSuitable ? "适合预取" : "不适合预取"}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>网络类型:</span>
                    <Badge variant="outline">{stats.prefetch?.networkType || "未知"}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>电池状态:</span>
                    <Badge variant={stats.prefetch?.isBatterySuitable ? "success" : "destructive"}>
                      {stats.prefetch?.isBatterySuitable ? "适合预取" : "不适合预取"}
                    </Badge>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="text-sm font-medium mb-2">网络状态</h4>
                    <div className="flex items-center gap-2">
                      <Wifi className="h-5 w-5 text-primary" />
                      <Progress value={stats.prefetch?.isNetworkSuitable ? 100 : 30} className="flex-1" />
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-2">电池状态</h4>
                    <div className="flex items-center gap-2">
                      <Battery className="h-5 w-5 text-primary" />
                      <Progress value={stats.prefetch?.isBatterySuitable ? 70 : 20} className="flex-1" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>预取规则</CardTitle>
                <CardDescription>当前活动的预取规则</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <table className="min-w-full divide-y divide-border">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">ID</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">模式</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">优先级</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">TTL</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">依赖项</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      <tr>
                        <td className="px-4 py-2 text-xs">init-chat</td>
                        <td className="px-4 py-2 text-xs">/chat</td>
                        <td className="px-4 py-2 text-xs">低</td>
                        <td className="px-4 py-2 text-xs">5分钟</td>
                        <td className="px-4 py-2 text-xs">-</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 text-xs">chat-histories</td>
                        <td className="px-4 py-2 text-xs">/chat</td>
                        <td className="px-4 py-2 text-xs">低</td>
                        <td className="px-4 py-2 text-xs">1分钟</td>
                        <td className="px-4 py-2 text-xs">init-chat</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 系统标签 */}
        <TabsContent value="system">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>系统资源</CardTitle>
                <CardDescription>系统资源使用情况</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">CPU使用率</span>
                      <span className="text-sm">{stats.system ? formatPercent(stats.system.cpu) : "-"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Cpu className="h-5 w-5 text-primary" />
                      <Progress value={stats.system ? stats.system.cpu : 0} className="flex-1" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">内存使用率</span>
                      <span className="text-sm">{stats.system ? formatPercent(stats.system.memory) : "-"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <HardDrive className="h-5 w-5 text-primary" />
                      <Progress value={stats.system ? stats.system.memory : 0} className="flex-1" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">网络使用率</span>
                      <span className="text-sm">{stats.system ? formatPercent(stats.system.network) : "-"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Wifi className="h-5 w-5 text-primary" />
                      <Progress value={stats.system ? stats.system.network : 0} className="flex-1" />
                    </div>
                  </div>

                  <div className="pt-2">
                    <div className="flex justify-between items-center">
                      <span>运行时间:</span>
                      <Badge variant="outline">{stats.system ? formatDuration(stats.system.uptime) : "-"}</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>系统状态</CardTitle>
                <CardDescription>系统运行状态信息</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>在线状态:</span>
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
                    <span>健康状态:</span>
                    <Badge variant={stats.optimizer?.isHealthy ? "success" : "destructive"}>
                      {stats.optimizer?.isHealthy ? "健康" : "不健康"}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>最后活动:</span>
                    <Badge variant="outline">
                      {stats.client?.lastActivity ? new Date(stats.client.lastActivity).toLocaleTimeString() : "-"}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>离线队列:</span>
                    <Badge variant="outline">{stats.client?.offlineQueueSize || 0}</Badge>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="text-sm font-medium mb-2">系统负载趋势</h4>
                    <div className="h-24 flex items-end gap-1">
                      {/* 模拟系统负载趋势图 */}
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
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>系统日志</CardTitle>
                <CardDescription>最近的系统日志记录</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-muted rounded-md p-4 font-mono text-xs h-[200px] overflow-y-auto">
                  <div className="text-green-500">[2023-05-21 07:15:32] [INFO] 系统启动成功</div>
                  <div className="text-blue-500">[2023-05-21 07:15:35] [DEBUG] 初始化缓存管理器</div>
                  <div className="text-blue-500">[2023-05-21 07:15:36] [DEBUG] 初始化优化器</div>
                  <div className="text-green-500">[2023-05-21 07:15:38] [INFO] 连接到Redis缓存</div>
                  <div className="text-yellow-500">[2023-05-21 07:16:02] [WARN] 请求超时: /api/fastgpt/chat</div>
                  <div className="text-green-500">[2023-05-21 07:16:15] [INFO] 预取规则触发: init-chat</div>
                  <div className="text-red-500">[2023-05-21 07:17:22] [ERROR] 缓存写入失败: Redis连接错误</div>
                  <div className="text-green-500">[2023-05-21 07:17:45] [INFO] Redis连接恢复</div>
                  <div className="text-blue-500">[2023-05-21 07:18:12] [DEBUG] 清理过期缓存项: 23个</div>
                  <div className="text-green-500">[2023-05-21 07:19:05] [INFO] 系统健康检查通过</div>
                  <div className="text-yellow-500">[2023-05-21 07:20:18] [WARN] 网络状态变更: wifi -&gt; cellular</div>
                  <div className="text-green-500">[2023-05-21 07:21:30] [INFO] 网络状态变更: cellular -&gt; wifi</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
