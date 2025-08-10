---
alwaysApply: true
---

# ZK-Agent 智能体约束规范

## 🎯 核心约束原则

基于项目实际情况和代码规范，对所有智能体（AI助手）进行严格约束，确保代码质量和项目一致性。

### 强制执行级别
- **CRITICAL**: 违反将导致代码拒绝
- **HIGH**: 必须修复才能合并
- **MEDIUM**: 建议修复，影响代码质量
- **LOW**: 优化建议

## 📋 TypeScript 代码约束 (CRITICAL)

### 类型安全强制要求
```typescript
// ✅ 强制要求：严格类型定义
interface UserProfile {
  readonly id: string;
  name: string;
  email: string;
  avatar?: string;
  preferences: UserPreferences;
  createdAt: Date;
  updatedAt: Date;
}

// ✅ 强制要求：函数必须有完整类型注解
async function fetchUserProfile(
  userId: string,
  options?: FetchOptions
): Promise<UserProfile | null> {
  // 实现代码
}

// ❌ 禁止：使用 any 类型
function processData(data: any): any { // 违反约束
  return data;
}

// ❌ 禁止：缺少返回类型
function calculateScore(input) { // 违反约束
  return input * 2;
}
```

### 项目特定约束
```typescript
// ✅ 强制要求：钩子类必须继承 BaseHook
export class CustomHook extends BaseHook {
  public readonly id = 'custom-hook';
  public readonly name = '自定义钩子';
  public readonly description = '钩子描述';
  public readonly triggers: HookTrigger[] = [
    {
      event: 'file.edit',
      patterns: ['**/*.ts']
    }
  ];

  public async execute(context: HookContext): Promise<HookResult> {
    // 实现代码
  }
}

// ❌ 禁止：直接实现 Hook 接口
export class BadHook implements Hook { // 违反约束
  // 实现代码
}
```

### 导入导出约束
```typescript
// ✅ 强制要求：使用绝对导入路径
import { BaseHook } from './core/base-hook.js';
import { HookContext, HookResult } from './types/index.js';

// ✅ 强制要求：显式导出类型
export type { HookEvent, HookContext, HookResult };
export { BaseHook, HookManagerImpl };

// ❌ 禁止：相对导入超过2级
import { BaseHook } from '../../../core/base-hook.js'; // 违反约束

// ❌ 禁止：默认导出复杂对象
export default { // 违反约束
  hook1: new Hook1(),
  hook2: new Hook2()
};
```

## 🐍 Python 代码约束 (CRITICAL)

### 类型注解强制要求
```python
# ✅ 强制要求：所有函数必须有类型注解
from typing import Dict, List, Optional, Union, Any
from dataclasses import dataclass

@dataclass
class ProcessingResult:
    success: bool
    data: Dict[str, Any]
    errors: List[str]

async def process_user_data(
    user_id: str,
    data: Dict[str, Any],
    options: Optional[ProcessingOptions] = None
) -> ProcessingResult:
    """处理用户数据并返回结果"""
    # 实现代码

# ❌ 禁止：缺少类型注解
def process_data(user_id, data, options=None): # 违反约束
    return {"success": True}
```

### 异常处理约束
```python
# ✅ 强制要求：完善的异常处理
async def fetch_user_profile(user_id: str) -> Optional[UserProfile]:
    """异步获取用户档案信息"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"/users/{user_id}")
            response.raise_for_status()
            return UserProfile(**response.json())
    except httpx.HTTPError as e:
        logger.error(f"获取用户档案失败: {user_id}, 错误: {str(e)}")
        return None
    except Exception as e:
        logger.error(f"未知错误: {str(e)}")
        raise ProcessingError(f"处理失败: {str(e)}") from e

# ❌ 禁止：裸露的异常处理
def risky_function():
    try:
        # 危险操作
        pass
    except:  # 违反约束：裸露的except
        pass
```

## 🏗️ 架构约束 (HIGH)

### 目录结构约束
```
✅ 强制要求的目录结构：
.kiro/hooks/
├── core/                    # 核心组件
│   ├── base-hook.ts        # 基类
│   ├── hook-manager.ts     # 管理器
│   └── mcp-tools-manager.ts # MCP工具管理
├── types/                   # 类型定义
│   └── index.ts            # 统一导出
├── config/                  # 配置文件
│   └── hooks-config.json   # 钩子配置
├── *.kiro.hook             # 具体钩子实现
└── index.ts                # 统一入口

❌ 禁止的目录结构：
.kiro/hooks/
├── utils/                  # 违反约束：应使用core/
├── helpers/                # 违反约束：功能不明确
└── misc/                   # 违反约束：杂项目录
```

