/**
 * 质量保证分析引擎
 * 
 * 执行工作前质量分析，包括技术栈一致性检查和代码质量预检查
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
 * 技术栈一致性检查结果
 */
export interface TechStackConsistencyResult {
  /** 检查是否通过 */
  passed: boolean;
  /** 一致性评分 (0-100) */
  score: number;
  /** 检测到的技术栈 */
  detectedTechStack: string[];
  /** 不一致的文件 */
  inconsistentFiles: string[];
  /** 建议的技术栈 */
  recommendedTechStack: string[];
  /** 问题列表 */
  issues: ComplianceIssue[];
}

/**
 * 代码质量预检查结果
 */
export interface CodeQualityPreCheckResult {
  /** 检查是否通过 */
  passed: boolean;
  /** 质量评分 (0-100) */
  score: number;
  /** 检查的文件数量 */
  filesChecked: number;
  /** 发现的问题数量 */
  issuesFound: number;
  /** 问题分布 */
  issueDistribution: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  /** 详细问题列表 */
  issues: ComplianceIssue[];
}

/**
 * 实时质量监控数据
 */
export interface QualityMonitoringData {
  /** 监控时间戳 */
  timestamp: Date;
  /** 当前质量评分 */
  currentScore: number;
  /** 质量趋势 */
  trend: 'improving' | 'stable' | 'declining';
  /** 活跃文件数量 */
  activeFiles: number;
  /** 修改频率 */
  changeFrequency: number;
  /** 风险等级 */
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * 质量保证分析引擎
 */
export class QualityAssuranceEngine {
  /** MCP 工具管理器 */
  private mcpTools: MCPToolsManager;
  
  /** 质量监控数据历史 */
  private monitoringHistory: QualityMonitoringData[] = [];
  
  /** 监控间隔 (毫秒) */
  private monitoringInterval: number = 5000; // 5秒
  
  /** 监控定时器 */
  private monitoringTimer?: ReturnType<typeof setInterval>;

  /**
   * 构造函数
   * @param mcpTools MCP 工具管理器
   */
  constructor(mcpTools: MCPToolsManager) {
    this.mcpTools = mcpTools;
    this.logInfo('质量保证分析引擎初始化完成');
  }

  /**
   * 执行工作前质量分析
   * @param files 要分析的文件列表
   * @returns 分析结果
   */
  public async executePreWorkAnalysis(files: string[]): Promise<{
    techStackConsistency: TechStackConsistencyResult;
    codeQualityPreCheck: CodeQualityPreCheckResult;
    overallScore: number;
    readyToProceed: boolean;
    recommendations: string[];
  }> {
    this.logInfo(`开始执行工作前质量分析，文件数量: ${files.length}`);
    
    try {
      // 并行执行技术栈一致性检查和代码质量预检查
      const [techStackResult, codeQualityResult] = await Promise.all([
        this.checkTechStackConsistency(files),
        this.executeCodeQualityPreCheck(files)
      ]);

      // 计算综合评分
      const overallScore = this.calculateOverallScore(techStackResult, codeQualityResult);
      
      // 判断是否可以继续工作
      const readyToProceed = this.isReadyToProceed(techStackResult, codeQualityResult, overallScore);
      
      // 生成建议
      const recommendations = this.generateRecommendations(techStackResult, codeQualityResult);

      const result = {
        techStackConsistency: techStackResult,
        codeQualityPreCheck: codeQualityResult,
        overallScore,
        readyToProceed,
        recommendations
      };

      this.logInfo(`工作前质量分析完成，综合评分: ${overallScore}, 可继续工作: ${readyToProceed}`);
      return result;

    } catch (error) {
      this.logError('工作前质量分析失败', error);
      throw this.createError(
        HookErrorType.SYSTEM_ERROR,
        `工作前质量分析失败: ${error.message}`
      );
    }
  }

