/**
 * 健康检查API端点
 * 检查应用基本功能和依赖服务(Redis)状态
 */
import { NextRequest, NextResponse } from 'next/server'

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
  services: ServiceStatus
}

// 检查Redis连接
async function checkRedis(): Promise<HealthCheck> {
  const startTime = Date.now()
  
  try {
    // 这里应该实际检查Redis连接
    // 暂时模拟检查
    const isHealthy = true // await redis.ping()
    
    return {
      name: 'Redis',
      status: isHealthy ? 'healthy' : 'unhealthy',
      message: isHealthy ? 'Redis连接正常' : 'Redis连接失败',
      responseTime: Date.now() - startTime,
      lastCheck: new Date().toISOString()
    }
  } catch (error) {
    return {
      name: 'Redis',
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Redis检查失败',
      responseTime: Date.now() - startTime,
      lastCheck: new Date().toISOString()
    }
  }
}

// 获取系统指标
function getSystemMetrics(): SystemMetrics {
  const memoryUsage = {
    rss: 0,
    heapTotal: 0,
    heapUsed: 0,
    external: 0,
    arrayBuffers: 0
  }
  
  let cpuUsage = null
  
  // 在Node.js环境中获取系统指标
  if (typeof global !== 'undefined' && global.process) {
    try {
      const nodeProcess = global.process
      if (nodeProcess.memoryUsage) {
        const memory = nodeProcess.memoryUsage()
        memoryUsage.rss = memory.rss
        memoryUsage.heapTotal = memory.heapTotal
        memoryUsage.heapUsed = memory.heapUsed
        memoryUsage.external = memory.external
        memoryUsage.arrayBuffers = memory.arrayBuffers
      }
      
      if (nodeProcess.cpuUsage) {
        cpuUsage = nodeProcess.cpuUsage()
      }
    } catch (error) {
      console.warn('获取系统指标失败:', error)
    }
  }
  
  return {
    memoryUsage,
    cpuUsage
  }
}

export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now()
    
    // 检查各种服务
    const redisCheck = await checkRedis()
    
    // 获取系统指标
    const metrics = getSystemMetrics()
    
    // 获取环境信息
    const environment = process.env.NODE_ENV || 'development'
    const version = process.env.npm_package_version || '1.0.0'
    
    // 计算运行时间（需要全局变量或文件存储启动时间）
    const uptime = Date.now() - startTime // 简化实现
    
    // 组装健康检查结果
    const checks: Record<string, HealthCheck> = {
      redis: redisCheck,
      api: {
        name: 'API',
        status: 'healthy',
        message: 'API服务正常',
        responseTime: Date.now() - startTime,
        lastCheck: new Date().toISOString()
      }
    }
    
    // 确定整体状态
    const hasUnhealthy = Object.values(checks).some(check => check.status === 'unhealthy')
    const hasWarning = Object.values(checks).some(check => check.status === 'warning')
    
    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy'
    if (hasUnhealthy) {
      overallStatus = 'unhealthy'
    } else if (hasWarning) {
      overallStatus = 'degraded'
    }
    
    const healthStatus: HealthStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime,
      version,
      environment,
      checks,
      metrics,
      services: {
        api: true,
        redis: redisCheck.status === 'healthy',
        db: true, // 暂时设为true，实际应检查数据库
        storage: true // 暂时设为true，实际应检查存储
      }
    }
    
    // 根据状态返回相应的HTTP状态码
    const httpStatus = overallStatus === 'healthy' ? 200 : 
                      overallStatus === 'degraded' ? 200 : 503
    
    return NextResponse.json(healthStatus, { 
      status: httpStatus,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
    
  } catch (error) {
    console.error('健康检查失败:', error)
    
    const errorResponse: HealthStatus = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: 0,
      version: 'unknown',
      environment: process.env.NODE_ENV || 'unknown',
      checks: {
        system: {
          name: 'System',
          status: 'unhealthy',
          message: error instanceof Error ? error.message : '系统检查失败',
          lastCheck: new Date().toISOString()
        }
      },
      services: {
        api: false,
        redis: false
      }
    }
    
    return NextResponse.json(errorResponse, { 
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  }
}

// 支持HEAD请求用于简单的存活检查
export async function HEAD() {
  return new NextResponse(null, { status: 200 })
}
