import 'react'

declare module 'react' {
  export interface HTMLAttributes<T> extends AriaAttributes, DOMAttributes<T> {
    // 使用任意字符串属性名称和任意值
    [key: string]: any;
  }
} 