# ZK-Agent Cursor Rules 规范文件总览

## 📋 已完成的规范文件

根据用户要求"梳理全局md内容结合项目规范及.kiro路径下的所有md内容及其他md内容基于现有项目整体架构、开发规范及开发钩子等进行增补和优化确保全部需要写入mdc的规范、规划、要求写入mdc，钩子同样也要设置"，我们已经完成了以下Cursor Rules文件：

### 🏗️ 核心架构规范
- **00-unified-project-standards.mdc** - 统一项目规范总纲和快速索引
- **01-project-architecture.mdc** - 项目架构规范，涵盖三大智能体子系统、技术栈、数据库策略
- **08-tech-stack-ai-models.mdc** - 技术栈与AI模型管理规范

### 💻 开发与代码规范
- **02-development-standards.mdc** - 开发规范与代码质量标准，包含Python/TypeScript规范
- **03-mcp-tools-integration.mdc** - MCP工具集成规范，强制使用TaskManager、Mentor、Serena等
- **09-work-quality-assurance.mdc** - 工作质量保证规范，定义工作前后质量验证流程

### 🧪 测试与质量规范
- **04-testing-standards.mdc** - 测试规范与质量保证标准，统一Vitest、Playwright、pytest
- **05-windows-environment-hooks.mdc** - Windows环境与开发钩子工作流程规范

### 🔗 API与集成规范
- **06-api-design-standards.mdc** - API设计与接口规范，RESTful、认证、版本控制
- **10-api-library-architecture.mdc** - API库架构规范，三层客户端架构
- **12-fastgpt-integration.mdc** - FastGPT集成规范，外部智能体接入标准

### 🚀 部署与运维规范
- **07-cicd-standards.mdc** - CI/CD规范，专门适配Linux Ubuntu生产环境

### 🤖 智能体规范
- **11-self-developed-agents.mdc** - 自研智能体架构规范，CAD解读和海报生成智能体

## 📊 覆盖范围统计

### 已处理的关键文档源
- ✅ `.kiro/hooks/` - 所有钩子文件已转换为规范
- ✅ `.kiro/steering/` - 核心技术指导文档已转换
- ✅ `.kiro/specs/` - 规范文档已整合
- ✅ `docs/API.md` - API设计规范已转换
- ✅ `docs/testing-standard.md` - 测试标准已转换
- ✅ `docs/CI_CD_GUIDELINES.md` - CI/CD指南已转换并优化为Ubuntu
- ✅ `ARCHITECTURE_OPTIMIZATION_PLAN.md` - 架构优化计划已整合
- ✅ `lib/api/README.md` - API库架构已转换

### 钩子集成状态
- ✅ **development-workflow-enhancement.kiro.hook** → 集成到 `05-windows-environment-hooks.mdc`
- ✅ **project-standards-compliance.kiro.hook** → 集成到 `05-windows-environment-hooks.mdc`
- ✅ **work-quality-assurance.kiro.hook** → 转换为 `09-work-quality-assurance.mdc`
- ✅ **post-work-quality-validation.kiro.hook** → 集成到 `09-work-quality-assurance.mdc`
- ✅ **mcp-tools-guidance.kiro.hook** → 转换为 `03-mcp-tools-integration.mdc`

### 特殊优化
- ✅ **Linux Ubuntu生产环境适配** - CI/CD规范已专门针对Ubuntu优化
- ✅ **MCP工具强制使用** - 所有规范都要求充分使用MCP工具
- ✅ **全局一致性保证** - 通过统一项目规范确保各规范间的一致性

## 🎯 质量保证特性

### 强制执行机制
1. **技术栈一致性**: 严格遵循指定技术栈，禁止擅自更改
2. **MCP工具强制使用**: 每个开发阶段必须使用对应MCP工具
3. **质量门禁**: 代码质量≥90%，测试覆盖率≥85%，安全漏洞=0
4. **真实环境**: 禁止使用模拟数据和服务
5. **全局一致性**: 所有规范必须与统一标准一致

### 覆盖的开发流程
- ✅ **工作前分析**: MCP工具可用性、历史经验、架构一致性检查
- ✅ **开发过程**: 实时质量监控、代码审查、性能优化
- ✅ **工作后验证**: 功能完整性、性能验证、安全验证、部署就绪

## 📈 规范文件使用指南

### 快速开始
1. 阅读 `00-unified-project-standards.mdc` 了解总体规范
2. 根据开发任务查阅对应的专门规范文件
3. 确保MCP工具可用性（参考 `03-mcp-tools-integration.mdc`）
4. 遵循质量保证流程（参考 `09-work-quality-assurance.mdc`）

### 规范优先级
1. `00-unified-project-standards.mdc` - 最高优先级，如有冲突以此为准
2. 各专门规范文件 - 具体领域的详细标准
3. 原始`.kiro`文档 - 参考和背景信息

### 更新维护
- 新增规范必须先检查是否与现有规范冲突
- 所有规范变更必须同步更新到对应的`.mdc`文件
- 禁止创建重复或冲突的规范文件

---

## ✅ 完成状态

**状态**: ✅ **已完成**

根据用户要求，我们已经成功：
1. ✅ 梳理了全局Markdown内容
2. ✅ 整合了`.kiro`路径下的所有内容
3. ✅ 转换了其他重要MD文档
4. ✅ 基于现有项目架构进行了优化
5. ✅ 将所有开发规范写入了`.mdc`文件
6. ✅ 设置了开发钩子规范
7. ✅ 确保了高质量的CI/CD流程
8. ✅ 适配了Linux Ubuntu生产环境

**总计创建文件**: 12个 `.mdc` 规范文件 + 1个 README.md

所有规范文件都已正确设置metadata并可被Cursor AI助手自动应用。
