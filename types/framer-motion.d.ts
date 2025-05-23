// framer-motion类型声明
declare module 'framer-motion' {
  import * as React from 'react'
  
  // 定义简化版的动画属性类型
  type MotionProps = {
    initial?: any
    animate?: any
    exit?: any
    transition?: any
    variants?: any
    whileHover?: any
    whileTap?: any
    whileFocus?: any
    whileDrag?: any
    whileInView?: any
    viewport?: any
    onHoverStart?: (event: MouseEvent) => void
    onHoverEnd?: (event: MouseEvent) => void
    onTap?: (event: MouseEvent) => void
    onTapStart?: (event: MouseEvent) => void
    onTapCancel?: (event: MouseEvent) => void
    drag?: boolean | 'x' | 'y'
    dragConstraints?: any
    layout?: boolean | string
    layoutId?: string
    style?: React.CSSProperties
    className?: string
    children?: React.ReactNode
  }
  
  // 定义motion组件
  type MotionComponent<T extends keyof JSX.IntrinsicElements> = React.FC<MotionProps & JSX.IntrinsicElements[T]>
  
  // motion对象，包含所有HTML元素的motion版本
  export const motion: {
    div: MotionComponent<'div'>
    span: MotionComponent<'span'>
    p: MotionComponent<'p'>
    a: MotionComponent<'a'>
    button: MotionComponent<'button'>
    img: MotionComponent<'img'>
    // 可以根据需要添加更多元素
    [key: string]: MotionComponent<any>
  }
  
  // AnimatePresence组件
  export const AnimatePresence: React.FC<{
    mode?: 'sync' | 'wait' | 'popLayout'
    initial?: boolean
    exitBeforeEnter?: boolean
    onExitComplete?: () => void
    children: React.ReactNode
  }>
} 