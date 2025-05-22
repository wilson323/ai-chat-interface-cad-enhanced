/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    domains: ['cdn.example.com'],
    formats: ['image/avif', 'image/webp'],
    unoptimized: process.env.NODE_ENV === 'development'
  },
  transpilePackages: [
    'framer-motion',
    'class-variance-authority',
    'lucide-react',
    'lru-cache'
  ],
  serverExternalPackages: [
    '@ag-ui/server',
    'cad-parser-lib',
    'ai-model-core'
  ],
  headers: () => [
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
            connect-src 'self' https://api.example.com;
          `.replace(/\s+/g, ' ')
        }
      ]
    }
  ]
}

export default nextConfig
