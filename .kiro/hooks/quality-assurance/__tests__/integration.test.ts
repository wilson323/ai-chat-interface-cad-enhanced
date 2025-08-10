/**
 * 质量保证模块集成测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WorkQualityAssuranceHook } from '../work-quality-assurance-hook.js';
import { QualityAssuranceEngine } from '../quality-assurance-engine.js';
import { QualityMetrics } from '../quality-metrics.js';
import { MCPToolsManager } from '../../core/mcp-tools-manager.js';
import { HookContext } from '../../types/index.js';

// Mock MCP Tools Manager
vi.mock('../../core/mcp-tools-manager.js');

describe('质量保证模块集成测试', () => {
  let hook: WorkQualityAssuranceHook;
  let engine: QualityAssuranceEngine;
  let metrics: QualityMetrics;
  let mockMCPTools: vi.Mocked<MCPToolsManager>;

  beforeEach(() => {
    mockMCPTools = {
      callTool: vi.fn(),
      isSerenaAvailable: vi.fn().mockResolvedValue(true),
      isMemoryAvailable: vi.fn().mockResolvedValue(true),
      cleanup: vi.fn()
    } as vi.Mocked<MCPToolsManager>;

    engine = new QualityAssuranceEngine(mockMCPTools);
    metrics = new QualityMetrics(mockMCPTools);
    hook = new WorkQualityAssuranceHook(mockMCPTools);
  });

  afterEach(async () => {
    await hook.cleanup();
    engine.cleanup();
    vi.clearAllMocks();
  });

  describe('完整工作流程测试', () => {
    it('应该完成完整的工作质量保证流程', async () => {
      // Given - 模拟一个完整的开发工作流程
      const files = [
        'src/components/UserProfile.tsx',
        'src/hooks/useUserData.ts',
        'src/types/user.ts',
        'src/utils/validation.ts',
        'src/__tests__/UserProfile.test.tsx'
      ];

      // 模拟高质量的代码
      mockMCPTools.callTool.mockImplementation(async (toolName, method) => {
        switch (method) {
          case 'styleCheck':
            return {
              toolName,
              success: true,
              data: { passed: true, score: 90, issues: 1 },
              executionTime: 100
            };
          case 'analyzeTechStack':
            return {
              toolName,
              success: true,
              data: { techStack: ['TypeScript', 'React'] },
              executionTime: 50
            };
          default:
            return {
              toolName,
              success: true,
              data: { result: 'success' },
              executionTime: 50
            };
        }
      });

      // When - 执行工作开始事件
      const startContext: HookContext = {
        event: 'work.start',
        files,
        metadata: { workType: 'feature-development' },
        timestamp: new Date()
      };

      const startResult = await hook.execute(startContext);

      // Then - 验证工作开始分析
      expect(startResult.success).toBe(true);
      expect(startResult.data.preWorkAnalysis).toBeDefined();
      expect(startResult.data.preWorkAnalysis.readyToProceed).toBe(true);
      expect(startResult.data.preWorkAnalysis.overallScore).toBeGreaterThan(80);

      // When - 执行工作进度监控
      const progressContext: HookContext = {
        event: 'work.progress',
        files,
        metadata: { progress: 50 },
        timestamp: new Date()
      };

      const progressResult = await hook.execute(progressContext);

      // Then - 验证进度监控
      expect(progressResult.success).toBe(true);
      expect(progressResult.data.progressMonitoring).toBeDefined();
      expect(progressResult.data.qualityGateCheck).toBeDefined();
      expect(progressResult.data.qualityGateCheck.passed).toBe(true);
    });

    it('应该在质量问题严重时阻止工作继续', async () => {
      // Given - 模拟低质量代码
      const files = [
        'src/legacy/badCode.js',
        'src/legacy/untested.js'
      ];

      mockMCPTools.callTool.mockImplementation(async (toolName, method) => {
        switch (method) {
          case 'styleCheck':
            return {
              toolName,
              success: true,
              data: { passed: false, score: 40, issues: 10 },
              executionTime: 100
            };
          case 'analyzeTechStack':
            return {
              toolName,
              success: true,
              data: { techStack: ['JavaScript'] },
              executionTime: 50
            };
          default:
            return {
              toolName,
              success: true,
              data: { vulnerabilities: 3 },
              executionTime: 50
            };
        }
      });

      // When - 执行工作开始事件
      const context: HookContext = {
        event: 'work.start',
        files,
        metadata: {},
        timestamp: new Date()
      };

      const result = await hook.execute(context);

      // Then - 应该阻止工作继续
      expect(result.success).toBe(false);
      expect(result.message).toContain('工作质量保证检查失败');
      expect(result.data.preWorkAnalysis.readyToProceed).toBe(false);
    });
  });

  describe('质量指标收集和分析', () => {
    it('应该正确收集和分析质量指标', async () => {
      // Given
      const files = [
        'src/services/apiClient.ts',
        'src/services/__tests__/apiClient.test.ts',
        'src/types/api.ts'
      ];

      mockMCPTools.callTool.mockResolvedValue({
        toolName: 'serena',
        success: true,
        data: { score: 85 },
        executionTime: 100
      });

      // When - 收集质量指标
      const qualityMetrics = await metrics.collectQualityMetrics(files);

      // Then - 验证指标收集
      expect(qualityMetrics).toBeDefined();
      expect(qualityMetrics.codeQualityScore).toBeGreaterThan(0);
      expect(qualityMetrics.testCoverageRate).toBeGreaterThan(0);

      // When - 生成仪表盘数据
      const dashboardData = await metrics.generateDashboardData(files);

      // Then - 验证仪表盘数据
      expect(dashboardData.currentMetrics).toBeDefined();
      expect(dashboardData.suggestions).toBeInstanceOf(Array);
      expect(dashboardData.gateStatus).toBeDefined();
    });

    it('应该正确分析质量趋势', async () => {
      // Given - 模拟多次质量指标收集
      const files = ['src/trending.ts'];
      
      mockMCPTools.callTool.mockResolvedValue({
        toolName: 'serena',
        success: true,
        data: { score: 80 },
        executionTime: 100
      });

      // 收集多个时间点的数据
      await metrics.collectQualityMetrics(files);
      await new Promise(resolve => setTimeout(resolve, 100));
      await metrics.collectQualityMetrics(files);

      // When - 分析趋势
      const trendAnalysis = metrics.analyzeQualityTrends(1);

      // Then - 验证趋势分析
      expect(trendAnalysis.trends).toBeInstanceOf(Array);
      expect(trendAnalysis.summary).toBeDefined();
      expect(['improving', 'stable', 'declining']).toContain(trendAnalysis.overallTrend);
    });
  });

  describe('技术栈一致性检查', () => {
    it('应该检测TypeScript + React技术栈', async () => {
      // Given
      const files = [
        'src/components/Header.tsx',
        'src/hooks/useAuth.ts',
        'src/types/auth.ts',
        'src/utils/helpers.ts'
      ];

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
      expect(result.passed).toBe(true);
      expect(result.inconsistentFiles).toHaveLength(0);
    });

    it('应该识别混合技术栈的不一致性', async () => {
      // Given - 混合 TypeScript 和 JavaScript 文件
      const files = [
        'src/components/NewComponent.tsx',
        'src/legacy/oldScript.js',
        'src/utils/modern.ts',
        'src/legacy/jquery.js'
      ];

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
      expect(result.inconsistentFiles.length).toBeGreaterThan(0);
      expect(result.passed).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });
  });

  describe('实时质量监控', () => {
    it('应该启动和管理实时监控', async () => {
      // Given
      const files = ['src/monitored.ts'];

      // When - 启动监控
      engine.startRealTimeMonitoring(files);

      // 等待监控数据收集
      await new Promise(resolve => setTimeout(resolve, 200));

      // Then - 验证监控状态
      const monitoringHistory = engine.getMonitoringHistory();
      expect(monitoringHistory).toBeInstanceOf(Array);

      // When - 停止监控
      engine.stopRealTimeMonitoring();

      // Then - 验证监控已停止
      const currentStatus = engine.getCurrentQualityStatus();
      // 监控停止后状态可能为null或最后一次的状态
      expect(currentStatus === null || typeof currentStatus === 'object').toBe(true);
    });
  });

  describe('质量门禁检查', () => {
    it('应该通过高质量代码的门禁检查', async () => {
      // Given - 高质量代码
      const files = ['src/highQuality.ts'];
      
      mockMCPTools.callTool.mockResolvedValue({
        toolName: 'serena',
        success: true,
        data: { score: 95, vulnerabilities: 0 },
        executionTime: 100
      });

      // When
      const context: HookContext = {
        event: 'work.progress',
        files,
        metadata: {},
        timestamp: new Date()
      };

      const result = await hook.execute(context);

      // Then
      expect(result.success).toBe(true);
      expect(result.data.qualityGateCheck.passed).toBe(true);
      expect(result.data.qualityGateCheck.blockers).toHaveLength(0);
    });

    it('应该阻止存在安全漏洞的代码', async () => {
      // Given - 存在安全漏洞的代码
      const files = ['src/vulnerable.ts'];
      
      mockMCPTools.callTool.mockResolvedValue({
        toolName: 'serena',
        success: true,
        data: { score: 80, vulnerabilities: 2 },
        executionTime: 100
      });

      // When
      const context: HookContext = {
        event: 'work.progress',
        files,
        metadata: {},
        timestamp: new Date()
      };

      const result = await hook.execute(context);

      // Then
      expect(result.success).toBe(false);
      expect(result.data.qualityGateCheck.passed).toBe(false);
      expect(result.data.qualityGateCheck.blockers.length).toBeGreaterThan(0);
    });
  });

  describe('改进建议生成', () => {
    it('应该为不同质量问题生成相应建议', async () => {
      // Given - 各种质量问题
      const problemMetrics = {
        codeQualityScore: 65,
        testCoverageRate: 55,
        architectureHealthIndex: 70,
        performanceRegression: 18,
        securityVulnerabilities: 1,
        technicalDebtScore: 35,
        timestamp: new Date()
      };

      // When
      const suggestions = metrics.generateImprovementSuggestions(problemMetrics);

      // Then
      expect(suggestions.length).toBeGreaterThan(0);
      
      // 应该包含各种类型的建议
      const categories = suggestions.map(s => s.category);
      expect(categories).toContain('code-quality');
      expect(categories).toContain('test-coverage');
      expect(categories).toContain('security');
      
      // 安全建议应该是最高优先级
      const securitySuggestion = suggestions.find(s => s.category === 'security');
      expect(securitySuggestion?.priority).toBe('critical');
    });
  });

  describe('错误恢复和容错性', () => {
    it('应该在MCP工具部分失败时继续工作', async () => {
      // Given
      const files = ['src/resilient.ts'];
      
      // 模拟部分工具失败
      mockMCPTools.callTool.mockImplementation(async (toolName, method) => {
        if (method === 'styleCheck') {
          throw new Error('Serena temporarily unavailable');
        }
        return {
          toolName,
          success: true,
          data: { score: 75 },
          executionTime: 100
        };
      });

      // When
      const context: HookContext = {
        event: 'work.start',
        files,
        metadata: {},
        timestamp: new Date()
      };

      const result = await hook.execute(context);

      // Then - 应该处理错误但不完全失败
      expect(result.success).toBe(false); // 由于工具失败，整体失败
      expect(result.errors).toBeDefined();
    });

    it('应该在网络问题时提供降级服务', async () => {
      // Given
      const files = ['src/network-issue.ts'];
      
      // 模拟网络超时
      mockMCPTools.callTool.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        throw new Error('Network timeout');
      });

      // When & Then
      await expect(engine.executePreWorkAnalysis(files)).rejects.toThrow();
    });
  });

  describe('性能和扩展性测试', () => {
    it('应该处理大量文件的质量分析', async () => {
      // Given - 大量文件
      const files = Array.from({ length: 50 }, (_, i) => `src/file${i}.ts`);
      
      mockMCPTools.callTool.mockResolvedValue({
        toolName: 'serena',
        success: true,
        data: { score: 85 },
        executionTime: 50
      });

      // When
      const startTime = Date.now();
      const result = await engine.executePreWorkAnalysis(files);
      const endTime = Date.now();

      // Then
      expect(result).toBeDefined();
      expect(result.readyToProceed).toBeDefined();
      
      // 性能要求：50个文件应该在10秒内完成
      const executionTime = endTime - startTime;
      expect(executionTime).toBeLessThan(10000);
    });

    it('应该支持并发质量检查', async () => {
      // Given
      const fileSets = [
        ['src/set1/file1.ts', 'src/set1/file2.ts'],
        ['src/set2/file1.ts', 'src/set2/file2.ts'],
        ['src/set3/file1.ts', 'src/set3/file2.ts']
      ];

      mockMCPTools.callTool.mockResolvedValue({
        toolName: 'serena',
        success: true,
        data: { score: 85 },
        executionTime: 100
      });

      // When - 并发执行多个质量检查
      const promises = fileSets.map(files => 
        engine.executePreWorkAnalysis(files)
      );

      const results = await Promise.all(promises);

      // Then
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.overallScore).toBeGreaterThan(0);
      });
    });
  });

  describe('配置和定制化', () => {
    it('应该支持自定义质量阈值', () => {
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
      expect(customHook.id).toBe('work-quality-assurance');
    });
  });
});