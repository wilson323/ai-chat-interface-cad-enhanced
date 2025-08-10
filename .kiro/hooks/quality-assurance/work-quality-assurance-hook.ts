/**
 * 工作质量保证钩子
 * 
 * 实现完整的工作质量保证流程，包括工作前分析、过程监控和质量门禁检查
 */

import { BaseHook } from '../core/base-hook.js';
import {
  HookContext,
  HookResult,
  HookTrigger,
  HookConfiguration,
  QualityMetrics,
  ComplianceResult,
  HookErrorType
} from '../types/index.js';
import { MCPToolsManager } from '../core/mcp-tools-manager.js';
import { QualityAssuranceEngine, TechStackConsistencyResult, CodeQualityPreCheckResult } from './quality-assurance-engine.js';
import { QualityMetricsCollector, QualityDashboardData } from './quality-metrics.js';

/**
 * 工作质量保证结果
 */
export interface WorkQualityAssuranceResult {
  /** 工作前分析结果 */
  preWorkAnalysis?: {
    techStackConsistency: TechStackConsistencyResult;
    codeQualityPreCheck: CodeQualityPreCheckResult;
    overallScore: number;
    readyToProceed: boolean;
    recommendations: string[];
  };
  /** 进度监控结果 */
  progressMonitoring?: {
    currentQualityScore: number;
    qualityTrend: 'improving' | 'stable' | 'declining';
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    activeIssues: number;
    recommendations: string[];
  };
  /** 质量门禁检查结果 */
  qualityGateCheck?: {
    passed: boolean;
    overallScore: number;
    failedChecks: string[];
    blockers: string[];
    warnings: string[];
  };
  /** 仪表盘数据 */
  dashboardData?: QualityDashboardData;
}

/**
 * 工作质量保证钩子
 */
export class WorkQualityAssuranceHook extends BaseHook {
  /** 钩子ID */
  public readonly id = 'work-quality-assurance';
  
  /** 钩子名称 */
  public readonly name = '工作质量保证钩子';
  
  /** 钩子描述 */
  public readonly description = '完整的工作质量保证流程，包括工作前分析、过程监控和质量门禁检查';
  
  /** 触发器配置 */
  public readonly triggers: HookTrigger[] = [
    {
      event: 'work.start',
      patterns: ['**/*'],
      conditions: []
    },
    {
      event: 'work.progress',
      patterns: ['**/*'],
      conditions: []
    }
  ];

  /** MCP 工具管理器 */
  private mcpTools: MCPToolsManager;
  
  /** 质量保证分析引擎 */
  private qualityEngine: QualityAssuranceEngine;
  
  /** 质量度量系统 */
  private qualityMetrics: QualityMetricsCollector;
  
  /** 当前监控的文件列表 */
  private monitoredFiles: string[] = [];
  
  /** 质量门禁阈值 */
  private qualityGateThresholds = {
    minimumScore: 90,
    testCoverage: 85,
    codeComplexity: 10,
    technicalDebt: 20
  };

  /**
   * 构造函数
   * @param mcpTools MCP 工具管理器
   * @param config 钩子配置
   */
  constructor(mcpTools?: MCPToolsManager, config?: HookConfiguration) {
    super(config);
    this.mcpTools = mcpTools || new MCPToolsManager();
    this.qualityEngine = new QualityAssuranceEngine(this.mcpTools);
    this.qualityMetrics = new QualityMetricsCollector(this.mcpTools);
    
    // 从配置中读取质量门禁阈值
    if (config?.parameters?.qualityThresholds) {
      this.qualityGateThresholds = {
        ...this.qualityGateThresholds,
        ...config.parameters.qualityThresholds
      };
    }
    
    this.logInfo('工作质量保证钩子初始化完成');
  }

  /**
   * 执行钩子
   * @param context 执行上下文
   * @returns 执行结果
   */
  public async execute(context: HookContext): Promise<HookResult> {
    this.startExecution();
    
    if (!this.validateContext(context)) {
      return this.createFailureResult('执行上下文验证失败');
    }

    try {
      this.logInfo(`执行工作质量保证钩子，事件: ${context.event}`);

      let result: WorkQualityAssuranceResult;

      switch (context.event) {
        case 'work.start':
          result = await this.executePreWorkAnalysis(context);
          break;
        case 'work.progress':
          result = await this.executeProgressMonitoring(context);
          break;
        default:
          return this.createFailureResult(`不支持的事件类型: ${context.event}`);
      }

      // 检查是否需要阻止工作继续
      const shouldBlock = this.shouldBlockWork(result);
      if (shouldBlock.block) {
        return this.createFailureResult(
          `工作质量保证检查失败: ${shouldBlock.reason}`,
          shouldBlock.details,
          result
        );
      }

      return this.createSuccessResult('工作质量保证检查通过', result);

    } catch (error) {
      this.logError('工作质量保证钩子执行失败', error);
      return this.handleError(error, context);
    }
  }

