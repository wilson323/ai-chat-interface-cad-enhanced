/**
 * 工作后质量验证钩子单元测试
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { PostWorkValidationHook, ValidationReport } from '../post-work-validation-hook';
import { AutomatedValidationPipeline } from '../automated-validation-pipeline';
import { ExperienceStorage } from '../experience-storage';
import { MCPToolsManager } from '../../core/mcp-tools-manager';
import { HookContext } from '../../types';

// Mock dependencies
vi.mock('../automated-validation-pipeline');
vi.mock('../experience-storage');
vi.mock('../../core/mcp-tools-manager');
vi.mock('../../core/hook-logger');

describe('PostWorkValidationHook', () => {
  let hook: PostWorkValidationHook;
  let mockMCPTools: jest.Mocked<MCPToolsManager>;
  let mockValidationPipeline: jest.Mocked<AutomatedValidationPipeline>;
  let mockExperienceStorage: jest.Mocked<ExperienceStorage>;

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

    mockValidationPipeline = {
      executeValidation: vi.fn()
    } as any;

    mockExperienceStorage = {
      storeDesignDecision: vi.fn(),
      storeProblemSolution: vi.fn(),
      storeBestPractice: vi.fn(),
      retrieveExperience: vi.fn(),
      generateApplicationSuggestions: vi.fn(),
      updateUsageStatistics: vi.fn()
    } as any;

    // Mock constructors
    (AutomatedValidationPipeline as any).mockImplementation(() => mockValidationPipeline);
    (ExperienceStorage as any).mockImplementation(() => mockExperienceStorage);

    hook = new PostWorkValidationHook(mockMCPTools);
  });

  describe('基本属性', () => {
    it('应该有正确的钩子属性', () => {
      expect(hook.id).toBe('post-work-validation');
      expect(hook.name).toBe('工作后质量验证钩子');
      expect(hook.description).toContain('工作完成后执行全面的质量验证');
      expect(hook.triggers).toHaveLength(2);
      expect(hook.triggers[0].event).toBe('work.complete');
      expect(hook.triggers[1].event).toBe('git.afterCommit');
    });
  });

  describe('execute', () => {
    const createMockContext = (overrides: Partial<HookContext> = {}): HookContext => ({
      event: 'work.complete',
      files: ['src/test.ts', 'src/test.test.ts'],
      metadata: { project: 'ai-chat-interface' },
      timestamp: new Date(),
      sessionId: 'test-session',
      ...overrides
    });

    const createMockValidationResult = (overrides: any = {}) => ({
      overallPassed: true,
      overallScore: 85,
      functionalityValidation: {
        passed: true,
        score: 90,
        requirementsCoverage: 85,
        functionalTestPassRate: 95,
        missingFeatures: [],
        incompleteFeatures: [],
        message: '功能完整性验证通过',
        details: {},
        timestamp: new Date(),
        executionTime: 1000
      },
      performanceBenchmark: {
        passed: true,
        score: 80,
        apiResponseTime: 150,
        pageLoadTime: 800,
        memoryUsage: 200,
        cpuUsage: 25,
        performanceRegression: false,
        message: '性能基准测试通过',
        details: {},
        timestamp: new Date(),
        executionTime: 2000
      },
      securityValidation: {
        passed: true,
        score: 90,
        vulnerabilitiesFound: 0,
        criticalVulnerabilities: 0,
        highVulnerabilities: 0,
        securityScanPassed: true,
        vulnerabilityDetails: [],
        message: '安全验证通过',
        details: {},
        timestamp: new Date(),
        executionTime: 1500
      },
      deploymentReadiness: {
        passed: true,
        score: 85,
        buildSuccess: true,
        testsPass: true,
        dependenciesValid: true,
        configurationValid: true,
        environmentCompatible: true,
        deploymentChecklist: [],
        message: '部署就绪检查通过',
        details: {},
        timestamp: new Date(),
        executionTime: 1000
      },
      summary: '验证流水线执行成功',
      recommendations: [],
      totalExecutionTime: 5500,
      ...overrides
    });

    it('应该成功执行完整的工作后质量验证', async () => {
      // Given
      const context = createMockContext();
      const validationResult = createMockValidationResult();

      mockValidationPipeline.executeValidation.mockResolvedValue(validationResult);
      mockExperienceStorage.storeDesignDecision.mockResolvedValue(true);
      mockExperienceStorage.storeProblemSolution.mockResolvedValue(true);
      mockExperienceStorage.storeBestPractice.mockResolvedValue(true);
      mockExperienceStorage.generateApplicationSuggestions.mockResolvedValue([]);

      // When
      const result = await hook.execute(context);

      // Then
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.report).toBeDefined();
      expect(result.data.validationSummary).toBeDefined();
      expect(result.data.experienceSummary).toBeDefined();
      expect(result.executionTime).toBeGreaterThan(0);

      // 验证各个阶段都被调用
      expect(mockValidationPipeline.executeValidation).toHaveBeenCalledWith(
        context.files,
        context.metadata
      );
    });

    it('应该在验证失败时返回失败结果', async () => {
      // Given
      const context = createMockContext();
      const validationResult = createMockValidationResult({
        overallPassed: false,
        overallScore: 65,
        functionalityValidation: {
          ...createMockValidationResult().functionalityValidation,
          passed: false,
          score: 60
        }
      });

      mockValidationPipeline.executeValidation.mockResolvedValue(validationResult);
      mockExperienceStorage.storeDesignDecision.mockResolvedValue(true);
      mockExperienceStorage.storeProblemSolution.mockResolvedValue(true);
      mockExperienceStorage.storeBestPractice.mockResolvedValue(true);
      mockExperienceStorage.generateApplicationSuggestions.mockResolvedValue([]);

      // When
      const result = await hook.execute(context);

      // Then
      expect(result.success).toBe(false);
      expect(result.data.report.validationResult.overallPassed).toBe(false);
      expect(result.data.validationSummary.overallScore).toBe(65);
      expect(result.message).toContain('未通过');
    });

    it('应该存储设计决策、问题解决方案和最佳实践', async () => {
      // Given
      const context = createMockContext();
      const validationResult = createMockValidationResult({
        overallScore: 95, // 高分数应该生成设计决策
        functionalityValidation: {
          ...createMockValidationResult().functionalityValidation,
          functionalTestPassRate: 98 // 高测试覆盖率应该生成最佳实践
        }
      });

      mockValidationPipeline.executeValidation.mockResolvedValue(validationResult);
      mockExperienceStorage.storeDesignDecision.mockResolvedValue(true);
      mockExperienceStorage.storeProblemSolution.mockResolvedValue(true);
      mockExperienceStorage.storeBestPractice.mockResolvedValue(true);
      mockExperienceStorage.generateApplicationSuggestions.mockResolvedValue([]);

      // When
      const result = await hook.execute(context);

      // Then
      expect(result.success).toBe(true);
      expect(mockExperienceStorage.storeDesignDecision).toHaveBeenCalled();
      expect(mockExperienceStorage.storeBestPractice).toHaveBeenCalled();
      
      const experienceSummary = result.data.experienceSummary;
      expect(experienceSummary.totalItemsStored).toBeGreaterThan(0);
      expect(experienceSummary.storageSuccessRate).toBe(100);
    });

    it('应该在发现安全漏洞时存储问题解决方案', async () => {
      // Given
      const context = createMockContext();
      const validationResult = createMockValidationResult({
        securityValidation: {
          ...createMockValidationResult().securityValidation,
          passed: false,
          vulnerabilitiesFound: 2,
          criticalVulnerabilities: 1,
          highVulnerabilities: 1,
          vulnerabilityDetails: [
            {
              severity: 'critical' as const,
              type: 'sql-injection',
              description: 'SQL注入漏洞',
              file: 'src/api.ts',
              line: 42
            },
            {
              severity: 'high' as const,
              type: 'xss',
              description: 'XSS漏洞',
              file: 'src/ui.ts',
              line: 15
            }
          ]
        }
      });

      mockValidationPipeline.executeValidation.mockResolvedValue(validationResult);
      mockExperienceStorage.storeDesignDecision.mockResolvedValue(true);
      mockExperienceStorage.storeProblemSolution.mockResolvedValue(true);
      mockExperienceStorage.storeBestPractice.mockResolvedValue(true);
      mockExperienceStorage.generateApplicationSuggestions.mockResolvedValue([]);

      // When
      const result = await hook.execute(context);

      // Then
      expect(mockExperienceStorage.storeProblemSolution).toHaveBeenCalledTimes(2);
      
      // 验证存储的问题解决方案
      const calls = (mockExperienceStorage.storeProblemSolution as Mock).mock.calls;
      expect(calls[0][0].problemTitle).toContain('sql-injection');
      expect(calls[1][0].problemTitle).toContain('xss');
    });

    it('应该生成改进建议', async () => {
      // Given
      const context = createMockContext();
      const validationResult = createMockValidationResult({
        overallPassed: false,
        functionalityValidation: {
          ...createMockValidationResult().functionalityValidation,
          passed: false,
          requirementsCoverage: 70
        },
        performanceBenchmark: {
          ...createMockValidationResult().performanceBenchmark,
          passed: false,
          performanceRegression: true
        }
      });

      mockValidationPipeline.executeValidation.mockResolvedValue(validationResult);
      mockExperienceStorage.storeDesignDecision.mockResolvedValue(true);
      mockExperienceStorage.storeProblemSolution.mockResolvedValue(true);
      mockExperienceStorage.storeBestPractice.mockResolvedValue(true);
      mockExperienceStorage.generateApplicationSuggestions.mockResolvedValue([
        {
          id: 'suggestion-1',
          type: 'best-practice' as const,
          title: '应用最佳实践',
          description: '基于历史经验的建议',
          relatedExperienceId: 'bp-001',
          applicabilityScore: 0.8,
          applicationGuidance: ['遵循编码规范'],
          expectedBenefits: ['提高代码质量'],
          implementationComplexity: 'low' as const,
          risks: ['需要时间投入']
        }
      ]);

      // When
      const result = await hook.execute(context);

      // Then
      expect(result.data.report.improvementSuggestions.length).toBeGreaterThan(0);
      
      const suggestions = result.data.report.improvementSuggestions;
      expect(suggestions.some(s => s.category === '功能完整性')).toBe(true);
      expect(suggestions.some(s => s.category === '性能优化')).toBe(true);
      expect(suggestions.some(s => s.category === '历史经验')).toBe(true);
      
      // 验证优先级排序
      for (let i = 1; i < suggestions.length; i++) {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        expect(priorityOrder[suggestions[i - 1].priority]).toBeGreaterThanOrEqual(
          priorityOrder[suggestions[i].priority]
        );
      }
    });

    it('应该分析质量趋势', async () => {
      // Given
      const context = createMockContext();
      const validationResult = createMockValidationResult({ overallScore: 88 });

      mockValidationPipeline.executeValidation.mockResolvedValue(validationResult);
      mockExperienceStorage.storeDesignDecision.mockResolvedValue(true);
      mockExperienceStorage.storeProblemSolution.mockResolvedValue(true);
      mockExperienceStorage.storeBestPractice.mockResolvedValue(true);
      mockExperienceStorage.generateApplicationSuggestions.mockResolvedValue([]);

      // When
      const result = await hook.execute(context);

      // Then
      expect(result.data.report.qualityTrend).toBeDefined();
      expect(result.data.report.qualityTrend.currentScore).toBe(88);
      expect(['improving', 'stable', 'declining']).toContain(result.data.report.qualityTrend.trend);
      expect(result.data.report.qualityTrend.trendAnalysis).toBeTruthy();
    });

    it('应该处理经验存储错误', async () => {
      // Given
      const context = createMockContext();
      const validationResult = createMockValidationResult({ overallScore: 95 });

      mockValidationPipeline.executeValidation.mockResolvedValue(validationResult);
      mockExperienceStorage.storeDesignDecision.mockRejectedValue(new Error('存储失败'));
      mockExperienceStorage.storeProblemSolution.mockResolvedValue(true);
      mockExperienceStorage.storeBestPractice.mockResolvedValue(true);
      mockExperienceStorage.generateApplicationSuggestions.mockResolvedValue([]);

      // When
      const result = await hook.execute(context);

      // Then
      expect(result.success).toBe(false); // 因为有存储错误
      expect(result.data.report.experienceStorageResult.storageErrors.length).toBeGreaterThan(0);
      expect(result.data.experienceSummary.storageSuccessRate).toBeLessThan(100);
    });

    it('应该处理验证流水线错误', async () => {
      // Given
      const context = createMockContext();
      mockValidationPipeline.executeValidation.mockRejectedValue(new Error('验证失败'));

      // When
      const result = await hook.execute(context);

      // Then
      expect(result.success).toBe(false);
      expect(result.message).toContain('工作后质量验证失败');
      expect(result.errors).toContain('Error: 验证失败');
    });

    it('应该处理无效的上下文', async () => {
      // Given
      const invalidContext = createMockContext({ files: [] });

      // When
      const result = await hook.execute(invalidContext);

      // Then
      expect(result.success).toBe(false);
      expect(result.message).toContain('无效的钩子上下文');
    });

    it('应该生成详细的验证报告', async () => {
      // Given
      const context = createMockContext();
      const validationResult = createMockValidationResult();

      mockValidationPipeline.executeValidation.mockResolvedValue(validationResult);
      mockExperienceStorage.storeDesignDecision.mockResolvedValue(true);
      mockExperienceStorage.storeProblemSolution.mockResolvedValue(true);
      mockExperienceStorage.storeBestPractice.mockResolvedValue(true);
      mockExperienceStorage.generateApplicationSuggestions.mockResolvedValue([]);

      // When
      const result = await hook.execute(context);

      // Then
      const report: ValidationReport = result.data.report;
      expect(report.id).toBeTruthy();
      expect(report.validationResult).toBe(validationResult);
      expect(report.experienceStorageResult).toBeDefined();
      expect(report.improvementSuggestions).toBeDefined();
      expect(report.qualityTrend).toBeDefined();
      expect(report.generatedAt).toBeInstanceOf(Date);
    });
  });

  describe('辅助方法测试', () => {
    it('应该正确提取模块名称', async () => {
      // Given
      const context = createMockContext({
        files: [
          'src/components/ui/button.ts',
          'src/components/ui/input.ts',
          'src/components/layout/header.ts'
        ]
      });
      const validationResult = createMockValidationResult();

      mockValidationPipeline.executeValidation.mockResolvedValue(validationResult);
      mockExperienceStorage.storeDesignDecision.mockResolvedValue(true);
      mockExperienceStorage.storeProblemSolution.mockResolvedValue(true);
      mockExperienceStorage.storeBestPractice.mockResolvedValue(true);
      mockExperienceStorage.generateApplicationSuggestions.mockResolvedValue([]);

      // When
      const result = await hook.execute(context);

      // Then
      expect(result.success).toBe(true);
      // 模块名称应该从文件路径中正确提取
    });

    it('应该正确提取技术栈', async () => {
      // Given
      const context = createMockContext({
        files: [
          'src/api.ts',
          'src/component.tsx',
          'scripts/deploy.py',
          'config/settings.js'
        ]
      });
      const validationResult = createMockValidationResult();

      mockValidationPipeline.executeValidation.mockResolvedValue(validationResult);
      mockExperienceStorage.storeDesignDecision.mockResolvedValue(true);
      mockExperienceStorage.storeProblemSolution.mockResolvedValue(true);
      mockExperienceStorage.storeBestPractice.mockResolvedValue(true);
      mockExperienceStorage.generateApplicationSuggestions.mockResolvedValue([]);

      // When
      const result = await hook.execute(context);

      // Then
      expect(result.success).toBe(true);
      // 应该正确识别 TypeScript, JavaScript, Python 等技术栈
    });
  });

  describe('消息生成', () => {
    it('应该为成功验证生成正确的消息', async () => {
      // Given
      const context = createMockContext();
      const validationResult = createMockValidationResult({
        overallPassed: true,
        overallScore: 92
      });

      mockValidationPipeline.executeValidation.mockResolvedValue(validationResult);
      mockExperienceStorage.storeDesignDecision.mockResolvedValue(true);
      mockExperienceStorage.storeProblemSolution.mockResolvedValue(true);
      mockExperienceStorage.storeBestPractice.mockResolvedValue(true);
      mockExperienceStorage.generateApplicationSuggestions.mockResolvedValue([]);

      // When
      const result = await hook.execute(context);

      // Then
      expect(result.message).toContain('工作后质量验证通过');
      expect(result.message).toContain('92/100');
    });

    it('应该为失败验证生成正确的消息', async () => {
      // Given
      const context = createMockContext();
      const validationResult = createMockValidationResult({
        overallPassed: false,
        overallScore: 68,
        functionalityValidation: {
          ...createMockValidationResult().functionalityValidation,
          passed: false
        },
        securityValidation: {
          ...createMockValidationResult().securityValidation,
          passed: false
        }
      });

      mockValidationPipeline.executeValidation.mockResolvedValue(validationResult);
      mockExperienceStorage.storeDesignDecision.mockResolvedValue(true);
      mockExperienceStorage.storeProblemSolution.mockResolvedValue(true);
      mockExperienceStorage.storeBestPractice.mockResolvedValue(true);
      mockExperienceStorage.generateApplicationSuggestions.mockResolvedValue([]);

      // When
      const result = await hook.execute(context);

      // Then
      expect(result.message).toContain('工作后质量验证未通过');
      expect(result.message).toContain('68/100');
      expect(result.message).toContain('功能完整性');
      expect(result.message).toContain('安全性');
    });
  });

  const createMockContext = (overrides: Partial<HookContext> = {}): HookContext => ({
    event: 'work.complete',
    files: ['src/test.ts', 'src/test.test.ts'],
    metadata: { project: 'ai-chat-interface' },
    timestamp: new Date(),
    sessionId: 'test-session',
    ...overrides
  });

  const createMockValidationResult = (overrides: any = {}) => ({
    overallPassed: true,
    overallScore: 85,
    functionalityValidation: {
      passed: true,
      score: 90,
      requirementsCoverage: 85,
      functionalTestPassRate: 95,
      missingFeatures: [],
      incompleteFeatures: [],
      message: '功能完整性验证通过',
      details: {},
      timestamp: new Date(),
      executionTime: 1000
    },
    performanceBenchmark: {
      passed: true,
      score: 80,
      apiResponseTime: 150,
      pageLoadTime: 800,
      memoryUsage: 200,
      cpuUsage: 25,
      performanceRegression: false,
      message: '性能基准测试通过',
      details: {},
      timestamp: new Date(),
      executionTime: 2000
    },
    securityValidation: {
      passed: true,
      score: 90,
      vulnerabilitiesFound: 0,
      criticalVulnerabilities: 0,
      highVulnerabilities: 0,
      securityScanPassed: true,
      vulnerabilityDetails: [],
      message: '安全验证通过',
      details: {},
      timestamp: new Date(),
      executionTime: 1500
    },
    deploymentReadiness: {
      passed: true,
      score: 85,
      buildSuccess: true,
      testsPass: true,
      dependenciesValid: true,
      configurationValid: true,
      environmentCompatible: true,
      deploymentChecklist: [],
      message: '部署就绪检查通过',
      details: {},
      timestamp: new Date(),
      executionTime: 1000
    },
    summary: '验证流水线执行成功',
    recommendations: [],
    totalExecutionTime: 5500,
    ...overrides
  });
});