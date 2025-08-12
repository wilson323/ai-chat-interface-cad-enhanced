import './globals.css'

import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { type ReactNode } from 'react'

import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from '@/components/ui/theme-provider'
import { FastGPTProvider } from "@/contexts/FastGPTContext"
import { initializeApp } from "@/lib/init"

import ClientLayout from "./client-layout"

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  variable: '--font-inter',
})

// 在RootLayout组件之前初始化应用
initializeApp().catch(console.error)

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://171.43.138.237:8005'),
  title: {
    default: 'AI聊天界面 - 智能CAD分析与AI对话平台',
    template: '%s | AI聊天界面'
  },
  description: '基于AG-UI协议的高性能AI聊天界面，集成CAD文件分析、智能对话、3D模型查看等功能。支持DWG、STEP、IGES等多种CAD格式分析。',
  keywords: [
    'AI聊天',
    'CAD分析',
    '3D模型查看',
    'DWG解析',
    'STEP文件',
    'IGES格式',
    '智能设计',
    'FastGPT',
    'AG-UI协议',
    '实时对话',
    '流式渲染',
    '工程设计',
    '建筑制图',
    '机械设计'
  ],
  authors: [
    {
      name: 'AI Chat Interface Team',
      url: 'https://171.43.138.237:8005'
    }
  ],
  creator: 'AI Chat Interface Team',
  publisher: 'ZKTeco AI Hub',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    alternateLocale: ['en_US'],
    url: 'https://171.43.138.237:8005',
    siteName: 'AI聊天界面',
    title: 'AI聊天界面 - 智能CAD分析与AI对话平台',
    description: '基于AG-UI协议的高性能AI聊天界面，集成CAD文件分析、智能对话、3D模型查看等功能。',
    images: [
      {
        url: '/images/og-image.png',
        width: 1200,
        height: 630,
        alt: 'AI聊天界面预览图',
        type: 'image/png',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI聊天界面 - 智能CAD分析与AI对话平台',
    description: '基于AG-UI协议的高性能AI聊天界面，集成CAD文件分析、智能对话、3D模型查看等功能。',
    images: ['/images/twitter-image.png'],
    creator: '@ai_chat_interface',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  manifest: '/manifest.json',
  category: 'technology',
  classification: 'AI Tools',
  referrer: 'origin-when-cross-origin',
  applicationName: 'AI聊天界面',
  generator: 'Next.js',
  alternates: {
    canonical: 'https://171.43.138.237:8005',
    languages: {
      'zh-CN': 'https://171.43.138.237:8005',
      'en-US': 'https://171.43.138.237:8005/en',
    },
  },
  verification: {
    google: process.env.GOOGLE_VERIFICATION_ID,
    yandex: process.env.YANDEX_VERIFICATION_ID,
    other: {
      'baidu-site-verification': process.env.BAIDU_VERIFICATION_ID || '',
    },
  },
}

// 结构化数据
const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'AI聊天界面',
  description: '基于AG-UI协议的高性能AI聊天界面，集成CAD文件分析、智能对话、3D模型查看等功能',
  url: 'https://171.43.138.237:8005',
  applicationCategory: 'ProductivityApplication',
  operatingSystem: 'Web Browser',
  author: {
    '@type': 'Organization',
    name: 'ZKTeco AI Hub',
    url: 'https://zktecoaihub.com'
  },
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'CNY',
    availability: 'https://schema.org/InStock'
  },
  featureList: [
    'AI智能对话',
    'CAD文件分析',
    '3D模型查看',
    'DWG/STEP/IGES格式支持',
    '实时流式渲染',
    '高性能AG-UI协议'
  ],
  screenshot: 'https://171.43.138.237:8005/images/screenshot.png',
  softwareVersion: '1.0.0',
  releaseNotes: '集成AG-UI性能优化，支持多种CAD格式分析',
  requirements: 'Modern web browser with JavaScript enabled',
  permissions: 'file-upload'
}

interface RootLayoutProps {
  children: ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html 
      lang="zh-CN" 
      className={`${inter.variable} scroll-smooth`}
      suppressHydrationWarning
    >
      <head>
        {/* 预加载关键资源 */}
        <link 
          rel="preload" 
          href="/images/logo.svg" 
          as="image" 
          type="image/svg+xml" 
        />
        
        {/* DNS预解析 */}
        <link rel="dns-prefetch" href="//fastgpt.zktecoaihub.com" />
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link rel="dns-prefetch" href="//fonts.gstatic.com" />
        
        {/* 预连接重要资源 */}
        <link rel="preconnect" href="https://fastgpt.zktecoaihub.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* 结构化数据 */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData),
          }}
        />
        
        {/* 性能监控 */}
        {process.env.NODE_ENV === 'production' && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                // Performance monitoring
                if ('performance' in window && 'observe' in window.PerformanceObserver.prototype) {
                  const observer = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                      if (entry.entryType === 'largest-contentful-paint') {
                        console.info('LCP:', entry.startTime);
                      }
                      if (entry.entryType === 'first-input') {
                        console.info('FID:', entry.processingStart - entry.startTime);
                      }
                      if (entry.entryType === 'layout-shift' && !entry.hadRecentInput) {
                        console.info('CLS:', entry.value);
                      }
                    }
                  });
                  
                  observer.observe({entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift']});
                }
                
                // Critical resource hints
                window.addEventListener('load', () => {
                  // 预加载下一页可能需要的资源
                  const link = document.createElement('link');
                  link.rel = 'prefetch';
                  link.href = '/api/fastgpt/init-chat';
                  document.head.appendChild(link);
                });
              `,
            }}
          />
        )}
        
        {/* 错误监控 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.addEventListener('error', (e) => {
                // 发送错误信息到监控服务
                fetch('/api/monitoring/error', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    message: e.message,
                    filename: e.filename,
                    lineno: e.lineno,
                    colno: e.colno,
                    stack: e.error?.stack,
                    userAgent: navigator.userAgent,
                    url: location.href,
                    timestamp: Date.now()
                  })
                }).catch(() => {});
              });
              
              window.addEventListener('unhandledrejection', (e) => {
                // Promise 错误监控
                fetch('/api/monitoring/error', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    type: 'unhandledrejection',
                    reason: e.reason?.toString(),
                    stack: e.reason?.stack,
                    userAgent: navigator.userAgent,
                    url: location.href,
                    timestamp: Date.now()
                  })
                }).catch(() => {});
              });
            `,
          }}
        />
      </head>
      <body 
        className={`${inter.className} antialiased min-h-screen bg-background font-sans`}
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <FastGPTProvider>
            <ClientLayout>
              {children}
            </ClientLayout>
            <Toaster 
              position="top-right" 
              toastOptions={{
                duration: 4000,
                className: 'font-sans',
              }}
            />
          </FastGPTProvider>
        </ThemeProvider>
        
        {/* Service Worker 注册 */}
        {process.env.NODE_ENV === 'production' && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                if ('serviceWorker' in navigator) {
                  window.addEventListener('load', () => {
                    navigator.serviceWorker.register('/sw.js')
                      .then((registration) => {
                        console.info('SW registered: ', registration);
                      })
                      .catch((registrationError) => {
                        console.info('SW registration failed: ', registrationError);
                      });
                  });
                }
              `,
            }}
          />
        )}
      </body>
    </html>
  )
}
