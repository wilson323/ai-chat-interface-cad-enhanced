/**
 * CAD临时文件清理脚本
 * 
 * 此脚本用于定期清理CAD分析过程中产生的临时文件。
 * 可以通过命令行参数控制清理行为:
 *   --dry-run: 试运行模式，不实际删除文件
 *   --age=<hours>: 清理超过指定小时数的文件（默认24小时）
 *   --dir=<path>: 仅清理指定目录
 *   --verbose: 输出详细日志
 * 
 * 例如: node scripts/cleanup.js --dry-run --age=48 --verbose
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 导入CAD分析器配置
let CLEANUP_CONFIG;
try {
  // 直接从配置文件加载
  // 注意：这里是服务器端环境，可以直接require .ts文件
  const configPath = path.join(process.cwd(), 'config', 'cad-analyzer.config.ts');
  
  if (fs.existsSync(configPath)) {
    // 对于TypeScript文件，需要使用一些技巧
    const configContent = fs.readFileSync(configPath, 'utf8');
    
    // 从配置文件内容中提取tempDirs数组
    const tempDirsMatch = configContent.match(/tempDirs:\s*\[([\s\S]*?)\]/);
    const scheduledCleanupMatch = configContent.match(/scheduledCleanup:\s*\{([\s\S]*?)\}/);
    
    if (tempDirsMatch && scheduledCleanupMatch) {
      const tempDirsStr = tempDirsMatch[1];
      const tempDirs = tempDirsStr
        .split(',')
        .map(s => s.trim().replace(/['"]/g, ''))
        .filter(Boolean);
      
      const scheduledCleanupStr = scheduledCleanupMatch[1];
      const maxFileAgeMatch = scheduledCleanupStr.match(/maxFileAge:\s*(\d+)\s*\*\s*60\s*\*\s*60\s*\*\s*1000/);
      const maxFileAgeHours = maxFileAgeMatch ? parseInt(maxFileAgeMatch[1]) : 24;
      
      CLEANUP_CONFIG = {
        tempDirs,
        scheduledCleanup: {
          maxFileAge: maxFileAgeHours * 60 * 60 * 1000,
          includeSubdirs: scheduledCleanupStr.includes('includeSubdirs: true'),
          dryRun: scheduledCleanupStr.includes('dryRun: true')
        }
      };
    }
  }
} catch (err) {
  console.warn('无法导入配置文件，使用默认配置:', err.message);
}

// 如果无法加载配置，使用默认值
if (!CLEANUP_CONFIG) {
  CLEANUP_CONFIG = {
    tempDirs: [
      'tmp/cad-thumbnails',
      'tmp/cad-uploads',
      'tmp/cad-reports',
      'tmp/cad-analysis',
      'public/temp'
    ],
    scheduledCleanup: {
      maxFileAge: 24 * 60 * 60 * 1000,
      includeSubdirs: true,
      dryRun: false
    }
  };
}

// 默认配置
const DEFAULT_MAX_AGE_HOURS = CLEANUP_CONFIG.scheduledCleanup.maxFileAge / (60 * 60 * 1000);

// 解析命令行参数
const args = process.argv.slice(2);
const options = {
  dryRun: args.includes('--dry-run') || CLEANUP_CONFIG.scheduledCleanup.dryRun,
  verbose: args.includes('--verbose'),
  maxAgeHours: DEFAULT_MAX_AGE_HOURS,
  specificDir: null,
  includeSubdirs: CLEANUP_CONFIG.scheduledCleanup.includeSubdirs
};

// 解析其他选项
args.forEach(arg => {
  if (arg.startsWith('--age=')) {
    options.maxAgeHours = parseInt(arg.split('=')[1], 10) || DEFAULT_MAX_AGE_HOURS;
  }
  
  if (arg.startsWith('--dir=')) {
    options.specificDir = arg.split('=')[1];
  }
  
  if (arg.startsWith('--include-subdirs=')) {
    options.includeSubdirs = arg.split('=')[1].toLowerCase() === 'true';
  }
});

// 确定要清理的目录
const dirsToClean = options.specificDir 
  ? [options.specificDir] 
  : CLEANUP_CONFIG.tempDirs;

// 计算文件最大保留时间（毫秒）
const maxAgeMs = options.maxAgeHours * 60 * 60 * 1000;
const now = Date.now();

// 打印清理配置
console.log('CAD临时文件清理开始');
console.log('---------------------');
console.log(`模式: ${options.dryRun ? '试运行 (不会删除文件)' : '正式运行'}`);
console.log(`最大保留时间: ${options.maxAgeHours} 小时`);
console.log(`包含子目录: ${options.includeSubdirs ? '是' : '否'}`);
console.log(`目录: ${dirsToClean.join(', ')}`);
console.log('---------------------');

// 统计数据
const stats = {
  totalFiles: 0,
  deletedFiles: 0,
  byDirectory: {},
  errors: []
};

/**
 * 清理指定目录中的过期文件
 */
