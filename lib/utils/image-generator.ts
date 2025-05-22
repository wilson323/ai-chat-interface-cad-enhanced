import { createCanvas, loadImage, registerFont } from "canvas"
import path from "path"
import fs from "fs/promises"
import os from "os"

interface ChatMessage {
  role: "user" | "assistant" | "system"
  content: string
  timestamp?: number
}

export async function generateImageFromChat(
  messages: ChatMessage[],
  includeWelcome = true,
): Promise<{ imageUrl: string }> {
  // 注册字体
  try {
    registerFont(path.join(process.cwd(), "public", "fonts", "NotoSansSC-Regular.otf"), {
      family: "Noto Sans SC",
    })
  } catch (error) {
    console.warn("无法注册字体:", error)
  }

  // 创建画布
  const width = 800
  const messageHeight = 150 // 每条消息的高度
  const welcomeHeight = includeWelcome ? 300 : 0 // 欢迎界面的高度
  const height = welcomeHeight + messages.length * messageHeight

  const canvas = createCanvas(width, height)
  const ctx = canvas.getContext("2d")

  // 设置背景
  ctx.fillStyle = "#f5f5f5"
  ctx.fillRect(0, 0, width, height)

  // 绘制欢迎界面
  if (includeWelcome) {
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, width, welcomeHeight)

    try {
      // 加载牛牛动画图片
      const mascotImage = await loadImage(path.join(process.cwd(), "public", "images", "zkteco-mascot.png"))
      const imgWidth = 200
      const imgHeight = (mascotImage.height / mascotImage.width) * imgWidth
      ctx.drawImage(mascotImage, (width - imgWidth) / 2, 50, imgWidth, imgHeight)

      // 绘制欢迎文字
      ctx.font = '24px "Noto Sans SC"'
      ctx.fillStyle = "#333333"
      ctx.textAlign = "center"
      ctx.fillText("欢迎使用ZKTeco AI智能对话系统", width / 2, welcomeHeight - 50)
    } catch (error) {
      console.error("加载图片失败:", error)
      // 如果图片加载失败，绘制备用文字
      ctx.font = '24px "Noto Sans SC"'
      ctx.fillStyle = "#333333"
      ctx.textAlign = "center"
      ctx.fillText("欢迎使用ZKTeco AI智能对话系统", width / 2, welcomeHeight / 2)
    }
  }

  // 绘制消息
  let y = welcomeHeight
  for (const message of messages) {
    const isUser = message.role === "user"

    // 设置消息背景
    ctx.fillStyle = isUser ? "#e1f5fe" : "#ffffff"
    ctx.fillRect(0, y, width, messageHeight)

    // 绘制角色标识
    ctx.font = '16px "Noto Sans SC"'
    ctx.fillStyle = "#666666"
    ctx.textAlign = "left"
    ctx.fillText(isUser ? "用户" : "助手", 20, y + 30)

    // 绘制消息内容
    ctx.font = '18px "Noto Sans SC"'
    ctx.fillStyle = "#333333"

    // 简单的文本换行处理
    const maxWidth = width - 40
    const words = message.content.split(" ")
    let line = ""
    let lineY = y + 60

    for (const word of words) {
      const testLine = line + word + " "
      const metrics = ctx.measureText(testLine)

      if (metrics.width > maxWidth && line !== "") {
        ctx.fillText(line, 20, lineY)
        line = word + " "
        lineY += 24
      } else {
        line = testLine
      }
    }
    ctx.fillText(line, 20, lineY)

    // 绘制时间戳
    if (message.timestamp) {
      const date = new Date(message.timestamp)
      const timeStr = date.toLocaleString()
      ctx.font = '14px "Noto Sans SC"'
      ctx.fillStyle = "#999999"
      ctx.textAlign = "right"
      ctx.fillText(timeStr, width - 20, y + messageHeight - 20)
    }

    y += messageHeight
  }

  // 保存图片到临时文件
  const tempDir = path.join(os.tmpdir(), "zkteco-chat-images")
  await fs.mkdir(tempDir, { recursive: true })

  const fileName = `chat_${Date.now()}.png`
  const filePath = path.join(tempDir, fileName)

  const buffer = canvas.toBuffer("image/png")
  await fs.writeFile(filePath, buffer)

  // 返回图片URL
  return {
    imageUrl: `/api/images/temp/${fileName}`,
  }
}
