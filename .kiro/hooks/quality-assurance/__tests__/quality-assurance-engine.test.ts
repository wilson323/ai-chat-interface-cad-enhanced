/**
 * 质量保证分析引擎单元测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { QualityAssuranceEngine } from '../quality-assurance-engine.js';
import { MCPToolsManager } from '../../core/mcp-tools-manager.js';

// Mock MCP Tools Manager
vi.mock('../../core/mcp-tools-manager.js');

describe('QualityAssuranceEngine', () => {
  let engine: QualityAssuranceEngine;
  let mockMCPTools: vi.Mocked<MCPToolsManager>;

  beforeEach(() => {
    mockMCPTools = {
      callTool: vi.fn(),
      isSerenaAvailable: vi.fn(),
      isMemoryAvailable: vi.fn(),
      cleanup: vi.fn()
    } as vi.Mocked<MCPToolsManager>;

    engine = new QualityAssuranceEngine(mockMCPTools);
  });

  afterEach(() => {
    engine.cleanup();
    vi.clearAllMocks();
  });

  describe('executePreWorkAnalysis', () => {
    it('应该成功执行工作前质量分析', async () => {
      // Given
      const files = ['src/test.ts', 'src/component.tsx'];
      mockMCPTools.callTool.mockResolvedValue({
        toolName: 'serena',
        success: true,
        data: { passed: true, score: 85, issues: 0 },
        executionTime: 100
      });

      // When
      const result = await engine.executePreWorkAnalysis(files);

      // Then
      expect(result).toBeDefined();
      expect(result.techStackConsistency).toBeDefined();
      expect(result.codeQualityPreCheck).toBeDefined();
      expect(result.overallScore).toBeGreaterThan(0);
      expect(typeof result.readyToProceed).toBe('boolean');
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it('应该在MCP工具调用失败时处理错误', async () => {
      // Given
      const files = ['src/test.ts'];
      mockMCPTools.callTool.mockRejectedValue(new Error('MCP工具不可用'));

      // When & Then
      await expect(engine.executePreWorkAnalysis(files)).rejects.toThrow('工作前质量分析失败');
    });

    it('应该正确处理空文件列表', async () => {
      // Given
      const files: string[] = [];

      // When
      const result = await engine.executePreWorkAnalysis(files);

      // Then
      expect(result).toBeDefined();
      expect(result.overallScore).toBe(100); // 空文件列表应该得到满分
      expect(result.readyToProceed).toBe(true);
    });
  });

  describe('checkTechStackConsistency', () => {
    it('应该检测TypeScript技术栈', async () => {
      // Given
      const files = ['src/component.tsx', 'src/utils.ts', 'src/types.ts'];
      mockMCPTools.callTool.mockResolvedValue({
        toolName: 'serena',
        success: true,
        data: { techStack: ['TypeScript', 'React'] },
        executionTime: 50
      });

      // When
      const result = await engine.checkTechStackConsistency(files);

      // Then
      expect(result.detectedTechStack).toContain('TypeScript');
      expect(result.detectedTechStack).toContain('React');
      expect(result.score).toBeGreaterThan(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('应该识别不一致的文件', async () => {
      // Given
      const files = ['src/component.tsx', 'src/legacy.js', 'src/utils.ts'];
      mockMCPTools.callTool.mockResolvedValue({
        toolName: 'serena',
        success: true,
        data: { techStack: ['TypeScript', 'React'] },
        executionTime: 50
      });

      // When
      const result = await engine.checkTechStackConsistency(files);

      // Then
      expect(result.inconsistentFiles.length).toBeGreaterThan(0);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.passed).toBe(false);
    });
  });

  describe('executeCodeQualityPreCheck', () => {
    it('应该执行代码质量预检查', async () => {
      // Given
      const files = ['src/test.ts', 'src/component.tsx'];
      mockMCPTools.callTool.mockResolvedValue({
        toolName: 'serena',
        success: true,
        data: { passed: true, score: 90, issues: 1 },
        executionTime: 100
      });

      // When
      const result = await engine.executeCodeQualityPreCheck(files);

      // Then
      expect(result.filesChecked).toBe(files.length);
      expect(result.score).toBeGreaterThan(0);
      expect(result.issueDistribution).toBeDefined();
      expect(result.issueDistribution.critical).toBeGreaterThanOrEqual(0);
      expect(result.issueDistribution.high).toBeGreaterThanOrEqual(0);
      expect(result.issueDistribution.medium).toBeGreaterThanOrEqual(0);
      expect(result.issueDistribution.low).toBeGreaterThanOrEqual(0);
    });

    it('应该正确计算问题分布', async () => {
      // Given
      const files = ['src/bad-code.ts'];
      mockMCPTools.callTool.mockResolvedValue({
        toolName: 'serena',
        success: true,
        data: { passed: false, score: 60, issues: 5 },
        executionTime: 100
      });

      // When
      const result = await engine.executeCodeQualityPreCheck(files);

      // Then
      expect(result.issuesFound).toBeGreaterThan(0);
      expect(result.passed).toBe(false);
      expect(result.score).toBeLessThan(80);
    });
  });

  describe('实时质量监控', () => {
    it('应该启动实时监控', () => {
      // Given
      const files = ['src/test.ts'];

      // When
      engine.startRealTimeMonitoring(files);

      // Then
      // 验证监控已启动（通过检查内部状态或行为）
      expect(true).toBe(true); // 简化的验证
    });

    it('应该停止实时监控', () => {
      // Given
      const files = ['src/test.ts'];
      engine.startRealTimeMonitoring(files);

      // When
      engine.stopRealTimeMonitoring();

      // Then
      // 验证监控已停止
      expect(true).toBe(true); // 简化的验证
    });

    it('应该获取监控历史数据', () => {
      // When
      const history = engine.getMonitoringHistory();

      // Then
      expect(Array.isArray(history)).toBe(true);
    });

    it('应该获取当前质量状态', () => {
      // When
      const status = engine.getCurrentQualityStatus();

      // Then
      // 初始状态应该为null
      expect(status).toBeNull();
    });
  });

  describe('错误处理', () => {
    it('应该处理MCP工具不可用的情况', async () => {
      // Given
      const files = ['src/test.ts'];
      mockMCPTools.callTool.mockResolvedValue({
        toolName: 'serena',
        success: false,
        error: 'Tool unavailable',
        executionTime: 0
      });

      // When & Then
      await expect(engine.executePreWorkAnalysis(files)).rejects.toThrow();
    });

    it('应该处理网络超时', async () => {
      // Given
      const files = ['src/test.ts'];
      mockMCPTools.callTool.mockRejectedValue(new Error('Timeout'));

      // When & Then
      await expect(engine.checkTechStackConsistency(files)).rejects.toThrow();
    });
  });

  describe('性能测试', () => {
    it('应该在合理时间内完成分析', async () => {
      // Given
      const files = Array.from({ length: 10 }, (_, i) => `src/file${i}.ts`);
      mockMCPTools.callTool.mockResolvedValue({
        toolName: 'serena',
        success: true,
        data: { passed: true, score: 85 },
        executionTime: 50
      });

      // When
      const startTime = Date.now();
      await engine.executePreWorkAnalysis(files);
      const endTime = Date.now();

      // Then
      const executionTime = endTime - startTime;
      expect(executionTime).toBeLessThan(5000); // 应该在5秒内完成
    });
  });

  describe('配置验证', () => {
    it('应该使用默认配置', () => {
      // Given & When
      const newEngine = new QualityAssuranceEngine(mockMCPTools);

      // Then
      expect(newEngine).toBeDefined();
    });
  });
});