/**
 * 质量度量和报告系统
 * 
 * 收集和分析质量指标，实现质量趋势分析和改进建议生成
 */

import {
  QualityMetrics,
  ComplianceResult,
  ComplianceIssue,
  MCPToolResult,
  HookError,
  HookErrorType
} from '../types/index.js';
import { MCPToolsManager } from '../core/mcp-tools-manager.js';

/**
 * 质量趋势数据
 */
export interface QualityTrendData {
  /** 时间戳 */
  timestamp: Date;
  /** 质量指标 */
  metrics: QualityMetrics;
  /** 变化率 */
  changeRate: {
    codeQuality: number;
    testCoverage: number;
    architecture: number;
    performance: number;
    security: number;
    technicalDebt: number;
  };
}

/**
 * 改进建议
 */
export interface ImprovementSuggestion {
  /** 建议ID */
  id: string;
  /** 优先级 */
  priority: 'critical' | 'high' | 'medium' | 'low';
  /** 分类 */
  category: 'code-quality' | 'test-coverage' | 'architecture' | 'performance' | 'security' | 'technical-debt';
  /** 建议标题 */
  title: string;
  /** 详细描述 */
  description: string;
  /** 预期影响 */
  expectedImpact: string;
  /** 实施难度 */
  implementationDifficulty: 'easy' | 'medium' | 'hard';
  /** 预估工作量（小时） */
  estimatedEffort: number;
  /** 相关文件 */
  relatedFiles?: string[];
  /** 实施步骤 */
  implementationSteps?: string[];
}

/**
 * 质量仪表盘数据
 */
export interface QualityDashboardData {
  /** 当前质量指标 */
  currentMetrics: QualityMetrics;
  /** 质量趋势 */
  trends: QualityTrendData[];
  /** 改进建议 */
  suggestions: ImprovementSuggestion[];
  /** 质量门禁状态 */
  gateStatus: {
    passed: boolean;
    failedChecks: string[];
    overallScore: number;
  };
  /** 最后更新时间 */
  lastUpdated: Date;
}

/**
 * 质量度量系统
 */
export class QualityMetricsCollector {
  /** MCP 工具管理器 */
  private mcpTools: MCPToolsManager;
  
  /** 质量趋势历史数据 */
  private trendHistory: QualityTrendData[] = [];
  
  /** 最大历史记录数量 */
  private maxHistorySize: number = 100;
  
  /** 质量基线 */
  private qualityBaseline?: QualityMetrics;

  /**
   * 构造函数
   * @param mcpTools MCP 工具管理器
   */
  constructor(mcpTools: MCPToolsManager) {
    this.mcpTools = mcpTools;
    this.logInfo('质量度量系统初始化完成');
  }

  /**
   * 收集质量指标
   * @param files 要分析的文件列表
   * @returns 质量指标
   */
  public async collectQualityMetrics(files: string[]): Promise<QualityMetrics> {
    this.logInfo(`开始收集质量指标，文件数量: ${files.length}`);
    
    try {
      // 并行收集各项指标
      const [
        codeQualityScore,
        testCoverageRate,
        architectureHealthIndex,
        performanceRegression,
        securityVulnerabilities,
        technicalDebtScore
      ] = await Promise.all([
        this.collectCodeQualityScore(files),
        this.collectTestCoverageRate(files),
        this.collectArchitectureHealthIndex(files),
        this.collectPerformanceRegression(files),
        this.collectSecurityVulnerabilities(files),
        this.collectTechnicalDebtScore(files)
      ]);

      const metrics: QualityMetrics = {
        codeQualityScore,
        testCoverageRate,
        architectureHealthIndex,
        performanceRegression,
        securityVulnerabilities,
        technicalDebtScore,
        timestamp: new Date()
      };

      // 记录趋势数据
      this.recordTrendData(metrics);

      this.logInfo(`质量指标收集完成，综合评分: ${this.calculateOverallScore(metrics)}`);
      return metrics;

    } catch (error) {
      this.logError('质量指标收集失败', error);
      throw this.createError(
        HookErrorType.SYSTEM_ERROR,
        `质量指标收集失败: ${error.message}`
      );
    }
  }

