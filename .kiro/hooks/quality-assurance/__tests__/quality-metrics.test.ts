/**
 * 质量度量系统单元测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { QualityMetricsCollector } from '../quality-metrics.js';
import { MCPToolsManager } from '../../core/mcp-tools-manager.js';

// Mock MCP Tools Manager
vi.mock('../../core/mcp-tools-manager.js');

describe('QualityMetricsCollector', () => {
  let qualityMetrics: QualityMetricsCollector;
  let mockMCPTools: vi.Mocked<MCPToolsManager>;

  beforeEach(() => {
    mockMCPTools = {
      callTool: vi.fn(),
      cleanup: vi.fn()
    } as vi.Mocked<MCPToolsManager>;

    qualityMetrics = new QualityMetricsCollector(mockMCPTools);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('collectQualityMetrics', () => {
    it('应该成功收集质量指标', async () => {
      // Given
      const files = ['src/test.ts', 'src/component.tsx'];
      mockMCPTools.callTool.mockResolvedValue({
        toolName: 'serena',
        success: true,
        data: { score: 85 },
        executionTime: 100
      });

      // When
      const metrics = await qualityMetrics.collectQualityMetrics(files);

      // Then
      expect(metrics).toBeDefined();
      expect(metrics.codeQualityScore).toBeGreaterThan(0);
      expect(metrics.testCoverageRate).toBeGreaterThanOrEqual(0);
      expect(metrics.architectureHealthIndex).toBeGreaterThan(0);
      expect(metrics.performanceRegression).toBeGreaterThanOrEqual(0);
      expect(metrics.securityVulnerabilities).toBeGreaterThanOrEqual(0);
      expect(metrics.technicalDebtScore).toBeGreaterThanOrEqual(0);
      expect(metrics.timestamp).toBeInstanceOf(Date);
    });

    it('应该处理MCP工具调用失败', async () => {
      // Given
      const files = ['src/test.ts'];
      mockMCPTools.callTool.mockRejectedValue(new Error('Tool failed'));

      // When & Then
      await expect(qualityMetrics.collectQualityMetrics(files)).rejects.toThrow('质量指标收集失败');
    });

    it('应该正确处理空文件列表', async () => {
      // Given
      const files: string[] = [];

      // When
      const metrics = await qualityMetrics.collectQualityMetrics(files);

      // Then
      expect(metrics).toBeDefined();
      expect(metrics.testCoverageRate).toBe(100); // 空文件列表应该有100%覆盖率
    });
  });

  describe('analyzeQualityTrends', () => {
    it('应该分析质量趋势', () => {
      // When
      const analysis = qualityMetrics.analyzeQualityTrends(24);

      // Then
      expect(analysis).toBeDefined();
      expect(analysis.trends).toBeInstanceOf(Array);
      expect(analysis.summary).toBeDefined();
      expect(analysis.summary.improving).toBeInstanceOf(Array);
      expect(analysis.summary.stable).toBeInstanceOf(Array);
      expect(analysis.summary.declining).toBeInstanceOf(Array);
      expect(['improving', 'stable', 'declining']).toContain(analysis.overallTrend);
    });

    it('应该处理没有历史数据的情况', () => {
      // When
      const analysis = qualityMetrics.analyzeQualityTrends(1);

      // Then
      expect(analysis.trends).toHaveLength(0);
      expect(analysis.overallTrend).toBe('stable');
    });
  });

  describe('generateImprovementSuggestions', () => {
    it('应该为低质量代码生成改进建议', () => {
      // Given
      const metrics = {
        codeQualityScore: 60,
        testCoverageRate: 50,
        architectureHealthIndex: 70,
        performanceRegression: 15,
        securityVulnerabilities: 2,
        technicalDebtScore: 40,
        timestamp: new Date()
      };

      // When
      const suggestions = qualityMetrics.generateImprovementSuggestions(metrics);

      // Then
      expect(suggestions.length).toBeGreaterThan(0);
      
      // 应该包含代码质量改进建议
      const codeQualitySuggestion = suggestions.find(s => s.category === 'code-quality');
      expect(codeQualitySuggestion).toBeDefined();
      expect(codeQualitySuggestion?.priority).toBe('high');
      
      // 应该包含测试覆盖率改进建议
      const testCoverageSuggestion = suggestions.find(s => s.category === 'test-coverage');
      expect(testCoverageSuggestion).toBeDefined();
      
      // 应该包含安全漏洞修复建议
      const securitySuggestion = suggestions.find(s => s.category === 'security');
      expect(securitySuggestion).toBeDefined();
      expect(securitySuggestion?.priority).toBe('critical');
    });

    it('应该为高质量代码生成较少建议', () => {
      // Given
      const metrics = {
        codeQualityScore: 95,
        testCoverageRate: 90,
        architectureHealthIndex: 95,
        performanceRegression: 2,
        securityVulnerabilities: 0,
        technicalDebtScore: 10,
        timestamp: new Date()
      };

      // When
      const suggestions = qualityMetrics.generateImprovementSuggestions(metrics);

      // Then
      expect(suggestions.length).toBeLessThan(3);
    });

    it('应该按优先级排序建议', () => {
      // Given
      const metrics = {
        codeQualityScore: 50,
        testCoverageRate: 40,
        architectureHealthIndex: 60,
        performanceRegression: 20,
        securityVulnerabilities: 1,
        technicalDebtScore: 50,
        timestamp: new Date()
      };

      // When
      const suggestions = qualityMetrics.generateImprovementSuggestions(metrics);

      // Then
      expect(suggestions.length).toBeGreaterThan(0);
      
      // 第一个建议应该是最高优先级
      expect(suggestions[0].priority).toBe('critical');
      
      // 验证排序正确性
      const priorities = suggestions.map(s => s.priority);
      const priorityOrder = ['critical', 'high', 'medium', 'low'];
      
      for (let i = 1; i < priorities.length; i++) {
        const currentIndex = priorityOrder.indexOf(priorities[i]);
        const previousIndex = priorityOrder.indexOf(priorities[i - 1]);
        expect(currentIndex).toBeGreaterThanOrEqual(previousIndex);
      }
    });
  });

  describe('generateDashboardData', () => {
    it('应该生成完整的仪表盘数据', async () => {
      // Given
      const files = ['src/test.ts', 'src/component.tsx'];
      mockMCPTools.callTool.mockResolvedValue({
        toolName: 'serena',
        success: true,
        data: { score: 85 },
        executionTime: 100
      });

      // When
      const dashboardData = await qualityMetrics.generateDashboardData(files);

      // Then
      expect(dashboardData).toBeDefined();
      expect(dashboardData.currentMetrics).toBeDefined();
      expect(dashboardData.trends).toBeInstanceOf(Array);
      expect(dashboardData.suggestions).toBeInstanceOf(Array);
      expect(dashboardData.gateStatus).toBeDefined();
      expect(dashboardData.gateStatus.passed).toBeDefined();
      expect(dashboardData.gateStatus.overallScore).toBeGreaterThan(0);
      expect(dashboardData.lastUpdated).toBeInstanceOf(Date);
    });
  });

  describe('质量基线管理', () => {
    it('应该设置和获取质量基线', () => {
      // Given
      const baselineMetrics = {
        codeQualityScore: 85,
        testCoverageRate: 80,
        architectureHealthIndex: 90,
        performanceRegression: 5,
        securityVulnerabilities: 0,
        technicalDebtScore: 15,
        timestamp: new Date()
      };

      // When
      qualityMetrics.setQualityBaseline(baselineMetrics);
      const retrievedBaseline = qualityMetrics.getQualityBaseline();

      // Then
      expect(retrievedBaseline).toBeDefined();
      expect(retrievedBaseline?.codeQualityScore).toBe(85);
      expect(retrievedBaseline?.testCoverageRate).toBe(80);
    });

    it('应该在没有基线时返回undefined', () => {
      // When
      const baseline = qualityMetrics.getQualityBaseline();

      // Then
      expect(baseline).toBeUndefined();
    });
  });

  describe('历史数据管理', () => {
    it('应该清理过期的历史数据', async () => {
      // Given
      const files = ['src/test.ts'];
      mockMCPTools.callTool.mockResolvedValue({
        toolName: 'serena',
        success: true,
        data: { score: 85 },
        executionTime: 100
      });

      // 添加一些历史数据
      await qualityMetrics.collectQualityMetrics(files);
      await qualityMetrics.collectQualityMetrics(files);

      // When
      qualityMetrics.cleanupHistory(0); // 清理所有数据

      // Then
      const trends = qualityMetrics.analyzeQualityTrends(24);
      expect(trends.trends.length).toBe(0);
    });
  });

  describe('性能测试', () => {
    it('应该在合理时间内收集指标', async () => {
      // Given
      const files = Array.from({ length: 20 }, (_, i) => `src/file${i}.ts`);
      mockMCPTools.callTool.mockResolvedValue({
        toolName: 'serena',
        success: true,
        data: { score: 85 },
        executionTime: 50
      });

      // When
      const startTime = Date.now();
      await qualityMetrics.collectQualityMetrics(files);
      const endTime = Date.now();

      // Then
      const executionTime = endTime - startTime;
      expect(executionTime).toBeLessThan(3000); // 应该在3秒内完成
    });

    it('应该在合理时间内生成仪表盘数据', async () => {
      // Given
      const files = Array.from({ length: 10 }, (_, i) => `src/file${i}.ts`);
      mockMCPTools.callTool.mockResolvedValue({
        toolName: 'serena',
        success: true,
        data: { score: 85 },
        executionTime: 50
      });

      // When
      const startTime = Date.now();
      await qualityMetrics.generateDashboardData(files);
      const endTime = Date.now();

      // Then
      const executionTime = endTime - startTime;
      expect(executionTime).toBeLessThan(5000); // 应该在5秒内完成
    });
  });

  describe('边界条件测试', () => {
    it('应该处理极端质量指标值', () => {
      // Given
      const extremeMetrics = {
        codeQualityScore: 0,
        testCoverageRate: 0,
        architectureHealthIndex: 0,
        performanceRegression: 100,
        securityVulnerabilities: 10,
        technicalDebtScore: 100,
        timestamp: new Date()
      };

      // When
      const suggestions = qualityMetrics.generateImprovementSuggestions(extremeMetrics);

      // Then
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.priority === 'critical')).toBe(true);
    });

    it('应该处理完美质量指标值', () => {
      // Given
      const perfectMetrics = {
        codeQualityScore: 100,
        testCoverageRate: 100,
        architectureHealthIndex: 100,
        performanceRegression: 0,
        securityVulnerabilities: 0,
        technicalDebtScore: 0,
        timestamp: new Date()
      };

      // When
      const suggestions = qualityMetrics.generateImprovementSuggestions(perfectMetrics);

      // Then
      expect(suggestions.length).toBe(0);
    });
  });
});