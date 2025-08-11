import { existsSync, mkdirSync } from 'fs'
import { unlink } from 'fs/promises'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'

/**
 * 仅服务端使用：生成临时文件路径
 */
export function generateTempFilePath(directory: string, extension: string): string {
  const fileId = uuidv4()
  const normalizedExt = extension.toLowerCase().replace(/^\./, '')
  const tempDir = join(process.cwd(), directory)

  if (!existsSync(tempDir)) {
    mkdirSync(tempDir, { recursive: true })
  }

  return join(tempDir, `${fileId}.${normalizedExt}`)
}

/**
 * 仅服务端使用：安全删除临时文件
 */
export async function cleanupTempFile(filePath: string): Promise<void> {
  try {
    if (filePath && existsSync(filePath)) {
      await unlink(filePath)
    }
  } catch (error) {
    console.warn(`清理临时文件失败: ${filePath}`, error)
  }
}
