# 工作质量保证模块

这个模块实现了完整的工作质量保证系统，包括工作前分析、实时监控和质量门禁检查。

## 模块结构

```
quality-assurance/
├── README.md                           # 本文件
├── quality-assurance-engine.ts         # 质量保证分析引擎
├── quality-metrics.ts                  # 质量度量和报告系统
├── work-quality-assurance-hook.ts      # 工作质量保证钩子
└── __tests__/                          # 测试文件
    ├── quality-assurance-engine.test.ts
    ├── quality-metrics.test.ts
    ├── work-quality-assurance-hook.test.ts
    └── integration.test.ts
```

## 核心组件

### 1. QualityAssuranceEngine (质量保证分析引擎)

负责执行工作前质量分析，包括：

- **技术栈一致性检查**: 检测项目使用的技术栈并验证文件一致性
- **代码质量预检查**: 执行代码风格、复杂度和质量检查
- **实时质量监控**: 提供持续的质量状态监控
- **进度跟踪**: 跟踪质量改进进度

#### 主要方法

```typescript
// 执行工作前质量分析
async executePreWorkAnalysis(files: string[]): Promise<PreWorkAnalysisResult>

// 检查技术栈一致性
async checkTechStackConsistency(files: string[]): Promise<TechStackConsistencyResult>

// 执行代码质量预检查
async executeCodeQualityPreCheck(files: string[]): Promise<CodeQualityPreCheckResult>

// 启动实时监控
startRealTimeMonitoring(files: string[]): void

// 停止实时监控
stopRealTimeMonitoring(): void
```

### 2. QualityMetrics (质量度量系统)

负责收集和分析质量指标，包括：

- **质量指标收集**: 收集代码质量、测试覆盖率、架构健康等指标
- **趋势分析**: 分析质量指标的变化趋势
- **改进建议生成**: 基于质量指标生成具体的改进建议
- **仪表盘数据**: 生成质量仪表盘所需的数据

#### 主要方法

```typescript
// 收集质量指标
async collectQualityMetrics(files: string[]): Promise<QualityMetrics>

// 分析质量趋势
analyzeQualityTrends(timeRange?: number): QualityTrendAnalysis

// 生成改进建议
generateImprovementSuggestions(metrics: QualityMetrics): ImprovementSuggestion[]

// 生成仪表盘数据
async generateDashboardData(files: string[]): Promise<QualityDashboardData>
```

### 3. WorkQualityAssuranceHook (工作质量保证钩子)

主要的钩子实现，集成质量保证引擎和度量系统：

- **工作前分析**: 在工作开始前执行全面的质量分析
- **进度监控**: 在工作进行中提供实时质量监控
- **质量门禁**: 实施质量门禁检查，阻止低质量代码
- **报告生成**: 生成详细的质量报告

#### 触发事件

- `work.start`: 工作开始时触发工作前分析
- `work.progress`: 工作进行中触发进度监控

## 质量标准

### 代码质量标准

- **最低评分**: 90分
- **严格模式**: 启用 TypeScript 严格模式
- **禁止 any 类型**: 不允许使用 `any` 类型

### 测试覆盖率标准

- **单元测试**: 80%
- **集成测试**: 60%
- **关键路径**: 90%

### 性能标准

- **API 响应时间**: < 2000ms
- **页面加载时间**: < 3000ms
- **内存使用率**: < 80%
- **CPU 使用率**: < 70%

### 安全标准

- **严重漏洞**: 0个
- **高危漏洞**: 0个
- **中危漏洞**: ≤ 2个

## 使用示例

### 基本使用

```typescript
import { WorkQualityAssuranceHook } from './work-quality-assurance-hook.js';
import { MCPToolsManager } from '../core/mcp-tools-manager.js';

// 创建钩子实例
const mcpTools = new MCPToolsManager();
const hook = new WorkQualityAssuranceHook(mcpTools);

// 执行工作前分析
const context = {
  event: 'work.start',
  files: ['src/component.tsx', 'src/utils.ts'],
  metadata: {},
  timestamp: new Date()
};

const result = await hook.execute(context);
console.log('质量分析结果:', result);
```

