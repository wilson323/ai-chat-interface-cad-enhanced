# Kiro Hooks 合规检查系统

## 概述

Kiro Hooks 合规检查系统是一个全面的代码质量保证工具，在Git提交前自动执行多维度的合规检查，确保代码质量和项目标准的一致性。

## 系统架构

```
合规检查系统
├── ComplianceChecker          # 代码规范检查器
│   ├── Python PEP 8检查
│   ├── TypeScript严格模式检查
│   └── 代码复杂度分析
├── TestingSecurityChecker     # 测试和安全检查器
│   ├── 测试覆盖率检查
│   ├── 安全漏洞扫描
│   └── Windows环境兼容性检查
└── ProjectStandardsComplianceHook  # 主钩子集成器
    ├── 质量门禁验证
    ├── 合规报告生成
    └── 修复建议提供
```

## 核心功能

### 1. Python 合规检查

- **PEP 8 风格检查**: 确保代码符合Python官方风格指南
- **代码复杂度分析**: 检测过于复杂的函数和方法
- **类型注解验证**: 确保函数和变量有适当的类型注解
- **异步编程检查**: 验证async/await的正确使用
- **异常处理检查**: 确保适当的异常处理机制

### 2. TypeScript 合规检查

- **ESLint 规范检查**: 执行TypeScript代码风格检查
- **严格模式验证**: 确保启用TypeScript严格模式
- **类型安全检查**: 检测any类型的使用
- **导入规范检查**: 验证import语句的组织
- **React组件结构检查**: 检查React组件的最佳实践

### 3. 测试合规检查

- **测试覆盖率分析**: 检查单元测试和集成测试覆盖率
- **测试质量评估**: 分析测试用例的质量
- **测试执行验证**: 运行测试确保所有测试通过
- **测试文件存在性检查**: 确保源文件有对应的测试文件

### 4. 安全合规检查

- **漏洞扫描**: 检测代码中的安全漏洞
- **敏感信息扫描**: 查找硬编码的密钥和敏感信息
- **依赖安全检查**: 检查第三方依赖的安全漏洞
- **输入验证检查**: 验证输入数据的安全处理
- **认证授权检查**: 检查认证和授权机制

### 5. Windows 环境合规检查

- **路径处理检查**: 确保跨平台的路径处理
- **PowerShell兼容性**: 验证PowerShell脚本兼容性
- **文件编码检查**: 确保文件使用正确的编码
- **换行符检查**: 验证换行符的一致性
- **权限处理检查**: 检查Windows权限处理

## 使用方法

### 基本使用

```typescript
import { ProjectStandardsComplianceHook } from '@/kiro/hooks/compliance';

// 创建钩子实例
const complianceHook = new ProjectStandardsComplianceHook();

// 执行合规检查
const context = {
  event: 'git.beforeCommit',
  files: ['src/utils.py', 'src/components/Button.tsx'],
  metadata: {},
  timestamp: new Date()
};

const result = await complianceHook.execute(context);

if (result.success) {
  console.log('✅ 合规检查通过，可以提交代码');
} else {
  console.log('❌ 合规检查未通过:', result.message);
  console.log('修复建议:', result.data.recommendations);
}
```

### 自定义配置

```typescript
const customConfig = {
  python: {
    enabled: true,
    maxComplexity: 15,        // 自定义复杂度限制
    maxLineLength: 120,       // 自定义行长度
    typeAnnotationCheck: true
  },
  typescript: {
    enabled: true,
    strictMode: true,
    noAnyType: true,
    eslintCheck: true
  },
  testing: {
    enabled: true,
    minCoverageRate: 80,      // 自定义覆盖率要求
    runTests: true,
    checkTestQuality: true
  },
  security: {
    enabled: true,
    scanSecrets: true,
    checkDependencies: true,
    vulnerabilityScan: true
  },
  windows: {
    enabled: true,
    checkPathHandling: true,
    checkPowerShellCompatibility: true,
    checkFileEncoding: true
  },
  qualityGate: {
    minOverallScore: 85,      // 最低评分要求
    allowCriticalIssues: false,
    allowHighIssues: false,
    maxIssuesPerCategory: 10
  }
};

// 应用自定义配置
const hook = new ProjectStandardsComplianceHook();
hook.config = {
  parameters: {
    complianceConfig: customConfig
  }
};
```

### 单独使用检查器

