# 项目待办清单（TodoList)

> 严格遵循统一规范与Windows环境要求；每完成一组任务需跑类型检查/构建/基本运行验证，再提交Git。

## 未完事项（保留）
- [ ] DWG 回退统一（待转换服务接入后移除；详见：P0 真实化 CAD 解析）
- [ ] AI 适配收敛（统一 OpenAI 协议与流式；区分 LLM/Embedding；详见：P0 全局一致性与规范检查）
- [ ] 文档与 .kiro（补齐 hooks 与校验脚本，纳入 CI；详见：P0 全局一致性与规范检查）
- [ ] 测试体系（Vitest 单测、Playwright E2E、覆盖率>80%；详见：P2 测试体系搭建）
- [ ] 缓存与性能（Redis/Upstash 收敛、失效策略、流优化复用；详见：P0 全局一致性与规范检查）

## P0 本轮必须完成
- [x] FastGPT 客户端命名与冗余治理
  - [x] 增加 `lib/api/enhanced-fastgpt-client.ts`（对现有增强客户端做命名对齐的导出包装，提供 `getEnhancedFastGPTClient`/`createEnhancedFastGPTClient` 别名）
  - [x] 盘点全局对 `fastgpt.ts`、`fastgpt-enhanced.ts`、`fastgpt-optimizer.ts` 的引用清单（引用清单见下文“引用清单（初版）”）
- [x] 新增使用处改为 `enhanced-fastgpt-client.ts`（不破坏现有，分阶段迁移）
- [x] 组件重复与命名一致性
  - [x] `components/chat/AgentSelector.tsx` 与 `agent-selector.tsx` 重复清点与统一
  - [x] 新增统一导出入口 `components/chat/index.ts`，提供别名导出，保持向后兼容
  - [x] 输出受影响 import 列表，分阶段迁移
    - 受影响 import：
    - `app/page.tsx`: `@/components/chat/AgentSelector`
    - `app/chat/page.tsx`: `@/components/chat/agent-selector`
    - 迁移建议：新增统一导入路径 `@/components/chat` 并导出单一 `AgentSelector`，先提供 codemod 脚本，再分支迁移
- [x] 基线质量门禁
  - [x] 运行 `npm run type-check` 与 `npm run lint`，记录错误清单（TS: 0 error；ESLint: 0 issue）
  - [x] 修复最高频/最高危的类型与Lint问题（本轮未发现阻断项）

### 批次A（去重 Hook/组件、限流合并）
- [x] 适配器中止透传修复
  - [x] `lib/api/ai-provider-adapter.ts`: 为 `chat/speech/transcribe` 增加 `RequestInit`，透传 `signal/headers`，解决 ConnectError aborted
- [x] Hook 去重与统一（进行中，可并行）
  - [x] 统一为 `components/ui/use-mobile.tsx` 的 `useIsMobile`
  - [x] 将所有 `import { useMobile } from '@/hooks/use-mobile'` 替换为 `import { useIsMobile } from '@/components/ui/use-mobile'`
  - [x] 删除 `hooks/use-mobile.ts` 并更新文档
- [x] `AgentSelector` 组件收敛（进行中，可并行）
  - [x] 以 `components/chat/agent-selector.tsx` 为唯一实现；合并大写版本差异后移除 `components/chat/AgentSelector.tsx`
  - [x] `components/chat/index.ts` 改为单一导出：`export { AgentSelector } from './agent-selector'`
  - [x] 全局替换导入为 `@/components/chat`（页面已改：`app/page.tsx`）
- [x] 限流实现合并（进行中，可并行）
  - [x] 移除 `lib/rate-limiter.ts` 占位实现
  - [x] `app/api/ag-ui/chat/route.ts` 改为使用 `middleware/rate-limiter`
  - [x] 在环境检查中加入 Upstash Redis 变量校验（`lib/utils/env-validator.ts`）
  - [x] `app/api/system/env-check/route.ts` 增加 Upstash 详细提示文案

