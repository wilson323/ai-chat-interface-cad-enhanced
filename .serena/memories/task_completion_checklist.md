# 任务完成检查清单
- 代码变更已通过：`npm run type-check && npm run lint`。
- E2E 测试运行通过：`npm run test:e2e`（必要时先 `npm run test:e2e:install`）。
- 文档已更新：README/相关 docs 与变更影响说明。
- 无冗余/重复实现；遵循命名导出与 Clean Architecture。
- 中间件与适配器路径一致；所有外部调用走统一适配器。
- 提交记录小而清晰，包含缘由。