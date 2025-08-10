# 项目待办清单（TodoList）

> 严格遵循统一规范与Windows环境要求；每完成一组任务需跑类型检查/构建/基本运行验证，再提交Git。

## P0 本轮必须完成
- [ ] FastGPT 客户端命名与冗余治理
  - [ ] 增加 `lib/api/enhanced-fastgpt-client.ts`（对现有增强客户端做命名对齐的导出包装）
  - [ ] 盘点全局对 `fastgpt.ts`、`fastgpt-enhanced.ts`、`fastgpt-optimizer.ts` 的引用清单
  - [ ] 新增使用处改为 `fastgpt-client.ts` 或 `enhanced-fastgpt-client.ts`（不破坏现有）
- [ ] 组件重复与命名一致性
  - [ ] `components/chat/AgentSelector.tsx` 与 `agent-selector.tsx` 重复清点与统一
  - [ ] 输出受影响 import 列表，分阶段迁移
- [ ] 基线质量门禁
  - [ ] 运行 `npm run type-check` 与 `npm run lint`，记录错误清单
  - [ ] 修复最高频/最高危的类型与Lint问题（不改变行为）

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
- [ ] 每阶段完成后：类型检查 + Lint + 本地启动冒烟（Windows PowerShell）
- [ ] Git 提交（原子化小步提交）