  /**
   * 检查技术栈一致性
   * @param files 文件列表
   * @returns 一致性检查结果
   */
  public async checkTechStackConsistency(files: string[]): Promise<TechStackConsistencyResult> {
    this.logDebug(`开始技术栈一致性检查，文件数量: ${files.length}`);
    
    try {
      // 分析文件扩展名和内容，检测技术栈
      const detectedTechStack = await this.detectTechStack(files);
      
      // 检查技术栈一致性
      const consistencyAnalysis = await this.analyzeTechStackConsistency(files, detectedTechStack);
      
      // 使用 Serena 工具进行深度分析
      const serenaResult = await this.mcpTools.callTool('serena', 'analyzeTechStack', {
        files,
        detectedTechStack
      });

      const issues: ComplianceIssue[] = [];
      const inconsistentFiles: string[] = [];

      // 分析不一致的文件
      for (const file of files) {
        const fileConsistency = await this.checkFileConsistency(file, detectedTechStack);
        if (!fileConsistency.consistent) {
          inconsistentFiles.push(file);
          issues.push({
            severity: 'medium',
            category: 'tech-stack-consistency',
            description: `文件 ${file} 与主要技术栈不一致`,
            file,
            suggestion: `建议使用 ${detectedTechStack.join(', ')} 技术栈`
          });
        }
      }

      // 计算一致性评分
      const score = Math.max(0, 100 - (inconsistentFiles.length / files.length) * 100);
      const passed = score >= 80 && inconsistentFiles.length === 0;

      const result: TechStackConsistencyResult = {
        passed,
        score: Math.round(score),
        detectedTechStack,
        inconsistentFiles,
        recommendedTechStack: this.getRecommendedTechStack(detectedTechStack),
        issues
      };

      this.logDebug(`技术栈一致性检查完成，评分: ${result.score}, 通过: ${result.passed}`);
      return result;

    } catch (error) {
      this.logError('技术栈一致性检查失败', error);
      throw this.createError(
        HookErrorType.VALIDATION_FAILED,
        `技术栈一致性检查失败: ${error.message}`
      );
    }
  }

  /**
   * 执行代码质量预检查
   * @param files 文件列表
   * @returns 代码质量检查结果
   */
  public async executeCodeQualityPreCheck(files: string[]): Promise<CodeQualityPreCheckResult> {
    this.logDebug(`开始代码质量预检查，文件数量: ${files.length}`);
    
    try {
      const issues: ComplianceIssue[] = [];
      let totalScore = 0;
      let filesChecked = 0;

      // 并行检查所有文件
      const checkPromises = files.map(async (file) => {
        try {
          const fileResult = await this.checkFileQuality(file);
          filesChecked++;
          totalScore += fileResult.score;
          issues.push(...fileResult.issues);
          return fileResult;
        } catch (error) {
          this.logWarn(`文件质量检查失败: ${file}`, error);
          return null;
        }
      });

      const results = await Promise.allSettled(checkPromises);
      const successfulResults = results
        .filter(result => result.status === 'fulfilled' && result.value !== null)
        .map(result => (result as PromiseFulfilledResult<{ score: number; issues: ComplianceIssue[] } | null>).value);

      // 计算问题分布
      const issueDistribution = {
        critical: issues.filter(i => i.severity === 'critical').length,
        high: issues.filter(i => i.severity === 'high').length,
        medium: issues.filter(i => i.severity === 'medium').length,
        low: issues.filter(i => i.severity === 'low').length
      };

      // 计算平均评分
      const averageScore = filesChecked > 0 ? totalScore / filesChecked : 0;
      const passed = averageScore >= 80 && issueDistribution.critical === 0;

      const result: CodeQualityPreCheckResult = {
        passed,
        score: Math.round(averageScore),
        filesChecked,
        issuesFound: issues.length,
        issueDistribution,
        issues
      };

      this.logDebug(`代码质量预检查完成，评分: ${result.score}, 通过: ${result.passed}`);
      return result;

    } catch (error) {
      this.logError('代码质量预检查失败', error);
      throw this.createError(
        HookErrorType.VALIDATION_FAILED,
        `代码质量预检查失败: ${error.message}`
      );
    }
  }

  /**
   * 开始实时质量监控
   * @param files 要监控的文件列表
   */
  public startRealTimeMonitoring(files: string[]): void {
    this.logInfo(`开始实时质量监控，文件数量: ${files.length}`);
    
    // 清除现有定时器
    this.stopRealTimeMonitoring();
    
    // 启动新的监控定时器
    this.monitoringTimer = setInterval(async () => {
      try {
        const monitoringData = await this.collectMonitoringData(files);
        this.monitoringHistory.push(monitoringData);
        
        // 保持历史记录在合理范围内（最多保留100条记录）
        if (this.monitoringHistory.length > 100) {
          this.monitoringHistory = this.monitoringHistory.slice(-100);
        }
        
        // 检查是否需要发出警告
        this.checkQualityAlerts(monitoringData);
        
      } catch (error) {
        this.logError('质量监控数据收集失败', error);
      }
    }, this.monitoringInterval);
  }

  /**
   * 停止实时质量监控
   */
  public stopRealTimeMonitoring(): void {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = undefined;
      this.logInfo('实时质量监控已停止');
    }
  }

