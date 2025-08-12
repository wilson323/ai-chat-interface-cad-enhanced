import { Redis } from "@upstash/redis"
import { type NextRequest, NextResponse } from "next/server"

// 创建Redis客户端
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
})

export async function POST(req: NextRequest) {
  try {
    // 验证请求
    const authHeader = req.headers.get("authorization")
    if (
      process.env.API_KEY &&
      (!authHeader || !authHeader.startsWith("Bearer ") || authHeader.slice(7) !== process.env.API_KEY)
    ) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { fileId, metadata, timestamp } = body

    if (!fileId) {
      return NextResponse.json({ success: false, error: "Missing fileId" }, { status: 400 })
    }

    // 保存CAD文件元数据到Redis
    const key = `cad:${fileId}`
    await redis.set(
      key,
      JSON.stringify({
        fileId,
        metadata,
        lastSynced: timestamp || Date.now(),
        version: (Number(await redis.get(`${key}:version`)) || 0) + 1,
      }),
    )

    // 更新版本号
    await redis.incr(`${key}:version`)

    // 添加到用户的CAD文件列表
    const userId = req.headers.get("x-user-id")
    if (userId) {
      await redis.sadd(`user:${userId}:cad-files`, fileId)
    }

    return NextResponse.json({
      success: true,
      fileId,
      version: await redis.get(`${key}:version`),
      timestamp: Date.now(),
    })
  } catch (error) {
    console.error("CAD Sync API error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 },
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    // 验证请求
    const authHeader = req.headers.get("authorization")
    if (
      process.env.API_KEY &&
      (!authHeader || !authHeader.startsWith("Bearer ") || authHeader.slice(7) !== process.env.API_KEY)
    ) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const fileId = req.nextUrl.searchParams.get("fileId")

    if (!fileId) {
      return NextResponse.json({ success: false, error: "Missing fileId" }, { status: 400 })
    }

    // 获取CAD文件元数据
    const key = `cad:${fileId}`
    const data = await redis.get(key)

    if (!data) {
      return NextResponse.json({ success: false, error: "File not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: JSON.parse(data as string),
      timestamp: Date.now(),
    })
  } catch (error) {
    console.error("CAD Sync API error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 },
    )
  }
}
