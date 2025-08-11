# 项目待办清单（TodoList）

> 严格遵循统一规范与Windows环境要求；每完成一组任务需跑类型检查/构建/基本运行验证，再提交Git。

## P0 本轮必须完成
- [x] FastGPT 客户端命名与冗余治理
  - [x] 增加 `lib/api/enhanced-fastgpt-client.ts`（对现有增强客户端做命名对齐的导出包装，提供 `getEnhancedFastGPTClient`/`createEnhancedFastGPTClient` 别名）
  - [ ] 盘点全局对 `fastgpt.ts`、`fastgpt-enhanced.ts`、`fastgpt-optimizer.ts` 的引用清单（已初步收集，待文档化）
  - [ ] 新增使用处改为 `fastgpt-client.ts` 或 `enhanced-fastgpt-client.ts`（不破坏现有，分阶段迁移）
- [ ] 组件重复与命名一致性
  - [ ] `components/chat/AgentSelector.tsx` 与 `agent-selector.tsx` 重复清点与统一
  - [x] 新增统一导出入口 `components/chat/index.ts`，提供别名导出，保持向后兼容
  - [x] 输出受影响 import 列表，分阶段迁移
    - 受影响 import：
      - `app/page.tsx`: `@/components/chat/AgentSelector`
      - `app/chat/page.tsx`: `@/components/chat/agent-selector`
    - 迁移建议：新增统一导入路径 `@/components/chat` 并导出单一 `AgentSelector`，先提供 codemod 脚本，再分支迁移
- [ ] 基线质量门禁
  - [x] 运行 `npm run type-check` 与 `npm run lint`，记录错误清单（TS: 0 error；ESLint: 0 issue）
  - [x] 修复最高频/最高危的类型与Lint问题（本轮未发现阻断项）

### 批次A（去重 Hook/组件、限流合并）
- [x] 适配器中止透传修复
  - [x] `lib/api/ai-provider-adapter.ts`: 为 `chat/speech/transcribe` 增加 `RequestInit`，透传 `signal/headers`，解决 ConnectError aborted
- [ ] Hook 去重与统一
  - [ ] 统一为 `components/ui/use-mobile.tsx` 的 `useIsMobile`
  - [ ] 将所有 `import { useMobile } from '@/hooks/use-mobile'` 替换为 `import { useIsMobile } from '@/components/ui/use-mobile'`
  - [ ] 删除 `hooks/use-mobile.ts` 并更新文档
- [ ] `AgentSelector` 组件收敛
  - [ ] 以 `components/chat/agent-selector.tsx` 为唯一实现；合并大写版本差异后移除 `components/chat/AgentSelector.tsx`
  - [ ] `components/chat/index.ts` 改为单一导出：`export { AgentSelector } from './agent-selector'`
  - [ ] 全局替换导入为 `@/components/chat`
- [ ] 限流实现合并
  - [ ] 移除 `lib/rate-limiter.ts` 占位实现
  - [ ] 在 `middleware/rate-limiter.ts` 暴露轻量 `limit(identifier: string)`/`limitByRequest(req)` 供路由端使用
  - [ ] `app/api/ag-ui/chat/route.ts` 等路由改为使用合并后的限流方法
  - [ ] 校验 Upstash 环境变量并在 `app/api/system/env-check/route.ts` 中加入检查项

### P0+ 真实化 CAD 解析（计划批次B实施，优先级最高）
- [ ] DXF：服务端使用 `dxf-parser` 替换自研/模拟
- [ ] STEP/IGES：接入 `occt-import-js`（Node/WASM）解析，删除 `simulate*` 路径
- [ ] DWG：接入商用解析或服务端转换（ODA/Teigha/转换为DXF），在落地前对前端给出明确提示
- [ ] 移除 `app/api/cad/*-parse/route.ts` 的模拟实现，补充错误处理与性能保护（并发/超时）

