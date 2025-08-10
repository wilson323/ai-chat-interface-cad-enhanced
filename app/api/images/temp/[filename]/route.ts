import { type NextRequest, NextResponse } from "next/server"
import fs from "fs/promises"
import path from "path"
import os from "os"

export async function GET(request: NextRequest, { params }: { params: { filename: string } }) {
  const filename = params.filename

  // 安全检查：确保文件名不包含路径遍历
  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    return NextResponse.json({ error: "无效的文件名" }, { status: 400 })
  }

  const tempDir = path.join(os.tmpdir(), "zkteco-chat-images")
  const filePath = path.join(tempDir, filename)

  try {
    // 检查文件是否存在
    await fs.access(filePath)

    // 读取文件
    const fileBuffer = await fs.readFile(filePath)

    // 返回图片
    return new Response(fileBuffer as any, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600",
      },
    })
  } catch (error) {
    console.error("读取图片失败:", error)
    return NextResponse.json({ error: "找不到图片" }, { status: 404 })
  }
}
