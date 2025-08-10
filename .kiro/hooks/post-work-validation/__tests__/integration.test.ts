/**
 * 工作后质量验证钩子集成测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PostWorkValidationHook } from '../post-work-validation-hook';
import { AutomatedValidationPipeline } from '../automated-validation-pipeline';
import { ExperienceStorage } from '../experience-storage';
import { MCPToolsManager } from '../../core/mcp-tools-manager';
import { HookContext } from '../../types';

// 不 mock 实际的类，进行真实的集成测试
vi.mock('../../core/hook-logger');

describe('PostWorkValidationHook Integration Tests', () => {
  let hook: PostWorkValidationHook;
  let mockMCPTools: jest.Mocked<MCPToolsManager>;

  beforeEach(() => {
    mockMCPTools = {
      isSerenaAvailable: vi.fn(),
      callSerena: vi.fn(),
      isMemoryAvailable: vi.fn(),
      callMemory: vi.fn(),
      isMentorAvailable: vi.fn(),
      callMentor: vi.fn(),
      isSequentialThinkingAvailable: vi.fn(),
      callSequentialThinking: vi.fn(),
      isContext7Available: vi.fn(),
      callContext7: vi.fn(),
      isTaskManagerAvailable: vi.fn(),
      callTaskManager: vi.fn(),
      getToolsStatus: vi.fn(),
      validateToolsReady: vi.fn()
    } as any;

    hook = new PostWorkValidationHook(mockMCPTools);
  });

  describe('完整工作流程集成测试', () => {
    const createTestContext = (overrides: Partial<HookContext> = {}): HookContext => ({
      event: 'work.complete',
      files: [
        'src/components/ChatInterface.tsx',
        'src/components/__tests__/ChatInterface.test.tsx',
        'src/api/chat.ts',
        'src/api/__tests__/chat.test.ts',
        'src/types/chat.ts'
      ],
      metadata: {
        project: 'ai-chat-interface',
        module: 'chat',
        workType: 'feature-development',
        estimatedComplexity: 'medium'
      },
      timestamp: new Date(),
      sessionId: 'integration-test-session',
      userId: 'test-user',
      ...overrides
    });

    it('应该执行完整的工作后验证流程', async () => {
      // Given
      const context = createTestContext();
      
      // Mock MCP 工具可用性
      mockMCPTools.isSerenaAvailable.mockResolvedValue(true);
      mockMCPTools.isMemoryAvailable.mockResolvedValue(true);
      
      // Mock Serena 工具调用
      mockMCPTools.callSerena.mockImplementation(async (method, params) => {
        switch (method) {
          case 'analyze_requirements_coverage':
            return { coveragePercentage: 88 };
          case 'security_scan':
            return { 
              vulnerabilities: [
                {
                  severity: 'medium',
                  type: 'potential-xss',
                  description: '潜在的XSS风险',
                  file: 'src/components/ChatInterface.tsx',
                  line: 45
                }
              ]
            };
          default:
            return {};
        }
      });

      // Mock Memory 工具调用
      mockMCPTools.callMemory.mockImplementation(async (method, params) => {
        switch (method) {
          case 'create_entities':
            return { success: true };
          case 'create_relations':
            return { success: true };
          case 'search_nodes':
            return {
              nodes: [
                {
                  name: 'best-practice-bp-001',
                  entityType: 'BestPractice',
                  observations: [
                    '标题: React 组件最佳实践',
                    '描述: React 组件开发的最佳实践',
                    '分类: coding',
                    '适用场景: 前端开发; 组件开发',
                    '指南: 使用 TypeScript; 编写单元测试; 遵循命名规范',
                    '收益: 代码质量提升; 维护性增强; 团队协作改善',
                    '注意事项: 学习成本; 开发时间增加',
                    '相关工具: React, TypeScript, Jest',
                    '使用频率: 15',
                    '标签: react, typescript, best-practice',
                    '创建时间: 2024-01-01T00:00:00.000Z',
                    '更新时间: 2024-01-15T00:00:00.000Z'
                  ],
                  relevanceScore: 0.85
                }
              ]
            };
          case 'add_observations':
            return { success: true };
          default:
            return {};
        }
      });

      // When
      const result = await hook.execute(context);

      // Then
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      // 验证验证报告结构
      const report = result.data.report;
      expect(report.id).toBeTruthy();
      expect(report.validationResult).toBeDefined();
      expect(report.experienceStorageResult).toBeDefined();
      expect(report.improvementSuggestions).toBeDefined();
      expect(report.qualityTrend).toBeDefined();
      expect(report.generatedAt).toBeInstanceOf(Date);

      // 验证验证结果
      const validationResult = report.validationResult;
      expect(validationResult.overallScore).toBeGreaterThan(0);
      expect(validationResult.overallScore).toBeLessThanOrEqual(100);
      expect(validationResult.functionalityValidation).toBeDefined();
      expect(validationResult.performanceBenchmark).toBeDefined();
      expect(validationResult.securityValidation).toBeDefined();
      expect(validationResult.deploymentReadiness).toBeDefined();

      // 验证经验存储结果
      const experienceResult = report.experienceStorageResult;
      expect(experienceResult.designDecisionsStored).toBeGreaterThanOrEqual(0);
      expect(experienceResult.problemSolutionsStored).toBeGreaterThanOrEqual(0);
      expect(experienceResult.bestPracticesStored).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(experienceResult.storageErrors)).toBe(true);

      // 验证改进建议
      expect(Array.isArray(report.improvementSuggestions)).toBe(true);
      if (report.improvementSuggestions.length > 0) {
        const suggestion = report.improvementSuggestions[0];
        expect(suggestion.category).toBeTruthy();
        expect(['high', 'medium', 'low']).toContain(suggestion.priority);
        expect(suggestion.description).toBeTruthy();
        expect(Array.isArray(suggestion.actionItems)).toBe(true);
      }

      // 验证质量趋势
      expect(report.qualityTrend.currentScore).toBeGreaterThan(0);
      expect(['improving', 'stable', 'declining']).toContain(report.qualityTrend.trend);
      expect(report.qualityTrend.trendAnalysis).toBeTruthy();

      // 验证 MCP 工具调用
      expect(mockMCPTools.isSerenaAvailable).toHaveBeenCalled();
      expect(mockMCPTools.isMemoryAvailable).toHaveBeenCalled();
    }, 30000); // 30秒超时，因为这是一个复杂的集成测试

    it('应该处理 MCP 工具部分不可用的情况', async () => {
      // Given
      const context = createTestContext();
      
      // Serena 可用，Memory 不可用
      mockMCPTools.isSerenaAvailable.mockResolvedValue(true);
      mockMCPTools.isMemoryAvailable.mockResolvedValue(false);
      
      mockMCPTools.callSerena.mockResolvedValue({
        coveragePercentage: 85,
        vulnerabilities: []
      });

      // When
      const result = await hook.execute(context);

      // Then
      expect(result.success).toBe(true);
      expect(result.data.report.validationResult).toBeDefined();
      
      // 经验存储应该使用本地存储作为后备
      expect(result.data.report.experienceStorageResult).toBeDefined();
      
      // 应该有警告信息
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('应该处理所有 MCP 工具都不可用的情况', async () => {
      // Given
      const context = createTestContext();
      
      mockMCPTools.isSerenaAvailable.mockResolvedValue(false);
      mockMCPTools.isMemoryAvailable.mockResolvedValue(false);

      // When
      const result = await hook.execute(context);

      // Then
      expect(result.success).toBe(true);
      expect(result.data.report.validationResult).toBeDefined();
      
      // 验证应该使用默认实现
      expect(result.data.report.validationResult.functionalityValidation.requirementsCoverage).toBeGreaterThanOrEqual(0);
      expect(result.data.report.validationResult.securityValidation.vulnerabilitiesFound).toBe(0);
    });

    it('应该正确处理高质量代码的情况', async () => {
      // Given
      const context = createTestContext({
        files: [
          'src/utils/high-quality.ts',
          'src/utils/__tests__/high-quality.test.ts',
          'src/utils/__tests__/high-quality.integration.test.ts'
        ]
      });
      
      mockMCPTools.isSerenaAvailable.mockResolvedValue(true);
      mockMCPTools.isMemoryAvailable.mockResolvedValue(true);
      
      // Mock 高质量的验证结果
      mockMCPTools.callSerena.mockImplementation(async (method) => {
        switch (method) {
          case 'analyze_requirements_coverage':
            return { coveragePercentage: 98 };
          case 'security_scan':
            return { vulnerabilities: [] };
          default:
            return {};
        }
      });

      mockMCPTools.callMemory.mockResolvedValue({ success: true });

      // When
      const result = await hook.execute(context);

      // Then
      expect(result.success).toBe(true);
      expect(result.data.report.validationResult.overallScore).toBeGreaterThan(85);
      expect(result.data.report.validationResult.overallPassed).toBe(true);
      
      // 应该生成设计决策（高分数）
      expect(result.data.report.experienceStorageResult.designDecisionsStored).toBeGreaterThan(0);
      
      // 应该生成最佳实践（高测试覆盖率）
      expect(result.data.report.experienceStorageResult.bestPracticesStored).toBeGreaterThan(0);
      
      // 改进建议应该较少
      const highPrioritySuggestions = result.data.report.improvementSuggestions.filter(
        s => s.priority === 'high'
      );
      expect(highPrioritySuggestions.length).toBe(0);
    });

    it('应该正确处理低质量代码的情况', async () => {
      // Given
      const context = createTestContext({
        files: [
          'src/legacy/problematic.js', // JavaScript 文件，可能质量较低
          'src/legacy/old-api.js'
        ]
      });
      
      mockMCPTools.isSerenaAvailable.mockResolvedValue(true);
      mockMCPTools.isMemoryAvailable.mockResolvedValue(true);
      
      // Mock 低质量的验证结果
      mockMCPTools.callSerena.mockImplementation(async (method) => {
        switch (method) {
          case 'analyze_requirements_coverage':
            return { coveragePercentage: 45 };
          case 'security_scan':
            return {
              vulnerabilities: [
                {
                  severity: 'critical',
                  type: 'sql-injection',
                  description: '严重的SQL注入漏洞',
                  file: 'src/legacy/old-api.js',
                  line: 23
                },
                {
                  severity: 'high',
                  type: 'xss',
                  description: 'XSS漏洞',
                  file: 'src/legacy/problematic.js',
                  line: 67
                }
              ]
            };
          default:
            return {};
        }
      });

      mockMCPTools.callMemory.mockResolvedValue({ success: true });

      // When
      const result = await hook.execute(context);

      // Then
      expect(result.success).toBe(false); // 低质量应该导致验证失败
      expect(result.data.report.validationResult.overallScore).toBeLessThan(70);
      expect(result.data.report.validationResult.overallPassed).toBe(false);
      
      // 应该生成问题解决方案（安全漏洞）
      expect(result.data.report.experienceStorageResult.problemSolutionsStored).toBeGreaterThan(0);
      
      // 应该有高优先级的改进建议
      const highPrioritySuggestions = result.data.report.improvementSuggestions.filter(
        s => s.priority === 'high'
      );
      expect(highPrioritySuggestions.length).toBeGreaterThan(0);
      
      // 应该包含安全性改进建议
      const securitySuggestions = result.data.report.improvementSuggestions.filter(
        s => s.category === '安全性'
      );
      expect(securitySuggestions.length).toBeGreaterThan(0);
    });

    it('应该正确处理大型项目的情况', async () => {
      // Given
      const largeProjectFiles = [];
      for (let i = 1; i <= 50; i++) {
        largeProjectFiles.push(`src/module${Math.ceil(i/10)}/component${i}.ts`);
        largeProjectFiles.push(`src/module${Math.ceil(i/10)}/__tests__/component${i}.test.ts`);
      }
      
      const context = createTestContext({
        files: largeProjectFiles,
        metadata: {
          project: 'large-enterprise-app',
          module: 'multi-module',
          workType: 'major-refactor',
          estimatedComplexity: 'high'
        }
      });
      
      mockMCPTools.isSerenaAvailable.mockResolvedValue(true);
      mockMCPTools.isMemoryAvailable.mockResolvedValue(true);
      
      mockMCPTools.callSerena.mockImplementation(async (method) => {
        // 模拟大项目的分析结果
        switch (method) {
          case 'analyze_requirements_coverage':
            return { coveragePercentage: 82 };
          case 'security_scan':
            return {
              vulnerabilities: [
                {
                  severity: 'medium',
                  type: 'dependency-vulnerability',
                  description: '依赖包存在已知漏洞',
                  file: 'package.json',
                  line: 1
                }
              ]
            };
          default:
            return {};
        }
      });

      mockMCPTools.callMemory.mockResolvedValue({ success: true });

      // When
      const startTime = Date.now();
      const result = await hook.execute(context);
      const executionTime = Date.now() - startTime;

      // Then
      expect(result.success).toBe(true);
      expect(executionTime).toBeLessThan(30000); // 应该在30秒内完成
      
      // 验证大项目的处理
      expect(result.data.report.validationResult).toBeDefined();
      expect(result.data.report.experienceStorageResult).toBeDefined();
      
      // 大项目应该有更多的改进建议
      expect(result.data.report.improvementSuggestions.length).toBeGreaterThan(0);
      
      // 验证性能指标
      expect(result.executionTime).toBeGreaterThan(0);
      expect(result.executionTime).toBeLessThan(30000);
    }, 35000); // 35秒超时
  });

  describe('错误恢复和容错性测试', () => {
    it('应该在验证流水线部分失败时继续执行', async () => {
      // Given
      const context = createTestContext();
      
      mockMCPTools.isSerenaAvailable.mockResolvedValue(true);
      mockMCPTools.isMemoryAvailable.mockResolvedValue(true);
      
      // 模拟部分 MCP 调用失败
      mockMCPTools.callSerena.mockImplementation(async (method) => {
        if (method === 'security_scan') {
          throw new Error('安全扫描服务暂时不可用');
        }
        return { coveragePercentage: 85 };
      });

      mockMCPTools.callMemory.mockResolvedValue({ success: true });

      // When
      const result = await hook.execute(context);

      // Then
      expect(result.success).toBe(true); // 应该继续执行
      expect(result.warnings.length).toBeGreaterThan(0); // 应该有警告
      expect(result.data.report.validationResult.securityValidation.score).toBe(0); // 安全验证应该失败
    });

    it('应该在经验存储失败时继续执行', async () => {
      // Given
      const context = createTestContext();
      
      mockMCPTools.isSerenaAvailable.mockResolvedValue(true);
      mockMCPTools.isMemoryAvailable.mockResolvedValue(true);
      
      mockMCPTools.callSerena.mockResolvedValue({
        coveragePercentage: 95,
        vulnerabilities: []
      });

      // 模拟 Memory 存储失败
      mockMCPTools.callMemory.mockImplementation(async (method) => {
        if (method === 'create_entities') {
          throw new Error('存储服务不可用');
        }
        return { success: true };
      });

      // When
      const result = await hook.execute(context);

      // Then
      expect(result.success).toBe(false); // 存储失败应该导致整体失败
      expect(result.data.report.experienceStorageResult.storageErrors.length).toBeGreaterThan(0);
      expect(result.data.report.validationResult).toBeDefined(); // 验证应该完成
    });
  });

  const createTestContext = (overrides: Partial<HookContext> = {}): HookContext => ({
    event: 'work.complete',
    files: [
      'src/components/ChatInterface.tsx',
      'src/components/__tests__/ChatInterface.test.tsx',
      'src/api/chat.ts',
      'src/types/chat.ts'
    ],
    metadata: {
      project: 'ai-chat-interface',
      module: 'chat',
      workType: 'feature-development'
    },
    timestamp: new Date(),
    sessionId: 'integration-test-session',
    ...overrides
  });
});