import React from 'react'
import * as React from 'react'

declare module 'react' {
  interface CSSProperties {
    [key: `--${string}`]: string | number
  }
}

// 仅扩展必要的类型
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'cad-viewer': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>
    }
  }
} 