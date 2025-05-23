/// <reference types="react" />
/// <reference types="react-dom" />
/// <reference types="next" />

import React from 'react';

declare global {
  // 确保全局使用React命名空间
  const React: typeof import('react');
  
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
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

declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test';
  }
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