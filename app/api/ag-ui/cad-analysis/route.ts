import { type NextRequest, NextResponse } from "next/server"
import { AgentRuntime } from "@ag-ui/server"

/**
 * AG-UI CAD分析API路由 - 提供CAD文件分析功能的AG-UI协议支持
 * AG-UI CAD Analysis API Route - Provides AG-UI protocol support for CAD file analysis
 *
 * 本文件处理CAD文件分析请求，将其转换为内部CAD分析API请求，并将结果转换为AG-UI事件
 * 调用关系: 被hooks/use-ag-ui-cad.tsx调用，内部调用/api/cad/upload
 */
export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const threadId = formData.get("threadId") as string
    const runId = formData.get("runId") as string

    if (!file || !threadId || !runId) {
      return NextResponse.json({ error: "缺少必要参数" }, { status: 400 })
    }

    // 创建AG-UI运行时
    const runtime = new AgentRuntime({
      threadId,
      runId,
      tools: [
        {
          name: "cad_analyzer",
          description: "Analyzes CAD files and extracts metadata",
          execute: async (params) => {
            // 调用现有的CAD分析API
            const fileBuffer = await file.arrayBuffer()
            const fileBlob = new Blob([fileBuffer], { type: file.type })

            const uploadFormData = new FormData()
            uploadFormData.append("file", fileBlob, file.name)

            const response = await fetch("/api/cad/upload", {
              method: "POST",
              body: uploadFormData,
            })

            if (!response.ok) {
              throw new Error("CAD分析失败")
            }

            return await response.json()
          },
        },
      ],
    })

    // 运行分析
    const result = await runtime.runTool("cad_analyzer", {})

    // 更新运行时状态
    runtime.updateState({
      analysisResult: result,
    })

    return NextResponse.json({
      threadId,
      runId,
      state: runtime.getState(),
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
