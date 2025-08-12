"use client"

import { Check } from "lucide-react"
import { useEffect,useState } from "react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

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

interface AvatarColorPickerProps {
  value: string
  onChange: (color: string) => void
}

export function AvatarColorPicker({ value, onChange }: AvatarColorPickerProps) {
  const [selectedColor, setSelectedColor] = useState<string>(value || themeColors[0])

  useEffect(() => {
    if (value && value !== selectedColor) {
      setSelectedColor(value)
    }
  }, [value])

  const handleColorSelect = (color: string) => {
    setSelectedColor(color)
    onChange(color)
  }

  return (
    <div className="space-y-3">
      <Label className="text-base">头像颜色</Label>
      <div className="grid grid-cols-6 gap-2">
        {themeColors.map((color) => (
          <Button
            key={color}
            type="button"
            variant="outline"
            className="w-10 h-10 rounded-full p-0 relative"
            style={{ backgroundColor: color, borderColor: color === selectedColor ? "#000" : "transparent" }}
            onClick={() => handleColorSelect(color)}
          >
            {color === selectedColor && <Check className="h-4 w-4 text-white absolute" />}
          </Button>
        ))}
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">选择与系统主题相协调的头像背景颜色</p>
    </div>
  )
}
