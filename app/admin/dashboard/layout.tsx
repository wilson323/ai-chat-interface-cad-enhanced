"use client"

import { FastGPTProvider } from "@/contexts/FastGPTContext"
import React from "react"

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