/**
 * 项目标准合规检查钩子
 * 
 * 继承BaseHook，在Git提交前自动执行全面的合规检查，确保代码质量和项目标准
 */

import { BaseHook } from '../core/base-hook.js';
import { ComplianceChecker } from './compliance-checker.js';
import { TestingSecurityChecker } from './testing-security-checker.js';
import {
  HookContext,
  HookResult,
  HookTrigger,
  ComplianceResult,
  ComplianceIssue,
  HookErrorType
} from '../types/index.js';

/**
 * 完整的合规检查结果
 */
interface FullComplianceResults {
  pythonCompliance: ComplianceResult;
  typescriptCompliance: ComplianceResult;
  testingCompliance: ComplianceResult;
  securityCompliance: ComplianceResult;
  windowsCompliance: ComplianceResult;
}

/**
 * 合规检查配置
 */
interface ComplianceCheckConfig {
  /** Python检查配置 */
  python: {
    enabled: boolean;
    pep8Check: boolean;
    maxLineLength: number;
    maxComplexity: number;
    typeAnnotationCheck: boolean;
  };
  /** TypeScript检查配置 */
  typescript: {
    enabled: boolean;
    strictMode: boolean;
    noAnyType: boolean;
    eslintCheck: boolean;
  };
  /** 测试检查配置 */
  testing: {
    enabled: boolean;
    minCoverageRate: number;
    runTests: boolean;
    checkTestQuality: boolean;
  };
  /** 安全检查配置 */
  security: {
    enabled: boolean;
    scanSecrets: boolean;
    checkDependencies: boolean;
    vulnerabilityScan: boolean;
  };
  /** Windows检查配置 */
  windows: {
    enabled: boolean;
    checkPathHandling: boolean;
    checkPowerShellCompatibility: boolean;
    checkFileEncoding: boolean;
  };
  /** 质量门禁配置 */
  qualityGate: {
    minOverallScore: number;
    allowCriticalIssues: boolean;
    allowHighIssues: boolean;
    maxIssuesPerCategory: number;
  };
}

/**
 * 项目标准合规检查钩子实现
 */
export class ProjectStandardsComplianceHook extends BaseHook {
  public readonly id = 'project-standards-compliance';
  public readonly name = '项目标准合规检查钩子';
  public readonly description = '提交前自动执行全面合规检查，确保代码质量和项目标准';
  
  public readonly triggers: HookTrigger[] = [
    {
      event: 'git.beforeCommit',
      patterns: ['**/*'],
      conditions: [
        {
          type: 'file-pattern',
          value: '**/*.{ts,tsx,js,jsx,py,ps1,json,md}',
          operator: 'matches'
        }
      ]
    }
  ];

  /** 合规检查器 */
  private complianceChecker: ComplianceChecker;
  
  /** 测试和安全检查器 */
  private testingSecurityChecker: TestingSecurityChecker;
  
  /** 默认配置 */
  private static readonly DEFAULT_CONFIG: ComplianceCheckConfig = {
    python: {
      enabled: true,
      pep8Check: true,
      maxLineLength: 88,
      maxComplexity: 10,
      typeAnnotationCheck: true
    },
    typescript: {
      enabled: true,
      strictMode: true,
      noAnyType: true,
      eslintCheck: true
    },
    testing: {
      enabled: true,
      minCoverageRate: 85,
      runTests: true,
      checkTestQuality: true
    },
    security: {
      enabled: true,
      scanSecrets: true,
      checkDependencies: true,
      vulnerabilityScan: true
    },
    windows: {
      enabled: true,
      checkPathHandling: true,
      checkPowerShellCompatibility: true,
      checkFileEncoding: true
    },
    qualityGate: {
      minOverallScore: 90,
      allowCriticalIssues: false,
      allowHighIssues: false,
      maxIssuesPerCategory: 10
    }
  };

