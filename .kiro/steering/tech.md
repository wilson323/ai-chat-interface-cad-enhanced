# 技术栈与构建系统

## 核心技术栈

### 前端技术栈
- **框架**: Next.js 15.3.2 with App Router
- **语言**: TypeScript 5.8.3 (严格模式)
- **UI 组件**: Radix UI + shadcn/ui 组件库
- **样式**: Tailwind CSS 3.4.17
- **状态管理**: React Query + React Context
- **3D 渲染**: Three.js + React Three Fiber
- **身份认证**: NextAuth.js

### 后端技术栈
- **运行时**: Node.js 18+
- **数据库**: PostgreSQL (主) + Redis (缓存/队列)
- **ORM**: Prisma
- **文件存储**: MinIO/S3 兼容存储
- **API**: Next.js API Routes
- **实时通信**: WebSockets + Server-Sent Events

### AI 与机器学习
- **FastGPT 集成**: 外部智能体平台对接
- **多智能体框架**: AutoGen, CrewAI, LangGraph
- **模型提供商**: OpenAI, Anthropic, Azure OpenAI
- **CAD 处理**: web-ifc, three-stl-loader, dxf-parser
- **文档生成**: PDFKit, jsPDF, html2canvas

### 开发工具
- **包管理器**: npm
- **代码质量**: ESLint + Prettier
- **测试框架**: Vitest (单元测试) + Playwright (E2E)
- **类型检查**: TypeScript 编译器
- **构建工具**: Next.js 内置构建系统

## 构建系统

### 开发环境
```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 快速开发模式（启用 Turbo）
npm run dev:fast
```

### 构建与部署
```bash
# 生产构建
npm run build

# 启动生产服务器
npm start

# 类型检查
npm run type-check

# 代码检查
npm run lint
```

### 测试命令
```bash
# 运行所有测试
npm test

# 测试覆盖率
npm run test:coverage

# E2E 测试
npm run test:e2e
```

### 维护命令
```bash
# 清理临时文件
npm run cleanup

# 依赖检查
npm run deps:check

# 安全审计
npm run deps:audit

# 健康检查
npm run health:check

# 性能检查
npm run performance:check
```

### 部署命令
```bash
# 生产部署
npm run deploy:prod

# 或使用脚本
./scripts/deploy-production.sh
```

## 环境要求

### 系统要求
- **Node.js**: >= 18.0.0
- **npm**: >= 9.0.0
- **内存**: 最少 4GB RAM
- **存储**: 至少 10GB 可用空间

### 环境变量配置
参考 `.env.production.example` 文件配置以下环境变量：
- 数据库连接信息
- Redis 配置
- FastGPT API 密钥
- 文件存储配置
- 第三方服务密钥

## 架构特性

### 性能优化
- **代码分割**: 自动代码分割和懒加载
- **图像优化**: Next.js Image 组件优化
- **缓存策略**: 多级缓存（内存 + Redis）
- **CDN 集成**: 静态资源 CDN 分发

### 安全特性
- **CSP 头部**: 内容安全策略
- **HTTPS 强制**: 生产环境强制 HTTPS
- **输入验证**: 全面的输入数据验证
- **文件安全**: CAD 文件安全扫描

### 可扩展性
- **容器化**: Docker 支持
- **微服务就绪**: 模块化架构设计
- **负载均衡**: 支持水平扩展
- **监控集成**: 性能和错误监控

## 开发规范

### 代码规范
- 使用 TypeScript 严格模式
- 遵循 ESLint 配置规则
- 统一使用 Prettier 格式化
- 组件使用 PascalCase 命名
- 工具函数使用 camelCase 命名

### 文件组织
- 页面文件放在 `app/` 目录
- 共享组件放在 `components/` 目录
- 业务逻辑放在 `lib/` 目录
- 类型定义放在 `types/` 目录
- 配置文件放在 `config/` 目录

### Git 工作流
- 使用语义化提交信息
- 功能分支开发模式
- 代码审查必需
- 自动化测试通过后合并