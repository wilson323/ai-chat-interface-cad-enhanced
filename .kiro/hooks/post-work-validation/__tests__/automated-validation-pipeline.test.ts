/**
 * 自动化验证流水线单元测试
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { AutomatedValidationPipeline } from '../automated-validation-pipeline';
import { MCPToolsManager } from '../../core/mcp-tools-manager';

// Mock MCPToolsManager
vi.mock('../../core/mcp-tools-manager');
vi.mock('../../core/hook-logger');

describe('AutomatedValidationPipeline', () => {
  let pipeline: AutomatedValidationPipeline;
  let mockMCPTools: jest.Mocked<MCPToolsManager>;

  beforeEach(() => {
    mockMCPTools = {
      isSerenaAvailable: vi.fn(),
      callSerena: vi.fn(),
      isMentorAvailable: vi.fn(),
      callMentor: vi.fn(),
      isMemoryAvailable: vi.fn(),
      callMemory: vi.fn(),
      isSequentialThinkingAvailable: vi.fn(),
      callSequentialThinking: vi.fn(),
      isContext7Available: vi.fn(),
      callContext7: vi.fn(),
      isTaskManagerAvailable: vi.fn(),
      callTaskManager: vi.fn(),
      getToolsStatus: vi.fn(),
      validateToolsReady: vi.fn()
    } as any;

    pipeline = new AutomatedValidationPipeline(mockMCPTools);
  });

  describe('executeValidation', () => {
    it('应该成功执行完整的验证流水线', async () => {
      // Given
      const files = ['src/test.ts', 'src/test.test.ts'];
      const context = { projectType: 'typescript' };

      mockMCPTools.isSerenaAvailable.mockResolvedValue(true);
      mockMCPTools.callSerena.mockResolvedValue({
        coveragePercentage: 95,
        vulnerabilities: []
      });

      // When
      const result = await pipeline.executeValidation(files, context);

      // Then
      expect(result).toBeDefined();
      expect(result.overallPassed).toBeDefined();
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
      expect(result.functionalityValidation).toBeDefined();
      expect(result.performanceBenchmark).toBeDefined();
      expect(result.securityValidation).toBeDefined();
      expect(result.deploymentReadiness).toBeDefined();
      expect(result.summary).toBeTruthy();
      expect(Array.isArray(result.recommendations)).toBe(true);
      expect(result.totalExecutionTime).toBeGreaterThan(0);
    });

    it('应该在所有验证通过时返回成功结果', async () => {
      // Given
      const files = ['src/high-quality.ts'];
      
      mockMCPTools.isSerenaAvailable.mockResolvedValue(true);
      mockMCPTools.callSerena.mockResolvedValue({
        coveragePercentage: 98,
        vulnerabilities: []
      });

      // When
      const result = await pipeline.executeValidation(files);

      // Then
      expect(result.overallPassed).toBe(true);
      expect(result.overallScore).toBeGreaterThan(80);
      expect(result.functionalityValidation.passed).toBe(true);
      expect(result.securityValidation.passed).toBe(true);
      expect(result.deploymentReadiness.passed).toBe(true);
    });

    it('应该在验证失败时返回失败结果', async () => {
      // Given
      const files = ['src/problematic.ts'];
      
      mockMCPTools.isSerenaAvailable.mockResolvedValue(true);
      mockMCPTools.callSerena.mockResolvedValue({
        coveragePercentage: 30,
        vulnerabilities: [
          { severity: 'critical', type: 'sql-injection', description: 'SQL注入漏洞' }
        ]
      });

      // When
      const result = await pipeline.executeValidation(files);

      // Then
      expect(result.overallPassed).toBe(false);
      expect(result.overallScore).toBeLessThan(80);
      expect(result.securityValidation.criticalVulnerabilities).toBeGreaterThan(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('应该处理 MCP 工具不可用的情况', async () => {
      // Given
      const files = ['src/test.ts'];
      
      mockMCPTools.isSerenaAvailable.mockResolvedValue(false);

      // When
      const result = await pipeline.executeValidation(files);

      // Then
      expect(result).toBeDefined();
      expect(result.functionalityValidation.requirementsCoverage).toBeGreaterThanOrEqual(0);
      // 应该使用默认实现而不是抛出错误
    });

    it('应该处理验证过程中的错误', async () => {
      // Given
      const files = ['src/test.ts'];
      
      mockMCPTools.isSerenaAvailable.mockRejectedValue(new Error('网络错误'));

      // When & Then
      await expect(pipeline.executeValidation(files)).rejects.toThrow('验证流水线执行失败');
    });
  });

  describe('功能完整性验证', () => {
    it('应该正确计算需求覆盖率', async () => {
      // Given
      const files = ['src/feature1.ts', 'src/feature2.ts', 'src/feature1.test.ts'];
      
      mockMCPTools.isSerenaAvailable.mockResolvedValue(true);
      mockMCPTools.callSerena.mockResolvedValue({
        coveragePercentage: 85
      });

      // When
      const result = await pipeline.executeValidation(files);

      // Then
      expect(result.functionalityValidation.requirementsCoverage).toBe(85);
      expect(result.functionalityValidation.functionalTestPassRate).toBeGreaterThan(0);
    });

    it('应该识别缺失和不完整的功能', async () => {
      // Given
      const files = ['src/incomplete.ts'];
      
      mockMCPTools.isSerenaAvailable.mockResolvedValue(true);
      mockMCPTools.callSerena.mockResolvedValue({
        coveragePercentage: 60
      });

      // When
      const result = await pipeline.executeValidation(files);

      // Then
      expect(Array.isArray(result.functionalityValidation.missingFeatures)).toBe(true);
      expect(Array.isArray(result.functionalityValidation.incompleteFeatures)).toBe(true);
    });
  });

  describe('性能基准测试', () => {
    it('应该测量 API 响应时间和页面加载时间', async () => {
      // Given
      const files = ['src/api.ts'];

      // When
      const result = await pipeline.executeValidation(files);

      // Then
      expect(result.performanceBenchmark.apiResponseTime).toBeGreaterThan(0);
      expect(result.performanceBenchmark.pageLoadTime).toBeGreaterThan(0);
      expect(result.performanceBenchmark.memoryUsage).toBeGreaterThan(0);
      expect(result.performanceBenchmark.cpuUsage).toBeGreaterThanOrEqual(0);
    });

    it('应该检测性能回归', async () => {
      // Given
      const files = ['src/slow-api.ts'];

      // When
      const result = await pipeline.executeValidation(files);

      // Then
      expect(typeof result.performanceBenchmark.performanceRegression).toBe('boolean');
    });
  });

  describe('安全验证', () => {
    it('应该检测安全漏洞', async () => {
      // Given
      const files = ['src/vulnerable.ts'];
      
      mockMCPTools.isSerenaAvailable.mockResolvedValue(true);
      mockMCPTools.callSerena.mockResolvedValue({
        vulnerabilities: [
          {
            severity: 'high',
            type: 'xss',
            description: 'XSS漏洞',
            file: 'src/vulnerable.ts',
            line: 42
          }
        ]
      });

      // When
      const result = await pipeline.executeValidation(files);

      // Then
      expect(result.securityValidation.vulnerabilitiesFound).toBe(1);
      expect(result.securityValidation.highVulnerabilities).toBe(1);
      expect(result.securityValidation.vulnerabilityDetails).toHaveLength(1);
      expect(result.securityValidation.vulnerabilityDetails[0].severity).toBe('high');
    });

    it('应该在没有关键漏洞时通过安全验证', async () => {
      // Given
      const files = ['src/secure.ts'];
      
      mockMCPTools.isSerenaAvailable.mockResolvedValue(true);
      mockMCPTools.callSerena.mockResolvedValue({
        vulnerabilities: []
      });

      // When
      const result = await pipeline.executeValidation(files);

      // Then
      expect(result.securityValidation.passed).toBe(true);
      expect(result.securityValidation.criticalVulnerabilities).toBe(0);
      expect(result.securityValidation.securityScanPassed).toBe(true);
    });
  });

  describe('部署就绪检查', () => {
    it('应该检查所有部署就绪项目', async () => {
      // Given
      const files = ['src/app.ts'];

      // When
      const result = await pipeline.executeValidation(files);

      // Then
      expect(result.deploymentReadiness.buildSuccess).toBeDefined();
      expect(result.deploymentReadiness.testsPass).toBeDefined();
      expect(result.deploymentReadiness.dependenciesValid).toBeDefined();
      expect(result.deploymentReadiness.configurationValid).toBeDefined();
      expect(result.deploymentReadiness.environmentCompatible).toBeDefined();
      expect(Array.isArray(result.deploymentReadiness.deploymentChecklist)).toBe(true);
    });

    it('应该生成部署检查清单', async () => {
      // Given
      const files = ['src/app.ts'];

      // When
      const result = await pipeline.executeValidation(files);

      // Then
      const checklist = result.deploymentReadiness.deploymentChecklist;
      expect(checklist.length).toBeGreaterThan(0);
      expect(checklist.every(item => 
        item.item && 
        ['passed', 'failed', 'warning'].includes(item.status)
      )).toBe(true);
    });
  });

  describe('综合评分', () => {
    it('应该正确计算整体分数', async () => {
      // Given
      const files = ['src/test.ts'];
      
      mockMCPTools.isSerenaAvailable.mockResolvedValue(true);
      mockMCPTools.callSerena.mockResolvedValue({
        coveragePercentage: 90,
        vulnerabilities: []
      });

      // When
      const result = await pipeline.executeValidation(files);

      // Then
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
      
      // 验证分数计算逻辑
      const expectedScore = Math.round(
        (result.functionalityValidation.score * 0.3) +
        (result.performanceBenchmark.score * 0.25) +
        (result.securityValidation.score * 0.25) +
        (result.deploymentReadiness.score * 0.2)
      );
      expect(result.overallScore).toBe(expectedScore);
    });

    it('应该生成有意义的摘要和建议', async () => {
      // Given
      const files = ['src/test.ts'];

      // When
      const result = await pipeline.executeValidation(files);

      // Then
      expect(result.summary).toBeTruthy();
      expect(result.summary.length).toBeGreaterThan(10);
      expect(Array.isArray(result.recommendations)).toBe(true);
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations.every(rec => typeof rec === 'string' && rec.length > 0)).toBe(true);
    });
  });

  describe('错误处理', () => {
    it('应该优雅处理网络错误', async () => {
      // Given
      const files = ['src/test.ts'];
      
      mockMCPTools.isSerenaAvailable.mockRejectedValue(new Error('网络连接失败'));

      // When & Then
      await expect(pipeline.executeValidation(files)).rejects.toThrow('验证流水线执行失败: 网络连接失败');
    });

    it('应该处理空文件列表', async () => {
      // Given
      const files: string[] = [];

      // When
      const result = await pipeline.executeValidation(files);

      // Then
      expect(result).toBeDefined();
      expect(result.functionalityValidation.requirementsCoverage).toBeGreaterThanOrEqual(0);
    });

    it('应该处理无效的上下文数据', async () => {
      // Given
      const files = ['src/test.ts'];
      const invalidContext = { invalid: null, undefined: undefined };

      // When
      const result = await pipeline.executeValidation(files, invalidContext);

      // Then
      expect(result).toBeDefined();
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe('执行时间监控', () => {
    it('应该记录各个验证阶段的执行时间', async () => {
      // Given
      const files = ['src/test.ts'];

      // When
      const result = await pipeline.executeValidation(files);

      // Then
      expect(result.totalExecutionTime).toBeGreaterThan(0);
      expect(result.functionalityValidation.executionTime).toBeGreaterThan(0);
      expect(result.performanceBenchmark.executionTime).toBeGreaterThan(0);
      expect(result.securityValidation.executionTime).toBeGreaterThan(0);
      expect(result.deploymentReadiness.executionTime).toBeGreaterThan(0);
    });

    it('应该在合理时间内完成验证', async () => {
      // Given
      const files = ['src/test.ts'];
      const startTime = Date.now();

      // When
      const result = await pipeline.executeValidation(files);

      // Then
      const actualExecutionTime = Date.now() - startTime;
      expect(actualExecutionTime).toBeLessThan(10000); // 应该在10秒内完成
      expect(result.totalExecutionTime).toBeLessThanOrEqual(actualExecutionTime + 100); // 允许一些误差
    });
  });
});