### 文件命名约束
```typescript
// ✅ 强制要求：钩子文件命名规范
development-workflow-enhancement.kiro.hook
project-standards-compliance.kiro.hook
mcp-tools-guidance.kiro.hook

// ✅ 强制要求：核心文件命名规范
base-hook.ts                // kebab-case
hook-manager.ts            // kebab-case
mcp-tools-manager.ts       // kebab-case

// ❌ 禁止：不规范的文件命名
BaseHook.ts                // 违反约束：PascalCase
hookManager.ts             // 违反约束：camelCase
hook_manager.ts            // 违反约束：snake_case
```

## 🔧 MCP 工具集成约束 (HIGH)

### 强制使用 MCP 工具
```typescript
// ✅ 强制要求：通过 MCPToolsManager 调用工具
export class MyHook extends BaseHook {
  private async executeAnalysis(files: string[]): Promise<any> {
    // 必须检查工具可用性
    const isAvailable = await mcpToolsManager.isSerenaAvailable();
    if (!isAvailable) {
      throw this.createError(
        HookErrorType.MCP_TOOL_UNAVAILABLE,
        'Serena工具不可用'
      );
    }

    // 必须通过管理器调用
    const result = await mcpToolsManager.callTool('serena', 'analyze', {
      files: files
    });

    return result;
  }
}

// ❌ 禁止：直接调用外部API
export class BadHook extends BaseHook {
  private async executeAnalysis(files: string[]): Promise<any> {
    // 违反约束：绕过MCP工具管理器
    const response = await fetch('http://external-api/analyze');
    return response.json();
  }
}
```

### MCP 工具错误处理约束
```typescript
// ✅ 强制要求：标准化的MCP工具错误处理
private async callMCPToolSafely(
  toolName: string,
  method: string,
  params?: any
): Promise<MCPToolResult> {
  try {
    const result = await mcpToolsManager.callTool(toolName, method, params);
    
    if (!result.success) {
      throw this.createError(
        HookErrorType.MCP_TOOL_UNAVAILABLE,
        `MCP工具调用失败: ${result.error}`
      );
    }
    
    return result;
  } catch (error) {
    this.logError(`MCP工具调用异常: ${toolName}.${method}`, error);
    throw error;
  }
}

// ❌ 禁止：忽略MCP工具错误
private async badMCPCall(): Promise<any> {
  try {
    return await mcpToolsManager.callTool('serena', 'analyze');
  } catch {
    return {}; // 违反约束：忽略错误
  }
}
```

## 📝 文档和注释约束 (MEDIUM)

### JSDoc 注释要求
```typescript
/**
 * 处理用户数据的复杂函数
 * 
 * 该函数执行多步骤的数据处理流程，包括验证、转换和存储
 * 
 * @param userId - 用户唯一标识符
 * @param data - 待处理的用户数据对象
 * @param options - 可选的处理配置参数
 * @returns Promise<ProcessingResult> - 处理结果对象
 * 
 * @throws {ValidationError} 当输入数据验证失败时抛出
 * @throws {ProcessingError} 当数据处理过程中发生错误时抛出
 * 
 * @example
 * ```typescript
 * const result = await processUserData('user-123', {
 *   name: '张三',
 *   email: 'zhangsan@example.com'
 * });
 * 
 * if (result.success) {
 *   console.log('处理成功:', result.data);
 * }
 * ```
 * 
 * @since 1.0.0
 * @see {@link UserProfile} 用户档案接口定义
 */
async function processUserData(
  userId: string,
  data: UserData,
  options?: ProcessingOptions
): Promise<ProcessingResult> {
  // 实现代码
}
```

### 类和接口注释要求
```typescript
/**
 * 钩子执行上下文接口
 * 
 * 包含钩子执行时需要的所有上下文信息，包括触发事件、
 * 相关文件列表、元数据和时间戳等
 * 
 * @interface HookContext
 * @since 1.0.0
 */
export interface HookContext {
  /** 触发事件类型 */
  event: HookEvent;
  
  /** 相关文件列表 */
  files: string[];
  
  /** 
   * 元数据对象
   * 包含额外的上下文信息，如编辑器类型、分支信息等
   */
  metadata: Record<string, any>;
  
  /** 事件触发时间戳 */
  timestamp: Date;
}
```

## 🧪 测试约束 (HIGH)