  /**
   * 构造函数
   */
  constructor() {
    super();
    this.complianceChecker = new ComplianceChecker();
    this.testingSecurityChecker = new TestingSecurityChecker();
    this.logInfo('项目标准合规检查钩子初始化完成');
  }

  /**
   * 执行钩子
   */
  public async execute(context: HookContext): Promise<HookResult> {
    this.startExecution();

    try {
      // 验证上下文
      if (!this.validateContext(context)) {
        return this.createFailureResult('执行上下文验证失败');
      }

      this.logInfo(`🔍 开始项目标准合规检查，文件数量: ${context.files.length}`);

      // 获取配置
      const config = this.getComplianceConfig();

      // 过滤需要检查的文件
      const filesToCheck = this.filterFilesForCheck(context.files);
      
      if (filesToCheck.length === 0) {
        this.logInfo('没有需要检查的文件，跳过合规检查');
        return this.createSuccessResult('没有需要检查的文件', {
          skipped: true,
          totalFiles: context.files.length
        });
      }

      // 执行完整的合规检查
      const complianceResults = await this.executeFullComplianceCheck(filesToCheck, config);

      // 生成合规报告
      const complianceReport = this.generateComplianceReport(complianceResults);

      // 验证质量门禁
      const qualityGateResult = this.validateQualityGate(complianceResults, config.qualityGate);

      if (!qualityGateResult.passed) {
        return this.createFailureResult(
          `合规检查未通过质量门禁: ${qualityGateResult.summary}`,
          qualityGateResult.blockingIssues,
          {
            complianceResults,
            complianceReport,
            qualityGateResult,
            recommendations: this.generateFixRecommendations(complianceResults),
            nextSteps: this.generateNextSteps(qualityGateResult)
          }
        );
      }

      this.logInfo('✅ 项目标准合规检查通过');
      return this.createSuccessResult('所有合规检查通过，可以提交代码', {
        complianceResults,
        complianceReport,
        qualityGateResult,
        summary: this.generateSuccessSummary(complianceResults)
      });

    } catch (error) {
      this.logError('项目标准合规检查钩子执行失败', error);
      return this.handleError(error, context);
    }
  }

  /**
   * 执行完整的合规检查
   */
  private async executeFullComplianceCheck(
    files: string[],
    config: ComplianceCheckConfig
  ): Promise<FullComplianceResults> {
    this.logInfo('📋 开始执行完整的项目标准合规检查...');

    const results: FullComplianceResults = {
      pythonCompliance: await this.executePythonCheck(files, config),
      typescriptCompliance: await this.executeTypeScriptCheck(files, config),
      testingCompliance: await this.executeTestingCheck(files, config),
      securityCompliance: await this.executeSecurityCheck(files, config),
      windowsCompliance: await this.executeWindowsCheck(files, config)
    };

    this.logInfo('📋 完整的项目标准合规检查执行完成');
    return results;
  }

  /**
   * 执行Python合规检查
   */
  private async executePythonCheck(
    files: string[],
    config: ComplianceCheckConfig
  ): Promise<ComplianceResult> {
    if (!config.python.enabled) {
      return this.createSkippedResult('Python合规检查', 'Python检查已禁用');
    }

    this.logInfo('🐍 执行Python合规检查...');
    
    try {
      const result = await this.complianceChecker.checkPythonCompliance(files, {
        pep8Check: config.python.pep8Check,
        maxLineLength: config.python.maxLineLength,
        maxComplexity: config.python.maxComplexity,
        typeAnnotationCheck: config.python.typeAnnotationCheck
      });

      this.logInfo(`🐍 Python合规检查完成: ${result.passed ? '通过' : '未通过'}, 评分: ${result.score}`);
      return result;

    } catch (error) {
      this.logError('Python合规检查失败', error);
      return this.createErrorResult('Python合规检查', error.message);
    }
  }

