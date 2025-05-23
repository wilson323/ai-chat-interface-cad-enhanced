/// <reference types="react" />
/// <reference types="react-dom" />
/// <reference types="next" />

import React from 'react';
import { Metadata as NextMetadata } from 'next/dist/lib/metadata/types/metadata-interface'

declare global {
  // 确保全局使用React命名空间
  const React: typeof import('react');
  
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }

  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test'
      NEXT_PUBLIC_APP_URL?: string
      NEXT_PUBLIC_APP_ENV?: string
      FASTGPT_API_URL?: string
      REDIS_URL?: string
      GOOGLE_VERIFICATION_ID?: string
      YANDEX_VERIFICATION_ID?: string
      BAIDU_VERIFICATION_ID?: string
      AG_UI_VERSION?: string
    }
  }
}

export {};

declare module '*.svg' {
  import type React from 'react';
  const content: React.FC<React.SVGProps<SVGSVGElement>>;
  export default content;
}

declare module 'class-variance-authority' {
  import { VariantProps } from 'class-variance-authority';
  export { cva } from 'class-variance-authority';
  export type { VariantProps };
}

declare module 'framer-motion' {
  export * from 'framer-motion';
}

declare module 'lucide-react' {
  export * from 'lucide-react';
}

// 扩展Next.js类型
declare module 'next' {
  interface PageProps {}
}

declare module 'next-themes' {
  export interface ThemeProviderProps {
    children: React.ReactNode
    attribute?: string
    defaultTheme?: string
    enableSystem?: boolean
  }
}

// Re-export Next.js types
export type Metadata = NextMetadata

// React types fallback
declare module 'react' {
  export interface ReactNode {
    key?: string | number | null
    type?: any
    props?: any
    ref?: any
  }
  
  export type FC<P = {}> = (props: P) => ReactNode
  export type PropsWithChildren<P = {}> = P & { children?: ReactNode }
}

// Next.js font fallback
declare module 'next/font/google' {
  export interface FontConfig {
    subsets: string[]
    display?: string
    preload?: boolean
    variable?: string
    weight?: string | string[]
  }
  
  export function Inter(config: FontConfig): {
    variable: string
    className: string
  }
} 