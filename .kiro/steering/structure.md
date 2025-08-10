# 项目结构与组织架构

## 项目根目录结构

```
ai-chat-interface/
├── app/                    # Next.js App Router 页面和 API
├── components/             # 共享 React 组件
├── lib/                    # 核心业务逻辑和工具
├── types/                  # TypeScript 类型定义
├── config/                 # 配置文件
├── hooks/                  # 自定义 React Hooks
├── contexts/               # React Context 提供者
├── middleware/             # 中间件
├── public/                 # 静态资源
├── styles/                 # 全局样式
├── scripts/                # 构建和部署脚本
├── deploy/                 # 部署相关文件
├── docs/                   # 项目文档
├── .kiro/                  # Kiro 配置和规范
└── .cursor/                # Cursor 规则配置
```

## 核心目录详解

### `/app` - Next.js App Router
```
app/
├── (routes)/               # 路由组
├── api/                    # API 路由
│   ├── auth/              # 认证相关 API
│   ├── chat/              # 聊天功能 API
│   ├── cad-analyzer/      # CAD 分析 API
│   ├── poster-generator/  # 海报生成 API
│   ├── admin/             # 管理员 API
│   └── shared/            # 共享 API 工具
├── auth/                   # 认证页面
├── chat/                   # 聊天界面
├── cad-analyzer/          # CAD 分析页面
├── poster-generator/      # 海报生成页面
├── admin/                 # 管理员界面
├── diagnostics/           # 诊断页面
├── shared/                # 共享页面组件
├── layout.tsx             # 根布局
├── page.tsx               # 首页
├── loading.tsx            # 加载页面
├── globals.css            # 全局样式
└── client-layout.tsx      # 客户端布局
```

### `/components` - 组件库
```
components/
├── ui/                    # 基础 UI 组件 (shadcn/ui)
│   ├── button.tsx
│   ├── input.tsx
│   ├── dialog.tsx
│   └── ...
├── chat/                  # 聊天相关组件
│   ├── ChatInterface.tsx
│   ├── MessageList.tsx
│   └── InputArea.tsx
├── cad/                   # CAD 相关组件
│   ├── CADViewer.tsx
│   ├── FileUpload.tsx
│   └── AnalysisResults.tsx
├── poster/                # 海报生成组件
├── admin/                 # 管理员组件
├── ag-ui/                 # AG-UI 协议组件
├── theme-provider.tsx     # 主题提供者
└── SomeComponent.tsx      # 示例组件
```

### `/lib` - 核心业务逻辑
```
lib/
├── api/                   # API 客户端
│   ├── fastgpt-client.ts
│   ├── enhanced-fastgpt-client.ts
│   └── api-client.ts
├── services/              # 业务服务
│   ├── chat-service.ts
│   ├── cad-service.ts
│   └── user-service.ts
├── database/              # 数据库操作
├── utils/                 # 工具函数
├── types/                 # 类型定义
├── hooks/                 # 业务 Hooks
├── stores/                # 状态管理
├── workers/               # Web Workers
├── agents/                # 智能体相关
├── managers/              # 管理器类
├── protocol/              # 协议处理
├── cache/                 # 缓存管理
├── errors/                # 错误处理
├── retry/                 # 重试机制
├── batch/                 # 批处理
├── sync/                  # 同步机制
├── prefetch/              # 预取逻辑
├── preload/               # 预加载
├── fallback/              # 降级处理
├── conversation/          # 对话管理
├── ag-ui/                 # AG-UI 集成
├── init.ts                # 初始化
├── system-init.ts         # 系统初始化
├── utils.ts               # 通用工具
└── monaco-environment.tsx # Monaco 编辑器环境
```

### `/types` - 类型定义
```
types/
├── ag-ui/                 # AG-UI 相关类型
├── node/                  # Node.js 类型扩展
├── fastgpt.ts             # FastGPT 类型
├── global.d.ts            # 全局类型声明
├── index.d.ts             # 主要类型导出
├── react.d.ts             # React 类型扩展
├── react-types.d.ts       # React 组件类型
├── next.d.ts              # Next.js 类型扩展
├── next-image.d.ts        # Next.js Image 类型
├── jsx-runtime.d.ts       # JSX 运行时类型
└── framer-motion.d.ts     # Framer Motion 类型
```

