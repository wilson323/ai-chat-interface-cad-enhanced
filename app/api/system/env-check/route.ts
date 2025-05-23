/**
 * 环境健康检查API端点
 * Environment Health Check API Endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateCriticalDependencies, generateEnvironmentReport } from '@/lib/utils/env-validator';

export const dynamic = 'force-dynamic';

interface EnvironmentStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  dependencies: {
    total: number;
    healthy: number;
    warnings: number;
    errors: number;
  };
  report?: string;
}

export async function GET(request: NextRequest) {
  try {
    const validation = validateCriticalDependencies();
    
    const healthyCount = validation.checks.filter(c => c.status === 'ok').length;
    const warningCount = validation.checks.filter(c => c.status === 'warning').length;
    const errorCount = validation.checks.filter(c => c.status === 'error').length;
    
    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (errorCount > 0) {
      status = 'unhealthy';
    } else if (warningCount > 0) {
      status = 'degraded';
    } else {
      status = 'healthy';
    }
    
    const response: EnvironmentStatus = {
      status,
      timestamp: new Date().toISOString(),
      dependencies: {
        total: validation.checks.length,
        healthy: healthyCount,
        warnings: warningCount,
        errors: errorCount
      }
    };
    
    // 如果请求详细报告
    const searchParams = request.nextUrl.searchParams;
    if (searchParams.get('detailed') === 'true') {
      response.report = generateEnvironmentReport();
    }
    
    return NextResponse.json(response, {
      status: status === 'healthy' ? 200 : status === 'degraded' ? 206 : 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json'
      }
    });
    
  } catch (error) {
    console.error('Environment check failed:', error);
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      dependencies: {
        total: 0,
        healthy: 0,
        warnings: 0,
        errors: 1
      }
    }, {
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json'
      }
    });
  }
}

export async function HEAD() {
  // 快速健康检查
  try {
    const validation = validateCriticalDependencies();
    return new NextResponse(null, {
      status: validation.isValid ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  } catch {
    return new NextResponse(null, { status: 503 });
  }
} 