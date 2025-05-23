import { CAD_FILE_TYPES, PARSER_CONFIG, ANALYZER_CONFIG } from '@/config/cad-analyzer.config';
import { existsSync, mkdirSync } from 'fs';
import { unlink } from 'fs/promises';
import { join, dirname } from 'path';
import { v4 as uuidv4 } from 'uuid';

/**
 * 检查文件类型是否受支持
 * @param fileExtension 文件扩展名
 * @returns 是否支持该文件类型
 */
export function isSupportedFileType(fileExtension: string): boolean {
  const normalizedExt = fileExtension.toLowerCase().replace(/^\./, '');
  
  return [
    ...CAD_FILE_TYPES['2d'].map(type => type.extension),
    ...CAD_FILE_TYPES['3d'].map(type => type.extension)
  ].includes(normalizedExt);
}

/**
 * 获取文件类型分类（2D或3D）
 * @param fileExtension 文件扩展名
 * @returns 文件类型分类，如果不支持则返回null
 */
export function getFileTypeCategory(fileExtension: string): '2d' | '3d' | null {
  const normalizedExt = fileExtension.toLowerCase().replace(/^\./, '');
  
  if (CAD_FILE_TYPES['2d'].some(type => type.extension === normalizedExt)) {
    return '2d';
  } else if (CAD_FILE_TYPES['3d'].some(type => type.extension === normalizedExt)) {
    return '3d';
  }
  
  return null;
}

/**
 * 获取文件类型的MIME类型
 * @param fileExtension 文件扩展名
 * @returns MIME类型
 */
export function getFileMimeType(fileExtension: string): string {
  const normalizedExt = fileExtension.toLowerCase().replace(/^\./, '');
  
  const type2D = CAD_FILE_TYPES['2d'].find(type => type.extension === normalizedExt);
  if (type2D) {
    return type2D.mimeType;
  }
  
  const type3D = CAD_FILE_TYPES['3d'].find(type => type.extension === normalizedExt);
  if (type3D) {
    return type3D.mimeType;
  }
  
  return 'application/octet-stream';
}

/**
 * 获取文件类型的描述
 * @param fileExtension 文件扩展名
 * @returns 文件类型描述
 */
export function getFileTypeDescription(fileExtension: string): string {
  const normalizedExt = fileExtension.toLowerCase().replace(/^\./, '');
  
  const type2D = CAD_FILE_TYPES['2d'].find(type => type.extension === normalizedExt);
  if (type2D) {
    return type2D.description;
  }
  
  const type3D = CAD_FILE_TYPES['3d'].find(type => type.extension === normalizedExt);
  if (type3D) {
    return type3D.description;
  }
  
  return '未知文件类型';
}

/**
 * 生成临时文件路径
 * @param directory 目录
 * @param extension 文件扩展名
 * @returns 临时文件路径
 */
export function generateTempFilePath(directory: string, extension: string): string {
  const fileId = uuidv4();
  const normalizedExt = extension.toLowerCase().replace(/^\./, '');
  const tempDir = join(process.cwd(), directory);
  
  // 确保目录存在
  if (!existsSync(tempDir)) {
    mkdirSync(tempDir, { recursive: true });
  }
  
  return join(tempDir, `${fileId}.${normalizedExt}`);
}

/**
 * 安全地删除临时文件
 * @param filePath 文件路径
 */
export async function cleanupTempFile(filePath: string): Promise<void> {
  try {
    if (filePath && existsSync(filePath)) {
      await unlink(filePath);
    }
  } catch (error) {
    console.warn(`清理临时文件失败: ${filePath}`, error);
  }
}

/**
 * 获取文件大小的可读字符串
 * @param bytes 文件大小（字节）
 * @returns 格式化的文件大小字符串
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * 验证文件大小是否在允许范围内
 * @param fileSize 文件大小（字节）
 * @param maxSize 最大允许大小（字节），默认使用配置中的值
 * @returns 是否有效
 */
