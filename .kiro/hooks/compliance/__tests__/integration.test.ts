/**
 * 合规检查系统集成测试
 * 
 * 测试整个合规检查流程的端到端功能
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { ProjectStandardsComplianceHook } from '../project-standards-compliance-hook.js';
import { mcpToolsManager } from '../../core/mcp-tools-manager.js';
import { HookContext, MCPToolResult } from '../../types/index.js';

// Mock MCP工具管理器
vi.mock('../../core/mcp-tools-manager.js', () => ({
  mcpToolsManager: {
    callTool: vi.fn()
  }
}));

describe('合规检查系统集成测试', () => {
  let hook: ProjectStandardsComplianceHook;
  let mockCallTool: Mock;

  beforeEach(() => {
    hook = new ProjectStandardsComplianceHook();
    mockCallTool = mcpToolsManager.callTool as Mock;
    mockCallTool.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('完整的合规检查流程', () => {
    it('应该执行完整的合规检查并通过质量门禁', async () => {
      // Given - 模拟一个典型的项目文件列表
      const context: HookContext = {
        event: 'git.beforeCommit',
        files: [
          'src/utils.py',
          'src/utils.test.py',
          'src/components/Button.tsx',
          'src/components/Button.test.tsx',
          'src/auth/login.ts',
          'package.json',
          'scripts/deploy.ps1',
          'README.md'
        ],
        metadata: {},
        timestamp: new Date(),
        workingDirectory: '/project'
      };

      // Mock所有MCP工具调用返回良好的结果
      mockCallTool.mockImplementation((tool: string, method: string) => {
        const baseResult = {
          success: true,
          data: {},
          executionTime: 100
        } as MCPToolResult;

        switch (method) {
          // Python检查
          case 'style_check':
            return Promise.resolve({
              ...baseResult,
              data: { issues: [] } // 无风格问题
            });
          case 'complexity_check':
            return Promise.resolve({
              ...baseResult,
              data: { violations: [] } // 无复杂度问题
            });
          case 'type_annotation_check':
            return Promise.resolve({
              ...baseResult,
              data: { missing: [] } // 类型注解完整
            });

          // TypeScript检查
          case 'eslint_check':
            return Promise.resolve({
              ...baseResult,
              data: { issues: [] } // 无ESLint问题
            });
          case 'typescript_strict_check':
            return Promise.resolve({
              ...baseResult,
              data: { issues: [] } // 严格模式正常
            });
          case 'any_type_check':
            return Promise.resolve({
              ...baseResult,
              data: { usages: [] } // 无any类型使用
            });

          // 测试检查
          case 'test_coverage':
            return Promise.resolve({
              ...baseResult,
              data: {
                percentage: 90, // 高覆盖率
                unitTestCoverage: 85,
                integrationTestCoverage: 70
              }
            });
          case 'test_run':
            return Promise.resolve({
              ...baseResult,
              data: {
                success: true,
                failedCount: 0,
                failedTests: []
              }
            });
          case 'test_quality_check':
            return Promise.resolve({
              ...baseResult,
              data: { issues: [] } // 测试质量良好
            });

          // 安全检查
          case 'security_scan':
            return Promise.resolve({
              ...baseResult,
              data: { vulnerabilities: [] } // 无安全漏洞
            });
          case 'secret_scan':
            return Promise.resolve({
              ...baseResult,
              data: { secrets: [] } // 无敏感信息泄露
            });
          case 'dependency_security_check':
            return Promise.resolve({
              ...baseResult,
              data: { vulnerabilities: [] } // 依赖安全
            });

          // Windows检查
          case 'path_handling_check':
            return Promise.resolve({
              ...baseResult,
              data: { issues: [] } // 路径处理正确
            });
          case 'powershell_compatibility_check':
            return Promise.resolve({
              ...baseResult,
              data: { issues: [] } // PowerShell兼容
            });
          case 'file_encoding_check':
            return Promise.resolve({
              ...baseResult,
              data: { issues: [] } // 编码正确
            });

          default:
            return Promise.resolve(baseResult);
        }
      });

      // When
      const result = await hook.execute(context);

      // Then
      expect(result.success).toBe(true);
      expect(result.message).toBe('所有合规检查通过，可以提交代码');
      
      // 验证合规结果
      const complianceResults = result.data.complianceResults;
      expect(complianceResults.pythonCompliance.passed).toBe(true);
      expect(complianceResults.typescriptCompliance.passed).toBe(true);
      expect(complianceResults.testingCompliance.passed).toBe(true);
      expect(complianceResults.securityCompliance.passed).toBe(true);
      expect(complianceResults.windowsCompliance.passed).toBe(true);

      // 验证质量门禁
      const qualityGate = result.data.qualityGateResult;
      expect(qualityGate.passed).toBe(true);
      expect(qualityGate.details.averageScore).toBeGreaterThanOrEqual(90);

      // 验证合规报告
      const report = result.data.complianceReport;
      expect(report.summary.totalChecks).toBe(5);
      expect(report.summary.passedChecks).toBe(5);
      expect(report.summary.totalIssues).toBe(0);
      expect(report.summary.averageScore).toBeGreaterThanOrEqual(90);
    });

    it('应该在发现问题时提供详细的修复建议', async () => {
      // Given - 模拟有各种问题的项目
      const context: HookContext = {
        event: 'git.beforeCommit',
        files: [
          'src/bad_code.py',
          'src/unsafe.ts',
          'package.json'
        ],
        metadata: {},
        timestamp: new Date()
      };

      // Mock MCP工具调用返回有问题的结果
      mockCallTool.mockImplementation((tool: string, method: string) => {
        switch (method) {
          case 'style_check':
            return Promise.resolve({
              success: true,
              data: {
                issues: [
                  {
                    severity: 'warning',
                    message: '行长度超过88字符',
                    file: 'src/bad_code.py',
                    line: 10,
                    code: 'E501'
                  }
                ]
              },
              executionTime: 100
            } as MCPToolResult);

          case 'security_scan':
            return Promise.resolve({
              success: true,
              data: {
                vulnerabilities: [
                  {
                    severity: 'high',
                    description: 'SQL注入漏洞',
                    file: 'src/unsafe.ts',
                    line: 25,
                    id: 'CWE-89',
                    recommendation: '使用参数化查询'
                  }
                ]
              },
              executionTime: 150
            } as MCPToolResult);

          case 'test_coverage':
            return Promise.resolve({
              success: true,
              data: {
                percentage: 60, // 低覆盖率
                unitTestCoverage: 50,
                integrationTestCoverage: 30
              },
              executionTime: 200
            } as MCPToolResult);

          case 'secret_scan':
            return Promise.resolve({
              success: true,
              data: {
                secrets: [
                  {
                    type: 'API密钥',
                    file: 'src/unsafe.ts',
                    line: 5
                  }
                ]
              },
              executionTime: 80
            } as MCPToolResult);

          default:
            return Promise.resolve({
              success: true,
              data: {},
              executionTime: 50
            } as MCPToolResult);
        }
      });

      // When
      const result = await hook.execute(context);

      // Then
      expect(result.success).toBe(false);
      expect(result.message).toContain('合规检查未通过质量门禁');

      // 验证问题被正确识别
      const complianceResults = result.data.complianceResults;
      expect(complianceResults.pythonCompliance.issues.length).toBeGreaterThan(0);
      expect(complianceResults.securityCompliance.issues.length).toBeGreaterThan(0);
      expect(complianceResults.testingCompliance.issues.length).toBeGreaterThan(0);

      // 验证修复建议
      const recommendations = result.data.recommendations;
      expect(recommendations).toContain('运行 black 和 flake8 修复Python代码风格问题');
      expect(recommendations).toContain('立即修复发现的安全漏洞');
      expect(recommendations).toContain('提高测试覆盖率，为核心功能添加更多测试');

      // 验证下一步操作
      const nextSteps = result.data.nextSteps;
      expect(nextSteps).toContain('⚠️ 修复高危问题');
      expect(nextSteps).toContain('🔄 修复后重新运行合规检查');
    });

    it('应该正确处理混合文件类型的项目', async () => {
      // Given - 包含多种文件类型的项目
      const context: HookContext = {
        event: 'git.beforeCommit',
        files: [
          // Python文件
          'backend/api.py',
          'backend/models.py',
          'backend/tests/test_api.py',
          // TypeScript/React文件
          'frontend/src/App.tsx',
          'frontend/src/components/Header.tsx',
          'frontend/src/utils/helpers.ts',
          'frontend/src/__tests__/App.test.tsx',
          // 配置文件
          'package.json',
          'requirements.txt',
          'tsconfig.json',
          // 脚本文件
          'scripts/build.ps1',
          'scripts/deploy.sh',
          // 文档文件
          'README.md',
          'docs/api.md',
          // 应该被过滤的文件
          'node_modules/package.json',
          '.git/config',
          'dist/bundle.js'
        ],
        metadata: {},
        timestamp: new Date()
      };

      // Mock良好的检查结果
      mockCallTool.mockResolvedValue({
        success: true,
        data: {},
        executionTime: 100
      } as MCPToolResult);

      // When
      const result = await hook.execute(context);

      // Then
      expect(result.success).toBe(true);

      // 验证文件过滤正确工作
      const filteredFiles = context.files.filter(file => 
        !file.includes('node_modules/') && 
        !file.includes('.git/') && 
        !file.includes('dist/')
      );

      // 验证所有检查都被执行
      expect(mockCallTool).toHaveBeenCalledWith('serena', 'style_check', 
        expect.objectContaining({
          files: expect.arrayContaining(['backend/api.py', 'backend/models.py'])
        })
      );

      expect(mockCallTool).toHaveBeenCalledWith('serena', 'eslint_check',
        expect.objectContaining({
          files: expect.arrayContaining([
            'frontend/src/App.tsx',
            'frontend/src/components/Header.tsx',
            'frontend/src/utils/helpers.ts'
          ])
        })
      );

      expect(mockCallTool).toHaveBeenCalledWith('serena', 'powershell_compatibility_check',
        expect.objectContaining({
          files: ['scripts/build.ps1']
        })
      );
    });

    it('应该支持自定义配置', async () => {
      // Given - 创建带自定义配置的钩子
      const customHook = new ProjectStandardsComplianceHook();
      (customHook as any).config = {
        parameters: {
          complianceConfig: {
            python: {
              enabled: true,
              maxComplexity: 15, // 自定义复杂度限制
              maxLineLength: 120 // 自定义行长度
            },
            testing: {
              enabled: true,
              minCoverageRate: 70, // 降低覆盖率要求
              runTests: false // 禁用测试运行
            },
            security: {
              enabled: false // 禁用安全检查
            },
            qualityGate: {
              minOverallScore: 80, // 降低评分要求
              allowHighIssues: true // 允许高危问题
            }
          }
        }
      };

      const context: HookContext = {
        event: 'git.beforeCommit',
        files: ['src/test.py'],
        metadata: {},
        timestamp: new Date()
      };

      mockCallTool.mockResolvedValue({
        success: true,
        data: {},
        executionTime: 100
      } as MCPToolResult);

      // When
      const result = await customHook.execute(context);

      // Then
      expect(result.success).toBe(true);

      // 验证自定义配置被使用
      expect(mockCallTool).toHaveBeenCalledWith('serena', 'complexity_check',
        expect.objectContaining({
          maxComplexity: 15
        })
      );

      expect(mockCallTool).toHaveBeenCalledWith('serena', 'style_check',
        expect.objectContaining({
          maxLineLength: 120
        })
      );

      // 验证测试运行被跳过
      expect(mockCallTool).not.toHaveBeenCalledWith('serena', 'test_run', expect.any(Object));

      // 验证安全检查被跳过
      expect(result.data.complianceResults.securityCompliance.checkType).toBe('跳过检查');
    });
  });

  describe('错误恢复和容错性', () => {
    it('应该在部分检查失败时继续执行其他检查', async () => {
      // Given
      const context: HookContext = {
        event: 'git.beforeCommit',
        files: ['src/test.py', 'src/test.ts'],
        metadata: {},
        timestamp: new Date()
      };

      // Mock部分检查失败
      mockCallTool.mockImplementation((tool: string, method: string) => {
        if (method === 'style_check') {
          return Promise.reject(new Error('Python检查工具不可用'));
        }
        if (method === 'eslint_check') {
          return Promise.resolve({
            success: true,
            data: { issues: [] },
            executionTime: 100
          } as MCPToolResult);
        }
        return Promise.resolve({
          success: true,
          data: {},
          executionTime: 100
        } as MCPToolResult);
      });

      // When
      const result = await hook.execute(context);

      // Then
      expect(result.success).toBe(true); // 整体仍然成功

      // 验证Python检查记录了错误
      expect(result.data.complianceResults.pythonCompliance.checkType).toBe('检查错误');
      expect(result.data.complianceResults.pythonCompliance.issues[0].category).toBe('检查错误');

      // 验证TypeScript检查正常执行
      expect(result.data.complianceResults.typescriptCompliance.passed).toBe(true);
    });

    it('应该在MCP工具完全不可用时提供降级方案', async () => {
      // Given
      const context: HookContext = {
        event: 'git.beforeCommit',
        files: ['src/test.py'],
        metadata: {},
        timestamp: new Date()
      };

      // Mock所有MCP工具调用失败
      mockCallTool.mockRejectedValue(new Error('MCP服务不可用'));

      // When
      const result = await hook.execute(context);

      // Then
      expect(result.success).toBe(true); // 应该提供降级方案

      // 验证所有检查都记录了错误但不阻止流程
      Object.values(result.data.complianceResults).forEach((complianceResult: any) => {
        expect(complianceResult.checkType).toBe('检查错误');
      });

      // 验证提供了手动检查建议
      expect(result.data.recommendations).toContain('请手动执行相关检查');
    });
  });

  describe('性能和资源管理', () => {
    it('应该在合理时间内完成检查', async () => {
      // Given
      const context: HookContext = {
        event: 'git.beforeCommit',
        files: Array.from({ length: 50 }, (_, i) => `src/file${i}.ts`), // 大量文件
        metadata: {},
        timestamp: new Date()
      };

      mockCallTool.mockResolvedValue({
        success: true,
        data: {},
        executionTime: 100
      } as MCPToolResult);

      // When
      const startTime = Date.now();
      const result = await hook.execute(context);
      const executionTime = Date.now() - startTime;

      // Then
      expect(result.success).toBe(true);
      expect(executionTime).toBeLessThan(30000); // 应该在30秒内完成
      expect(result.executionTime).toBeDefined();
    });
  });
});