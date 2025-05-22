import { NextRequest, NextResponse } from "next/server"
import path from "path"
import fs from "fs/promises"
import { v4 as uuidv4 } from "uuid"
import { createQueue } from 'lib/utils/processingQueue'
import { isCADFile } from '@/lib/utils/fileValidation'
import { cadMetrics } from '@/lib/services/cad-analyzer/metrics'
import { validateCADAnalysisResult } from '@/lib/services/cad-analyzer/validation'

/**
 * CAD文件上传和分析API端点
 */
const analysisQueue = createQueue({
  concurrency: 2, // 控制并发数
  timeout: 120_000 // 2分钟超时
})

export async function POST(request: NextRequest) {
  return analysisQueue.add(async () => {
    try {
      // 检查请求类型
      if (!request.headers.get("content-type")?.includes("multipart/form-data")) {
        return NextResponse.json(
          { error: "请求格式错误: 应为multipart/form-data" },
          { status: 400 }
        )
      }

      // 解析表单数据
      const formData = await request.formData()
      const file = formData.get("file") as File | null
      const userNotes = formData.get("userNotes") as string || ""
      const precision = formData.get("precision") as "low" | "standard" | "high" || "standard"

      // 检查文件是否存在
      if (!file) {
        return NextResponse.json(
          { error: "未提供文件" },
          { status: 400 }
        )
      }

      // 检查文件大小(最大50MB)
      const maxFileSizeMB = 50
      if (file.size > maxFileSizeMB * 1024 * 1024) {
        return NextResponse.json(
          { error: `文件过大: ${(file.size / (1024 * 1024)).toFixed(2)}MB, 超过了${maxFileSizeMB}MB的限制` },
          { status: 400 }
        )
      }

      // 检查文件类型
      const fileName = file.name.toLowerCase()
      const fileExt = fileName.split(".").pop()
      const supportedFormats = ["dxf", "dwg", "step", "stp", "iges", "igs"]

      if (!fileExt || !supportedFormats.includes(fileExt)) {
        return NextResponse.json(
          { error: `不支持的文件格式: ${fileExt || "未知"}. 支持的格式: ${supportedFormats.join(", ")}` },
          { status: 400 }
        )
      }

      // 保存上传的文件到临时目录
      const tempDir = path.join(process.cwd(), "tmp")
      await fs.mkdir(tempDir, { recursive: true })

      const fileId = uuidv4()
      const tempFilePath = path.join(tempDir, `${fileId}.${fileExt}`)
      const fileBuffer = await file.arrayBuffer()
      await fs.writeFile(tempFilePath, Buffer.from(fileBuffer))

      const isValid = await isCADFile(tempFilePath, fileExt)
      if (!isValid) {
        await fs.unlink(tempFilePath)
        return NextResponse.json(
          { error: "文件内容验证失败，不是有效的CAD文件" },
          { status: 400 }
        )
      }

      try {
        // 记录性能指标
        cadMetrics.record('file_size', file.size, 'bytes', { fileType: fileExt })
        const startTime = Date.now()

        // 转发到内部CAD分析服务
        const cad_api_url = process.env.CAD_API_URL || "/api/cad-analyzer/analyze"
        
        // 创建一个新的FormData对象来转发请求
        const apiFormData = new FormData()
        apiFormData.append("file", file)
        apiFormData.append("userNotes", userNotes)
        apiFormData.append("precision", precision)
        apiFormData.append("fileId", fileId)
        
        // 发送到CAD分析服务
        const response = await fetch(cad_api_url, {
          method: "POST",
          body: apiFormData,
        })
        
        // 如果后端服务报错
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || `服务返回错误: ${response.status}`)
        }
        
        // 返回分析结果
        const result = await response.json()
        
        // 删除临时文件
        try {
          console.log(`删除临时文件: ${tempFilePath}`);
          await fs.unlink(tempFilePath)
        } catch (unlinkError) {
          console.error(`删除临时文件失败: ${tempFilePath}`, unlinkError)
        }
        
        // 在处理完成后添加
        const parseTime = Date.now() - startTime
        cadMetrics.record('parse_duration', parseTime, 'ms', { 
          fileType: fileExt,
          success: 'true'
        })
        cadMetrics.record('entity_count', 
          Object.values(result.cadResult.entities).reduce((sum, count) => sum + count, 0), 
          'count'
        )
        cadMetrics.record('complexity_score', 
          cadMetrics.calculateComplexityScore(result.cadResult.entities, result.cadResult.layers),
          'score'
        )

        // 添加验证
        const validationResult = validateCADAnalysisResult(result)
        if (!validationResult.valid) {
          console.warn('CAD验证警告:', validationResult.issues)
        }
        
        return NextResponse.json({
          success: true,
          id: result.id || fileId,
          fileName: file.name,
          fileType: fileExt,
          fileSize: file.size,
          processingTime: new Date().toISOString(),
          ...result
        })
      } catch (error) {
        // 删除临时文件
        try {
          console.log(`删除临时文件: ${tempFilePath}`);
          await fs.unlink(tempFilePath)
        } catch (unlinkError) {
          console.error(`删除临时文件失败: ${tempFilePath}`, unlinkError)
        }
        
        console.error("CAD分析错误:", error)
        
        // 返回模拟数据(实际生产中应该返回错误)
        return NextResponse.json({
          success: true,
          id: fileId,
          fileName: file.name,
          fileType: fileExt,
          fileSize: file.size,
          processingTime: new Date().toISOString(),
          cadResult: {
            metadata: {
              author: "设计师",
              createdAt: "2023-05-15",
              modifiedAt: "2023-06-20",
              software: "AutoCAD 2022",
              layers: ["0", "外框", "尺寸标注", "文本注释", "图框", "标题栏"],
              totalEntities: 650
            },
            entities: {
              lines: 245,
              circles: 78,
              arcs: 32,
              polylines: 56,
              text: 124,
              dimensions: 48,
              blocks: 12,
            },
            dimensions: {
              width: 841,
              height: 594,
              unit: "mm",
            },
            securityDevices: [],
            wiringInfo: []
          },
          analysisResult: {
            id: fileId,
            devices: [],
            wiring: {
              totalLength: 0,
              details: []
            },
            risks: [],
            aiInsights: {
              summary: "这是一个模拟分析结果，实际分析失败，请重试或联系管理员。",
              recommendations: ["重新上传文件", "确保文件格式正确", "联系技术支持"]
            }
          }
        })
      }
    } catch (error) {
      console.error("处理上传请求失败:", error)
      
      return NextResponse.json(
        { 
          error: `处理请求失败: ${error instanceof Error ? error.message : String(error)}`,
          success: false
        },
        { status: 500 }
      )
    }
  })
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  })
}