```typescript
import { ComplianceChecker, TestingSecurityChecker } from '@/kiro/hooks/compliance';

// 只进行Python检查
const complianceChecker = new ComplianceChecker();
const pythonResult = await complianceChecker.checkPythonCompliance(
  ['src/api.py', 'src/models.py'],
  {
    maxComplexity: 12,
    typeAnnotationCheck: true
  }
);

// 只进行安全检查
const securityChecker = new TestingSecurityChecker();
const securityResult = await securityChecker.checkSecurityCompliance(
  ['src/auth.ts', 'package.json'],
  {
    scanSecrets: true,
    vulnerabilityScan: true
  }
);
```

## 质量门禁

系统提供灵活的质量门禁机制，可以根据以下条件阻止代码提交：

- **整体评分**: 平均评分低于设定阈值
- **严重问题**: 存在critical级别的问题
- **高危问题**: 存在high级别的问题
- **问题数量**: 单个类别的问题数量超过限制

### 质量门禁配置

```typescript
const qualityGateConfig = {
  minOverallScore: 90,        // 最低平均评分
  allowCriticalIssues: false, // 不允许严重问题
  allowHighIssues: false,     // 不允许高危问题
  maxIssuesPerCategory: 5     // 每个类别最多5个问题
};
```

## 合规报告

系统会生成详细的合规报告，包含：

- **执行摘要**: 检查统计和整体评分
- **详细结果**: 每个检查的具体结果
- **问题列表**: 按严重程度排序的问题清单
- **修复建议**: 针对性的修复建议
- **下一步操作**: 具体的操作指导

### 报告示例

```json
{
  "timestamp": "2025-08-10T08:00:00.000Z",
  "summary": {
    "totalChecks": 5,
    "passedChecks": 4,
    "totalIssues": 3,
    "averageScore": 87
  },
  "details": {
    "pythonCompliance": {
      "passed": true,
      "score": 95,
      "issueCount": 0
    },
    "securityCompliance": {
      "passed": false,
      "score": 70,
      "issueCount": 2
    }
  },
  "topIssues": [
    {
      "severity": "high",
      "category": "安全漏洞",
      "description": "发现SQL注入漏洞",
      "file": "src/auth.ts",
      "line": 25,
      "suggestion": "使用参数化查询"
    }
  ]
}
```

## 错误处理

系统具有强大的错误处理和容错能力：

- **部分失败容错**: 单个检查失败不会阻止其他检查
- **MCP工具降级**: 工具不可用时提供降级方案
- **详细错误报告**: 提供具体的错误信息和修复建议
- **重试机制**: 对临时性错误进行自动重试

## 性能优化

- **并行执行**: 多个检查并行执行提高效率
- **文件过滤**: 自动过滤不需要检查的文件
- **缓存机制**: 缓存检查结果避免重复计算
- **超时控制**: 设置合理的超时时间防止阻塞

## 扩展性

系统设计具有良好的扩展性：

- **插件化架构**: 可以轻松添加新的检查器
- **配置驱动**: 通过配置文件控制检查行为
- **钩子机制**: 支持在检查过程中插入自定义逻辑
- **MCP工具集成**: 可以集成更多的外部工具

## 最佳实践

### 1. 配置建议

- 根据项目特点调整质量门禁标准
- 为不同环境设置不同的检查级别
- 定期审查和更新检查规则

### 2. 团队协作

- 建立统一的代码规范文档
- 定期进行代码质量培训
- 设置合理的质量目标和改进计划

### 3. 持续改进

- 监控检查结果趋势
- 收集团队反馈优化规则
- 定期更新工具和依赖

## 故障排除

### 常见问题

1. **MCP工具连接失败**
   - 检查MCP服务状态
   - 验证网络连接
   - 查看工具配置

2. **检查超时**
   - 增加超时时间设置
   - 减少检查文件数量
   - 优化检查规则

3. **误报问题**
   - 调整检查规则配置
   - 添加例外规则
   - 更新工具版本

### 调试模式

```typescript
// 启用详细日志
process.env.KIRO_HOOKS_DEBUG = 'true';

// 设置日志级别
process.env.KIRO_HOOKS_LOG_LEVEL = 'debug';
```

## 贡献指南

欢迎贡献代码和建议：

1. Fork 项目仓库
2. 创建功能分支
3. 编写测试用例
4. 提交 Pull Request
5. 等待代码审查

## 许可证

本项目采用 MIT 许可证，详见 LICENSE 文件。