### 测试文件结构约束
```typescript
// ✅ 强制要求：测试文件命名和结构
// 文件: base-hook.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BaseHook } from '../core/base-hook.js';
import { HookContext, HookResult } from '../types/index.js';

class TestHook extends BaseHook {
  public readonly id = 'test-hook';
  public readonly name = '测试钩子';
  public readonly description = '用于测试的钩子';
  public readonly triggers = [];

  public async execute(context: HookContext): Promise<HookResult> {
    return this.createSuccessResult('测试成功');
  }
}

describe('BaseHook', () => {
  let hook: TestHook;

  beforeEach(() => {
    hook = new TestHook();
  });

  afterEach(() => {
    // 清理代码
  });

  describe('execute', () => {
    it('应该成功执行钩子', async () => {
      // Given
      const context: HookContext = {
        event: 'file.edit',
        files: ['test.ts'],
        metadata: {},
        timestamp: new Date()
      };

      // When
      const result = await hook.execute(context);

      // Then
      expect(result.success).toBe(true);
      expect(result.message).toBe('测试成功');
    });
  });
});

// ❌ 禁止：不规范的测试结构
test('hook works', () => { // 违反约束：缺少describe分组
  // 测试代码
});
```

### 测试覆盖率约束
```typescript
// ✅ 强制要求：关键路径必须有测试覆盖
export class CriticalHook extends BaseHook {
  // 关键方法必须有对应测试
  public async execute(context: HookContext): Promise<HookResult> {
    // 实现代码
  }

  // 错误处理路径必须有测试覆盖
  protected handleError(error: Error): HookResult {
    // 实现代码
  }

  // 私有方法如果包含复杂逻辑，建议通过公共方法测试
  private complexLogic(): boolean {
    // 复杂逻辑
  }
}
```

## 🔒 安全约束 (CRITICAL)

### 敏感信息处理约束
```typescript
// ✅ 强制要求：敏感信息使用环境变量
const config = {
  apiKey: process.env.MCP_API_KEY,
  secretKey: process.env.SECRET_KEY,
  databaseUrl: process.env.DATABASE_URL
};

// ❌ 禁止：硬编码敏感信息
const badConfig = {
  apiKey: 'sk-1234567890abcdef', // 违反约束
  password: 'admin123',          // 违反约束
  token: 'bearer-token-here'     // 违反约束
};
```

### 输入验证约束
```typescript
// ✅ 强制要求：所有外部输入必须验证
export class SecureHook extends BaseHook {
  public async execute(context: HookContext): Promise<HookResult> {
    // 验证上下文
    if (!this.validateContext(context)) {
      return this.createFailureResult('无效的执行上下文');
    }

    // 验证文件路径
    const validFiles = context.files.filter(file => 
      this.isValidFilePath(file)
    );

    if (validFiles.length === 0) {
      return this.createFailureResult('没有有效的文件路径');
    }

    // 处理验证后的数据
    return this.processValidatedData(validFiles);
  }

  private isValidFilePath(filePath: string): boolean {
    // 路径验证逻辑
    return !filePath.includes('..') && 
           !filePath.startsWith('/') &&
           filePath.length < 260; // Windows路径长度限制
  }
}
```

## 🚀 性能约束 (MEDIUM)

### 异步操作约束
```typescript
// ✅ 强制要求：IO操作必须异步
export class PerformantHook extends BaseHook {
  public async execute(context: HookContext): Promise<HookResult> {
    // 并发处理多个文件
    const results = await Promise.allSettled(
      context.files.map(file => this.processFile(file))
    );

    // 处理结果
    const successful = results
      .filter(result => result.status === 'fulfilled')
      .map(result => (result as PromiseFulfilledResult<any>).value);

    return this.createSuccessResult('处理完成', { successful });
  }

  private async processFile(filePath: string): Promise<any> {
    // 异步文件处理
    return new Promise(resolve => {
      // 处理逻辑
      resolve({ filePath, processed: true });
    });
  }
}

// ❌ 禁止：同步IO操作
export class SlowHook extends BaseHook {
  public async execute(context: HookContext): Promise<HookResult> {
    // 违反约束：同步文件操作
    const fs = require('fs');
    const content = fs.readFileSync('large-file.txt', 'utf8');
    
    return this.createSuccessResult('处理完成');
  }
}
```

### 内存管理约束
```typescript
// ✅ 强制要求：大数据处理使用流式处理
export class MemoryEfficientHook extends BaseHook {
  public async execute(context: HookContext): Promise<HookResult> {
    // 分批处理大量文件
    const batchSize = 10;
    const batches = this.chunkArray(context.files, batchSize);

    for (const batch of batches) {
      await this.processBatch(batch);
      // 允许垃圾回收
      await this.delay(10);
    }

    return this.createSuccessResult('批量处理完成');
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}
```

## 🪟 Windows 环境约束 (HIGH)

