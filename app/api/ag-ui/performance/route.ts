import { type NextRequest, NextResponse } from "next/server"
import { globalStreamMonitor } from '@/lib/ag-ui/stream-optimizer'

/**
 * AG-UI性能监控API - 提供流式响应性能指标查询
 * AG-UI Performance Monitoring API - Provides streaming response performance metrics
 * 
 * 本文件提供实时性能监控数据，用于优化和调试AG-UI流式响应
 * 调用关系: 被管理面板或监控工具调用
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const format = searchParams.get('format') || 'json'
    const detailed = searchParams.get('detailed') === 'true'

    // 获取性能指标
    const metrics = globalStreamMonitor.getAggregatedMetrics()
    const report = globalStreamMonitor.getOptimizationReport()

    if (format === 'report') {
      // 返回详细报告
      return NextResponse.json({
        timestamp: Date.now(),
        uptime: report.uptime,
        summary: {
          totalOptimizers: report.totalOptimizers,
          performance: report.averagePerformance,
          recommendations: report.recommendations,
        },
        detailed: detailed ? {
          rawMetrics: metrics,
          systemHealth: {
            status: getSystemHealth(report.averagePerformance),
            alerts: generateAlerts(report.averagePerformance),
          }
        } : undefined
      })
    }

    // 返回简单指标
    return NextResponse.json({
      timestamp: Date.now(),
      metrics,
      status: getSystemHealth(metrics),
    })

  } catch (error: any) {
    console.error("Error in performance monitoring route:", error)
    return NextResponse.json({ 
      error: error.message || "Internal server error",
      timestamp: Date.now(),
    }, { status: 500 })
  }
}

// 系统状态分级函数
function getSystemHealth(metrics: any): {
  level: 'excellent' | 'good' | 'warning' | 'critical'
  score: number
  summary: string
} {
  let score = 100
  const issues: Array<string> = []

  // 评估延迟
  if (metrics.averageLatency > 200) {
    score -= 30
    issues.push('高延迟')
  } else if (metrics.averageLatency > 100) {
    score -= 15
    issues.push('中等延迟')
  }

  // 评估错误率
  if (metrics.errorRate > 0.05) {
    score -= 40
    issues.push('高错误率')
  } else if (metrics.errorRate > 0.01) {
    score -= 20
    issues.push('错误率偏高')
  }

  // 评估缓冲区利用率
  if (metrics.bufferUtilization > 0.9) {
    score -= 20
    issues.push('缓冲区拥堵')
  } else if (metrics.bufferUtilization > 0.7) {
    score -= 10
    issues.push('缓冲区利用率高')
  }

  // 评估内存使用
  if (metrics.memoryUsage > 100 * 1024 * 1024) { // 100MB
    score -= 15
    issues.push('高内存使用')
  }

  // 确定等级
  let level: 'excellent' | 'good' | 'warning' | 'critical'
  if (score >= 90) level = 'excellent'
  else if (score >= 75) level = 'good'
  else if (score >= 50) level = 'warning'
  else level = 'critical'

  return {
    level,
    score: Math.max(0, score),
    summary: issues.length > 0 ? `发现问题: ${issues.join(', ')}` : '系统运行正常'
  }
}

// 生成警报
function generateAlerts(metrics: any): Array<{
  type: 'warning' | 'error' | 'info'
  message: string
  timestamp: number
}> {
  const alerts = []
  const now = Date.now()

  if (metrics.averageLatency > 200) {
    alerts.push({
      type: 'error' as const,
      message: `平均延迟过高: ${metrics.averageLatency.toFixed(1)}ms`,
      timestamp: now
    })
  }

  if (metrics.errorRate > 0.05) {
    alerts.push({
      type: 'error' as const,
      message: `错误率过高: ${(metrics.errorRate * 100).toFixed(2)}%`,
      timestamp: now
    })
  }

  if (metrics.bufferUtilization > 0.8) {
    alerts.push({
      type: 'warning' as const,
      message: `缓冲区利用率高: ${(metrics.bufferUtilization * 100).toFixed(1)}%`,
      timestamp: now
    })
  }

  if (metrics.eventsPerSecond > 1000) {
    alerts.push({
      type: 'info' as const,
      message: `高事件频率: ${metrics.eventsPerSecond.toFixed(0)}/秒`,
      timestamp: now
    })
  }

  return alerts
}

// 实时性能流（SSE）
export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const interval = parseInt(searchParams.get('interval') || '1000')

    // 创建SSE流
    const stream = new TransformStream()
    const writer = stream.writable.getWriter()
    const encoder = new TextEncoder()

    // 定期发送性能数据
    const intervalId = setInterval(async () => {
      try {
        const metrics = globalStreamMonitor.getAggregatedMetrics()
        const health = getSystemHealth(metrics)
        
        const data = {
          timestamp: Date.now(),
          metrics,
          health,
        }

        await writer.write(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
        )
      } catch (error) {
        console.error('Error sending performance data:', error)
      }
    }, interval)

    // 5分钟后自动关闭
    setTimeout(async () => {
      clearInterval(intervalId)
      await writer.close()
    }, 5 * 60 * 1000)

    return new NextResponse(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })

  } catch (error: any) {
    console.error("Error in performance streaming route:", error)
    return NextResponse.json({ 
      error: error.message || "Internal server error",
      timestamp: Date.now(),
    }, { status: 500 })
  }
} 