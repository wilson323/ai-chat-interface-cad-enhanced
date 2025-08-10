/**
 * 图片上传API路由
 */

import { NextRequest, NextResponse } from "next/server"
import { writeFile } from "fs/promises"
import { join } from "path"
import { v4 as uuidv4 } from "uuid"
import { mkdir } from "fs/promises"

export async function POST(req: NextRequest) {
  try {
    const userId = undefined

    // 处理文件上传
    const formData = await req.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // 验证文件类型
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 })
    }

    // 获取文件扩展名
    const fileExtension = file.name.split(".").pop() || "png"

    // 生成唯一文件名
    const filename = `${uuidv4()}.${fileExtension}`

    // 转换文件为Buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // 创建存储路径
    const userDir = userId ? `user/${userId}` : "temp"
    const relativePath = `/uploads/${userDir}`
    const uploadDir = join(process.cwd(), "public", relativePath)

    try {
      // 确保目录存在
      await mkdir(uploadDir, { recursive: true })

      // 写入文件
      const filePath = join(uploadDir, filename)
      await writeFile(filePath, buffer)

      // 构建URL
      const imageUrl = `${relativePath}/${filename}`

      // 返回成功响应
      return NextResponse.json({
        success: true,
        imageUrl,
        filename,
      })
    } catch (error) {
      console.error("Failed to save file:", error)
      return NextResponse.json({ error: "Failed to save file" }, { status: 500 })
    }
  } catch (error) {
    console.error("Error in image upload:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// 目录创建已在主流程中处理 