  /**
   * 执行工作前分析
   * @param context 执行上下文
   * @returns 分析结果
   */
  private async executePreWorkAnalysis(context: HookContext): Promise<WorkQualityAssuranceResult> {
    this.logInfo('开始执行工作前质量保证分析');
    
    try {
      // 更新监控文件列表
      this.monitoredFiles = context.files;
      
      // 执行工作前分析
      const preWorkAnalysis = await this.qualityEngine.executePreWorkAnalysis(context.files);
      
      // 生成仪表盘数据
      const dashboardData = await this.qualityMetrics.generateDashboardData(context.files);
      
      // 如果分析通过，开始实时监控
      if (preWorkAnalysis.readyToProceed) {
        this.qualityEngine.startRealTimeMonitoring(context.files);
        this.logInfo('已启动实时质量监控');
      }

      const result: WorkQualityAssuranceResult = {
        preWorkAnalysis,
        dashboardData
      };

      this.logInfo(`工作前分析完成，综合评分: ${preWorkAnalysis.overallScore}, 可继续工作: ${preWorkAnalysis.readyToProceed}`);
      return result;

    } catch (error) {
      this.logError('工作前分析失败', error);
      throw this.createError(
        HookErrorType.VALIDATION_FAILED,
        `工作前分析失败: ${error.message}`
      );
    }
  }

  /**
   * 执行进度监控
   * @param context 执行上下文
   * @returns 监控结果
   */
  private async executeProgressMonitoring(context: HookContext): Promise<WorkQualityAssuranceResult> {
    this.logDebug('执行工作进度质量监控');
    
    try {
      // 获取当前质量状态
      const currentStatus = this.qualityEngine.getCurrentQualityStatus();
      
      if (!currentStatus) {
        // 如果没有监控数据，启动监控
        this.qualityEngine.startRealTimeMonitoring(context.files);
        await this.delay(1000); // 等待监控数据收集
        const newStatus = this.qualityEngine.getCurrentQualityStatus();
        
        if (!newStatus) {
          throw new Error('无法获取质量监控数据');
        }
      }

      // 收集当前质量指标
      const currentMetrics = await this.qualityMetrics.collectQualityMetrics(context.files);
      
      // 分析质量趋势
      const trendAnalysis = this.qualityMetrics.analyzeQualityTrends(1); // 最近1小时
      
      // 生成改进建议
      const suggestions = this.qualityMetrics.generateImprovementSuggestions(
        currentMetrics,
        trendAnalysis.trends
      );

      // 评估风险等级
      const riskLevel = this.assessCurrentRiskLevel(currentMetrics, trendAnalysis.overallTrend);
      
      // 统计活跃问题
      const activeIssues = suggestions.filter(s => 
        s.priority === 'critical' || s.priority === 'high'
      ).length;

      const progressMonitoring = {
        currentQualityScore: this.calculateOverallScore(currentMetrics),
        qualityTrend: trendAnalysis.overallTrend,
        riskLevel,
        activeIssues,
        recommendations: suggestions.slice(0, 5).map(s => s.title) // 前5个建议
      };

      // 执行质量门禁检查
      const qualityGateCheck = await this.executeQualityGateCheck(currentMetrics);

      const result: WorkQualityAssuranceResult = {
        progressMonitoring,
        qualityGateCheck
      };

      this.logDebug(`进度监控完成，质量评分: ${progressMonitoring.currentQualityScore}, 风险等级: ${riskLevel}`);
      return result;

    } catch (error) {
      this.logError('进度监控失败', error);
      throw this.createError(
        HookErrorType.SYSTEM_ERROR,
        `进度监控失败: ${error.message}`
      );
    }
  }

  /**
   * 执行质量门禁检查
   * @param metrics 质量指标
   * @returns 门禁检查结果
   */
  private async executeQualityGateCheck(metrics: QualityMetrics): Promise<{
    passed: boolean;
    overallScore: number;
    failedChecks: string[];
    blockers: string[];
    warnings: string[];
  }> {
    this.logDebug('执行质量门禁检查');
    
    const failedChecks: string[] = [];
    const blockers: string[] = [];
    const warnings: string[] = [];
    
    const overallScore = this.calculateOverallScore(metrics);

    // 检查最低评分要求
    if (overallScore < this.qualityGateThresholds.minimumScore) {
      const message = `综合质量评分 ${overallScore} 低于要求的 ${this.qualityGateThresholds.minimumScore}`;
      failedChecks.push(message);
      if (overallScore < this.qualityGateThresholds.minimumScore - 10) {
        blockers.push(message);
      } else {
        warnings.push(message);
      }
    }

    // 检查测试覆盖率
    if (metrics.testCoverageRate < this.qualityGateThresholds.testCoverage) {
      const message = `测试覆盖率 ${metrics.testCoverageRate}% 低于要求的 ${this.qualityGateThresholds.testCoverage}%`;
      failedChecks.push(message);
      if (metrics.testCoverageRate < this.qualityGateThresholds.testCoverage - 20) {
        blockers.push(message);
      } else {
        warnings.push(message);
      }
    }

    // 检查安全漏洞
    if (metrics.securityVulnerabilities > 0) {
      const message = `发现 ${metrics.securityVulnerabilities} 个安全漏洞`;
      failedChecks.push(message);
      blockers.push(message); // 安全漏洞始终是阻塞项
    }

    // 检查性能回归
    if (metrics.performanceRegression > 15) {
      const message = `性能回归 ${metrics.performanceRegression}% 超过可接受范围`;
      failedChecks.push(message);
      if (metrics.performanceRegression > 25) {
        blockers.push(message);
      } else {
        warnings.push(message);
      }
    }

    // 检查技术债务
    if (metrics.technicalDebtScore > this.qualityGateThresholds.technicalDebt) {
      const message = `技术债务评分 ${metrics.technicalDebtScore} 超过阈值 ${this.qualityGateThresholds.technicalDebt}`;
      failedChecks.push(message);
      warnings.push(message);
    }

    const passed = blockers.length === 0;

    this.logDebug(`质量门禁检查完成，通过: ${passed}, 阻塞项: ${blockers.length}, 警告: ${warnings.length}`);

    return {
      passed,
      overallScore,
      failedChecks,
      blockers,
      warnings
    };
  }

