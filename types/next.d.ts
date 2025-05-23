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