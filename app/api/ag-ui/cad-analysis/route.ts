import { type NextRequest, NextResponse } from "next/server"
import { AgentRuntime } from "@ag-ui/server"
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

    // 创建AG-UI运行时
    const runtime = new AgentRuntime({
      threadId,
      runId,
      tools: [
        {
          name: "cad_analyzer",
          description: "Analyzes CAD files and extracts metadata",
          execute: async () => {
            try {
              // 上传文件到CAD分析服务
              const uploadedFile = await cadAnalyzerService.uploadFile(file, userId, (progress) => {
                // 更新上传进度状态
                runtime.updateState({
                  uploadProgress: progress,
                })
              })
              
              // 发送文件上传完成的事件
              runtime.sendTextMessage("文件上传完成，开始分析...")
              
              // 分析文件
              const analysisResult = await cadAnalyzerService.analyzeFile(
                uploadedFile.id, 
                userId, 
                undefined, 
                {
                  analysisType: analysisType as any,
                  includeThumbnail: true,
                  progressCallback: (progress) => {
                    // 更新分析进度状态
                    runtime.updateState({
                      analysisProgress: progress,
                    })
                  }
                }
              )
              
              // 发送分析完成消息
              runtime.sendTextMessage(`分析完成，发现 ${analysisResult.components.length} 个组件和 ${analysisResult.measures.length} 个测量数据。`)
              
              if (analysisResult.summary) {
                runtime.sendTextMessage(analysisResult.summary)
              }
              
              // 返回分析结果
              return analysisResult
            } catch (error) {
              console.error("CAD分析错误:", error)
              throw new Error("分析CAD文件时发生错误")
            }
          },
        },
        {
          name: "generate_cad_report",
          description: "Generates a report for the analyzed CAD file",
          execute: async (params: { analysisId: string, format?: 'html' | 'pdf' }) => {
            try {
              const { analysisId, format = 'html' } = params
              
              // 生成报告
              const reportUrl = await cadAnalyzerService.generateReport(analysisId, format)
              
              // 发送报告生成消息
              runtime.sendTextMessage(`报告已生成，可以通过以下链接访问: ${reportUrl}`)
              
              return { success: true, reportUrl }
            } catch (error) {
              console.error("生成报告错误:", error)
              throw new Error("生成CAD报告时发生错误")
            }
          }
        }
      ],
    })

    // 设置初始状态
    runtime.updateState({
      uploadProgress: 0,
      analysisProgress: 0,
      analysisType,
      fileInfo: {
        name: file.name,
        size: file.size,
        type: file.type
      }
    })
    
    // 发送欢迎消息
    runtime.sendTextMessage(`正在处理您的 ${file.name} 文件，请稍候...`)

    // 运行分析工具
    const result = await runtime.runTool("cad_analyzer", {})

    // 更新运行时状态
    runtime.updateState({
      analysisResult: result,
      status: "completed",
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
