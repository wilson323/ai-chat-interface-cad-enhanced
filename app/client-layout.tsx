"use client"

import { ThemeProvider } from "@/components/ui/theme-provider"
import { useState, useEffect } from "react"

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' || 
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    setTheme(savedTheme)
    setMounted(true)
  }, [])

  if (!mounted) {
    return <>{children}</>
  }

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme={theme}
      enableSystem
    >
      {children}
    </ThemeProvider>
  )
} 