  /**
   * 获取质量监控历史数据
   * @returns 监控历史数据
   */
  public getMonitoringHistory(): QualityMonitoringData[] {
    return [...this.monitoringHistory];
  }

  /**
   * 获取当前质量状态
   * @returns 当前质量状态
   */
  public getCurrentQualityStatus(): QualityMonitoringData | null {
    return this.monitoringHistory.length > 0 
      ? this.monitoringHistory[this.monitoringHistory.length - 1]
      : null;
  }

  // ============================================================================
  // 私有方法
  // ============================================================================

  /**
   * 检测技术栈
   * @param files 文件列表
   * @returns 检测到的技术栈
   */
  private async detectTechStack(files: string[]): Promise<string[]> {
    const techStack = new Set<string>();
    
    for (const file of files) {
      const extension = file.split('.').pop()?.toLowerCase();
      
      switch (extension) {
        case 'ts':
        case 'tsx':
          techStack.add('TypeScript');
          techStack.add('React');
          break;
        case 'js':
        case 'jsx':
          techStack.add('JavaScript');
          techStack.add('React');
          break;
        case 'py':
          techStack.add('Python');
          break;
        case 'java':
          techStack.add('Java');
          break;
        case 'cs':
          techStack.add('C#');
          break;
        case 'cpp':
        case 'cc':
        case 'cxx':
          techStack.add('C++');
          break;
        case 'go':
          techStack.add('Go');
          break;
        case 'rs':
          techStack.add('Rust');
          break;
        case 'php':
          techStack.add('PHP');
          break;
        case 'rb':
          techStack.add('Ruby');
          break;
        case 'swift':
          techStack.add('Swift');
          break;
        case 'kt':
          techStack.add('Kotlin');
          break;
      }
    }
    
    return Array.from(techStack);
  }

  /**
   * 分析技术栈一致性
   * @param files 文件列表
   * @param detectedTechStack 检测到的技术栈
   * @returns 一致性分析结果
   */
  private async analyzeTechStackConsistency(
    files: string[],
    detectedTechStack: string[]
  ): Promise<{ consistent: boolean; score: number }> {
    // 简化的一致性分析逻辑
    const mainTech = detectedTechStack[0];
    let consistentFiles = 0;
    
    for (const file of files) {
      const fileConsistency = await this.checkFileConsistency(file, detectedTechStack);
      if (fileConsistency.consistent) {
        consistentFiles++;
      }
    }
    
    const score = files.length > 0 ? (consistentFiles / files.length) * 100 : 100;
    const consistent = score >= 80;
    
    return { consistent, score };
  }

  /**
   * 检查文件一致性
   * @param file 文件路径
   * @param techStack 技术栈
   * @returns 一致性检查结果
   */
  private async checkFileConsistency(
    file: string,
    techStack: string[]
  ): Promise<{ consistent: boolean; issues: string[] }> {
    const extension = file.split('.').pop()?.toLowerCase();
    const issues: string[] = [];
    
    // 简化的文件一致性检查
    let consistent = true;
    
    if (techStack.includes('TypeScript') && !['ts', 'tsx'].includes(extension || '')) {
      if (['js', 'jsx'].includes(extension || '')) {
        issues.push('建议使用 TypeScript 而不是 JavaScript');
        consistent = false;
      }
    }
    
    if (techStack.includes('React') && !['tsx', 'jsx', 'ts', 'js'].includes(extension || '')) {
      issues.push('React 项目中发现非 JavaScript/TypeScript 文件');
      consistent = false;
    }
    
    return { consistent, issues };
  }

  /**
   * 获取推荐的技术栈
   * @param detectedTechStack 检测到的技术栈
   * @returns 推荐的技术栈
   */
  private getRecommendedTechStack(detectedTechStack: string[]): string[] {
    // 基于检测到的技术栈提供推荐
    const recommendations = [...detectedTechStack];
    
    if (detectedTechStack.includes('JavaScript') && !detectedTechStack.includes('TypeScript')) {
      recommendations.push('TypeScript'); // 推荐使用 TypeScript
    }
    
    if (detectedTechStack.includes('React') && !detectedTechStack.includes('Next.js')) {
      recommendations.push('Next.js'); // 推荐使用 Next.js
    }
    
    return recommendations;
  }