### 自定义配置

```typescript
const customConfig = {
  enabled: true,
  priority: 1,
  timeout: 30000,
  retryCount: 2,
  conditions: [],
  parameters: {
    qualityThresholds: {
      minimumScore: 95,
      testCoverage: 90,
      codeComplexity: 5,
      technicalDebt: 10
    }
  }
};

const hook = new WorkQualityAssuranceHook(mcpTools, customConfig);
```

### 质量监控

```typescript
import { QualityAssuranceEngine } from './quality-assurance-engine.js';

const engine = new QualityAssuranceEngine(mcpTools);

// 启动实时监控
engine.startRealTimeMonitoring(['src/**/*.ts']);

// 获取监控状态
const status = engine.getCurrentQualityStatus();
console.log('当前质量状态:', status);

// 获取监控历史
const history = engine.getMonitoringHistory();
console.log('质量历史数据:', history);
```

### 质量指标分析

```typescript
import { QualityMetrics } from './quality-metrics.js';

const metrics = new QualityMetrics(mcpTools);

// 收集质量指标
const qualityData = await metrics.collectQualityMetrics(['src/**/*.ts']);

// 分析趋势
const trends = metrics.analyzeQualityTrends(24); // 最近24小时

// 生成改进建议
const suggestions = metrics.generateImprovementSuggestions(qualityData);

// 生成仪表盘数据
const dashboard = await metrics.generateDashboardData(['src/**/*.ts']);
```

## 质量门禁规则

### 阻塞条件

以下情况会阻止工作继续：

1. **安全漏洞**: 存在任何安全漏洞
2. **综合评分过低**: 低于最低要求评分10分以上
3. **测试覆盖率过低**: 低于要求覆盖率20%以上
4. **严重质量风险**: 风险等级为 `critical`

### 警告条件

以下情况会发出警告但不阻止工作：

1. **评分略低**: 低于要求但在可接受范围内
2. **性能回归**: 轻微的性能回归
3. **技术债务**: 技术债务评分超过阈值

## 错误处理

模块具有完善的错误处理机制：

- **MCP 工具不可用**: 提供降级服务或明确错误提示
- **网络超时**: 自动重试和超时处理
- **数据异常**: 数据验证和异常恢复
- **并发冲突**: 并发安全和资源管理

## 性能优化

- **并行处理**: 多个检查项并行执行
- **缓存机制**: 缓存重复计算结果
- **增量分析**: 只分析变更的文件
- **资源管理**: 自动清理过期数据

## 测试覆盖

模块包含完整的测试套件：

- **单元测试**: 测试各个组件的独立功能
- **集成测试**: 测试组件间的协作
- **性能测试**: 验证性能要求
- **错误处理测试**: 验证错误恢复能力

运行测试：

```bash
npm test quality-assurance
```

## 配置文件

质量保证相关配置在 `config/hooks-config.json` 中：

```json
{
  "hooks": {
    "work-quality-assurance": {
      "enabled": true,
      "priority": 3,
      "timeout": 45000,
      "retryCount": 2,
      "parameters": {
        "qualityThresholds": {
          "minimumScore": 90,
          "testCoverage": 85,
          "codeComplexity": 10,
          "technicalDebt": 20
        }
      }
    }
  }
}
```

## 扩展和定制

模块设计为可扩展的：

1. **自定义质量检查器**: 实现新的质量检查逻辑
2. **自定义度量指标**: 添加项目特定的质量指标
3. **自定义改进建议**: 实现智能的改进建议生成
4. **自定义报告格式**: 定制质量报告的格式和内容

## 最佳实践

1. **定期设置基线**: 为项目设置质量基线
2. **监控趋势变化**: 关注质量指标的趋势变化
3. **及时处理建议**: 优先处理高优先级的改进建议
4. **持续优化阈值**: 根据项目情况调整质量阈值
5. **团队协作**: 将质量保证融入团队工作流程