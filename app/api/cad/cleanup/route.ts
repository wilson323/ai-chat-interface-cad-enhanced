import { NextRequest, NextResponse } from 'next/server';
import { readdir, stat, unlink } from 'fs/promises';
import { join } from 'path';
import { cadMetrics } from '@/lib/services/cad-analyzer/metrics';
import { CLEANUP_CONFIG } from '@/config/cad-analyzer.config';

// 文件最大保留时间（使用配置文件中的值）
const MAX_FILE_AGE_MS = CLEANUP_CONFIG.scheduledCleanup.maxFileAge;

interface CleanupOptions {
  maxAgeHours?: number;  // 文件最大保留时间（小时）
  dryRun?: boolean;      // 试运行模式，不实际删除文件
  specificDir?: string;  // 指定要清理的目录
  includeSubdirs?: boolean; // 是否包含子目录
}

/**
 * CAD临时文件清理API端点
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  
  try {
    const options: CleanupOptions = await request.json();
    
    // 验证权限（实际应用中，应该使用更完善的授权机制）
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // 配置清理选项
    const maxAgeMs = options.maxAgeHours ? options.maxAgeHours * 60 * 60 * 1000 : MAX_FILE_AGE_MS;
    const dryRun = options.dryRun || false;
    
    // 确定要清理的目录
    const dirsToClean = options.specificDir 
      ? [options.specificDir] 
      : CLEANUP_CONFIG.tempDirs;
    
    // 执行清理
    const result = await cleanupTempFiles(dirsToClean, {
      maxAgeMs,
      dryRun,
      includeSubdirs: options.includeSubdirs || CLEANUP_CONFIG.scheduledCleanup.includeSubdirs
    });
    
    // 记录处理时间
    const duration = Date.now() - startTime;
    cadMetrics.record('cleanup_operation_time', duration, 'ms', {
      dryRun: String(dryRun),
      fileCount: String(result.totalFiles),
      deletedCount: String(result.deletedFiles)
    });
    
    return NextResponse.json({
      success: true,
      ...result,
      dryRun,
      executionTimeMs: duration
    });
    
  } catch (error) {
    console.error('文件清理失败:', error);
    
    // 记录错误
    cadMetrics.record('error_count', 1, 'count', {
      error: error instanceof Error ? error.message : String(error),
      endpoint: 'cleanup'
    });
    
    return NextResponse.json(
      { error: 'Failed to cleanup files', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/**
 * 清理临时文件
 */
async function cleanupTempFiles(
  directories: string[],
  options: {
    maxAgeMs: number,
    dryRun: boolean,
    includeSubdirs: boolean
  }
): Promise<{
  totalFiles: number,
  deletedFiles: number,
  byDirectory: Record<string, { total: number, deleted: number }>,
  errors: string[]
}> {
  const now = Date.now();
  const result = {
    totalFiles: 0,
    deletedFiles: 0,
    byDirectory: {} as Record<string, { total: number, deleted: number }>,
    errors: [] as string[]
  };
  
  for (const dirPath of directories) {
    // 确保目录路径是相对于项目根目录的
    const fullPath = join(process.cwd(), dirPath);
    
    try {
      // 初始化该目录的结果统计
      result.byDirectory[dirPath] = { total: 0, deleted: 0 };
      
      // 处理目录
      const dirStats = await processDirectory(fullPath, now, options, result, dirPath);
      
      // 更新总计数据
      result.totalFiles += dirStats.total;
      result.deletedFiles += dirStats.deleted;
    } catch (error) {
      // 记录错误但继续处理其他目录
      const errorMessage = `处理目录 ${dirPath} 时出错: ${error instanceof Error ? error.message : String(error)}`;
      console.error(errorMessage);
      result.errors.push(errorMessage);
    }
  }
  
  return result;
}

/**
 * 处理单个目录
 */
async function processDirectory(
  dirPath: string,
  now: number,
  options: {
    maxAgeMs: number,
    dryRun: boolean,
    includeSubdirs: boolean
  },
  result: {
    byDirectory: Record<string, { total: number, deleted: number }>,
    errors: string[]
  },
  originalPath: string
): Promise<{ total: number, deleted: number }> {
  let total = 0;
  let deleted = 0;
  
  try {
    // 读取目录内容
    const entries = await readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const entryPath = join(dirPath, entry.name);
      
      try {
        if (entry.isDirectory() && options.includeSubdirs) {
          // 递归处理子目录
          const subdirStats = await processDirectory(
            entryPath, 
            now, 
            options, 
            result, 
            join(originalPath, entry.name)
          );
          
          total += subdirStats.total;
          deleted += subdirStats.deleted;
        } else if (entry.isFile()) {
          total++;
          
          // 获取文件状态
          const fileStat = await stat(entryPath);
          const fileAge = now - fileStat.mtimeMs;
          
          // 检查文件是否过期
          if (fileAge > options.maxAgeMs) {
            // 删除文件（如果不是试运行模式）
            if (!options.dryRun) {
              await unlink(entryPath);
            }
            deleted++;
          }
        }
      } catch (error) {
        // 记录错误但继续处理其他文件
        const errorMessage = `处理文件 ${entryPath} 时出错: ${error instanceof Error ? error.message : String(error)}`;
        console.error(errorMessage);
        result.errors.push(errorMessage);
      }
    }
    
    // 更新目录统计数据
    result.byDirectory[originalPath].total += total;
    result.byDirectory[originalPath].deleted += deleted;
    
    return { total, deleted };
  } catch (error) {
    // 如果目录不存在或无法访问，返回零计数
    console.warn(`无法访问目录 ${dirPath}: ${error instanceof Error ? error.message : String(error)}`);
    return { total: 0, deleted: 0 };
  }
}

/**
 * 定期清理任务（GET请求）
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  
  try {
    // 验证清理调度器的密钥
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // 使用默认设置执行清理
    const result = await cleanupTempFiles(CLEANUP_CONFIG.tempDirs, {
      maxAgeMs: MAX_FILE_AGE_MS,
      dryRun: CLEANUP_CONFIG.scheduledCleanup.dryRun,
      includeSubdirs: CLEANUP_CONFIG.scheduledCleanup.includeSubdirs
    });
    
    // 记录处理时间
    const duration = Date.now() - startTime;
    cadMetrics.record('scheduled_cleanup_time', duration, 'ms', {
      fileCount: String(result.totalFiles),
      deletedCount: String(result.deletedFiles)
    });
    
    return NextResponse.json({
      success: true,
      ...result,
      executionTimeMs: duration
    });
    
  } catch (error) {
    console.error('定期清理失败:', error);
    
    // 记录错误
    cadMetrics.record('error_count', 1, 'count', {
      error: error instanceof Error ? error.message : String(error),
      endpoint: 'cleanup_scheduled'
    });
    
    return NextResponse.json(
      { error: 'Failed to perform scheduled cleanup', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 