  /**
   * 执行TypeScript合规检查
   */
  private async executeTypeScriptCheck(
    files: string[],
    config: ComplianceCheckConfig
  ): Promise<ComplianceResult> {
    if (!config.typescript.enabled) {
      return this.createSkippedResult('TypeScript合规检查', 'TypeScript检查已禁用');
    }

    this.logInfo('📘 执行TypeScript合规检查...');
    
    try {
      const result = await this.complianceChecker.checkTypeScriptCompliance(files, {
        strictMode: config.typescript.strictMode,
        noAnyType: config.typescript.noAnyType,
        eslintCheck: config.typescript.eslintCheck
      });

      this.logInfo(`📘 TypeScript合规检查完成: ${result.passed ? '通过' : '未通过'}, 评分: ${result.score}`);
      return result;

    } catch (error) {
      this.logError('TypeScript合规检查失败', error);
      return this.createErrorResult('TypeScript合规检查', error.message);
    }
  }

  /**
   * 执行测试合规检查
   */
  private async executeTestingCheck(
    files: string[],
    config: ComplianceCheckConfig
  ): Promise<ComplianceResult> {
    if (!config.testing.enabled) {
      return this.createSkippedResult('测试合规检查', '测试检查已禁用');
    }

    this.logInfo('🧪 执行测试合规检查...');
    
    try {
      const result = await this.testingSecurityChecker.checkTestingCompliance(files, {
        minCoverageRate: config.testing.minCoverageRate,
        runTests: config.testing.runTests,
        checkTestQuality: config.testing.checkTestQuality
      });

      this.logInfo(`🧪 测试合规检查完成: ${result.passed ? '通过' : '未通过'}, 评分: ${result.score}`);
      return result;

    } catch (error) {
      this.logError('测试合规检查失败', error);
      return this.createErrorResult('测试合规检查', error.message);
    }
  }

  /**
   * 执行安全合规检查
   */
  private async executeSecurityCheck(
    files: string[],
    config: ComplianceCheckConfig
  ): Promise<ComplianceResult> {
    if (!config.security.enabled) {
      return this.createSkippedResult('安全合规检查', '安全检查已禁用');
    }

    this.logInfo('🔒 执行安全合规检查...');
    
    try {
      const result = await this.testingSecurityChecker.checkSecurityCompliance(files, {
        scanSecrets: config.security.scanSecrets,
        checkDependencies: config.security.checkDependencies,
        vulnerabilityScan: config.security.vulnerabilityScan
      });

      this.logInfo(`🔒 安全合规检查完成: ${result.passed ? '通过' : '未通过'}, 评分: ${result.score}`);
      return result;

    } catch (error) {
      this.logError('安全合规检查失败', error);
      return this.createErrorResult('安全合规检查', error.message);
    }
  }

  /**
   * 执行Windows环境合规检查
   */
  private async executeWindowsCheck(
    files: string[],
    config: ComplianceCheckConfig
  ): Promise<ComplianceResult> {
    if (!config.windows.enabled) {
      return this.createSkippedResult('Windows环境合规检查', 'Windows检查已禁用');
    }

    this.logInfo('🪟 执行Windows环境合规检查...');
    
    try {
      const result = await this.testingSecurityChecker.checkWindowsCompliance(files, {
        checkPathHandling: config.windows.checkPathHandling,
        checkPowerShellCompatibility: config.windows.checkPowerShellCompatibility,
        checkFileEncoding: config.windows.checkFileEncoding
      });

      this.logInfo(`🪟 Windows环境合规检查完成: ${result.passed ? '通过' : '未通过'}, 评分: ${result.score}`);
      return result;

    } catch (error) {
      this.logError('Windows环境合规检查失败', error);
      return this.createErrorResult('Windows环境合规检查', error.message);
    }
  }

