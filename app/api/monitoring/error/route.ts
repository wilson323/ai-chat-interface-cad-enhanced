import { NextRequest, NextResponse } from 'next/server';
import { log } from '@/lib/utils/logger';

interface ErrorReport {
  message: string;
  filename?: string;
  lineno?: number;
  colno?: number;
  stack?: string;
  userAgent: string;
  url: string;
  timestamp: number;
  type?: 'error' | 'unhandledrejection';
  reason?: string;
  userId?: string;
  sessionId?: string;
}

interface ErrorStats {
  totalErrors: number;
  recentErrors: number;
  errorsByType: Record<string, number>;
  errorsByPage: Record<string, number>;
  criticalErrors: number;
}

// 错误存储（生产环境建议使用数据库）
const errorLog: ErrorReport[] = [];
const MAX_ERRORS = 10000;

// 错误分类
const ERROR_SEVERITY = {
  CRITICAL: ['TypeError', 'ReferenceError', 'SyntaxError'],
  HIGH: ['NetworkError', 'SecurityError', 'QuotaExceededError'],
  MEDIUM: ['TimeoutError', 'AbortError'],
  LOW: ['Warning', 'Info']
};

export async function POST(request: NextRequest) {
  try {
    const errorData: ErrorReport = await request.json();
    
    // 验证错误数据
    if (!errorData.message || !errorData.userAgent || !errorData.url) {
      return NextResponse.json(
        { error: '缺少必需的错误信息' },
        { status: 400 }
      );
    }

    // 增强错误数据
    const enhancedError: ErrorReport = {
      ...errorData,
      timestamp: errorData.timestamp || Date.now(),
      sessionId: request.headers.get('x-session-id') || 'unknown',
    };

    // 添加到错误日志
    errorLog.push(enhancedError);
    
    // 保持错误日志大小限制
    if (errorLog.length > MAX_ERRORS) {
      errorLog.splice(0, errorLog.length - MAX_ERRORS);
    }

    // 确定错误严重性
    const severity = getErrorSeverity(errorData.message);
    
    // 记录到日志系统
    if (severity === 'CRITICAL') {
      log.fatal('前端关键错误', {
        module: 'ErrorMonitoring',
        error: errorData.message,
        stack: errorData.stack,
        url: errorData.url,
        userAgent: errorData.userAgent,
        filename: errorData.filename,
        line: errorData.lineno,
        column: errorData.colno
      });
    } else if (severity === 'HIGH') {
      log.error('前端高级错误', {
        module: 'ErrorMonitoring',
        error: errorData.message,
        url: errorData.url,
        userAgent: errorData.userAgent
      });
    } else {
      log.warn('前端错误', {
        module: 'ErrorMonitoring',
        error: errorData.message,
        url: errorData.url
      });
    }

    // 如果是关键错误，可以触发告警
    if (severity === 'CRITICAL') {
      await triggerAlert(enhancedError);
    }

    return NextResponse.json(
      { 
        success: true, 
        severity,
        errorId: generateErrorId(enhancedError)
      },
      { status: 200 }
    );

  } catch (error) {
    log.error('错误监控API失败', {
      module: 'ErrorMonitoring'
    }, error as Error);
    
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const severity = url.searchParams.get('severity');
    const page = url.searchParams.get('page');
    const since = url.searchParams.get('since');
    
    let filteredErrors = [...errorLog];

    // 按时间过滤
    if (since) {
      const sinceTime = parseInt(since);
      filteredErrors = filteredErrors.filter(error => error.timestamp >= sinceTime);
    }

    // 按严重性过滤
    if (severity) {
      filteredErrors = filteredErrors.filter(error => 
        getErrorSeverity(error.message) === severity.toUpperCase()
      );
    }

    // 按页面过滤
    if (page) {
      filteredErrors = filteredErrors.filter(error => 
        error.url.includes(page)
      );
    }

    // 排序（最新的优先）
    filteredErrors.sort((a, b) => b.timestamp - a.timestamp);

    // 限制数量
    const limitedErrors = filteredErrors.slice(0, limit);

    // 生成统计信息
    const stats = generateErrorStats(filteredErrors);

    return NextResponse.json({
      errors: limitedErrors,
      stats,
      total: filteredErrors.length,
      timestamp: Date.now()
    });

  } catch (error) {
    log.error('获取错误日志失败', {
      module: 'ErrorMonitoring'
    }, error as Error);
    
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

// 清理旧错误日志
export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const before = url.searchParams.get('before');
    
    if (before) {
      const beforeTime = parseInt(before);
      const initialLength = errorLog.length;
      
      // 删除指定时间之前的错误
      for (let i = errorLog.length - 1; i >= 0; i--) {
        if (errorLog[i].timestamp < beforeTime) {
          errorLog.splice(i, 1);
        }
      }
      
      const deletedCount = initialLength - errorLog.length;
      
      log.info('清理错误日志', {
        module: 'ErrorMonitoring',
        deletedCount,
        remainingCount: errorLog.length
      });
      
      return NextResponse.json({
        success: true,
        deletedCount,
        remainingCount: errorLog.length
      });
    } else {
      // 清空所有错误日志
      const deletedCount = errorLog.length;
      errorLog.length = 0;
      
      log.info('清空错误日志', {
        module: 'ErrorMonitoring',
        deletedCount
      });
      
      return NextResponse.json({
        success: true,
        deletedCount
      });
    }

  } catch (error) {
    log.error('清理错误日志失败', {
      module: 'ErrorMonitoring'
    }, error as Error);
    
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

// 确定错误严重性
function getErrorSeverity(message: string): string {
  for (const [severity, patterns] of Object.entries(ERROR_SEVERITY)) {
    if (patterns.some(pattern => message.includes(pattern))) {
      return severity;
    }
  }
  return 'MEDIUM';
}

// 生成错误ID
function generateErrorId(error: ErrorReport): string {
  const hash = simpleHash(error.message + error.filename + error.lineno);
  return `err_${Date.now()}_${hash}`;
}

// 简单哈希函数
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 转换为32位整数
  }
  return Math.abs(hash).toString(36);
}

