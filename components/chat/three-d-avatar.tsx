"use client"
import dynamic from "next/dynamic"

// 使用动态导入避免SSR问题
const ThreeDContent = dynamic(() => import("./three-d-content"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="w-16 h-16 rounded-full bg-[#6cb33f]/20 animate-pulse"></div>
    </div>
  ),
})

export function ThreeDAvatar() {
  return (
    <div className="w-full h-full">
      <ThreeDContent />
    </div>
  )
}
