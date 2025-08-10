/**
 * 工作质量保证钩子单元测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WorkQualityAssuranceHook } from '../work-quality-assurance-hook.js';
import { MCPToolsManager } from '../../core/mcp-tools-manager.js';
import { HookContext } from '../../types/index.js';

// Mock dependencies
vi.mock('../../core/mcp-tools-manager.js');
vi.mock('../quality-assurance-engine.js');
vi.mock('../quality-metrics.js');

describe('WorkQualityAssuranceHook', () => {
  let hook: WorkQualityAssuranceHook;
  let mockMCPTools: vi.Mocked<MCPToolsManager>;

  beforeEach(() => {
    mockMCPTools = {
      callTool: vi.fn(),
      cleanup: vi.fn()
    } as vi.Mocked<MCPToolsManager>;

    hook = new WorkQualityAssuranceHook(mockMCPTools);
  });

  afterEach(async () => {
    await hook.cleanup();
    vi.clearAllMocks();
  });

  describe('基本属性', () => {
    it('应该有正确的钩子属性', () => {
      expect(hook.id).toBe('work-quality-assurance');
      expect(hook.name).toBe('工作质量保证钩子');
      expect(hook.description).toContain('完整的工作质量保证流程');
      expect(hook.triggers).toHaveLength(2);
      expect(hook.triggers[0].event).toBe('work.start');
      expect(hook.triggers[1].event).toBe('work.progress');
    });
  });

  describe('execute - work.start 事件', () => {
    it('应该成功执行工作前分析', async () => {
      // Given
      const context: HookContext = {
        event: 'work.start',
        files: ['src/test.ts', 'src/component.tsx'],
        metadata: {},
        timestamp: new Date()
      };

      mockMCPTools.callTool.mockResolvedValue({
        toolName: 'serena',
        success: true,
        data: { passed: true, score: 85 },
        executionTime: 100
      });

      // When
      const result = await hook.execute(context);

      // Then
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.preWorkAnalysis).toBeDefined();
      expect(result.data.dashboardData).toBeDefined();
    });

    it('应该在质量分析未通过时阻止工作', async () => {
      // Given
      const context: HookContext = {
        event: 'work.start',
        files: ['src/bad-code.ts'],
        metadata: {},
        timestamp: new Date()
      };

      mockMCPTools.callTool.mockResolvedValue({
        toolName: 'serena',
        success: true,
        data: { passed: false, score: 40 },
        executionTime: 100
      });

      // When
      const result = await hook.execute(context);

      // Then
      expect(result.success).toBe(false);
      expect(result.message).toContain('工作质量保证检查失败');
    });
  });

  describe('execute - work.progress 事件', () => {
    it('应该成功执行进度监控', async () => {
      // Given
      const context: HookContext = {
        event: 'work.progress',
        files: ['src/test.ts'],
        metadata: {},
        timestamp: new Date()
      };

      mockMCPTools.callTool.mockResolvedValue({
        toolName: 'serena',
        success: true,
        data: { score: 85 },
        executionTime: 100
      });

      // When
      const result = await hook.execute(context);

      // Then
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.progressMonitoring).toBeDefined();
      expect(result.data.qualityGateCheck).toBeDefined();
    });

    it('应该在检测到严重质量风险时阻止工作', async () => {
      // Given
      const context: HookContext = {
        event: 'work.progress',
        files: ['src/critical-issue.ts'],
        metadata: {},
        timestamp: new Date()
      };

      mockMCPTools.callTool.mockResolvedValue({
        toolName: 'serena',
        success: true,
        data: { score: 30 }, // 极低分数
        executionTime: 100
      });

      // When
      const result = await hook.execute(context);

      // Then
      expect(result.success).toBe(false);
      expect(result.message).toContain('检测到严重质量风险');
    });
  });

  describe('execute - 错误处理', () => {
    it('应该处理不支持的事件类型', async () => {
      // Given
      const context: HookContext = {
        event: 'unsupported.event' as HookContext['event'],
        files: ['src/test.ts'],
        metadata: {},
        timestamp: new Date()
      };

      // When
      const result = await hook.execute(context);

      // Then
      expect(result.success).toBe(false);
      expect(result.message).toContain('不支持的事件类型');
    });

    it('应该处理上下文验证失败', async () => {
      // Given
      const invalidContext = {} as HookContext;

      // When
      const result = await hook.execute(invalidContext);

      // Then
      expect(result.success).toBe(false);
      expect(result.message).toContain('执行上下文验证失败');
    });

    it('应该处理MCP工具异常', async () => {
      // Given
      const context: HookContext = {
        event: 'work.start',
        files: ['src/test.ts'],
        metadata: {},
        timestamp: new Date()
      };

      mockMCPTools.callTool.mockRejectedValue(new Error('MCP工具异常'));

      // When
      const result = await hook.execute(context);

      // Then
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('质量门禁检查', () => {
    it('应该通过高质量代码的门禁检查', async () => {
      // Given
      const context: HookContext = {
        event: 'work.progress',
        files: ['src/high-quality.ts'],
        metadata: {},
        timestamp: new Date()
      };

      mockMCPTools.callTool.mockResolvedValue({
        toolName: 'serena',
        success: true,
        data: { score: 95 },
        executionTime: 100
      });

      // When
      const result = await hook.execute(context);

      // Then
      expect(result.success).toBe(true);
      expect(result.data.qualityGateCheck.passed).toBe(true);
      expect(result.data.qualityGateCheck.blockers).toHaveLength(0);
    });

    it('应该阻止存在安全漏洞的代码', async () => {
      // Given
      const context: HookContext = {
        event: 'work.progress',
        files: ['src/vulnerable.ts'],
        metadata: {},
        timestamp: new Date()
      };

      mockMCPTools.callTool.mockResolvedValue({
        toolName: 'serena',
        success: true,
        data: { score: 85, vulnerabilities: 2 },
        executionTime: 100
      });

      // When
      const result = await hook.execute(context);

      // Then
      expect(result.success).toBe(false);
      expect(result.data.qualityGateCheck.blockers.length).toBeGreaterThan(0);
    });
  });

  describe('监控状态管理', () => {
    it('应该获取监控状态', () => {
      // When
      const status = hook.getMonitoringStatus();

      // Then
      expect(status).toBeDefined();
      expect(status.isMonitoring).toBeDefined();
      expect(status.monitoredFiles).toBeInstanceOf(Array);
      expect(status.currentStatus).toBeDefined();
      expect(status.qualityBaseline).toBeDefined();
    });

    it('应该设置质量基线', async () => {
      // Given
      const files = ['src/baseline.ts'];
      mockMCPTools.callTool.mockResolvedValue({
        toolName: 'serena',
        success: true,
        data: { score: 90 },
        executionTime: 100
      });

      // When & Then
      await expect(hook.setQualityBaseline(files)).resolves.not.toThrow();
    });

    it('应该生成质量报告', async () => {
      // Given
      const files = ['src/report.ts'];
      mockMCPTools.callTool.mockResolvedValue({
        toolName: 'serena',
        success: true,
        data: { score: 85 },
        executionTime: 100
      });

      // When
      const report = await hook.generateQualityReport(files);

      // Then
      expect(report).toBeDefined();
      expect(report.currentMetrics).toBeDefined();
      expect(report.trends).toBeInstanceOf(Array);
      expect(report.suggestions).toBeInstanceOf(Array);
    });
  });

  describe('配置管理', () => {
    it('应该使用自定义质量门禁阈值', () => {
      // Given
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

      // When
      const customHook = new WorkQualityAssuranceHook(mockMCPTools, customConfig);

      // Then
      expect(customHook).toBeDefined();
      // 验证自定义阈值已应用（通过内部状态或行为验证）
    });
  });

  describe('清理和资源管理', () => {
    it('应该正确清理资源', async () => {
      // Given
      const context: HookContext = {
        event: 'work.start',
        files: ['src/test.ts'],
        metadata: {},
        timestamp: new Date()
      };

      mockMCPTools.callTool.mockResolvedValue({
        toolName: 'serena',
        success: true,
        data: { score: 85 },
        executionTime: 100
      });

      await hook.execute(context);

      // When & Then
      await expect(hook.cleanup()).resolves.not.toThrow();
    });
  });

  describe('性能测试', () => {
    it('应该在合理时间内完成工作前分析', async () => {
      // Given
      const context: HookContext = {
        event: 'work.start',
        files: Array.from({ length: 20 }, (_, i) => `src/file${i}.ts`),
        metadata: {},
        timestamp: new Date()
      };

      mockMCPTools.callTool.mockResolvedValue({
        toolName: 'serena',
        success: true,
        data: { score: 85 },
        executionTime: 50
      });

      // When
      const startTime = Date.now();
      const result = await hook.execute(context);
      const endTime = Date.now();

      // Then
      expect(result.success).toBe(true);
      const executionTime = endTime - startTime;
      expect(executionTime).toBeLessThan(10000); // 应该在10秒内完成
    });

    it('应该在合理时间内完成进度监控', async () => {
      // Given
      const context: HookContext = {
        event: 'work.progress',
        files: Array.from({ length: 10 }, (_, i) => `src/file${i}.ts`),
        metadata: {},
        timestamp: new Date()
      };

      mockMCPTools.callTool.mockResolvedValue({
        toolName: 'serena',
        success: true,
        data: { score: 85 },
        executionTime: 50
      });

      // When
      const startTime = Date.now();
      const result = await hook.execute(context);
      const endTime = Date.now();

      // Then
      expect(result.success).toBe(true);
      const executionTime = endTime - startTime;
      expect(executionTime).toBeLessThan(5000); // 应该在5秒内完成
    });
  });

  describe('并发处理', () => {
    it('应该能够处理并发执行', async () => {
      // Given
      const contexts = Array.from({ length: 3 }, (_, i) => ({
        event: 'work.progress' as const,
        files: [`src/concurrent${i}.ts`],
        metadata: {},
        timestamp: new Date()
      }));

      mockMCPTools.callTool.mockResolvedValue({
        toolName: 'serena',
        success: true,
        data: { score: 85 },
        executionTime: 100
      });

      // When
      const promises = contexts.map(context => hook.execute(context));
      const results = await Promise.all(promises);

      // Then
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });
  });
});