  /**
   * 验证质量门禁
   */
  private validateQualityGate(
    results: FullComplianceResults,
    gateConfig: ComplianceCheckConfig['qualityGate']
  ): { passed: boolean; summary: string; blockingIssues: string[]; details: any } {
    this.logInfo('🚪 验证质量门禁...');

    const allIssues: ComplianceIssue[] = [];
    const allResults = Object.values(results);
    let totalScore = 0;
    let validResults = 0;

    // 聚合所有问题和评分
    allResults.forEach(result => {
      if (result.checkType !== '跳过检查' && result.checkType !== '检查错误') {
        allIssues.push(...result.issues);
        totalScore += result.score;
        validResults++;
      }
    });

    const averageScore = validResults > 0 ? totalScore / validResults : 0;
    const criticalIssues = allIssues.filter(i => i.severity === 'critical');
    const highIssues = allIssues.filter(i => i.severity === 'high');
    const blockingIssues: string[] = [];

    // 检查评分门禁
    if (averageScore < gateConfig.minOverallScore) {
      blockingIssues.push(`整体评分不达标: ${Math.round(averageScore)} < ${gateConfig.minOverallScore}`);
    }

    // 检查严重问题门禁
    if (!gateConfig.allowCriticalIssues && criticalIssues.length > 0) {
      blockingIssues.push(`存在${criticalIssues.length}个严重问题，不允许提交`);
    }

    if (!gateConfig.allowHighIssues && highIssues.length > 0) {
      blockingIssues.push(`存在${highIssues.length}个高危问题，不允许提交`);
    }

    // 检查问题数量门禁
    const issuesByCategory = this.groupIssuesByCategory(allIssues);
    Object.entries(issuesByCategory).forEach(([category, issues]) => {
      if (issues.length > gateConfig.maxIssuesPerCategory) {
        blockingIssues.push(`${category}问题数量超标: ${issues.length} > ${gateConfig.maxIssuesPerCategory}`);
      }
    });

    const passed = blockingIssues.length === 0;
    const summary = passed 
      ? `质量门禁通过 (评分: ${Math.round(averageScore)}, 问题: ${allIssues.length}个)`
      : `质量门禁未通过 (${blockingIssues.length}个阻塞问题)`;

    this.logInfo(`🚪 质量门禁验证完成: ${passed ? '通过' : '未通过'}`);

    return {
      passed,
      summary,
      blockingIssues,
      details: {
        averageScore: Math.round(averageScore),
        totalIssues: allIssues.length,
        criticalIssues: criticalIssues.length,
        highIssues: highIssues.length,
        issuesByCategory
      }
    };
  }

  /**
   * 生成合规报告
   */
  private generateComplianceReport(results: FullComplianceResults): any {
    const report = {
      timestamp: new Date(),
      summary: {
        totalChecks: 0,
        passedChecks: 0,
        skippedChecks: 0,
        errorChecks: 0,
        totalIssues: 0,
        averageScore: 0
      },
      details: {} as any,
      topIssues: [] as ComplianceIssue[]
    };

    let totalScore = 0;
    let validResults = 0;
    const allIssues: ComplianceIssue[] = [];

    Object.entries(results).forEach(([key, result]) => {
      report.summary.totalChecks++;
      
      if (result.checkType === '跳过检查') {
        report.summary.skippedChecks++;
      } else if (result.checkType === '检查错误') {
        report.summary.errorChecks++;
      } else {
        if (result.passed) {
          report.summary.passedChecks++;
        }
        totalScore += result.score;
        validResults++;
        allIssues.push(...result.issues);
      }

      report.details[key] = {
        checkType: result.checkType,
        passed: result.passed,
        score: result.score,
        issueCount: result.issues.length,
        recommendations: result.recommendations.slice(0, 3) // 只保留前3个建议
      };
    });

    report.summary.averageScore = validResults > 0 ? Math.round(totalScore / validResults) : 0;
    report.summary.totalIssues = allIssues.length;

    // 获取最严重的问题
    report.topIssues = allIssues
      .sort((a, b) => this.getSeverityWeight(b.severity) - this.getSeverityWeight(a.severity))
      .slice(0, 10);

    return report;
  }

