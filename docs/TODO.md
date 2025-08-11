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

## P1 近期优化
- [ ] AG-UI 路由与适配器一致性验证
  - [ ] 核查 `app/api/ag-ui/*` 是否统一走 `lib/api/fastgpt-ag-ui-adapter.ts`
  - [ ] 对齐 OpenAI 协议字段（对话/嵌入区分）
- [ ] 文档与规范同步
  - [ ] 在 `docs/` 更新改动点与统一使用方式
  - [ ] 在 `CODE-QUALITY-SUMMARY.md` 增补“冗余治理”章节

## P2 测试体系搭建（分阶段）
- [ ] 单元测试基础
  - [ ] 引入 Vitest 与基础配置（Windows 兼容）
  - [ ] 针对 `lib/utils/*` 与纯函数先行补测
- [ ] E2E 基线
  - [ ] 引入 Playwright 并添加 smoke 用例：主页可打开、`/api/health` 200

## 记录与验收
- [ ] 变更记录（Changelog）
- [x] 每阶段完成后：类型检查 + Lint + 本地启动冒烟（Windows PowerShell）
- [ ] Git 提交（原子化小步提交）

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
