/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: false,
    dirs: ['app', 'components', 'lib', 'hooks', 'contexts'],
  },
  typescript: {
    // 生产环境进行类型检查
    ignoreBuildErrors: process.env.NODE_ENV === 'development',
    tsconfigPath: './tsconfig.json',
  },
  images: {
    domains: [
      'localhost',
      '171.43.138.237',
      'zktecoaihub.com',
      'fastgpt.zktecoaihub.com'
    ],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30天缓存
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  // 启用standalone输出用于Docker部署
  output: 'standalone',
  
  transpilePackages: [
    'framer-motion',
    'class-variance-authority',
    'lucide-react',
    'lru-cache',
  ],
  serverExternalPackages: [
    '@ag-ui/server',
    'cad-parser-lib',
    'ai-model-core',
    'web-ifc',
    'web-ifc-three',
    // moved from experimental.serverComponentsExternalPackages
    'sharp',
    'puppeteer-core'
  ],
  experimental: {
    // 固定关闭以避免引入 critters 依赖
    optimizeCss: false,
    optimizePackageImports: [
      '@radix-ui/react-icons',
      'lucide-react',
      '@radix-ui/react-accordion',
      '@radix-ui/react-alert-dialog',
      '@radix-ui/react-avatar',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-collapsible',
      '@radix-ui/react-context-menu',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-hover-card',
      '@radix-ui/react-label',
      '@radix-ui/react-menubar',
      '@radix-ui/react-navigation-menu',
      '@radix-ui/react-popover',
      '@radix-ui/react-progress',
      '@radix-ui/react-radio-group',
      '@radix-ui/react-scroll-area',
      '@radix-ui/react-select',
      '@radix-ui/react-separator',
      '@radix-ui/react-slider',
      '@radix-ui/react-slot',
      '@radix-ui/react-switch',
      '@radix-ui/react-tabs',
      '@radix-ui/react-toast',
      '@radix-ui/react-toggle',
      '@radix-ui/react-toggle-group',
      '@radix-ui/react-tooltip'
    ],
    // 仅在开发环境禁用老的优化加载
    disableOptimizedLoading: process.env.NODE_ENV === 'development',
  },
  // 生产环境启用严格模式
  reactStrictMode: process.env.NODE_ENV === 'production',
  
  // 生产环境日志配置
  logging: {
    level: process.env.NODE_ENV === 'development' ? 'warn' : 'info',
  },
  
  // 性能优化配置
  compiler: {
    // 生产环境移除console.log
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn']
    } : false,
  },
  
  // 压缩配置
  compress: process.env.NODE_ENV === 'production',
  
  // 生产环境禁用powered by header
  poweredByHeader: false,
  
  // 静态文件优化
  generateEtags: true,
  
  // 缓存配置
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 5,
  },
  
  // Webpack配置精简为最小实现，避免影响Next内部runtime
  webpack: (config) => {
    return config;
  },
  
  // 安全Headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'geolocation=(), microphone=(), camera=()' },
        ],
      },
    ]
  },
  
  // 环境变量配置
  env: {
    NEXT_PUBLIC_NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },
  
  // 重写规则
  async rewrites() {
    return [
      { source: '/health', destination: '/api/health' },
      { source: '/monitoring', destination: '/admin/dashboard/performance' },
    ];
  },
}

export default nextConfig
