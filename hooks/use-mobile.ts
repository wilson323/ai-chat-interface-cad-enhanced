"use client"

import { useState, useEffect } from "react"

export function useMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    // 初始检查
    checkMobile()
    
    // 监听窗口大小变化
    window.addEventListener('resize', checkMobile)
    
    // 清理函数
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return isMobile
} 