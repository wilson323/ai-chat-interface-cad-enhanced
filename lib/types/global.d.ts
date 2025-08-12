// 全局类型声明，解决各种类型问题
declare module 'lucide-react';

interface Window {
  gtag?:
    | ((command: "js", date: Date) => void)
    | ((command: "config", targetId: string, config?: Record<string, unknown>) => void)
    | ((command: string, ...args: Array<unknown>) => void)
}

declare module '*.svg' {
  const content: React.FC<React.SVGProps<SVGSVGElement>>;
  export default content;
} 