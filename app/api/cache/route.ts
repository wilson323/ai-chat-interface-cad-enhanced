/**
 * 缓存管理API - 提供缓存管理功能
 * Cache Management API - Provides cache management functionality
 */
import { type NextRequest, NextResponse } from "next/server"
import { getCacheManager } from "@/lib/cache/cache-manager"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    // 获取缓存统计信息
    const cacheManager = getCacheManager()
    const stats = await cacheManager.getStats()

    return NextResponse.json(
      {
        status: "success",
        data: stats,
        timestamp: new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    )
  } catch (error) {
    console.error("Cache stats request failed:", error)

    return NextResponse.json(
      {
        status: "error",
        error: (error instanceof Error ? error.message : String(error)),
        timestamp: new Date().toISOString(),
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const cacheManager = getCacheManager()

    // 检查是否有标签参数
    const url = new URL(request.url)
    const tag = url.searchParams.get("tag")

    if (tag) {
      // 按标签清除缓存
      await cacheManager.deleteByTag(tag)

      return NextResponse.json(
        {
          status: "success",
          message: `Cache cleared for tag: ${tag}`,
          timestamp: new Date().toISOString(),
        },
        { status: 200 },
      )
    } else {
      // 清除所有缓存
      await cacheManager.clear()

      return NextResponse.json(
        {
          status: "success",
          message: "All cache cleared",
          timestamp: new Date().toISOString(),
        },
        { status: 200 },
      )
    }
  } catch (error) {
    console.error("Cache clear request failed:", error)

    return NextResponse.json(
      {
        status: "error",
        error: (error instanceof Error ? error.message : String(error)),
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
