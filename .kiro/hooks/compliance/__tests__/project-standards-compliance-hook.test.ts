/**
 * ProjectStandardsComplianceHook 单元测试
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { ProjectStandardsComplianceHook } from '../project-standards-compliance-hook.js';
import { ComplianceChecker } from '../compliance-checker.js';
import { TestingSecurityChecker } from '../testing-security-checker.js';
import { HookContext, ComplianceResult } from '../../types/index.js';

// Mock 依赖
vi.mock('../compliance-checker.js');
vi.mock('../testing-security-checker.js');

describe('ProjectStandardsComplianceHook', () => {
  let hook: ProjectStandardsComplianceHook;
  let mockComplianceChecker: jest.Mocked<ComplianceChecker>;
  let mockTestingSecurityChecker: jest.Mocked<TestingSecurityChecker>;

  beforeEach(() => {
    // 创建mock实例
    mockComplianceChecker = {
      checkPythonCompliance: vi.fn(),
      checkTypeScriptCompliance: vi.fn()
    } as any;

    mockTestingSecurityChecker = {
      checkTestingCompliance: vi.fn(),
      checkSecurityCompliance: vi.fn(),
      checkWindowsCompliance: vi.fn()
    } as any;

    // Mock构造函数
    (ComplianceChecker as any).mockImplementation(() => mockComplianceChecker);
    (TestingSecurityChecker as any).mockImplementation(() => mockTestingSecurityChecker);

    hook = new ProjectStandardsComplianceHook();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('基本属性', () => {
    it('应该有正确的钩子属性', () => {
      expect(hook.id).toBe('project-standards-compliance');
      expect(hook.name).toBe('项目标准合规检查钩子');
      expect(hook.description).toBe('提交前自动执行全面合规检查，确保代码质量和项目标准');
      expect(hook.triggers).toHaveLength(1);
      expect(hook.triggers[0].event).toBe('git.beforeCommit');
      expect(hook.triggers[0].patterns).toEqual(['**/*']);
    });
  });

  describe('execute', () => {
    let context: HookContext;

    beforeEach(() => {
      context = {
        event: 'git.beforeCommit',
        files: ['src/utils.ts', 'src/utils.test.ts', 'src/auth.py'],
        metadata: {},
        timestamp: new Date(),
        workingDirectory: '/project'
      };
    });

    it('应该在上下文验证失败时返回失败结果', async () => {
      // Given
      const invalidContext = {} as HookContext;

      // When
      const result = await hook.execute(invalidContext);

      // Then
      expect(result.success).toBe(false);
      expect(result.message).toBe('执行上下文验证失败');
    });

    it('应该在没有需要检查的文件时跳过检查', async () => {
      // Given
      context.files = ['node_modules/package.json', '.git/config'];

      // When
      const result = await hook.execute(context);

      // Then
      expect(result.success).toBe(true);
      expect(result.message).toBe('没有需要检查的文件');
      expect(result.data.skipped).toBe(true);
    });

    it('应该执行完整的合规检查流程', async () => {
      // Given
      const mockResults = {
        python: createMockComplianceResult('Python合规检查', true, 95, []),
        typescript: createMockComplianceResult('TypeScript合规检查', true, 90, []),
        testing: createMockComplianceResult('测试合规检查', true, 85, []),
        security: createMockComplianceResult('安全合规检查', true, 88, []),
        windows: createMockComplianceResult('Windows环境合规检查', true, 92, [])
      };

      mockComplianceChecker.checkPythonCompliance.mockResolvedValue(mockResults.python);
      mockComplianceChecker.checkTypeScriptCompliance.mockResolvedValue(mockResults.typescript);
      mockTestingSecurityChecker.checkTestingCompliance.mockResolvedValue(mockResults.testing);
      mockTestingSecurityChecker.checkSecurityCompliance.mockResolvedValue(mockResults.security);
      mockTestingSecurityChecker.checkWindowsCompliance.mockResolvedValue(mockResults.windows);

      // When
      const result = await hook.execute(context);

      // Then
      expect(result.success).toBe(true);
      expect(result.message).toBe('所有合规检查通过，可以提交代码');
      
      // 验证所有检查都被调用
      expect(mockComplianceChecker.checkPythonCompliance).toHaveBeenCalledWith(
        context.files,
        expect.any(Object)
      );
      expect(mockComplianceChecker.checkTypeScriptCompliance).toHaveBeenCalledWith(
        context.files,
        expect.any(Object)
      );
      expect(mockTestingSecurityChecker.checkTestingCompliance).toHaveBeenCalledWith(
        context.files,
        expect.any(Object)
      );
      expect(mockTestingSecurityChecker.checkSecurityCompliance).toHaveBeenCalledWith(
        context.files,
        expect.any(Object)
      );
      expect(mockTestingSecurityChecker.checkWindowsCompliance).toHaveBeenCalledWith(
        context.files,
        expect.any(Object)
      );

      // 验证结果数据
      expect(result.data.complianceResults).toBeDefined();
      expect(result.data.complianceReport).toBeDefined();
      expect(result.data.qualityGateResult).toBeDefined();
      expect(result.data.summary).toBeDefined();
    });

    it('应该在质量门禁未通过时返回失败结果', async () => {
      // Given - 创建有严重问题的检查结果
      const criticalIssue = {
        severity: 'critical' as const,
        category: '安全漏洞',
        description: '发现严重安全漏洞',
        suggestion: '立即修复'
      };

      const mockResults = {
        python: createMockComplianceResult('Python合规检查', true, 95, []),
        typescript: createMockComplianceResult('TypeScript合规检查', true, 90, []),
        testing: createMockComplianceResult('测试合规检查', true, 85, []),
        security: createMockComplianceResult('安全合规检查', false, 60, [criticalIssue]),
        windows: createMockComplianceResult('Windows环境合规检查', true, 92, [])
      };

      mockComplianceChecker.checkPythonCompliance.mockResolvedValue(mockResults.python);
      mockComplianceChecker.checkTypeScriptCompliance.mockResolvedValue(mockResults.typescript);
      mockTestingSecurityChecker.checkTestingCompliance.mockResolvedValue(mockResults.testing);
      mockTestingSecurityChecker.checkSecurityCompliance.mockResolvedValue(mockResults.security);
      mockTestingSecurityChecker.checkWindowsCompliance.mockResolvedValue(mockResults.windows);

      // When
      const result = await hook.execute(context);

      // Then
      expect(result.success).toBe(false);
      expect(result.message).toContain('合规检查未通过质量门禁');
      expect(result.data.qualityGateResult.passed).toBe(false);
      expect(result.data.qualityGateResult.blockingIssues).toContain('存在1个严重问题，不允许提交');
      expect(result.data.recommendations).toBeDefined();
      expect(result.data.nextSteps).toBeDefined();
    });

    it('应该处理单个检查失败的情况', async () => {
      // Given
      const mockResults = {
        python: createMockComplianceResult('Python合规检查', true, 95, []),
        typescript: createMockComplianceResult('TypeScript合规检查', true, 90, []),
        testing: createMockComplianceResult('测试合规检查', true, 85, []),
        security: createMockComplianceResult('安全合规检查', true, 88, []),
        windows: createMockComplianceResult('Windows环境合规检查', true, 92, [])
      };

      mockComplianceChecker.checkPythonCompliance.mockResolvedValue(mockResults.python);
      mockComplianceChecker.checkTypeScriptCompliance.mockRejectedValue(new Error('TypeScript检查失败'));
      mockTestingSecurityChecker.checkTestingCompliance.mockResolvedValue(mockResults.testing);
      mockTestingSecurityChecker.checkSecurityCompliance.mockResolvedValue(mockResults.security);
      mockTestingSecurityChecker.checkWindowsCompliance.mockResolvedValue(mockResults.windows);

      // When
      const result = await hook.execute(context);

      // Then
      expect(result.success).toBe(true); // 单个检查失败不应该阻止整个流程
      expect(result.data.complianceResults.typescriptCompliance.checkType).toBe('检查错误');
    });

    it('应该支持禁用特定检查', async () => {
      // Given - 创建禁用Python和安全检查的配置
      const hookWithConfig = new ProjectStandardsComplianceHook();
      (hookWithConfig as any).config = {
        parameters: {
          complianceConfig: {
            python: { enabled: false },
            security: { enabled: false }
          }
        }
      };

      const mockResults = {
        typescript: createMockComplianceResult('TypeScript合规检查', true, 90, []),
        testing: createMockComplianceResult('测试合规检查', true, 85, []),
        windows: createMockComplianceResult('Windows环境合规检查', true, 92, [])
      };

      mockComplianceChecker.checkTypeScriptCompliance.mockResolvedValue(mockResults.typescript);
      mockTestingSecurityChecker.checkTestingCompliance.mockResolvedValue(mockResults.testing);
      mockTestingSecurityChecker.checkWindowsCompliance.mockResolvedValue(mockResults.windows);

      // When
      const result = await hookWithConfig.execute(context);

      // Then
      expect(result.success).toBe(true);
      expect(mockComplianceChecker.checkPythonCompliance).not.toHaveBeenCalled();
      expect(mockTestingSecurityChecker.checkSecurityCompliance).not.toHaveBeenCalled();
      expect(result.data.complianceResults.pythonCompliance.checkType).toBe('跳过检查');
      expect(result.data.complianceResults.securityCompliance.checkType).toBe('跳过检查');
    });
  });

  describe('质量门禁验证', () => {
    it('应该在评分低于门禁时阻止提交', async () => {
      // Given - 创建低评分的检查结果
      const mockResults = {
        python: createMockComplianceResult('Python合规检查', false, 60, []),
        typescript: createMockComplianceResult('TypeScript合规检查', false, 65, []),
        testing: createMockComplianceResult('测试合规检查', false, 70, []),
        security: createMockComplianceResult('安全合规检查', false, 75, []),
        windows: createMockComplianceResult('Windows环境合规检查', true, 80, [])
      };

      mockComplianceChecker.checkPythonCompliance.mockResolvedValue(mockResults.python);
      mockComplianceChecker.checkTypeScriptCompliance.mockResolvedValue(mockResults.typescript);
      mockTestingSecurityChecker.checkTestingCompliance.mockResolvedValue(mockResults.testing);
      mockTestingSecurityChecker.checkSecurityCompliance.mockResolvedValue(mockResults.security);
      mockTestingSecurityChecker.checkWindowsCompliance.mockResolvedValue(mockResults.windows);

      const context: HookContext = {
        event: 'git.beforeCommit',
        files: ['src/test.ts'],
        metadata: {},
        timestamp: new Date()
      };

      // When
      const result = await hook.execute(context);

      // Then
      expect(result.success).toBe(false);
      expect(result.data.qualityGateResult.blockingIssues).toContain(
        expect.stringMatching(/整体评分不达标.*70.*90/)
      );
    });

    it('应该在问题数量超标时阻止提交', async () => {
      // Given - 创建大量问题的检查结果
      const manyIssues = Array.from({ length: 15 }, (_, i) => ({
        severity: 'medium' as const,
        category: '代码风格',
        description: `问题${i + 1}`,
        suggestion: '修复此问题'
      }));

      const mockResults = {
        python: createMockComplianceResult('Python合规检查', false, 85, manyIssues),
        typescript: createMockComplianceResult('TypeScript合规检查', true, 90, []),
        testing: createMockComplianceResult('测试合规检查', true, 85, []),
        security: createMockComplianceResult('安全合规检查', true, 88, []),
        windows: createMockComplianceResult('Windows环境合规检查', true, 92, [])
      };

      mockComplianceChecker.checkPythonCompliance.mockResolvedValue(mockResults.python);
      mockComplianceChecker.checkTypeScriptCompliance.mockResolvedValue(mockResults.typescript);
      mockTestingSecurityChecker.checkTestingCompliance.mockResolvedValue(mockResults.testing);
      mockTestingSecurityChecker.checkSecurityCompliance.mockResolvedValue(mockResults.security);
      mockTestingSecurityChecker.checkWindowsCompliance.mockResolvedValue(mockResults.windows);

      const context: HookContext = {
        event: 'git.beforeCommit',
        files: ['src/test.py'],
        metadata: {},
        timestamp: new Date()
      };

      // When
      const result = await hook.execute(context);

      // Then
      expect(result.success).toBe(false);
      expect(result.data.qualityGateResult.blockingIssues).toContain(
        expect.stringMatching(/代码风格问题数量超标.*15.*10/)
      );
    });
  });

  describe('合规报告生成', () => {
    it('应该生成详细的合规报告', async () => {
      // Given
      const mockResults = {
        python: createMockComplianceResult('Python合规检查', true, 95, []),
        typescript: createMockComplianceResult('TypeScript合规检查', false, 80, [
          {
            severity: 'medium' as const,
            category: 'TypeScript风格',
            description: '缺少类型注解',
            suggestion: '添加类型注解'
          }
        ]),
        testing: createMockComplianceResult('测试合规检查', true, 85, []),
        security: createMockComplianceResult('安全合规检查', true, 88, []),
        windows: createMockComplianceResult('Windows环境合规检查', true, 92, [])
      };

      mockComplianceChecker.checkPythonCompliance.mockResolvedValue(mockResults.python);
      mockComplianceChecker.checkTypeScriptCompliance.mockResolvedValue(mockResults.typescript);
      mockTestingSecurityChecker.checkTestingCompliance.mockResolvedValue(mockResults.testing);
      mockTestingSecurityChecker.checkSecurityCompliance.mockResolvedValue(mockResults.security);
      mockTestingSecurityChecker.checkWindowsCompliance.mockResolvedValue(mockResults.windows);

      const context: HookContext = {
        event: 'git.beforeCommit',
        files: ['src/test.ts'],
        metadata: {},
        timestamp: new Date()
      };

      // When
      const result = await hook.execute(context);

      // Then
      const report = result.data.complianceReport;
      expect(report).toBeDefined();
      expect(report.summary.totalChecks).toBe(5);
      expect(report.summary.passedChecks).toBe(4);
      expect(report.summary.totalIssues).toBe(1);
      expect(report.summary.averageScore).toBe(88); // (95+80+85+88+92)/5
      expect(report.details).toHaveProperty('pythonCompliance');
      expect(report.details).toHaveProperty('typescriptCompliance');
      expect(report.topIssues).toHaveLength(1);
      expect(report.topIssues[0].category).toBe('TypeScript风格');
    });
  });

  describe('错误处理', () => {
    it('应该处理钩子执行过程中的异常', async () => {
      // Given
      mockComplianceChecker.checkPythonCompliance.mockRejectedValue(new Error('系统错误'));

      const context: HookContext = {
        event: 'git.beforeCommit',
        files: ['src/test.py'],
        metadata: {},
        timestamp: new Date()
      };

      // When
      const result = await hook.execute(context);

      // Then
      expect(result.success).toBe(false);
      expect(result.message).toContain('项目标准合规检查钩子执行失败');
    });
  });

  // ============================================================================
  // 辅助函数
  // ============================================================================

  function createMockComplianceResult(
    checkType: string,
    passed: boolean,
    score: number,
    issues: any[]
  ): ComplianceResult {
    return {
      passed,
      score,
      issues,
      recommendations: passed ? [`${checkType}通过`] : [`修复${checkType}问题`],
      checkType,
      timestamp: new Date()
    };
  }
});