### P0+ 真实化 CAD 解析（计划批次B实施，优先级最高）
- [x] DXF：服务端使用 `dxf-parser` 替换自研/模拟（已完成：新增 `app/api/cad/dxf-parse/route.ts`，使用 dxf-parser 并发/超时与回退已就绪）
- [x] STEP/IGES：接入 `occt-import-js`（Node/WASM）解析；已移除模拟回退（需 `OCCT_IMPORT_ENABLED=true`）
- [x] DWG：接入服务端转换（通过 `DWG_CONVERTER_URL` -> DXF -> dxf-parser），已移除模拟回退；未配置服务时返回明确错误提示（并发/超时已就绪）
- [x] 移除 `app/api/cad/dxf-parse/route.ts` 的模拟回退；保留严格错误提示与并发/超时
- [ ] 统一DWG回退提示逻辑，待转换服务接入后移除
- [x] 文档化与校验：新增/校验 `OCCT_IMPORT_ENABLED`、`ENABLE_SIMULATED_CAD_PARSERS` 开关及其在 `config/features.ts`/环境校验中的提示

## P0 全局一致性与规范检查（补充）
- [ ] AI 适配与流式统一（SDK 收敛）
  - [ ] 采用 OpenAI 官方 SDK 或 Vercel AI SDK 统一对话流与函数调用；`lib/api/ai-provider-adapter.ts` 精简为供应商配置映射层
  - [ ] 强制所有模型调用走单一适配器且遵循 OpenAI 协议；区分 LLM 与 Embedding（禁止混用字段）
  - [ ] `app/api/proxy/ai/route.ts` 与 `app/api/ag-ui/chat` 统一走同一底座
- [ ] 去除所有 mock/模拟路径
  - [x] 全局扫描 `simulate`/`mock`/占位实现，替换为真实实现或关闭入口（包含 UI 层 mock 数据，如 `app/chat/page.tsx`）
  - [x] 为停用能力给出明确用户提示与后继计划
  - [x] 移除 `app/page.tsx` 内的 UI 层 mock 数据（`publishedAgents`、`mockConversations`）并改为由 `FastGPTContext`/真实API驱动
- [ ] 文档与规范持续化
  - [ ] 新增并维护：《注释开发规范与流程文档.md》、《架构一致性指引.md》（docs/ 下）
  - [ ] 变更同步到《CODE-QUALITY-SUMMARY.md》与《README.md》
- [ ] .kiro 钩子与系统启动规范
  - [ ] 校验 `.kiro/` 规范与 hooks（如 `system.startup`）一致性；若缺失则补齐脚本与校验
  - [ ] 将 `npm run hooks:validate` 纳入 CI 本地校验清单
- [ ] FastGPT 上下文与多代理一致性
  - [x] `contexts/FastGPTContext.tsx` 从本地存储兜底过渡到真实后端为主，保留容错；移除 UI 层 mock 数据
  - [ ] 确认多代理能力不偏离核心目标（CAD 分析、AI 海报生成），补充能力开关与文档
- [ ] 安全与监控
  - [ ] 安全头/CSP 策略审查并固化在合并后的 `middleware.ts`
  - [ ] 接入 Sentry/Logtail（二选一）用于错误上报；`app/api/monitoring/error/route.ts` 与前端上报一致
- [ ] 缓存与性能
  - [ ] 统一 `lib/cache/*` 与 Redis/Upstash 使用方式，移除重复封装；明确失效策略与键前缀
  - [ ] 评估 `lib/ag-ui/stream-optimizer.ts` 与 SDK 能力的重叠度，能复用则收敛

## P1 近期优化
- [ ] AG-UI 路由与适配器一致性验证
  - [x] 将 `app/api/ag-ui/chat/route.ts` 切换为使用 `lib/api/server-fastgpt-upstream.ts`（Edge 安全）
  - [ ] 核查 `app/api/ag-ui/*` 路由，统一抽象到服务层适配器
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
- [x] Git 提交（原子化小步提交，阶段验收后自动提交）

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