  /**
   * 生成修复建议
   */
  private generateFixRecommendations(results: FullComplianceResults): string[] {
    const recommendations = new Set<string>();

    Object.values(results).forEach(result => {
      result.recommendations.forEach(rec => recommendations.add(rec));
    });

    // 添加通用建议
    recommendations.add('运行 npm run lint 修复代码风格问题');
    recommendations.add('运行测试确保功能正常');
    recommendations.add('检查并修复安全漏洞');
    recommendations.add('更新文档和注释');

    return Array.from(recommendations).slice(0, 10); // 最多10个建议
  }

  /**
   * 生成下一步操作建议
   */
  private generateNextSteps(qualityGateResult: any): string[] {
    const nextSteps: string[] = [];

    if (qualityGateResult.details.criticalIssues > 0) {
      nextSteps.push('🚨 立即修复所有严重问题');
    }

    if (qualityGateResult.details.highIssues > 0) {
      nextSteps.push('⚠️ 修复高危问题');
    }

    if (qualityGateResult.details.averageScore < 90) {
      nextSteps.push('📈 提高代码质量评分');
    }

    nextSteps.push('🔄 修复后重新运行合规检查');
    nextSteps.push('📚 查看详细的合规检查报告');

    return nextSteps;
  }

  /**
   * 生成成功摘要
   */
  private generateSuccessSummary(results: FullComplianceResults): any {
    const allResults = Object.values(results);
    const totalScore = allResults.reduce((sum, r) => sum + r.score, 0);
    const averageScore = Math.round(totalScore / allResults.length);
    const totalIssues = allResults.reduce((sum, r) => sum + r.issues.length, 0);

    return {
      message: '🎉 所有合规检查通过！',
      averageScore,
      totalIssues,
      passedChecks: allResults.filter(r => r.passed).length,
      totalChecks: allResults.length,
      readyToCommit: true
    };
  }

  // ============================================================================
  // 工具方法
  // ============================================================================

  /**
   * 获取合规检查配置
   */
  private getComplianceConfig(): ComplianceCheckConfig {
    // 从钩子配置中获取，如果没有则使用默认配置
    const customConfig = this.config?.parameters?.complianceConfig || {};
    return { ...ProjectStandardsComplianceHook.DEFAULT_CONFIG, ...customConfig };
  }

  /**
   * 过滤需要检查的文件
   */
  private filterFilesForCheck(files: string[]): string[] {
    return files.filter(file => {
      // 排除不需要检查的文件
      const excludePatterns = [
        'node_modules/',
        '.git/',
        'dist/',
        'build/',
        '.next/',
        'coverage/',
        '*.min.js',
        '*.map'
      ];

      return !excludePatterns.some(pattern => file.includes(pattern));
    });
  }

  /**
   * 按类别分组问题
   */
  private groupIssuesByCategory(issues: ComplianceIssue[]): Record<string, ComplianceIssue[]> {
    const grouped: Record<string, ComplianceIssue[]> = {};
    
    issues.forEach(issue => {
      if (!grouped[issue.category]) {
        grouped[issue.category] = [];
      }
      grouped[issue.category].push(issue);
    });

    return grouped;
  }

  /**
   * 获取严重程度权重
   */
  private getSeverityWeight(severity: ComplianceIssue['severity']): number {
    switch (severity) {
      case 'critical': return 4;
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 0;
    }
  }

  /**
   * 创建跳过的检查结果
   */
  private createSkippedResult(checkType: string, reason: string): ComplianceResult {
    return {
      passed: true,
      score: 100,
      issues: [],
      recommendations: [reason],
      checkType: '跳过检查',
      timestamp: new Date()
    };
  }

  /**
   * 创建错误的检查结果
   */
  private createErrorResult(checkType: string, errorMessage: string): ComplianceResult {
    return {
      passed: false,
      score: 0,
      issues: [{
        severity: 'medium',
        category: '检查错误',
        description: `${checkType}执行失败: ${errorMessage}`,
        suggestion: '请检查系统配置和依赖'
      }],
      recommendations: ['请手动执行相关检查'],
      checkType: '检查错误',
      timestamp: new Date()
    };
  }
}