// 生成错误统计
function generateErrorStats(errors: ErrorReport[]): ErrorStats {
  const now = Date.now();
  const oneHourAgo = now - 3600000; // 1小时前
  
  const stats: ErrorStats = {
    totalErrors: errors.length,
    recentErrors: errors.filter(e => e.timestamp >= oneHourAgo).length,
    errorsByType: {},
    errorsByPage: {},
    criticalErrors: 0
  };

  errors.forEach(error => {
    // 按类型统计
    const errorType = error.type || 'unknown';
    stats.errorsByType[errorType] = (stats.errorsByType[errorType] || 0) + 1;

    // 按页面统计
    try {
      const url = new URL(error.url);
      const page = url.pathname;
      stats.errorsByPage[page] = (stats.errorsByPage[page] || 0) + 1;
    } catch {
      stats.errorsByPage['unknown'] = (stats.errorsByPage['unknown'] || 0) + 1;
    }

    // 关键错误统计
    if (getErrorSeverity(error.message) === 'CRITICAL') {
      stats.criticalErrors++;
    }
  });

  return stats;
}

// 触发告警（可以集成邮件、短信、Slack等）
async function triggerAlert(error: ErrorReport): Promise<void> {
  try {
    // 这里可以实现告警逻辑
    // 例如：发送邮件、Slack通知、短信等
    
    log.fatal('关键错误告警', {
      module: 'ErrorMonitoring',
      alert: true,
      error: error.message,
      url: error.url,
      userAgent: error.userAgent,
      stack: error.stack
    });

    // 如果配置了Webhook，可以发送到外部服务
    if (process.env.ERROR_WEBHOOK_URL) {
      await fetch(process.env.ERROR_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: `🚨 关键错误告警\n错误: ${error.message}\n页面: ${error.url}\n时间: ${new Date(error.timestamp).toLocaleString()}`,
          error
        }),
      }).catch(err => {
        log.warn('发送错误告警失败', { module: 'ErrorMonitoring' }, err);
      });
    }

  } catch (alertError) {
    log.error('触发告警失败', {
      module: 'ErrorMonitoring'
    }, alertError as Error);
  }
} 