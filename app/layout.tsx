import { initializeApp } from "@/lib/init"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import ClientLayout from "./client-layout"
import { FastGPTProvider } from "@/contexts/FastGPTContext"
import { ReactNode } from 'react'

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

// 在RootLayout组件之前初始化应用
initializeApp().catch(console.error)

export const metadata: Metadata = {
  title: "v0 App",
  description: "AI Chat Interface",
}

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="en">
      <body className={`font-sans ${inter.variable}`}>
        <FastGPTProvider>
          <ClientLayout>{children}</ClientLayout>
        </FastGPTProvider>
      </body>
    </html>
  )
}