### `/config` - 配置文件
```
config/
├── cad-analyzer.config.ts # CAD 分析器配置
├── default-agent.ts       # 默认智能体配置
├── fastgpt.ts            # FastGPT 配置
└── security.ts           # 安全配置
```

### `/hooks` - 自定义 Hooks
```
hooks/
├── use-ag-ui.tsx          # AG-UI Hook
├── use-ag-ui-cad.tsx      # CAD AG-UI Hook
├── use-agent-filters.ts   # 智能体过滤
├── use-agent-management.ts # 智能体管理
├── use-mobile.ts          # 移动端检测
├── use-model-fetcher.ts   # 模型获取
├── use-toast.ts           # 提示消息
├── useCADAnalyzerService.ts # CAD 分析服务
└── useWindowSize.ts       # 窗口尺寸
```

## 架构设计原则

### 模块化设计
- **单一职责**: 每个模块只负责一个特定功能
- **松耦合**: 模块间依赖最小化
- **高内聚**: 相关功能集中在同一模块
- **可复用**: 组件和工具函数可在多处使用

### 分层架构
```
表现层 (Presentation Layer)
├── Pages (app/)
├── Components (components/)
└── Hooks (hooks/)

业务逻辑层 (Business Logic Layer)
├── Services (lib/services/)
├── Managers (lib/managers/)
└── Agents (lib/agents/)

数据访问层 (Data Access Layer)
├── API Clients (lib/api/)
├── Database (lib/database/)
└── Cache (lib/cache/)

基础设施层 (Infrastructure Layer)
├── Utils (lib/utils/)
├── Config (config/)
└── Types (types/)
```

### 命名约定

#### 文件命名
- **组件文件**: `PascalCase.tsx` (如: `ChatInterface.tsx`)
- **页面文件**: `page.tsx`, `layout.tsx`, `loading.tsx`
- **工具文件**: `kebab-case.ts` (如: `api-client.ts`)
- **类型文件**: `kebab-case.ts` (如: `user-types.ts`)
- **配置文件**: `kebab-case.config.ts`

#### 目录命名
- **功能模块**: `kebab-case` (如: `cad-analyzer`)
- **组件分类**: `kebab-case` (如: `ui`, `chat`)
- **API 路由**: `kebab-case` (如: `poster-generator`)

### 导入规范
```typescript
// ✅ 使用绝对导入
import { Button } from '@/components/ui/button'
import { ChatService } from '@/lib/services/chat-service'
import type { UserProfile } from '@/types/user'

// ❌ 避免相对导入
import { Button } from '../../../components/ui/button'
```

### 代码组织最佳实践

#### 组件组织
- 每个组件一个文件
- 相关组件放在同一目录
- 使用 index.ts 文件统一导出
- 组件 Props 类型定义在同一文件

#### 业务逻辑组织
- 服务类负责业务逻辑
- 工具函数保持纯函数
- 复杂状态使用专门的管理器
- API 调用统一通过客户端类

#### 类型组织
- 全局类型放在 `/types` 目录
- 模块特定类型放在模块内
- 使用 TypeScript 严格模式
- 避免使用 `any` 类型

## 特殊目录说明

### `/.kiro` - Kiro 配置
包含 Kiro AI 助手的配置文件、规范文档和 hooks

### `/.cursor` - Cursor 规则
包含 Cursor AI 编辑器的规则配置，确保代码质量和一致性

### `/deploy` - 部署配置
包含 Docker 配置、部署脚本和生产环境配置

### `/docs` - 项目文档
包含 API 文档、架构说明、优化计划等技术文档

### `/public` - 静态资源
包含图片、图标、Web Workers 和其他静态文件

### `/scripts` - 脚本文件
包含构建、部署、清理和安全检查脚本

这种结构设计确保了项目的可维护性、可扩展性和团队协作的效率。