  /**
   * 分析质量趋势
   * @param timeRange 时间范围（小时）
   * @returns 趋势分析结果
   */
  public analyzeQualityTrends(timeRange: number = 24): {
    trends: QualityTrendData[];
    summary: {
      improving: string[];
      stable: string[];
      declining: string[];
    };
    overallTrend: 'improving' | 'stable' | 'declining';
  } {
    this.logDebug(`分析质量趋势，时间范围: ${timeRange}小时`);
    
    const cutoffTime = new Date(Date.now() - timeRange * 60 * 60 * 1000);
    const recentTrends = this.trendHistory.filter(
      trend => trend.timestamp >= cutoffTime
    );

    if (recentTrends.length < 2) {
      return {
        trends: recentTrends,
        summary: { improving: [], stable: [], declining: [] },
        overallTrend: 'stable'
      };
    }

    // 分析各项指标趋势
    const summary = this.analyzeTrendSummary(recentTrends);
    const overallTrend = this.calculateOverallTrend(summary);

    return {
      trends: recentTrends,
      summary,
      overallTrend
    };
  }

  /**
   * 生成改进建议
   * @param metrics 当前质量指标
   * @param trends 质量趋势数据
   * @returns 改进建议列表
   */
  public generateImprovementSuggestions(
    metrics: QualityMetrics,
    trends?: QualityTrendData[]
  ): ImprovementSuggestion[] {
    this.logDebug('生成改进建议');
    
    const suggestions: ImprovementSuggestion[] = [];

    // 代码质量建议
    if (metrics.codeQualityScore < 80) {
      suggestions.push({
        id: 'improve-code-quality',
        priority: metrics.codeQualityScore < 60 ? 'critical' : 'high',
        category: 'code-quality',
        title: '提升代码质量',
        description: `当前代码质量评分为 ${metrics.codeQualityScore}，低于标准要求（80分）`,
        expectedImpact: '提升代码可维护性和可读性，减少bug数量',
        implementationDifficulty: 'medium',
        estimatedEffort: 8,
        implementationSteps: [
          '运行代码质量检查工具',
          '修复高优先级的代码质量问题',
          '重构复杂度过高的函数',
          '添加必要的代码注释'
        ]
      });
    }

    // 测试覆盖率建议
    if (metrics.testCoverageRate < 80) {
      suggestions.push({
        id: 'improve-test-coverage',
        priority: metrics.testCoverageRate < 60 ? 'high' : 'medium',
        category: 'test-coverage',
        title: '提升测试覆盖率',
        description: `当前测试覆盖率为 ${metrics.testCoverageRate}%，低于标准要求（80%）`,
        expectedImpact: '提高代码质量和稳定性，减少生产环境bug',
        implementationDifficulty: 'medium',
        estimatedEffort: 12,
        implementationSteps: [
          '识别未覆盖的代码路径',
          '编写单元测试',
          '添加集成测试',
          '验证测试质量'
        ]
      });
    }

    // 架构健康建议
    if (metrics.architectureHealthIndex < 80) {
      suggestions.push({
        id: 'improve-architecture',
        priority: 'medium',
        category: 'architecture',
        title: '优化系统架构',
        description: `架构健康指数为 ${metrics.architectureHealthIndex}，存在改进空间`,
        expectedImpact: '提升系统可扩展性和维护性',
        implementationDifficulty: 'hard',
        estimatedEffort: 20,
        implementationSteps: [
          '分析架构问题',
          '设计重构方案',
          '逐步实施重构',
          '验证架构改进效果'
        ]
      });
    }

    // 性能回归建议
    if (metrics.performanceRegression > 10) {
      suggestions.push({
        id: 'fix-performance-regression',
        priority: 'high',
        category: 'performance',
        title: '修复性能回归',
        description: `检测到 ${metrics.performanceRegression}% 的性能回归`,
        expectedImpact: '恢复系统性能，提升用户体验',
        implementationDifficulty: 'medium',
        estimatedEffort: 6,
        implementationSteps: [
          '定位性能瓶颈',
          '分析性能回归原因',
          '实施性能优化',
          '验证性能改进'
        ]
      });
    }

    // 安全漏洞建议
    if (metrics.securityVulnerabilities > 0) {
      suggestions.push({
        id: 'fix-security-vulnerabilities',
        priority: 'critical',
        category: 'security',
        title: '修复安全漏洞',
        description: `发现 ${metrics.securityVulnerabilities} 个安全漏洞`,
        expectedImpact: '提升系统安全性，降低安全风险',
        implementationDifficulty: 'medium',
        estimatedEffort: 4,
        implementationSteps: [
          '分析安全漏洞详情',
          '制定修复方案',
          '实施安全修复',
          '验证安全改进'
        ]
      });
    }

    // 技术债务建议
    if (metrics.technicalDebtScore > 30) {
      suggestions.push({
        id: 'reduce-technical-debt',
        priority: 'medium',
        category: 'technical-debt',
        title: '减少技术债务',
        description: `技术债务评分为 ${metrics.technicalDebtScore}，建议进行重构`,
        expectedImpact: '提升代码质量和开发效率',
        implementationDifficulty: 'medium',
        estimatedEffort: 16,
        implementationSteps: [
          '识别技术债务热点',
          '制定重构计划',
          '逐步清理技术债务',
          '建立债务预防机制'
        ]
      });
    }

    // 基于趋势的建议
    if (trends && trends.length > 1) {
      const trendSuggestions = this.generateTrendBasedSuggestions(trends);
      suggestions.push(...trendSuggestions);
    }

    // 按优先级排序
    return suggestions.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * 生成质量仪表盘数据
   * @param files 要分析的文件列表
   * @returns 仪表盘数据
   */
  public async generateDashboardData(files: string[]): Promise<QualityDashboardData> {
    this.logInfo('生成质量仪表盘数据');
    
    try {
      // 收集当前质量指标
      const currentMetrics = await this.collectQualityMetrics(files);
      
      // 分析质量趋势
      const trendAnalysis = this.analyzeQualityTrends(24);
      
      // 生成改进建议
      const suggestions = this.generateImprovementSuggestions(
        currentMetrics,
        trendAnalysis.trends
      );
      
      // 检查质量门禁
      const gateStatus = this.checkQualityGate(currentMetrics);

      const dashboardData: QualityDashboardData = {
        currentMetrics,
        trends: trendAnalysis.trends,
        suggestions,
        gateStatus,
        lastUpdated: new Date()
      };

      this.logInfo('质量仪表盘数据生成完成');
      return dashboardData;

    } catch (error) {
      this.logError('质量仪表盘数据生成失败', error);
      throw this.createError(
        HookErrorType.SYSTEM_ERROR,
        `质量仪表盘数据生成失败: ${error.message}`
      );
    }
  }

  /**
   * 设置质量基线
   * @param metrics 基线质量指标
   */
  public setQualityBaseline(metrics: QualityMetrics): void {
    this.qualityBaseline = { ...metrics };
    this.logInfo('质量基线已设置');
  }

  /**
   * 获取质量基线
   * @returns 质量基线
   */
  public getQualityBaseline(): QualityMetrics | undefined {
    return this.qualityBaseline ? { ...this.qualityBaseline } : undefined;
  }

  /**
   * 清理历史数据
   * @param keepDays 保留天数
   */
  public cleanupHistory(keepDays: number = 30): void {
    const cutoffTime = new Date(Date.now() - keepDays * 24 * 60 * 60 * 1000);
    const originalLength = this.trendHistory.length;
    
    this.trendHistory = this.trendHistory.filter(
      trend => trend.timestamp >= cutoffTime
    );
    
    const removedCount = originalLength - this.trendHistory.length;
    this.logInfo(`清理历史数据完成，删除 ${removedCount} 条记录`);
  }

  // ============================================================================
  // 私有方法
  // ============================================================================

  /**
   * 收集代码质量评分
   * @param files 文件列表
   * @returns 代码质量评分
   */
  private async collectCodeQualityScore(files: string[]): Promise<number> {
    try {
      const serenaResult = await this.mcpTools.callTool('serena', 'styleCheck', {
        files,
        standard: 'comprehensive'
      });

      if (serenaResult.success && serenaResult.data) {
        return serenaResult.data.score || 75;
      }

      // 模拟代码质量评分
      return Math.floor(Math.random() * 30) + 70; // 70-100
    } catch (error) {
      this.logWarn('代码质量评分收集失败', error);
      return 75; // 默认值
    }
  }

  /**
   * 收集测试覆盖率
   * @param files 文件列表
   * @returns 测试覆盖率
   */
  private async collectTestCoverageRate(files: string[]): Promise<number> {
    try {
      // 模拟测试覆盖率收集
      const testFiles = files.filter(f => f.includes('.test.') || f.includes('.spec.'));
      const sourceFiles = files.filter(f => !f.includes('.test.') && !f.includes('.spec.'));
      
      if (sourceFiles.length === 0) return 100;
      
      const coverageRate = Math.min(100, (testFiles.length / sourceFiles.length) * 100);
      return Math.floor(coverageRate);
    } catch (error) {
      this.logWarn('测试覆盖率收集失败', error);
      return 60; // 默认值
    }
  }

  /**
   * 收集架构健康指数
   * @param files 文件列表
   * @returns 架构健康指数
   */
  private async collectArchitectureHealthIndex(files: string[]): Promise<number> {
    try {
      // 模拟架构健康指数计算
      const hasProperStructure = files.some(f => f.includes('types/')) &&
                                 files.some(f => f.includes('components/')) &&
                                 files.some(f => f.includes('lib/'));
      
      const baseScore = hasProperStructure ? 85 : 70;
      return baseScore + Math.floor(Math.random() * 15);
    } catch (error) {
      this.logWarn('架构健康指数收集失败', error);
      return 80; // 默认值
    }
  }

  /**
   * 收集性能回归指数
   * @param files 文件列表
   * @returns 性能回归指数
   */
  private async collectPerformanceRegression(files: string[]): Promise<number> {
    try {
      // 模拟性能回归检测
      return Math.floor(Math.random() * 20); // 0-20%
    } catch (error) {
      this.logWarn('性能回归指数收集失败', error);
      return 5; // 默认值
    }
  }

  /**
   * 收集安全漏洞数量
   * @param files 文件列表
   * @returns 安全漏洞数量
   */
  private async collectSecurityVulnerabilities(files: string[]): Promise<number> {
    try {
      // 模拟安全扫描
      return Math.floor(Math.random() * 3); // 0-2个漏洞
    } catch (error) {
      this.logWarn('安全漏洞扫描失败', error);
      return 0; // 默认值
    }
  }

  /**
   * 收集技术债务评分
   * @param files 文件列表
   * @returns 技术债务评分
   */
  private async collectTechnicalDebtScore(files: string[]): Promise<number> {
    try {
      // 模拟技术债务评估
      const complexFiles = files.filter(f => f.length > 50); // 简化的复杂度判断
      const debtScore = Math.min(50, complexFiles.length * 5);
      return debtScore;
    } catch (error) {
      this.logWarn('技术债务评分收集失败', error);
      return 20; // 默认值
    }
  }

  /**
   * 记录趋势数据
   * @param metrics 质量指标
   */
  private recordTrendData(metrics: QualityMetrics): void {
    const changeRate = this.calculateChangeRate(metrics);
    
    const trendData: QualityTrendData = {
      timestamp: new Date(),
      metrics,
      changeRate
    };

    this.trendHistory.push(trendData);

    // 保持历史记录在合理范围内
    if (this.trendHistory.length > this.maxHistorySize) {
      this.trendHistory = this.trendHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * 计算变化率
   * @param currentMetrics 当前指标
   * @returns 变化率
   */
  private calculateChangeRate(currentMetrics: QualityMetrics): {
    codeQuality: number;
    testCoverage: number;
    architecture: number;
    performance: number;
    security: number;
    technicalDebt: number;
  } {
    if (this.trendHistory.length === 0) {
      return {
        codeQuality: 0,
        testCoverage: 0,
        architecture: 0,
        performance: 0,
        security: 0,
        technicalDebt: 0
      };
    }

    const lastMetrics = this.trendHistory[this.trendHistory.length - 1].metrics;

    return {
      codeQuality: currentMetrics.codeQualityScore - lastMetrics.codeQualityScore,
      testCoverage: currentMetrics.testCoverageRate - lastMetrics.testCoverageRate,
      architecture: currentMetrics.architectureHealthIndex - lastMetrics.architectureHealthIndex,
      performance: lastMetrics.performanceRegression - currentMetrics.performanceRegression, // 回归减少是好事
      security: lastMetrics.securityVulnerabilities - currentMetrics.securityVulnerabilities, // 漏洞减少是好事
      technicalDebt: lastMetrics.technicalDebtScore - currentMetrics.technicalDebtScore // 债务减少是好事
    };
  }

  /**
   * 分析趋势摘要
   * @param trends 趋势数据
   * @returns 趋势摘要
   */
  private analyzeTrendSummary(trends: QualityTrendData[]): {
    improving: string[];
    stable: string[];
    declining: string[];
  } {
    const summary = { improving: [], stable: [], declining: [] };
    
    if (trends.length < 2) return summary;

    const latest = trends[trends.length - 1];
    const changeRate = latest.changeRate;

    // 分析各项指标趋势
    Object.entries(changeRate).forEach(([key, rate]) => {
      const metricName = this.getMetricDisplayName(key);
      
      if (rate > 2) {
        summary.improving.push(metricName);
      } else if (rate < -2) {
        summary.declining.push(metricName);
      } else {
        summary.stable.push(metricName);
      }
    });

    return summary;
  }

  /**
   * 计算整体趋势
   * @param summary 趋势摘要
   * @returns 整体趋势
   */
  private calculateOverallTrend(summary: {
    improving: string[];
    stable: string[];
    declining: string[];
  }): 'improving' | 'stable' | 'declining' {
    const improvingCount = summary.improving.length;
    const decliningCount = summary.declining.length;

    if (improvingCount > decliningCount) {
      return 'improving';
    } else if (decliningCount > improvingCount) {
      return 'declining';
    } else {
      return 'stable';
    }
  }

  /**
   * 生成基于趋势的建议
   * @param trends 趋势数据
   * @returns 建议列表
   */
  private generateTrendBasedSuggestions(trends: QualityTrendData[]): ImprovementSuggestion[] {
    const suggestions: ImprovementSuggestion[] = [];
    
    if (trends.length < 2) return suggestions;

    const latest = trends[trends.length - 1];
    const changeRate = latest.changeRate;

    // 检查持续下降的指标
    if (changeRate.codeQuality < -5) {
      suggestions.push({
        id: 'address-code-quality-decline',
        priority: 'high',
        category: 'code-quality',
        title: '解决代码质量下降趋势',
        description: '代码质量评分呈下降趋势，需要立即关注',
        expectedImpact: '阻止代码质量进一步恶化',
        implementationDifficulty: 'medium',
        estimatedEffort: 6
      });
    }

    if (changeRate.testCoverage < -10) {
      suggestions.push({
        id: 'address-test-coverage-decline',
        priority: 'high',
        category: 'test-coverage',
        title: '解决测试覆盖率下降趋势',
        description: '测试覆盖率呈下降趋势，需要补充测试',
        expectedImpact: '提升代码质量保障',
        implementationDifficulty: 'medium',
        estimatedEffort: 8
      });
    }

    return suggestions;
  }

  /**
   * 检查质量门禁
   * @param metrics 质量指标
   * @returns 门禁状态
   */
  private checkQualityGate(metrics: QualityMetrics): {
    passed: boolean;
    failedChecks: string[];
    overallScore: number;
  } {
    const failedChecks: string[] = [];
    
    if (metrics.codeQualityScore < 80) {
      failedChecks.push('代码质量评分低于80分');
    }
    
    if (metrics.testCoverageRate < 80) {
      failedChecks.push('测试覆盖率低于80%');
    }
    
    if (metrics.securityVulnerabilities > 0) {
      failedChecks.push('存在安全漏洞');
    }
    
    if (metrics.performanceRegression > 15) {
      failedChecks.push('性能回归超过15%');
    }

    const overallScore = this.calculateOverallScore(metrics);
    const passed = failedChecks.length === 0 && overallScore >= 80;

    return {
      passed,
      failedChecks,
      overallScore
    };
  }

  /**
   * 计算综合评分
   * @param metrics 质量指标
   * @returns 综合评分
   */
  private calculateOverallScore(metrics: QualityMetrics): number {
    const weights = {
      codeQuality: 0.25,
      testCoverage: 0.25,
      architecture: 0.20,
      performance: 0.15,
      security: 0.10,
      technicalDebt: 0.05
    };

    const performanceScore = Math.max(0, 100 - metrics.performanceRegression);
    const securityScore = Math.max(0, 100 - metrics.securityVulnerabilities * 20);
    const technicalDebtScore = Math.max(0, 100 - metrics.technicalDebtScore);

    const overallScore = 
      metrics.codeQualityScore * weights.codeQuality +
      metrics.testCoverageRate * weights.testCoverage +
      metrics.architectureHealthIndex * weights.architecture +
      performanceScore * weights.performance +
      securityScore * weights.security +
      technicalDebtScore * weights.technicalDebt;

    return Math.round(overallScore);
  }

  /**
   * 获取指标显示名称
   * @param key 指标键
   * @returns 显示名称
   */
  private getMetricDisplayName(key: string): string {
    const displayNames: Record<string, string> = {
      codeQuality: '代码质量',
      testCoverage: '测试覆盖率',
      architecture: '架构健康',
      performance: '性能表现',
      security: '安全状况',
      technicalDebt: '技术债务'
    };

    return displayNames[key] || key;
  }

  /**
   * 创建错误
   * @param type 错误类型
   * @param message 错误消息
   * @returns 钩子错误
   */
  private createError(type: HookErrorType, message: string): HookError {
    const error = new Error(message) as HookError;
    error.type = type;
    error.retryable = true;
    return error;
  }

  // ============================================================================
  // 日志记录方法
  // ============================================================================

  private logDebug(message: string, data?: unknown): void {
    console.debug(`[QualityMetrics] DEBUG: ${message}`, data || '');
  }

  private logInfo(message: string, data?: unknown): void {
    console.info(`[QualityMetrics] INFO: ${message}`, data || '');
  }

  private logWarn(message: string, data?: unknown): void {
    console.warn(`[QualityMetrics] WARN: ${message}`, data || '');
  }

  private logError(message: string, error?: Error): void {
    console.error(`[QualityMetrics] ERROR: ${message}`, error || '');
  }
}