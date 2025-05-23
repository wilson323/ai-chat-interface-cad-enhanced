// Next.js Image组件类型声明
declare module 'next/image' {
  import { DetailedHTMLProps, ImgHTMLAttributes } from 'react'
  
  type ImageProps = {
    src: string
    alt: string
    width?: number
    height?: number
    fill?: boolean
    quality?: number
    priority?: boolean
    loading?: 'lazy' | 'eager'
    className?: string
    sizes?: string
    style?: React.CSSProperties
    blurDataURL?: string
    placeholder?: 'blur' | 'empty'
    onLoad?: (event: React.SyntheticEvent<HTMLImageElement, Event>) => void
    onError?: (error: Error) => void
  } & Omit<DetailedHTMLProps<ImgHTMLAttributes<HTMLImageElement>, HTMLImageElement>, 'src' | 'width' | 'height' | 'loading' | 'style'>
  
  const Image: React.FC<ImageProps>
  export default Image
} 