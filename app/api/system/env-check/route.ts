/**
 * 环境健康检查API端点 (Edge Runtime 轻量版)
 * Environment Health Check API Endpoint (Edge)
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

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

function lightweightValidation() {
  const checks: Array<{ name: string; status: 'ok' | 'warning' | 'error'; message?: string }> = []

  // Upstash Redis
  const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL
  const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!REDIS_URL || !REDIS_TOKEN) {
    checks.push({ name: 'Upstash Redis Config', status: 'warning', message: 'Missing Upstash Redis env, rate limiter will be disabled.' })
  } else {
    checks.push({ name: 'Upstash Redis Config', status: 'ok', message: 'Upstash Redis env detected' })
  }

  // CAD feature flags
  const OCCT_ENABLED = process.env.OCCT_IMPORT_ENABLED === 'true'
  if (!OCCT_ENABLED) {
    checks.push({ name: 'OCCT Import', status: 'warning', message: 'occt-import-js disabled; STEP/IGES parsing requires OCCT_IMPORT_ENABLED=true.' })
  } else {
    checks.push({ name: 'OCCT Import', status: 'ok', message: 'occt-import-js enabled' })
  }

  const DWG_URL = process.env.DWG_CONVERTER_URL
  if (!DWG_URL) {
    checks.push({ name: 'DWG Converter Service', status: 'warning', message: 'DWG converter URL missing; DWG->DXF conversion will be unavailable.' })
  } else {
    checks.push({ name: 'DWG Converter Service', status: 'ok', message: 'DWG converter configured' })
  }

  const healthy = checks.filter(c => c.status === 'ok').length
  const warnings = checks.filter(c => c.status === 'warning').length
  const errors = checks.filter(c => c.status === 'error').length

  const status: EnvironmentStatus['status'] = errors > 0 ? 'unhealthy' : warnings > 0 ? 'degraded' : 'healthy'
  return { checks, status }
}

export async function GET(request: NextRequest) {
  try {
    const validation = lightweightValidation()

    const response: EnvironmentStatus & { hints?: string[]; checks?: any[] } = {
      status: validation.status,
      timestamp: new Date().toISOString(),
      dependencies: {
        total: validation.checks.length,
        healthy: validation.checks.filter(c => c.status === 'ok').length,
        warnings: validation.checks.filter(c => c.status === 'warning').length,
        errors: validation.checks.filter(c => c.status === 'error').length,
      },
    }

    const hints: string[] = []
    const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL
    const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN
    if (!REDIS_URL || !REDIS_TOKEN) {
      const missingVars = [!REDIS_URL ? 'UPSTASH_REDIS_REST_URL' : null, !REDIS_TOKEN ? 'UPSTASH_REDIS_REST_TOKEN' : null].filter(Boolean) as string[]
      hints.push(`缺少 Upstash Redis 配置，限流与部分缓存将自动禁用。缺失变量: ${missingVars.join(', ') || '未知'}`)
      hints.push('在 .env 或部署环境中设置上述变量。例如：UPSTASH_REDIS_REST_URL=https://...，UPSTASH_REDIS_REST_TOKEN=********')
      hints.push('若暂不配置，可继续运行，但建议在生产环境开启以获得更稳定的限流与防护能力。')
    }

    const searchParams = request.nextUrl.searchParams
    if (searchParams.get('detailed') === 'true') {
      response.checks = validation.checks
    }
    if (hints.length > 0) response.hints = hints

    return NextResponse.json(response, {
      status: validation.status === 'healthy' ? 200 : validation.status === 'degraded' ? 206 : 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json',
      },
    })
  } catch (error) {
    console.error('Environment check failed:', error)
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        dependencies: { total: 0, healthy: 0, warnings: 0, errors: 1 },
      },
      { status: 503, headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Content-Type': 'application/json' } },
    )
  }
}

export async function HEAD() {
  try {
    const validation = lightweightValidation()
    return new NextResponse(null, {
      status: validation.status === 'healthy' ? 200 : validation.status === 'degraded' ? 206 : 503,
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
    })
  } catch {
    return new NextResponse(null, { status: 503 })
  }
} 