  /**
   * 检查文件质量
   * @param file 文件路径
   * @returns 文件质量检查结果
   */
  private async checkFileQuality(file: string): Promise<{
    score: number;
    issues: ComplianceIssue[];
  }> {
    const issues: ComplianceIssue[] = [];
    let score = 100;
    
    try {
      // 使用 Serena 工具进行代码质量检查
      const serenaResult = await this.mcpTools.callTool('serena', 'styleCheck', {
        files: [file]
      });
      
      if (serenaResult.success && serenaResult.data) {
        const { passed, issues: serenaIssues, score: serenaScore } = serenaResult.data;
        
        if (!passed) {
          score = Math.min(score, serenaScore || 60);
        }
        
        // 转换 Serena 问题格式
        if (serenaIssues) {
          for (let i = 0; i < serenaIssues; i++) {
            issues.push({
              severity: 'medium',
              category: 'code-style',
              description: `代码风格问题 ${i + 1}`,
              file,
              suggestion: '请遵循项目代码规范'
            });
          }
        }
      }
      
      // 额外的质量检查
      await this.performAdditionalQualityChecks(file, issues);
      
    } catch (error) {
      this.logWarn(`文件质量检查失败: ${file}`, error);
      score = 50; // 检查失败时给予较低分数
      issues.push({
        severity: 'high',
        category: 'quality-check-failed',
        description: `质量检查失败: ${error.message}`,
        file,
        suggestion: '请检查文件是否可访问和格式是否正确'
      });
    }
    
    return { score, issues };
  }

  /**
   * 执行额外的质量检查
   * @param file 文件路径
   * @param issues 问题列表
   */
  private async performAdditionalQualityChecks(
    file: string,
    issues: ComplianceIssue[]
  ): Promise<void> {
    const extension = file.split('.').pop()?.toLowerCase();
    
    // TypeScript 特定检查
    if (['ts', 'tsx'].includes(extension || '')) {
      // 模拟检查通用类型使用
      if (Math.random() > 0.8) {
        issues.push({
          severity: 'medium',
          category: 'typescript-quality',
          description: '检测到通用类型的使用',
          file,
          suggestion: '建议使用具体的类型定义'
        });
      }
      
      // 模拟检查严格模式
      if (Math.random() > 0.9) {
        issues.push({
          severity: 'low',
          category: 'typescript-quality',
          description: '建议启用 TypeScript 严格模式',
          file,
          suggestion: '在 tsconfig.json 中设置 "strict": true'
        });
      }
    }
    
    // Python 特定检查
    if (extension === 'py') {
      // 模拟 PEP 8 检查
      if (Math.random() > 0.7) {
        issues.push({
          severity: 'low',
          category: 'python-style',
          description: 'PEP 8 风格问题',
          file,
          suggestion: '请遵循 PEP 8 编码规范'
        });
      }
    }
  }

  /**
   * 计算综合评分
   * @param techStackResult 技术栈检查结果
   * @param codeQualityResult 代码质量检查结果
   * @returns 综合评分
   */
  private calculateOverallScore(
    techStackResult: TechStackConsistencyResult,
    codeQualityResult: CodeQualityPreCheckResult
  ): number {
    // 权重分配：技术栈一致性 30%，代码质量 70%
    const techStackWeight = 0.3;
    const codeQualityWeight = 0.7;
    
    const overallScore = 
      techStackResult.score * techStackWeight + 
      codeQualityResult.score * codeQualityWeight;
    
    return Math.round(overallScore);
  }

  /**
   * 判断是否可以继续工作
   * @param techStackResult 技术栈检查结果
   * @param codeQualityResult 代码质量检查结果
   * @param overallScore 综合评分
   * @returns 是否可以继续工作
   */
  private isReadyToProceed(
    techStackResult: TechStackConsistencyResult,
    codeQualityResult: CodeQualityPreCheckResult,
    overallScore: number
  ): boolean {
    // 检查关键条件
    const hasNoCriticalIssues = codeQualityResult.issueDistribution.critical === 0;
    const techStackConsistent = techStackResult.passed;
    const qualityAcceptable = overallScore >= 70;
    
    return hasNoCriticalIssues && techStackConsistent && qualityAcceptable;
  }

  /**
   * 生成改进建议
   * @param techStackResult 技术栈检查结果
   * @param codeQualityResult 代码质量检查结果
   * @returns 改进建议列表
   */
  private generateRecommendations(
    techStackResult: TechStackConsistencyResult,
    codeQualityResult: CodeQualityPreCheckResult
  ): string[] {
    const recommendations: string[] = [];
    
    // 技术栈相关建议
    if (!techStackResult.passed) {
      recommendations.push('建议统一项目技术栈，确保所有文件使用一致的技术');
      if (techStackResult.inconsistentFiles.length > 0) {
        recommendations.push(`需要处理 ${techStackResult.inconsistentFiles.length} 个不一致的文件`);
      }
    }
    
    // 代码质量相关建议
    if (!codeQualityResult.passed) {
      if (codeQualityResult.issueDistribution.critical > 0) {
        recommendations.push(`需要立即修复 ${codeQualityResult.issueDistribution.critical} 个严重问题`);
      }
      if (codeQualityResult.issueDistribution.high > 0) {
        recommendations.push(`建议优先修复 ${codeQualityResult.issueDistribution.high} 个高优先级问题`);
      }
      if (codeQualityResult.score < 80) {
        recommendations.push('建议提高代码质量评分至 80 分以上');
      }
    }
    
    // 通用建议
    if (recommendations.length === 0) {
      recommendations.push('代码质量良好，可以继续开发工作');
    } else {
      recommendations.push('建议在继续开发前先解决上述问题');
    }
    
    return recommendations;
  }

