import * as React from 'react'

declare module 'react' {
  interface CSSProperties {
    [key: `--${string}`]: string | number
  }
  
  // 添加缺少的React Hooks导出
  export const useState: typeof React.useState
  export const useEffect: typeof React.useEffect
  export const useRef: typeof React.useRef
}

// 仅扩展必要的类型
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'cad-viewer': React.HTMLAttributes<HTMLElement>
    }
  }
} 