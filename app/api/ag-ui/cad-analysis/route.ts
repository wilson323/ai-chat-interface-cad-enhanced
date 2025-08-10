import { type NextRequest, NextResponse } from "next/server"
import { CADAnalyzerService } from "@/lib/services/cad-analyzer-service"
import { v4 as uuidv4 } from 'uuid'

/**
 * AG-UI CAD分析API路由 - 提供CAD文件分析功能的AG-UI协议支持
 * AG-UI CAD Analysis API Route - Provides AG-UI protocol support for CAD file analysis
 *
 * 本文件处理CAD文件分析请求，将其转换为内部CAD分析服务调用，并将结果转换为AG-UI事件
 * 调用关系: 被hooks/use-ag-ui-cad.tsx调用，内部调用CADAnalyzerService
 */
export const runtime = "nodejs"

// 创建CAD分析服务实例
const cadAnalyzerService = new CADAnalyzerService()

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const threadId = formData.get("threadId") as string
    const runId = formData.get("runId") as string
    const analysisType = formData.get("analysisType") as string || "standard"
    const userId = formData.get("userId") as string || "anonymous"
    
    if (!file || !threadId || !runId) {
      return NextResponse.json({ error: "缺少必要参数" }, { status: 400 })
    }

    // 直接调用服务：上传 + 分析
    const uploaded = await cadAnalyzerService.uploadFile(file, userId)
    const analysisResult = await cadAnalyzerService.analyzeFile(uploaded.id, userId, undefined, {
      analysisType: analysisType as any,
      includeThumbnail: true,
    })

    return NextResponse.json({
      threadId,
      runId,
      state: { analysisResult },
      status: "completed",
    })
  } catch (error) {
    console.error("CAD分析错误:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "处理请求时发生未知错误" },
      { status: 500 },
    )
  }
}

// 处理OPTIONS请求，用于CORS预检
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