## P1 近期优化
- [ ] AG-UI 路由与适配器一致性验证
  - [ ] 核查 `app/api/ag-ui/*` 是否统一走 `lib/api/fastgpt-ag-ui-adapter.ts`
  - [ ] 对齐 OpenAI 协议字段（对话/嵌入区分）
- [ ] 文档与规范同步
  - [ ] 在 `docs/` 更新改动点与统一使用方式
  - [ ] 在 `CODE-QUALITY-SUMMARY.md` 增补“冗余治理”章节
- [ ] 聊天流与TTS/STT统一
  - [ ] 使用 OpenAI 官方 SDK 或 Vercel AI SDK 统一 SSE/函数调用（保持 OpenAI 兼容协议）
  - [ ] TTS：统一 `/audio/speech`；STT：统一 `/audio/transcriptions`；由适配层切换 `baseUrl/apiKey`

## P2 测试体系搭建（分阶段）
- [ ] 单元测试基础
  - [ ] 引入 Vitest 与基础配置（Windows 兼容）
  - [ ] 针对 `lib/utils/*` 与纯函数先行补测
- [ ] E2E 基线
  - [ ] 引入 Playwright 并添加 smoke 用例：主页可打开、`/api/health` 200
  - [ ] AG-UI：会话初始化、消息流式、错误事件
  - [ ] TTS：请求->返回音频事件->前端播放
  - [ ] CAD：上传->解析->报告生成（HTML/PDF/JSON）
  - [ ] 覆盖率目标 >80%

## P3 工程化与基础设施
- [ ] 日志
  - [ ] 用 `pino` 替换 `lib/utils/logger.ts` 自研日志；开发态 `pino-pretty`；可选接入 Sentry/Logtail
- [ ] 分片上传
  - [ ] 对接对象存储 Multipart（S3/OSS）或采用 `tus-js-client/uppy`，替换 `lib/utils/chunkedUpload.ts`
- [ ] 中间件收敛
  - [ ] 合并 `middleware.ts` 与 `middleware/high-availability.ts` 的重叠能力，保留单入口；CSP/CORS/限流统一配置

## 记录与验收
- [ ] 变更记录（Changelog）
- [x] 每阶段完成后：类型检查 + Lint + 本地启动冒烟（Windows PowerShell）
- [ ] Git 提交（原子化小步提交，阶段验收后自动提交）

---

### 引用清单（初版）

- fastgpt（旧接口）引用位置：
  - `components/chat/chat-sidebar.tsx`: import FastGPTApi from `@/lib/api/fastgpt`
  - `contexts/FastGPTContext.tsx`: import FastGPTApi from `@/lib/api/fastgpt`
  - `hooks/use-model-fetcher.ts`: import FastGPTApi from `@/lib/api/fastgpt`
- enhanced & optimizer 引用位置：
  - `components/admin/system-monitor.tsx`: getEnhancedFastGPTClient, getFastGPTOptimizer
  - `components/admin/performance-dashboard.tsx`: getEnhancedFastGPTClient, getFastGPTOptimizer
  - `app/api/system/status/route.ts`: getEnhancedFastGPTClient, getFastGPTOptimizer
  - `app/api/fastgpt/init-chat/route.ts`: getEnhancedFastGPTClient, RequestPriority
  - `app/api/fastgpt/chat/route.ts`: getEnhancedFastGPTClient, RequestPriority

后续迁移建议：新代码优先使用 `@/lib/api/enhanced-fastgpt-client` 导出的 `getEnhancedFastGPTClient`；存量代码分阶段替换，确保不改变行为。

### AG-UI 路由与适配器一致性（初查）

- 现状：`app/api/ag-ui/*` 多数路由直接调用本地代理/服务，并未统一引入 `lib/api/fastgpt-ag-ui-adapter.ts`
- 建议：
  1) 在服务层封装一层适配器调用（保持现有路由签名不变），实现协议字段对齐（对话/嵌入区分）。
  2) 渐进改造，新增 feature flag 控制是否走适配器。
  3) 为关键路由补充 zod 校验与错误码对齐。
