import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

// 确保数据目录存在
const DATA_DIR = path.join(process.cwd(), "data")
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

// 文件路径
const API_CONFIG_FILE = path.join(DATA_DIR, "api_config.json")
const AGENTS_FILE = path.join(DATA_DIR, "agents.json")

// 辅助函数：读取JSON文件
const readJsonFile = (filePath: string, defaultValue: any = null) => {
  try {
    if (!fs.existsSync(filePath)) {
      return defaultValue
    }
    const data = fs.readFileSync(filePath, "utf8")
    return JSON.parse(data)
  } catch (error) {
    console.error(`读取文件失败 (${filePath}):`, error)
    return defaultValue
  }
}

// 辅助函数：写入JSON文件
const writeJsonFile = (filePath: string, data: any) => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8")
    return true
  } catch (error) {
    console.error(`写入文件失败 (${filePath}):`, error)
    return false
  }
}

// 获取聊天会话文件路径
const getChatSessionsFilePath = (agentId: string) => {
  return path.join(DATA_DIR, `chat_sessions_${agentId}.json`)
}

// 添加GET方法处理测试连接请求
export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const path = url.pathname.split("/api/db/")[1]

    if (path === "init") {
      // 检查是否已初始化
      const isInitialized = fs.existsSync(AGENTS_FILE) && readJsonFile(AGENTS_FILE, []).length > 0
      return NextResponse.json({ success: true, initialized: isInitialized })
    }

    if (path === "api-config") {
      const config = readJsonFile(API_CONFIG_FILE, {})
      return NextResponse.json(config)
    }

    if (path === "agents") {
      const agents = readJsonFile(AGENTS_FILE, [])
      return NextResponse.json(agents)
    }

    if (path.startsWith("agent/")) {
      const agentId = path.split("agent/")[1]
      const agents = readJsonFile(AGENTS_FILE, [])
      const agent = (agents as Array<any>).find((a: any) => a.id === agentId)

      if (!agent) {
        return NextResponse.json({ error: "Agent not found" }, { status: 404 })
      }

      return NextResponse.json(agent)
    }

    if (path.startsWith("sessions/")) {
      const agentId = path.split("sessions/")[1]
      const sessionsFilePath = getChatSessionsFilePath(agentId)
      const sessions = readJsonFile(sessionsFilePath, [])
      return NextResponse.json(sessions)
    }

    return NextResponse.json({ error: "Invalid endpoint" }, { status: 400 })
  } catch (error) {
    console.error("API错误:", error)
    return NextResponse.json(
      {
        error: (error as any)?.message || "Internal server error",
        stack: process.env.NODE_ENV === "development" ? (error as any)?.stack : undefined,
      },
      { status: 500 },
    )
  }
}

// 确保所有响应都是JSON格式
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action, data } = body

    // 根据action执行不同的操作
    if (action === "saveApiConfig") {
      try {
        // 保存到本地文件
        const fs = require("fs")
        const path = require("path")
        const configDir = path.join(process.cwd(), "data")
        const configPath = path.join(configDir, "api-config.json")

        // 确保目录存在
        if (!fs.existsSync(configDir)) {
          fs.mkdirSync(configDir, { recursive: true })
        }

        // 写入文件
        fs.writeFileSync(configPath, JSON.stringify(data, null, 2))

        return Response.json({ success: true, message: "配置已保存" })
      } catch (error) {
        console.error("保存API配置到文件失败:", error)
        return Response.json(
          {
            success: false,
            message: `保存配置失败: ${(error as any)?.message}`,
          },
          { status: 500 },
        )
      }
    }

    if (action === "getApiConfig") {
      try {
        // 从本地文件读取
        const fs = require("fs")
        const path = require("path")
        const configPath = path.join(process.cwd(), "data", "api-config.json")

        if (!fs.existsSync(configPath)) {
          return Response.json(
            {
              success: false,
              message: "配置不存在",
            },
            { status: 404 },
          )
        }

        const configData = JSON.parse(fs.readFileSync(configPath, "utf8"))
        return Response.json({ success: true, data: configData })
      } catch (error) {
        console.error("读取API配置失败:", error)
        return Response.json(
          {
            success: false,
            message: `读取配置失败: ${(error as any)?.message}`,
          },
          { status: 500 },
        )
      }
    }

    // 未知操作
    return Response.json(
      {
        success: false,
        message: `未知操作: ${action}`,
      },
      { status: 400 },
    )
  } catch (error) {
    console.error("API请求处理失败:", error)
    return Response.json(
      {
        success: false,
        message: `请求处理失败: ${(error as any)?.message}`,
      },
      { status: 500 },
    )
  }
}

export async function PUT(request: Request) {
  try {
    const url = new URL(request.url)
    const path = url.pathname.split("/api/db/")[1]

    let body
    try {
      body = await request.json()
    } catch (e) {
      console.error("解析请求体失败:", e)
      return NextResponse.json({ error: "无效的JSON请求体" }, { status: 400 })
    }

    if (path.startsWith("agent/")) {
      const agentId = path.split("agent/")[1]
      const agents = readJsonFile(AGENTS_FILE, [])
      const index = (agents as Array<any>).findIndex((a: any) => a.id === agentId)

      if (index !== -1) {
        agents[index] = {
          ...agents[index],
          ...body,
          config: {
            ...agents[index].config,
            ...body.config,
          },
          updatedAt: new Date().toISOString(),
        }

        writeJsonFile(AGENTS_FILE, agents)
        return NextResponse.json({ success: true })
      }

      return NextResponse.json({ error: "Agent not found" }, { status: 404 })
    }

    return NextResponse.json({ error: "Invalid endpoint" }, { status: 400 })
  } catch (error) {
    console.error("API错误:", error)
    return NextResponse.json(
      {
        error: (error as any)?.message || "Internal server error",
        stack: process.env.NODE_ENV === "development" ? (error as any)?.stack : undefined,
      },
      { status: 500 },
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url)
    const path = url.pathname.split("/api/db/")[1]

    if (path.startsWith("agent/")) {
      const agentId = path.split("agent/")[1]
      const agents = readJsonFile(AGENTS_FILE, [])
      const filteredAgents = (agents as Array<any>).filter((agent: any) => agent.id !== agentId)

      writeJsonFile(AGENTS_FILE, filteredAgents)
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: "Invalid endpoint" }, { status: 400 })
  } catch (error) {
    console.error("API错误:", error)
    return NextResponse.json(
      {
        error: (error as any)?.message || "Internal server error",
        stack: process.env.NODE_ENV === "development" ? (error as any)?.stack : undefined,
      },
      { status: 500 },
    )
  }
}
