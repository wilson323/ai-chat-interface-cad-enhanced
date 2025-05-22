// 全局类型声明，解决各种类型问题
declare module 'lucide-react';

interface Window {
  gtag?: (...args: any[]) => void;
}

declare module '*.svg' {
  const content: React.FC<React.SVGProps<SVGSVGElement>>;
  export default content;
} 