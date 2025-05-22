/**
 * 根据智能体名称生成一致的头像颜色
 * 这确保了同一个智能体总是获得相同的颜色
 */
export function generateAvatarColor(name: string): string {
  // 默认主题色
  const defaultColor = "#6cb33f"

  // 预定义的主题色，与系统主题相协调
  const themeColors = [
    "#6cb33f", // 默认绿色（主题色）
    "#4CAF50", // 绿色变种
    "#2196F3", // 蓝色
    "#3F51B5", // 靛蓝色
    "#9C27B0", // 紫色
    "#E91E63", // 粉色
    "#F44336", // 红色
    "#FF9800", // 橙色
    "#FFEB3B", // 黄色
    "#795548", // 棕色
    "#607D8B", // 蓝灰色
    "#9E9E9E", // 灰色
  ]

  if (!name) return defaultColor

  // 使用简单的哈希算法将名称映射到颜色
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }

  // 将哈希值映射到颜色数组的索引
  const index = Math.abs(hash) % themeColors.length
  return themeColors[index]
}

/**
 * 根据背景色生成适合的文本颜色（黑色或白色）
 * 确保文本在背景上有足够的对比度
 */
export function getContrastTextColor(bgColor: string): string {
  // 移除可能的 # 前缀
  const color = bgColor.replace("#", "")

  // 将十六进制颜色转换为 RGB
  const r = Number.parseInt(color.substring(0, 2), 16)
  const g = Number.parseInt(color.substring(2, 4), 16)
  const b = Number.parseInt(color.substring(4, 6), 16)

  // 计算亮度 (YIQ 公式)
  const yiq = (r * 299 + g * 587 + b * 114) / 1000

  // 亮度大于 128 返回黑色，否则返回白色
  return yiq >= 128 ? "#000000" : "#ffffff"
}