### 路径处理约束
```typescript
// ✅ 强制要求：跨平台路径处理
import path from 'path';
import os from 'os';

export class WindowsCompatibleHook extends BaseHook {
  private normalizePath(inputPath: string): string {
    return path.normalize(inputPath).replace(/\\/g, '/');
  }

  private getSafeFilePath(basePath: string, fileName: string): string {
    // Windows文件名字符限制
    const safeName = fileName.replace(/[<>:"|?*]/g, '_');
    return path.join(basePath, safeName);
  }

  private handleLongPath(inputPath: string): string {
    // Windows长路径处理
    if (process.platform === 'win32' && inputPath.length > 260) {
      return `\\\\?\\${path.resolve(inputPath)}`;
    }
    return inputPath;
  }
}

// ❌ 禁止：硬编码Unix路径
export class UnixOnlyHook extends BaseHook {
  public async execute(context: HookContext): Promise<HookResult> {
    // 违反约束：硬编码Unix路径分隔符
    const configPath = '/home/user/.config/app.json';
    const logPath = '/var/log/app.log';
    
    return this.createSuccessResult('处理完成');
  }
}
```

## 📊 质量门禁约束 (CRITICAL)

### 代码质量检查点
```json
{
  "qualityGates": {
    "typescript": {
      "noAnyType": true,
      "strictMode": true,
      "noUnusedVariables": true,
      "noImplicitReturns": true
    },
    "testing": {
      "unitTestCoverage": 80,
      "integrationTestCoverage": 60,
      "criticalPathCoverage": 90
    },
    "security": {
      "noHardcodedSecrets": true,
      "inputValidation": true,
      "errorHandling": true
    },
    "performance": {
      "asyncIO": true,
      "memoryEfficient": true,
      "batchProcessing": true
    }
  }
}
```

### 自动化检查脚本
```powershell
# Windows PowerShell 质量检查脚本
param([string]$ProjectPath)

Write-Output "🔍 执行代码质量检查..."

# TypeScript 类型检查
Write-Output "检查 TypeScript 类型..."
npx tsc --noEmit --strict

# ESLint 检查
Write-Output "执行 ESLint 检查..."
npx eslint "**/*.ts" --max-warnings 0

# 测试覆盖率检查
Write-Output "检查测试覆盖率..."
npm run test:coverage

# 安全扫描
Write-Output "执行安全扫描..."
npm audit --audit-level moderate

Write-Output "✅ 质量检查完成"
```

## 🚫 严格禁止项 (CRITICAL)

### 绝对禁止的代码模式
```typescript
// ❌ 绝对禁止：使用 any 类型
function badFunction(data: any): any {
  return data;
}

// ❌ 绝对禁止：忽略 Promise 错误
async function badAsyncFunction() {
  someAsyncOperation(); // 缺少 await 和错误处理
}

// ❌ 绝对禁止：硬编码敏感信息
const API_KEY = 'sk-1234567890abcdef';

// ❌ 绝对禁止：使用 eval 或类似危险函数
const result = eval(userInput);

// ❌ 绝对禁止：直接修改原型
Array.prototype.customMethod = function() {};

// ❌ 绝对禁止：使用 var 声明
var globalVariable = 'bad';

// ❌ 绝对禁止：不处理异常
try {
  riskyOperation();
} catch {
  // 空的 catch 块
}
```

### 架构层面禁止项
```typescript
// ❌ 绝对禁止：绕过 BaseHook 基类
export class DirectHook implements Hook {
  // 违反架构约束
}

// ❌ 绝对禁止：直接访问外部API
export class BadAPIHook extends BaseHook {
  async execute() {
    // 违反约束：绕过MCP工具管理器
    const response = await fetch('https://external-api.com');
    return response.json();
  }
}

// ❌ 绝对禁止：创建重复功能
export class DuplicateHook extends BaseHook {
  // 违反约束：与现有钩子功能重复
}
```

## 📈 持续改进约束

### 代码审查检查清单
- [ ] 所有函数都有完整的类型注解
- [ ] 所有异步操作都有错误处理
- [ ] 所有外部输入都经过验证
- [ ] 没有硬编码的敏感信息
- [ ] 遵循项目的命名规范
- [ ] 包含必要的单元测试
- [ ] 文档注释完整且准确
- [ ] 符合Windows环境兼容性要求
- [ ] 通过所有质量门禁检查

### 违规处理流程
1. **CRITICAL违规**: 立即拒绝，必须修复后重新提交
2. **HIGH违规**: 阻塞合并，需要修复确认
3. **MEDIUM违规**: 警告提示，建议修复
4. **LOW违规**: 记录日志，后续优化

---

**重要提醒**: 本约束规范是项目代码质量的最后防线，所有智能体生成的代码都必须严格遵循。违反约束的代码将被自动拒绝或要求修改。