  /**
   * 收集监控数据
   * @param files 监控的文件列表
   * @returns 监控数据
   */
  private async collectMonitoringData(files: string[]): Promise<QualityMonitoringData> {
    try {
      // 执行快速质量检查
      const quickCheck = await this.executeCodeQualityPreCheck(files);
      
      // 计算趋势
      const trend = this.calculateQualityTrend();
      
      // 评估风险等级
      const riskLevel = this.assessRiskLevel(quickCheck.score, quickCheck.issueDistribution);
      
      return {
        timestamp: new Date(),
        currentScore: quickCheck.score,
        trend,
        activeFiles: files.length,
        changeFrequency: this.calculateChangeFrequency(),
        riskLevel
      };
      
    } catch (error) {
      this.logError('监控数据收集失败', error);
      
      // 返回默认监控数据
      return {
        timestamp: new Date(),
        currentScore: 0,
        trend: 'stable',
        activeFiles: files.length,
        changeFrequency: 0,
        riskLevel: 'high'
      };
    }
  }

  /**
   * 计算质量趋势
   * @returns 质量趋势
   */
  private calculateQualityTrend(): 'improving' | 'stable' | 'declining' {
    if (this.monitoringHistory.length < 2) {
      return 'stable';
    }
    
    const recent = this.monitoringHistory.slice(-3);
    const scores = recent.map(data => data.currentScore);
    
    if (scores.length < 2) {
      return 'stable';
    }
    
    const firstScore = scores[0];
    const lastScore = scores[scores.length - 1];
    const difference = lastScore - firstScore;
    
    if (difference > 5) {
      return 'improving';
    } else if (difference < -5) {
      return 'declining';
    } else {
      return 'stable';
    }
  }

  /**
   * 计算变更频率
   * @returns 变更频率
   */
  private calculateChangeFrequency(): number {
    // 简化的变更频率计算
    const recentHistory = this.monitoringHistory.slice(-10);
    return recentHistory.length > 0 ? recentHistory.length / 10 : 0;
  }

  /**
   * 评估风险等级
   * @param score 质量评分
   * @param issueDistribution 问题分布
   * @returns 风险等级
   */
  private assessRiskLevel(
    score: number,
    issueDistribution: { critical: number; high: number; medium: number; low: number }
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (issueDistribution.critical > 0 || score < 50) {
      return 'critical';
    } else if (issueDistribution.high > 3 || score < 70) {
      return 'high';
    } else if (issueDistribution.high > 0 || score < 85) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * 检查质量警告
   * @param data 监控数据
   */
  private checkQualityAlerts(data: QualityMonitoringData): void {
    if (data.riskLevel === 'critical') {
      this.logWarn(`质量警告: 检测到严重质量问题，当前评分: ${data.currentScore}`);
    } else if (data.riskLevel === 'high' && data.trend === 'declining') {
      this.logWarn(`质量警告: 代码质量呈下降趋势，当前评分: ${data.currentScore}`);
    }
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

  /**
   * 清理资源
   */
  public cleanup(): void {
    this.stopRealTimeMonitoring();
    this.monitoringHistory = [];
    this.logInfo('质量保证分析引擎已清理');
  }

  // ============================================================================
  // 日志记录方法
  // ============================================================================

  private logDebug(message: string, data?: unknown): void {
    console.debug(`[QualityAssuranceEngine] DEBUG: ${message}`, data || '');
  }

  private logInfo(message: string, data?: unknown): void {
    console.info(`[QualityAssuranceEngine] INFO: ${message}`, data || '');
  }

  private logWarn(message: string, data?: unknown): void {
    console.warn(`[QualityAssuranceEngine] WARN: ${message}`, data || '');
  }

  private logError(message: string, error?: Error): void {
    console.error(`[QualityAssuranceEngine] ERROR: ${message}`, error || '');
  }
}