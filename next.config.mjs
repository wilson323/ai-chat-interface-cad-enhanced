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
      'web-ifc-three'
    ],
  experimental: {
    // 生产环境优化
    optimizeCss: process.env.NODE_ENV === 'production',
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
    // 启用并行编译（提高开发时的速度）
    parallelServerCompiles: true,
    // 仅在生产环境启用图片压缩
    disableOptimizedLoading: process.env.NODE_ENV === 'development',
    // 生产环境启用instrumentationHook用于监控
    instrumentationHook: process.env.NODE_ENV === 'production',
    serverComponentsExternalPackages: ['sharp', 'puppeteer-core'],
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
  
  // Webpack配置优化
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // 外部依赖优化
    if (!isServer) {
      config.externals = {
        ...config.externals,
        'utf-8-validate': 'commonjs utf-8-validate',
        'bufferutil': 'commonjs bufferutil',
        'supports-color': 'commonjs supports-color',
      };
    }
    
    // 生产环境优化
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        usedExports: true,
        sideEffects: false,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            framework: {
              chunks: 'all',
              name: 'framework',
              test: /(?<!node_modules.*)[\\/]node_modules[\\/](react|react-dom|scheduler|prop-types|use-subscription)[\\/]/,
              priority: 40,
              enforce: true,
            },
            lib: {
              test(module) {
                return module.size() > 160000 && /node_modules[/\\]/.test(module.identifier());
              },
              chunks: 'all',
              name: 'lib',
              priority: 30,
              minChunks: 1,
              reuseExistingChunk: true,
            },
            commons: {
              chunks: 'all',
              name: 'commons',
              minChunks: 2,
              priority: 20,
            },
            shared: {
              chunks: 'all',
              name: 'shared',
              test: /[\\/]node_modules[\\/]/,
              priority: 10,
              minChunks: 1,
              reuseExistingChunk: true,
            },
          },
        },
      };
      
      // Tree shaking优化
      config.optimization.usedExports = true;
      config.optimization.providedExports = true;
    }
    
    // 文件加载优化
    config.module.rules.push({
      test: /\.(woff|woff2|eot|ttf|otf)$/i,
      type: 'asset/resource',
      generator: {
        filename: 'static/fonts/[name].[hash][ext]',
      },
    });
    
    return config;
  },
  
  // 安全Headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          },
        ],
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/public/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400',
          },
        ],
      },
    ];
  },
  
  // 环境变量配置
  env: {
    NEXT_PUBLIC_NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },
  
  // 重定向和重写规则
  async rewrites() {
    return [
      {
        source: '/health',
        destination: '/api/health',
      },
      {
        source: '/monitoring',
        destination: '/admin/dashboard/performance',
      },
    ];
  },
}

export default nextConfig
