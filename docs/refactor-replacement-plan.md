# 全局重构与替代方案清单

> 目标：减少自定义实现，采用成熟开源方案；统一协议与适配层；消除重复与命名不一致；提升一致性、可靠性与可维护性。

## 1. AI 适配与聊天流
- 问题
  - `lib/api/ai-provider-adapter.ts` 自研请求封装，`app/api/ag-ui/chat/route.ts` 自行解析 SSE。
- 建议替代
  - 统一使用 `OpenAI` 官方 SDK 或 `ai` (Vercel AI SDK) 处理 SSE、工具调用与中间件。
  - 开放供应商通过 OpenAI 兼容协议，保留单一适配层（当前文件可精简为配置映射）。
- 收益
  - 降低流处理与边界情况复杂度；减少维护成本；天然支持多模型与函数调用。
- 优先级：高

## 2. 速率限制
- 问题
  - `lib/rate-limiter.ts` 为占位；`middleware/rate-limiter.ts` 为 Upstash 实现，重复与散落。
- 建议替代
  - 收敛到 `@upstash/ratelimit` 单实现；导出 `limit(identifier)` 以供 API 路由与中间件共用。
- 收益
  - 单一来源，减少重复与配置分裂。
- 优先级：高

## 3. TTS/STT 统一
- 问题
  - `app/api/ag-ui/tts/route.ts` 直接调自研适配器；不同厂商签名兼容性不统一。
- 建议替代
  - 使用 OpenAI 兼容端点 `/audio/speech`、`/audio/transcriptions`，通过统一的适配层切换 baseUrl/apiKey。
- 收益
  - 简化调用路径；减少每厂商分支。
- 优先级：中高

## 4. 移动端断点 Hook 重复
- 问题
  - `hooks/use-mobile.ts` 与 `components/ui/use-mobile.tsx` 功能重复、命名不一致。
- 建议替代
  - 收敛为 `components/ui/use-mobile.tsx`（`useIsMobile`），在其他位置统一引用，删除重复 Hook。
- 收益
  - 去重，统一命名与断点常量。
- 优先级：高

## 5. AgentSelector 组件重复
- 问题
  - `components/chat/AgentSelector.tsx` 与 `components/chat/agent-selector.tsx` 重复实现，`components/chat/index.ts` 双重导出。
- 建议替代
  - 选定一个实现（建议下沉为 `agent-selector.tsx`，更贴近现有上下文 `FastGPTContext`）；保留单导出 `export { AgentSelector }`，修改引用；移除另一个组件。
- 收益
  - 消除重复 UI 与逻辑歧义。
- 优先级：高

## 6. CAD 解析
- 问题
  - `app/api/cad/*-parse/route.ts` 存在模拟解析；`lib/services/cad-analyzer/parsers/*` 中含大量非真实实现/占位逻辑；`advanced-parser.ts` 为演示性质。
- 建议替代
  - 2D（DXF）：直接使用 `dxf-parser`（项目已引入）于服务端解析；
  - 3D（STEP/IGES）：采用 `occt-import-js`（已引入）在 Node 侧解析或通过独立微服务（WASM/OCCT）；
  - DWG：接入商用/服务方案（ODA/Teigha/API 网关）或转换为 DXF 后再处理；
  - 移除模拟返回路径，确保全链路真实。
- 收益
  - 去掉 mock；真实可用的生产能力；与现有依赖对齐。
- 优先级：最高

## 7. 日志
- 问题
  - `lib/utils/logger.ts` 自研日志功能有限。
- 建议替代
  - 使用 `pino` 并结合 `pino-pretty`（开发）与可选远程聚合（Sentry/Logtail）。
- 收益
  - 标准化结构化日志与性能。
- 优先级：中

## 8. 分片上传
- 问题
  - `lib/utils/chunkedUpload.ts` 自研，协议自定义。
- 建议替代
  - 若后端为对象存储，优先使用 S3 Multipart/阿里云 OSS Multipart；或前端采用 `tus-js-client`/`uppy` 标准协议。
- 收益
  - 可靠续传与生态对接。
- 优先级：中

## 9. 中间件合并
- 问题
  - `middleware.ts` 与 `middleware/*` 部分能力重叠。
- 建议替代
  - 提炼单个 `middleware.ts`，按环境注入安全头、CORS 与限流；将 `high-availability` 能力内联或作为 util 复用；删除重复。
- 收益
  - 简化请求链路与配置。
- 优先级：中

## 10. 文档与命名规范
- 建议
  - 在 `docs/` 下持续维护《注释开发规范与流程文档.md》与《架构一致性指引.md》，并在变更时更新。
- 优先级：持续

## 里程碑与测试
- 里程碑 M1（高优先级）：AI 流/适配统一、Agent/Hook 去重、限流合并、去除 CAD 模拟；
- 里程碑 M2：TTS/STT 统一、日志替换、上传方案标准化；
- 测试
  - E2E：Playwright（AG-UI 会话流、TTS 播放、CAD 上传解析与报告生成）。
  - API：`/api/ag-ui/chat`、`/api/ag-ui/tts`、`/api/cad/*-parse` 行为测试；
  - 单测覆盖率目标 >80%。
