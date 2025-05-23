/// <reference types="next" />
/// <reference types="next/types/global" />

// 移除所有手动类型引用
import "next"

// 简化类型声明
declare module "next/server" {
  interface NextRequest {
    geo?: {
      city?: string
      country?: string
    }
  }
}

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test'
    }
  }
}

// Next.js 类型增强文件
// 解决Next.js 15的类型导入问题

declare module 'next' {
  export interface Metadata {
    metadataBase?: URL | null
    title?: string | {
      default?: string
      template?: string
      absolute?: string
    }
    description?: string
    keywords?: string | string[]
    authors?: Array<{
      name?: string
      url?: string
    }>
    creator?: string
    publisher?: string
    formatDetection?: {
      email?: boolean
      address?: boolean
      telephone?: boolean
    }
    openGraph?: {
      type?: string
      locale?: string
      alternateLocale?: string[]
      url?: string
      siteName?: string
      title?: string
      description?: string
      images?: Array<{
        url: string
        width?: number
        height?: number
        alt?: string
        type?: string
      }>
    }
    twitter?: {
      card?: string
      title?: string
      description?: string
      images?: string[]
      creator?: string
    }
    robots?: {
      index?: boolean
      follow?: boolean
      googleBot?: {
        index?: boolean
        follow?: boolean
        'max-video-preview'?: number
        'max-image-preview'?: string
        'max-snippet'?: number
      }
    }
    manifest?: string
    category?: string
    classification?: string
    referrer?: string
    applicationName?: string
    generator?: string
    alternates?: {
      canonical?: string
      languages?: Record<string, string>
    }
    verification?: {
      google?: string
      yandex?: string
      other?: Record<string, string>
    }
  }
}

declare module 'next/font/google' {
  export interface FontConfig {
    subsets: string[]
    display?: 'auto' | 'block' | 'swap' | 'fallback' | 'optional'
    preload?: boolean
    variable?: string
    weight?: string | string[]
  }
  
  export function Inter(config: FontConfig): {
    variable: string
    className: string
  }
}

export {} 