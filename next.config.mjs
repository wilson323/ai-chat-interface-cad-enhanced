/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    // 生产环境进行类型检查
    ignoreBuildErrors: process.env.NODE_ENV === 'development',
  },
  images: {
    domains: ['cdn.example.com'],
    formats: ['image/avif', 'image/webp'],
    unoptimized: process.env.NODE_ENV === 'development'
  },
  // 启用standalone输出用于Docker部署
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
  
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
      'web-ifc-three'
    ],
  experimental: {
    // 生产环境优化
    optimizeCss: process.env.NODE_ENV === 'production',
    optimizePackageImports: [
      'react',
      'react-dom',
      'framer-motion', 
      'lucide-react',
      'tailwind-merge'
    ],
    // 启用并行编译（提高开发时的速度）
    parallelServerCompiles: true,
    // 仅在生产环境启用图片压缩
    disableOptimizedLoading: process.env.NODE_ENV === 'development',
    // 生产环境启用instrumentationHook用于监控
    instrumentationHook: process.env.NODE_ENV === 'production',
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
  
  // 构建时优化
  swcMinify: true,
  
  headers: () => {
    // 开发环境不设置CSP
    if (process.env.NODE_ENV === 'development') {
      return [];
    }
    
    // 生产环境设置安全headers
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: `
              default-src 'self';
              script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com;
              style-src 'self' 'unsafe-inline';
              img-src 'self' data: https://cdn.example.com;
              font-src 'self';
              connect-src 'self' https://api.example.com wss: ws:;
              frame-ancestors 'none';
            `.replace(/\s+/g, ' ')
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          }
        ]
      },
      // API路由性能优化headers
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, must-revalidate'
          }
        ]
      },
      // 静态资源缓存
      {
        source: '/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      }
    ]
  },
  
  // 重定向配置
  redirects: async () => {
    return [
      {
        source: '/admin',
        destination: '/admin/dashboard',
        permanent: true,
      },
    ]
  },
  
  // 环境变量配置
  env: {
    AG_UI_VERSION: '1.0.0',
    BUILD_TIME: new Date().toISOString(),
  },
  
  // 压缩配置
  compress: process.env.NODE_ENV === 'production',
  
  // 生产环境禁用powered by header
  poweredByHeader: false,
  
  // webpack配置优化
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // 生产环境优化
    if (!dev) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: 10,
            enforce: true,
          },
        },
      }
    }
    
    return config
  },
}

export default nextConfig