export function validateFileSize(fileSize: number, maxSize: number = ANALYZER_CONFIG.limits.maxFileSize): boolean {
  return fileSize > 0 && fileSize <= maxSize;
}

/**
 * 获取支持的CAD文件类型扩展名列表
 */
export function getSupportedFileExtensions(): string[] {
  return [
    ...CAD_FILE_TYPES['2d'].map(type => type.extension),
    ...CAD_FILE_TYPES['3d'].map(type => type.extension)
  ];
}

/**
 * 获取支持的CAD文件类型MIME类型列表
 */
export function getSupportedMimeTypes(): string[] {
  return [
    ...CAD_FILE_TYPES['2d'].map(type => type.mimeType),
    ...CAD_FILE_TYPES['3d'].map(type => type.mimeType)
  ];
}

/**
 * 解析文件名并提取信息
 * @param fileName 文件名
 * @returns 解析后的信息
 */
export function parseFileName(fileName: string): {
  name: string;
  extension: string;
  fullName: string;
  hasVersion: boolean;
  version?: string;
} {
  const fullName = fileName;
  const lastDotIndex = fileName.lastIndexOf('.');
  
  // 提取扩展名和基本名称
  const extension = lastDotIndex !== -1 ? fileName.slice(lastDotIndex + 1) : '';
  const name = lastDotIndex !== -1 ? fileName.slice(0, lastDotIndex) : fileName;
  
  // 检查是否有版本号
  const versionMatch = name.match(/[vV](\d+(\.\d+)*)|[-_](\d+(\.\d+)*)$/);
  const hasVersion = !!versionMatch;
  const version = versionMatch ? (versionMatch[1] || versionMatch[3]) : undefined;
  
  return {
    name,
    extension,
    fullName,
    hasVersion,
    version
  };
}

/**
 * 获取安全的文件名（移除不安全字符）
 * @param fileName 原始文件名
 * @returns 安全的文件名
 */
export function getSafeFileName(fileName: string): string {
  // 移除不安全的字符
  return fileName
    .replace(/[\/\?<>\\:\*\|"]/g, '_') // 替换文件系统不允许的字符
    .replace(/\s+/g, '_')              // 替换空白字符为下划线
    .replace(/^\.+/, '')               // 移除开头的点
    .replace(/\.+$/, '');              // 移除结尾的点
}

/**
 * 检查文件名是否包含敏感或危险内容
 * @param fileName 文件名
 * @returns 是否包含敏感内容
 */
export function hasSensitiveContent(fileName: string): boolean {
  const sensitivePatterns = [
    /\.\.\//, // 相对路径操作
    /^\//,    // 绝对路径
    /^\\$/,   // Windows路径
    /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i // Windows保留名称
  ];
  
  return sensitivePatterns.some(pattern => pattern.test(fileName));
}

/**
 * 检查是否为2D文件类型
 * @param fileExtension 文件扩展名
 * @returns 是否为2D文件
 */
export function is2DFileType(fileExtension: string): boolean {
  const normalizedExt = fileExtension.toLowerCase().replace(/^\./, '');
  return CAD_FILE_TYPES['2d'].some(type => type.extension === normalizedExt);
}

/**
 * 检查是否为3D文件类型
 * @param fileExtension 文件扩展名
 * @returns 是否为3D文件
 */
export function is3DFileType(fileExtension: string): boolean {
  const normalizedExt = fileExtension.toLowerCase().replace(/^\./, '');
  return CAD_FILE_TYPES['3d'].some(type => type.extension === normalizedExt);
}

/**
 * 获取文件接受格式字符串（用于input accept属性）
 * @returns 接受格式字符串
 */
export function getFileAcceptString(): string {
  const mimeTypes = getSupportedMimeTypes();
  const extensions = getSupportedFileExtensions().map(ext => `.${ext}`);
  return [...mimeTypes, ...extensions].join(',');
} 