function cleanDirectory(dirPath, isRoot = true) {
  const directoryPath = path.resolve(process.cwd(), dirPath);
  const dirName = isRoot ? dirPath : path.basename(dirPath);
  
  // 初始化该目录的统计数据
  if (isRoot) {
    stats.byDirectory[dirPath] = { total: 0, deleted: 0 };
  }
  
  try {
    // 检查目录是否存在
    if (!fs.existsSync(directoryPath)) {
      if (options.verbose) {
        console.log(`目录不存在，跳过: ${dirPath}`);
      }
      return;
    }
    
    // 读取目录内容
    const entries = fs.readdirSync(directoryPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const entryPath = path.join(directoryPath, entry.name);
      
      try {
        if (entry.isDirectory()) {
          // 递归处理子目录（如果启用）
          if (options.includeSubdirs) {
            cleanDirectory(entryPath, false);
          } else if (options.verbose) {
            console.log(`跳过子目录: ${entryPath}`);
          }
        } else if (entry.isFile()) {
          // 获取文件状态
          const fileStat = fs.statSync(entryPath);
          const fileAge = now - fileStat.mtimeMs;
          
          // 增加文件计数
          stats.totalFiles++;
          if (isRoot) {
            stats.byDirectory[dirPath].total++;
          }
          
          // 检查文件是否过期
          if (fileAge > maxAgeMs) {
            if (options.verbose) {
              console.log(`发现过期文件: ${entry.name} (${Math.round(fileAge / (1000 * 60 * 60))} 小时)`);
            }
            
            // 删除文件（如果不是试运行模式）
            if (!options.dryRun) {
              fs.unlinkSync(entryPath);
              console.log(`已删除: ${entryPath}`);
            } else {
              console.log(`[试运行] 将删除: ${entryPath}`);
            }
            
            // 更新删除计数
            stats.deletedFiles++;
            if (isRoot) {
              stats.byDirectory[dirPath].deleted++;
            }
          } else if (options.verbose) {
            console.log(`保留文件: ${entry.name} (${Math.round(fileAge / (1000 * 60 * 60))} 小时)`);
          }
        }
      } catch (error) {
        const errorMessage = `处理 ${entryPath} 时出错: ${error.message}`;
        console.error(errorMessage);
        stats.errors.push(errorMessage);
      }
    }
  } catch (error) {
    const errorMessage = `无法访问目录 ${dirPath}: ${error.message}`;
    console.error(errorMessage);
    stats.errors.push(errorMessage);
  }
}

// 清理所有指定目录
dirsToClean.forEach(dir => cleanDirectory(dir));

// 打印清理结果
console.log('\n清理结果摘要:');
console.log('---------------------');
console.log(`总文件数: ${stats.totalFiles}`);
console.log(`${options.dryRun ? '将删除' : '已删除'}文件数: ${stats.deletedFiles}`);

console.log('\n按目录统计:');
Object.entries(stats.byDirectory).forEach(([dir, dirStats]) => {
  console.log(`  ${dir}: 总计 ${dirStats.total} 文件, ${options.dryRun ? '将删除' : '已删除'} ${dirStats.deleted} 文件`);
});

if (stats.errors.length > 0) {
  console.log('\n错误:');
  stats.errors.forEach(error => console.log(`  - ${error}`));
}

// 记录清理日志
const logMessage = `[${new Date().toISOString()}] ${options.dryRun ? '[DRY RUN] ' : ''}清理完成: 扫描 ${stats.totalFiles} 文件, ${options.dryRun ? '将删除' : '已删除'} ${stats.deletedFiles} 文件`;

try {
  const logDir = path.join(process.cwd(), 'logs');
  
  // 确保日志目录存在
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  
  // 追加日志
  fs.appendFileSync(
    path.join(logDir, 'cleanup.log'), 
    logMessage + '\n'
  );
} catch (error) {
  console.error(`写入日志失败: ${error.message}`);
}

console.log('\n' + logMessage); 