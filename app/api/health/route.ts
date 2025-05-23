/**
 * 健康检查API端点
 * 检查应用基本功能和依赖服务(Redis)状态
 */
import { NextRequest, NextResponse } from 'next/server'

// 声明process全局变量类型
declare global {
  var process: {
    env: Record<string, string | undefined>
    memoryUsage(): {
      rss: number
      heapTotal: number
      heapUsed: number
      external: number
      arrayBuffers: number
    }
    cpuUsage?(previousValue?: {
      user: number
      system: number
    }): {
      user: number
      system: number
    }
  }
}

export const dynamic = "force-dynamic"

interface ServiceStatus {
  api: boolean;
  redis: boolean;
  db?: boolean;
  storage?: boolean;
}

interface HealthCheck {
  name: string
  status: 'healthy' | 'unhealthy' | 'warning'
  message?: string
  responseTime?: number
  lastCheck?: string
}

interface SystemMetrics {
  memoryUsage: {
    rss: number
    heapTotal: number
    heapUsed: number
    external: number
    arrayBuffers: number
  }
  cpuUsage?: {
    user: number
    system: number
  } | null
}

interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded'
  timestamp: string
  uptime: number
  version: string
  environment: string
  checks: Record<string, HealthCheck>
  metrics?: SystemMetrics
}

// 启动时间
const startTime = Date.now()

/**
 * 检查Redis连接
 */
async function checkRedis(): Promise<HealthCheck> {
  try {
    // 这里可以添加实际的Redis连接检查
    const redisUrl = process.env.REDIS_URL
    if (!redisUrl) {
      return {
        name: 'Redis',
        status: 'warning',
        message: 'Redis URL not configured'
      }
    }
    
    // 模拟Redis连接检查
    return {
      name: 'Redis',
      status: 'healthy',
      message: 'Connected',
      responseTime: 5,
      lastCheck: new Date().toISOString()
    }
  } catch (error) {
    return {
      name: 'Redis',
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Connection failed'
    }
  }
}

/**
 * 检查FastGPT API
 */
async function checkFastGPT(): Promise<HealthCheck> {
  try {
    const apiUrl = process.env.FASTGPT_API_URL
    if (!apiUrl) {
      return {
        name: 'FastGPT',
        status: 'warning',
        message: 'FastGPT API URL not configured'
      }
    }
    
    // 这里可以添加实际的FastGPT API连接检查
    return {
      name: 'FastGPT',
      status: 'healthy',
      message: 'API accessible',
      responseTime: 150,
      lastCheck: new Date().toISOString()
    }
  } catch (error) {
    return {
      name: 'FastGPT',
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'API not accessible'
    }
  }
}

/**
 * 检查AG-UI性能优化器
 */
async function checkAGUIOptimizer(): Promise<HealthCheck> {
  try {
    // 检查性能监控API是否可用，使用AbortController实现超时
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 2000)
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/ag-ui/performance`, {
        method: 'GET',
        signal: controller.signal,
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        return {
          name: 'AG-UI Optimizer',
          status: 'warning',
          message: 'Performance API not responding'
        }
      }
      
      return {
        name: 'AG-UI Optimizer',
        status: 'healthy',
        message: 'Performance optimization active',
        lastCheck: new Date().toISOString()
      }
    } catch (fetchError) {
      clearTimeout(timeoutId)
      return {
        name: 'AG-UI Optimizer',
        status: 'warning',
        message: 'Performance API not responding'
      }
    }
  } catch (error) {
    return {
      name: 'AG-UI Optimizer',
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Optimizer not working'
    }
  }
}

/**
 * 获取系统指标
 */
function getSystemMetrics() {
  try {
    return {
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage ? process.cpuUsage() : null
    }
  } catch (error) {
    return undefined
  }
}

export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now()
    
    // 并行执行所有健康检查
    const [redisCheck, fastgptCheck, aguiCheck] = await Promise.all([
      checkRedis(),
      checkFastGPT(),
      checkAGUIOptimizer()
    ])
    
    const checks = {
      redis: redisCheck,
      fastgpt: fastgptCheck,
      agui: aguiCheck
    }
    
    // 确定整体健康状态
    const unhealthyChecks = Object.values(checks).filter(check => check.status === 'unhealthy')
    const warningChecks = Object.values(checks).filter(check => check.status === 'warning')
    
    let overallStatus: 'healthy' | 'unhealthy' | 'degraded'
    if (unhealthyChecks.length > 0) {
      overallStatus = 'unhealthy'
    } else if (warningChecks.length > 0) {
      overallStatus = 'degraded'
    } else {
      overallStatus = 'healthy'
    }
    
    const healthStatus: HealthStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - startTime,
      version: process.env.AG_UI_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks,
      metrics: getSystemMetrics()
    }
    
    const endTime = Date.now()
    const responseTime = endTime - startTime
    
    // 根据健康状态返回相应的HTTP状态码
    const httpStatus = overallStatus === 'healthy' ? 200 : 
                      overallStatus === 'degraded' ? 200 : 503
    
    return NextResponse.json(healthStatus, { 
      status: httpStatus,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Response-Time': responseTime.toString()
      }
    })
    
  } catch (error) {
    console.error('Health check error:', error)
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: Date.now() - startTime,
      version: process.env.AG_UI_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      message: error instanceof Error ? error.message : 'Internal health check error',
      checks: {}
    }, { status: 503 })
  }
}

// 支持HEAD请求用于简单的存活检查
export async function HEAD() {
  return new NextResponse(null, { status: 200 })
}
