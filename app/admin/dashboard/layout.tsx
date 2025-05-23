"use client"

import { FastGPTProvider } from "@/contexts/FastGPTContext"

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <FastGPTProvider>
      {children}
    </FastGPTProvider>
  )
} 