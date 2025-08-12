"use client"

import { 
  Activity, 
  AlertTriangle, 
  BarChart3, 
  CheckCircle, 
  Clock, 
  Database,
  Download,
  Monitor,
  RefreshCw,
  Server,
  Settings,
  Users,
  Zap} from "lucide-react"
import { useEffect,useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

/**
 * AG-UI性能监控管理面板 - 仅供管理员使用
 * AG-UI Performance Monitoring Dashboard - Admin Only
 * 
 * 本页面展示AG-UI流式响应优化器的实时性能数据和历史统计
 * 完全独立于用户界面，提供管理员专用的监控和配置功能
 */

interface PerformanceData {
  timestamp: number
  metrics: {
    totalEvents: number
    eventsPerSecond: number
    averageLatency: number
    bufferUtilization: number
    memoryUsage: number
    errorRate: number
  }
  status: {
    level: 'excellent' | 'good' | 'warning' | 'critical'
    score: number
    summary: string
  }
}

interface Alert {
  type: 'warning' | 'error' | 'info'
  message: string
  timestamp: number
}

interface SystemStats {
  activeUsers: number
  totalSessions: number
  avgResponseTime: number
  errorCount: number
  uptime: number
}

export default function AdminPerformancePage() {
  const [currentData, setCurrentData] = useState<PerformanceData | null>(null)
  const [historicalData, setHistoricalData] = useState<PerformanceData[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null)
  const [isLive, setIsLive] = useState(false)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  // 获取系统统计信息
  const fetchSystemStats = async () => {
    try {
      // 模拟系统统计数据
      const stats: SystemStats = {
        activeUsers: Math.floor(Math.random() * 100) + 20,
        totalSessions: Math.floor(Math.random() * 500) + 200,
        avgResponseTime: Math.floor(Math.random() * 50) + 30,
        errorCount: Math.floor(Math.random() * 5),
        uptime: Date.now() - (24 * 60 * 60 * 1000), // 24小时
      }
      setSystemStats(stats)
    } catch (error) {
      console.error('Failed to fetch system stats:', error)
    }
  }

  // 获取当前性能数据
  const fetchCurrentData = async () => {
    try {
      const response = await fetch('/api/ag-ui/performance?format=report&detailed=true')
      if (response.ok) {
        const data = await response.json()
        const performanceData: PerformanceData = {
          timestamp: data.timestamp,
          metrics: data.summary.performance,
          status: data.detailed.systemHealth.status
        }
        setCurrentData(performanceData)
        setAlerts(data.detailed.systemHealth.alerts || [])
        setLastUpdate(new Date())
        
        // 添加到历史数据
        setHistoricalData(prev => {
          const newData = [...prev, performanceData].slice(-50) // 保留最近50条记录
          return newData
        })
      }
    } catch (error) {
      console.error('Failed to fetch performance data:', error)
      // 添加错误警报
      setAlerts(prev => [...prev, {
        type: 'error',
        message: '无法获取性能数据',
        timestamp: Date.now()
      }])
    } finally {
      setLoading(false)
    }
  }

  // 启动实时监控
  const startLiveMonitoring = () => {
    if (isLive) return

    setIsLive(true)
    
    // 使用POST方法获取SSE流
    fetch('/api/ag-ui/performance?interval=2000', { method: 'POST' })
      .then(response => {
        if (!response.body) throw new Error('No response body')
        
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        
        const readStream = () => {
          reader.read().then(({ done, value }) => {
            if (done) {
              setIsLive(false)
              return
            }
            
            const chunk = decoder.decode(value)
            const lines = chunk.split('\n')
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6))
                  const performanceData: PerformanceData = {
                    timestamp: data.timestamp,
                    metrics: data.metrics,
                    status: data.health
                  }
                  setCurrentData(performanceData)
                  setLastUpdate(new Date())
                  
                  // 添加到历史数据
                  setHistoricalData(prev => {
                    const newData = [...prev, performanceData].slice(-50)
                    return newData
                  })
                } catch (error) {
                  console.error('Error parsing live data:', error)
                }
              }
            }
            
            if (isLive) {
              readStream()
            }
          }).catch(error => {
            console.error('Live monitoring read error:', error)
            setIsLive(false)
          })
        }
        
        readStream()
      })
      .catch(error => {
        console.error('Live monitoring connection error:', error)
        setIsLive(false)
      })
  }

  // 停止实时监控
  const stopLiveMonitoring = () => {
    setIsLive(false)
  }

  // 导出数据
  const exportData = () => {
    const exportData = {
      timestamp: new Date().toISOString(),
      currentData,
      historicalData,
      alerts,
      systemStats
    }
    const dataStr = JSON.stringify(exportData, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `ag-ui-admin-performance-${new Date().toISOString().split('T')[0]}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  // 清理历史数据
  const clearHistoricalData = () => {
    setHistoricalData([])
    setAlerts([])
  }

  // 重置性能监控
  const resetMonitoring = async () => {
    try {
      // 这里可以调用API重置性能计数器
      await fetchCurrentData()
      await fetchSystemStats()
    } catch (error) {
      console.error('Failed to reset monitoring:', error)
    }
  }

  useEffect(() => {
    fetchCurrentData()
    fetchSystemStats()
    
    // 定期更新系统统计
    const interval = setInterval(fetchSystemStats, 30000) // 每30秒
    return () => clearInterval(interval)
  }, [])

  const getStatusColor = (level: string) => {
    switch (level) {
      case 'excellent': return 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-300'
      case 'good': return 'text-blue-600 bg-blue-100 dark:bg-blue-900 dark:text-blue-300'
      case 'warning': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-300'
      case 'critical': return 'text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-300'
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'error': return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'info': return <CheckCircle className="h-4 w-4 text-blue-500" />
      default: return <CheckCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const formatUptime = (uptime: number) => {
    const hours = Math.floor(uptime / (1000 * 60 * 60))
    const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}m`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center space-y-4">
          <Activity className="h-12 w-12 animate-pulse mx-auto text-blue-500" />
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">正在加载管理面板</h2>
            <p className="text-gray-600 dark:text-gray-400">正在获取系统性能数据...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto p-6 space-y-6 max-w-7xl">
        {/* 管理员页面标题 */}
        <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Monitor className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">AG-UI 性能监控中心</h1>
              <p className="text-gray-600 dark:text-gray-400">管理员专用 · 实时监控流式响应优化器性能指标</p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                最后更新: {lastUpdate.toLocaleString()}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant={isLive ? "destructive" : "default"}
              onClick={isLive ? stopLiveMonitoring : startLiveMonitoring}
              className="flex items-center space-x-2"
            >
              {isLive ? (
                <>
                  <Activity className="h-4 w-4 animate-pulse" />
                  <span>停止监控</span>
                </>
              ) : (
                <>
                  <BarChart3 className="h-4 w-4" />
                  <span>开始监控</span>
                </>
              )}
            </Button>
            <Button variant="outline" onClick={fetchCurrentData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              刷新
            </Button>
            <Button variant="outline" onClick={exportData}>
              <Download className="h-4 w-4 mr-2" />
              导出数据
            </Button>
            <Button variant="outline" onClick={resetMonitoring}>
              <Settings className="h-4 w-4 mr-2" />
              重置
            </Button>
          </div>
        </div>

        {/* 系统统计概览 */}
        {systemStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center text-gray-600 dark:text-gray-400">
                  <Users className="h-4 w-4 mr-2" />
                  活跃用户
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{systemStats.activeUsers}</div>
                <p className="text-xs text-gray-500">总会话: {systemStats.totalSessions}</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center text-gray-600 dark:text-gray-400">
                  <Clock className="h-4 w-4 mr-2" />
                  平均响应时间
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{systemStats.avgResponseTime}ms</div>
                <p className="text-xs text-gray-500">系统响应</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-yellow-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center text-gray-600 dark:text-gray-400">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  错误计数
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{systemStats.errorCount}</div>
                <p className="text-xs text-gray-500">过去24小时</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center text-gray-600 dark:text-gray-400">
                  <Server className="h-4 w-4 mr-2" />
                  系统运行时间
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">{formatUptime(systemStats.uptime)}</div>
                <p className="text-xs text-gray-500">稳定运行</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 系统状态概览 */}
        {currentData && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-6 w-6 text-blue-500" />
                <span>系统状态总览</span>
                {isLive && (
                  <Badge variant="outline" className="ml-auto animate-pulse border-green-500 text-green-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    实时监控中
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <Badge className={getStatusColor(currentData.status.level)}>
                    {currentData.status.level.toUpperCase()}
                  </Badge>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {currentData.status.summary}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">
                    {currentData.status.score}/100
                  </div>
                  <div className="text-sm text-gray-500">性能得分</div>
                </div>
              </div>
              <Progress 
                value={currentData.status.score} 
                className="h-3"
                // className={`h-3 ${currentData.status.score >= 90 ? 'bg-green-500' : currentData.status.score >= 75 ? 'bg-blue-500' : currentData.status.score >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
              />
            </CardContent>
          </Card>
        )}

        {/* 主要指标卡片 */}
        {currentData && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <Clock className="h-4 w-4 mr-2 text-blue-500" />
                  平均延迟
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold mb-2">
                  {currentData.metrics.averageLatency.toFixed(0)}ms
                </div>
                <Badge variant={currentData.metrics.averageLatency < 100 ? "default" : "destructive"}>
                  {currentData.metrics.averageLatency < 100 ? "优秀" : "需优化"}
                </Badge>
                <div className="mt-2 text-xs text-gray-500">
                  目标: &lt; 100ms
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <Zap className="h-4 w-4 mr-2 text-yellow-500" />
                  事件频率
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold mb-2">
                  {currentData.metrics.eventsPerSecond.toFixed(0)}/秒
                </div>
                <Badge variant="secondary">
                  总计 {currentData.metrics.totalEvents.toLocaleString()} 事件
                </Badge>
                <div className="mt-2 text-xs text-gray-500">
                  处理效率
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <Database className="h-4 w-4 mr-2 text-green-500" />
                  缓冲区利用率
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold mb-2">
                  {(currentData.metrics.bufferUtilization * 100).toFixed(1)}%
                </div>
                <Progress value={currentData.metrics.bufferUtilization * 100} className="mt-2" />
                <div className="mt-2 text-xs text-gray-500">
                  警告阈值: 80%
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <Monitor className="h-4 w-4 mr-2 text-purple-500" />
                  内存使用
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold mb-2">
                  {(currentData.metrics.memoryUsage / 1024).toFixed(0)}KB
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  错误率: {(currentData.metrics.errorRate * 100).toFixed(2)}%
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  内存优化
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 详细监控面板 */}
        <Tabs defaultValue="alerts" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="alerts">警报中心</TabsTrigger>
            <TabsTrigger value="history">历史趋势</TabsTrigger>
            <TabsTrigger value="config">系统配置</TabsTrigger>
            <TabsTrigger value="management">管理工具</TabsTrigger>
          </TabsList>

          <TabsContent value="alerts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>实时警报监控</span>
                  <Badge variant="outline">{alerts.length} 条警报</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {alerts.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
                    <h3 className="text-lg font-medium mb-2">系统运行正常</h3>
                    <p>当前没有任何警报或异常情况</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {alerts.map((alert, index) => (
                      <div key={index} className="flex items-start space-x-4 p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        {getAlertIcon(alert.type)}
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{alert.message}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(alert.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <Badge variant={alert.type === 'error' ? 'destructive' : alert.type === 'warning' ? 'secondary' : 'default'}>
                          {alert.type}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>性能历史趋势</span>
                  <div className="flex space-x-2">
                    <Badge variant="outline">{historicalData.length} 记录</Badge>
                    <Button variant="outline" size="sm" onClick={clearHistoricalData}>
                      清理数据
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {historicalData.length > 0 ? (
                  <div className="space-y-6">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      显示最近 {historicalData.length} 条性能记录
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <h4 className="font-medium flex items-center">
                          <Clock className="h-4 w-4 mr-2" />
                          延迟趋势分析
                        </h4>
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <div className="text-gray-500">平均延迟</div>
                              <div className="text-lg font-bold">
                                {(historicalData.reduce((sum, d) => sum + d.metrics.averageLatency, 0) / historicalData.length).toFixed(0)}ms
                              </div>
                            </div>
                            <div>
                              <div className="text-gray-500">最低延迟</div>
                              <div className="text-lg font-bold text-green-600">
                                {Math.min(...historicalData.map(d => d.metrics.averageLatency)).toFixed(0)}ms
                              </div>
                            </div>
                            <div>
                              <div className="text-gray-500">最高延迟</div>
                              <div className="text-lg font-bold text-red-600">
                                {Math.max(...historicalData.map(d => d.metrics.averageLatency)).toFixed(0)}ms
                              </div>
                            </div>
                            <div>
                              <div className="text-gray-500">优化建议</div>
                              <Badge variant="secondary" className="text-xs">
                                {historicalData[historicalData.length - 1]?.metrics.averageLatency < 100 ? '保持现状' : '需要优化'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <h4 className="font-medium flex items-center">
                          <Zap className="h-4 w-4 mr-2" />
                          事件处理统计
                        </h4>
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <div className="text-gray-500">平均事件/秒</div>
                              <div className="text-lg font-bold">
                                {(historicalData.reduce((sum, d) => sum + d.metrics.eventsPerSecond, 0) / historicalData.length).toFixed(0)}
                              </div>
                            </div>
                            <div>
                              <div className="text-gray-500">总事件数</div>
                              <div className="text-lg font-bold text-blue-600">
                                {historicalData[historicalData.length - 1]?.metrics.totalEvents.toLocaleString() || 0}
                              </div>
                            </div>
                            <div>
                              <div className="text-gray-500">错误率</div>
                              <div className="text-lg font-bold text-orange-600">
                                {((historicalData.reduce((sum, d) => sum + d.metrics.errorRate, 0) / historicalData.length) * 100).toFixed(2)}%
                              </div>
                            </div>
                            <div>
                              <div className="text-gray-500">系统状态</div>
                              <Badge variant="default" className="text-xs">
                                {historicalData[historicalData.length - 1]?.status.level || 'unknown'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <BarChart3 className="h-16 w-16 mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">暂无历史数据</h3>
                    <p>开始监控后将显示性能趋势图表</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="config" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="h-5 w-5 mr-2" />
                  系统配置管理
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900 dark:text-white">流式优化参数</h4>
                    <div className="space-y-3 text-sm bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">缓冲区大小:</span>
                        <Badge variant="outline">8KB (推荐)</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">批处理大小:</span>
                        <Badge variant="outline">10 事件</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">打字机速度:</span>
                        <Badge variant="outline">120 字符/秒</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">防抖延迟:</span>
                        <Badge variant="outline">5ms</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">最大缓冲:</span>
                        <Badge variant="outline">64KB</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900 dark:text-white">性能阈值设置</h4>
                    <div className="space-y-3 text-sm bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">延迟警告:</span>
                        <Badge variant="secondary">&gt; 100ms</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">延迟严重:</span>
                        <Badge variant="destructive">&gt; 200ms</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">错误率警告:</span>
                        <Badge variant="secondary">&gt; 1%</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">缓冲区警告:</span>
                        <Badge variant="secondary">&gt; 80%</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">内存警告:</span>
                        <Badge variant="secondary">&gt; 50MB</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="management" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Monitor className="h-5 w-5 mr-2" />
                  管理工具
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium">系统操作</h4>
                    <div className="space-y-3">
                      <Button 
                        variant="outline" 
                        className="w-full justify-start" 
                        onClick={resetMonitoring}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        重置性能计数器
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full justify-start" 
                        onClick={clearHistoricalData}
                      >
                        <Database className="h-4 w-4 mr-2" />
                        清理历史数据
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full justify-start" 
                        onClick={exportData}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        导出完整报告
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="font-medium">监控配置</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <span className="text-sm">实时监控</span>
                        <Badge variant={isLive ? "default" : "secondary"}>
                          {isLive ? "启用" : "禁用"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <span className="text-sm">自动警报</span>
                        <Badge variant="default">启用</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <span className="text-sm">数据保留</span>
                        <Badge variant="secondary">50条记录</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
} 