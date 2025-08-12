import { ANALYZER_CONFIG,CAD_FILE_TYPES } from '@/config/cad-analyzer.config'

/**
 * 浏览器端安全的 CAD 文件工具集合（不依赖 Node.js 内置模块）
 */

export function isSupportedFileType(fileExtension: string): boolean {
  const normalizedExt = fileExtension.toLowerCase().replace(/^\./, '')
  return [
    ...CAD_FILE_TYPES['2d'].map((type) => type.extension),
    ...CAD_FILE_TYPES['3d'].map((type) => type.extension),
  ].includes(normalizedExt)
}

export function getFileTypeCategory(fileExtension: string): '2d' | '3d' | null {
  const normalizedExt = fileExtension.toLowerCase().replace(/^\./, '')
  if (CAD_FILE_TYPES['2d'].some((type) => type.extension === normalizedExt)) return '2d'
  if (CAD_FILE_TYPES['3d'].some((type) => type.extension === normalizedExt)) return '3d'
  return null
}

export function getFileMimeType(fileExtension: string): string {
  const normalizedExt = fileExtension.toLowerCase().replace(/^\./, '')
  const type2D = CAD_FILE_TYPES['2d'].find((type) => type.extension === normalizedExt)
  if (type2D) return type2D.mimeType
  const type3D = CAD_FILE_TYPES['3d'].find((type) => type.extension === normalizedExt)
  if (type3D) return type3D.mimeType
  return 'application/octet-stream'
}

export function getFileTypeDescription(fileExtension: string): string {
  const normalizedExt = fileExtension.toLowerCase().replace(/^\./, '')
  const type2D = CAD_FILE_TYPES['2d'].find((type) => type.extension === normalizedExt)
  if (type2D) return type2D.description
  const type3D = CAD_FILE_TYPES['3d'].find((type) => type.extension === normalizedExt)
  if (type3D) return type3D.description
  return '未知文件类型'
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

export function validateFileSize(fileSize: number, maxSize: number = ANALYZER_CONFIG.limits.maxFileSize): boolean {
  return fileSize > 0 && fileSize <= maxSize
}

export function getSupportedFileExtensions(): Array<string> {
  return [...CAD_FILE_TYPES['2d'].map((type) => type.extension), ...CAD_FILE_TYPES['3d'].map((type) => type.extension)]
}

export function getSupportedMimeTypes(): Array<string> {
  return [...CAD_FILE_TYPES['2d'].map((type) => type.mimeType), ...CAD_FILE_TYPES['3d'].map((type) => type.mimeType)]
}

export function parseFileName(fileName: string): {
  name: string
  extension: string
  fullName: string
  hasVersion: boolean
  version?: string
} {
  const fullName = fileName
  const lastDotIndex = fileName.lastIndexOf('.')
  const extension = lastDotIndex !== -1 ? fileName.slice(lastDotIndex + 1) : ''
  const name = lastDotIndex !== -1 ? fileName.slice(0, lastDotIndex) : fileName
  const versionMatch = name.match(/[vV](\d+(\.\d+)*)|[-_](\d+(\.\d+)*)$/)
  const hasVersion = !!versionMatch
  const version = versionMatch ? versionMatch[1] || versionMatch[3] : undefined
  return { name, extension, fullName, hasVersion, version }
}

export function getSafeFileName(fileName: string): string {
  return fileName
    .replace(/[\/\?<>\\:\*\|"]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/^\.+/, '')
    .replace(/\.+$/, '')
}

export function hasSensitiveContent(fileName: string): boolean {
  const sensitivePatterns = [/\.\.\//, /^\//, /^\\$/, /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i]
  return sensitivePatterns.some((pattern) => pattern.test(fileName))
}

export function is2DFileType(fileExtension: string): boolean {
  const normalizedExt = fileExtension.toLowerCase().replace(/^\./, '')
  return CAD_FILE_TYPES['2d'].some((type) => type.extension === normalizedExt)
}

export function is3DFileType(fileExtension: string): boolean {
  const normalizedExt = fileExtension.toLowerCase().replace(/^\./, '')
  return CAD_FILE_TYPES['3d'].some((type) => type.extension === normalizedExt)
}

export function getFileAcceptString(): string {
  const mimeTypes = getSupportedMimeTypes()
  const extensions = getSupportedFileExtensions().map((ext) => `.${ext}`)
  return [...mimeTypes, ...extensions].join(',')
}


