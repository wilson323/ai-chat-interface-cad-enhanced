# 代码风格与约定
- TypeScript 严格模式；所有导出优先 `export const` 命名导出。
- 命名：camelCase；类型清晰；公共函数/复杂函数必须 JSDoc；注释写“为什么”。
- 错误处理：try-catch 或 Zod 校验；统一错误结构；不吞错。
- 结构：遵循 Clean Architecture；UI 与业务分层；文件职责单一；避免冗余。
- 适配器：AI 必须走 OpenAI 兼容适配器；嵌入/TTS/STT 接口统一。
- 中间件：`middleware.ts` 集中 CSP/CORS/限流与管理员鉴权；`lib/middleware/stats` 统计。
- 测试：Playwright E2E；覆盖率>80%（e2e 保底），提交前运行测试与 lint。
- 文档：更新 `docs/` 与根部 mdc；重要变更需记录设计与影响。