  /**
   * 判断是否应该阻止工作继续
   * @param result 质量保证结果
   * @returns 阻止信息
   */
  private shouldBlockWork(result: WorkQualityAssuranceResult): {
    block: boolean;
    reason?: string;
    details?: string[];
  } {
    // 检查工作前分析
    if (result.preWorkAnalysis && !result.preWorkAnalysis.readyToProceed) {
      return {
        block: true,
        reason: '工作前分析未通过',
        details: result.preWorkAnalysis.recommendations
      };
    }

    // 检查质量门禁
    if (result.qualityGateCheck && !result.qualityGateCheck.passed) {
      if (result.qualityGateCheck.blockers.length > 0) {
        return {
          block: true,
          reason: '质量门禁检查存在阻塞项',
          details: result.qualityGateCheck.blockers
        };
      }
    }

    // 检查进度监控
    if (result.progressMonitoring && result.progressMonitoring.riskLevel === 'critical') {
      return {
        block: true,
        reason: '检测到严重质量风险',
        details: result.progressMonitoring.recommendations
      };
    }

    return { block: false };
  }

  /**
   * 评估当前风险等级
   * @param metrics 质量指标
   * @param trend 质量趋势
   * @returns 风险等级
   */
  private assessCurrentRiskLevel(
    metrics: QualityMetrics,
    trend: 'improving' | 'stable' | 'declining'
  ): 'low' | 'medium' | 'high' | 'critical' {
    const overallScore = this.calculateOverallScore(metrics);
    
    // 严重风险条件
    if (metrics.securityVulnerabilities > 0 || overallScore < 50) {
      return 'critical';
    }
    
    // 高风险条件
    if (overallScore < 70 || (trend === 'declining' && overallScore < 80)) {
      return 'high';
    }
    
    // 中等风险条件
    if (overallScore < 85 || trend === 'declining') {
      return 'medium';
    }
    
    // 低风险
    return 'low';
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
   * 钩子清理
   */
  public async cleanup(): Promise<void> {
    this.logInfo('清理工作质量保证钩子');
    
    try {
      // 停止实时监控
      this.qualityEngine.stopRealTimeMonitoring();
      
      // 清理质量保证引擎
      this.qualityEngine.cleanup();
      
      // 清理质量度量系统历史数据
      this.qualityMetrics.cleanupHistory(7); // 保留7天数据
      
      // 清空监控文件列表
      this.monitoredFiles = [];
      
      this.logInfo('工作质量保证钩子清理完成');
      
    } catch (error) {
      this.logError('钩子清理失败', error);
    }
  }

  /**
   * 获取监控状态
   * @returns 监控状态信息
   */
  public getMonitoringStatus(): {
    isMonitoring: boolean;
    monitoredFiles: string[];
    currentStatus: unknown;
    qualityBaseline: QualityMetrics | undefined;
  } {
    return {
      isMonitoring: this.monitoredFiles.length > 0,
      monitoredFiles: [...this.monitoredFiles],
      currentStatus: this.qualityEngine.getCurrentQualityStatus(),
      qualityBaseline: this.qualityMetrics.getQualityBaseline()
    };
  }

  /**
   * 设置质量基线
   * @param files 文件列表
   */
  public async setQualityBaseline(files: string[]): Promise<void> {
    this.logInfo('设置质量基线');
    
    try {
      const metrics = await this.qualityMetrics.collectQualityMetrics(files);
      this.qualityMetrics.setQualityBaseline(metrics);
      this.logInfo('质量基线设置完成');
    } catch (error) {
      this.logError('质量基线设置失败', error);
      throw error;
    }
  }

  /**
   * 生成质量报告
   * @param files 文件列表
   * @returns 质量报告
   */
  public async generateQualityReport(files: string[]): Promise<QualityDashboardData> {
    this.logInfo('生成质量报告');
    
    try {
      const dashboardData = await this.qualityMetrics.generateDashboardData(files);
      this.logInfo('质量报告生成完成');
      return dashboardData;
    } catch (error) {
      this.logError('质量报告生成失败', error);
      throw error;
    }
  }
}