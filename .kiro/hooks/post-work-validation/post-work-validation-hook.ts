/**
 * 工作后质量验证钩子
 * 继承 BaseHook，实现工作完成后的全面质量验证
 */

import { BaseHook } from '../core/base-hook';
import { HookContext, HookResult, HookTrigger } from '../types';
import { AutomatedValidationPipeline, ComprehensiveValidationResult } from './automated-validation-pipeline';
import { ExperienceStorage, DesignDecision, ProblemSolution, BestPractice } from './experience-storage';
import { MCPToolsManager } from '../core/mcp-tools-manager';
import { HookLogger } from '../core/hook-logger';

/**
 * 验证报告接口
 */
export interface ValidationReport {
  /** 报告ID */
  id: string;
  /** 验证结果 */
  validationResult: ComprehensiveValidationResult;
  /** 经验存储结果 */
  experienceStorageResult: {
    designDecisionsStored: number;
    problemSolutionsStored: number;
    bestPracticesStored: number;
    storageErrors: string[];
  };
  /** 改进建议 */
  improvementSuggestions: Array<{
    category: string;
    priority: 'high' | 'medium' | 'low';
    description: string;
    actionItems: string[];
  }>;
  /** 质量趋势 */
  qualityTrend: {
    currentScore: number;
    previousScore?: number;
    trend: 'improving' | 'stable' | 'declining';
    trendAnalysis: string;
  };
  /** 生成时间 */
  generatedAt: Date;
}

/**
 * 工作后质量验证钩子类
 * 在工作完成后执行全面的质量验证和经验存储
 */
export class PostWorkValidationHook extends BaseHook {
  id = 'post-work-validation';
  name = '工作后质量验证钩子';
  description = '工作完成后执行全面的质量验证，包括功能完整性、性能、安全性和部署就绪检查，并存储经验教训';
  
  triggers: HookTrigger[] = [
    {
      event: 'work.complete',
      patterns: ['**/*'],
      conditions: [
        {
          type: 'file-change-threshold',
          value: 1 // 至少有一个文件变更
        }
      ]
    },
    {
      event: 'git.afterCommit',
      patterns: ['**/*'],
      conditions: [
        {
          type: 'commit-size-threshold',
          value: 5 // 提交包含至少5个文件变更
        }
      ]
    }
  ];

  private validationPipeline: AutomatedValidationPipeline;
  private experienceStorage: ExperienceStorage;
  private logger: HookLogger;

  constructor(mcpTools: MCPToolsManager) {
    super();
    this.validationPipeline = new AutomatedValidationPipeline(mcpTools);
    this.experienceStorage = new ExperienceStorage(mcpTools);
    this.logger = new HookLogger('PostWorkValidationHook');
  }

  /**
   * 执行工作后质量验证
   * @param context 钩子上下文
   * @returns 验证结果
   */
  async execute(context: HookContext): Promise<HookResult> {
    const startTime = Date.now();
    this.logger.info('开始执行工作后质量验证', {
      event: context.event,
      files: context.files.length,
      sessionId: context.sessionId
    });

    try {
      // 验证上下文
      if (!this.validateContext(context)) {
        return this.createFailureResult('无效的钩子上下文');
      }

      // 阶段1：执行自动化验证流水线
      this.logger.info('执行自动化验证流水线');
      const validationResult = await this.validationPipeline.executeValidation(
        context.files,
        context.metadata
      );

      // 阶段2：存储经验和教训
      this.logger.info('存储经验和教训');
      const experienceStorageResult = await this.storeExperienceAndLessons(
        context,
        validationResult
      );

      // 阶段3：生成改进建议
      this.logger.info('生成改进建议');
      const improvementSuggestions = await this.generateImprovementSuggestions(
        validationResult,
        context
      );

      // 阶段4：分析质量趋势
      this.logger.info('分析质量趋势');
      const qualityTrend = await this.analyzeQualityTrend(
        validationResult.overallScore,
        context
      );

      // 生成验证报告
      const report: ValidationReport = {
        id: `validation-report-${Date.now()}`,
        validationResult,
        experienceStorageResult,
        improvementSuggestions,
        qualityTrend,
        generatedAt: new Date()
      };

      const executionTime = Date.now() - startTime;

      // 判断整体验证结果
      const overallSuccess = validationResult.overallPassed && 
                           experienceStorageResult.storageErrors.length === 0;

      const result: HookResult = {
        success: overallSuccess,
        message: this.generateResultMessage(report),
        data: {
          report,
          validationSummary: {
            overallScore: validationResult.overallScore,
            functionalityScore: validationResult.functionalityValidation.score,
            performanceScore: validationResult.performanceBenchmark.score,
            securityScore: validationResult.securityValidation.score,
            deploymentScore: validationResult.deploymentReadiness.score
          },
          experienceSummary: {
            totalItemsStored: experienceStorageResult.designDecisionsStored +
                            experienceStorageResult.problemSolutionsStored +
                            experienceStorageResult.bestPracticesStored,
            storageSuccessRate: this.calculateStorageSuccessRate(experienceStorageResult)
          },
          recommendations: improvementSuggestions.slice(0, 5), // 前5个最重要的建议
          qualityTrend: qualityTrend.trend
        },
        errors: this.collectErrors(validationResult, experienceStorageResult),
        warnings: this.collectWarnings(validationResult, experienceStorageResult),
        executionTime,
        timestamp: new Date()
      };

      this.logger.info('工作后质量验证完成', {
        success: overallSuccess,
        overallScore: validationResult.overallScore,
        executionTime
      });

      return result;

    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error('工作后质量验证失败', error);
      
      return {
        success: false,
        message: `工作后质量验证失败: ${error instanceof Error ? error.message : String(error)}`,
        data: null,
        errors: [String(error)],
        warnings: [],
        executionTime,
        timestamp: new Date()
      };
    }
  }

  /**
   * 存储经验和教训
   */
  private async storeExperienceAndLessons(
    context: HookContext,
    validationResult: ComprehensiveValidationResult
  ): Promise<{
    designDecisionsStored: number;
    problemSolutionsStored: number;
    bestPracticesStored: number;
    storageErrors: string[];
  }> {
    const storageErrors: string[] = [];
    let designDecisionsStored = 0;
    let problemSolutionsStored = 0;
    let bestPracticesStored = 0;

    try {
      // 从验证结果中提取设计决策
      const designDecisions = await this.extractDesignDecisions(context, validationResult);
      for (const decision of designDecisions) {
        try {
          const stored = await this.experienceStorage.storeDesignDecision(decision);
          if (stored) designDecisionsStored++;
        } catch (error) {
          storageErrors.push(`设计决策存储失败: ${error}`);
        }
      }

      // 从验证结果中提取问题解决方案
      const problemSolutions = await this.extractProblemSolutions(context, validationResult);
      for (const solution of problemSolutions) {
        try {
          const stored = await this.experienceStorage.storeProblemSolution(solution);
          if (stored) problemSolutionsStored++;
        } catch (error) {
          storageErrors.push(`问题解决方案存储失败: ${error}`);
        }
      }

      // 从验证结果中提取最佳实践
      const bestPractices = await this.extractBestPractices(context, validationResult);
      for (const practice of bestPractices) {
        try {
          const stored = await this.experienceStorage.storeBestPractice(practice);
          if (stored) bestPracticesStored++;
        } catch (error) {
          storageErrors.push(`最佳实践存储失败: ${error}`);
        }
      }

    } catch (error) {
      storageErrors.push(`经验存储过程失败: ${error}`);
    }

    return {
      designDecisionsStored,
      problemSolutionsStored,
      bestPracticesStored,
      storageErrors
    };
  }

  /**
   * 生成改进建议
   */
  private async generateImprovementSuggestions(
    validationResult: ComprehensiveValidationResult,
    context: HookContext
  ): Promise<Array<{
    category: string;
    priority: 'high' | 'medium' | 'low';
    description: string;
    actionItems: string[];
  }>> {
    const suggestions: Array<{
      category: string;
      priority: 'high' | 'medium' | 'low';
      description: string;
      actionItems: string[];
    }> = [];

    // 功能完整性改进建议
    if (!validationResult.functionalityValidation.passed) {
      suggestions.push({
        category: '功能完整性',
        priority: 'high',
        description: '功能完整性验证未通过，需要完善功能实现',
        actionItems: [
          `提高需求覆盖率至85%以上（当前：${validationResult.functionalityValidation.requirementsCoverage}%）`,
          `提高功能测试通过率至90%以上（当前：${validationResult.functionalityValidation.functionalTestPassRate}%）`,
          '完善缺失的功能模块',
          '修复不完整的功能实现'
        ]
      });
    }

    // 性能优化建议
    if (!validationResult.performanceBenchmark.passed) {
      suggestions.push({
        category: '性能优化',
        priority: validationResult.performanceBenchmark.performanceRegression ? 'high' : 'medium',
        description: '性能基准测试未达标，需要优化性能',
        actionItems: [
          `优化 API 响应时间至200ms以下（当前：${Math.round(validationResult.performanceBenchmark.apiResponseTime)}ms）`,
          `优化页面加载时间至1000ms以下（当前：${Math.round(validationResult.performanceBenchmark.pageLoadTime)}ms）`,
          `优化内存使用至250MB以下（当前：${Math.round(validationResult.performanceBenchmark.memoryUsage)}MB）`,
          '进行性能回归测试'
        ]
      });
    }

    // 安全性改进建议
    if (!validationResult.securityValidation.passed) {
      const priority = validationResult.securityValidation.criticalVulnerabilities > 0 ? 'high' : 'medium';
      suggestions.push({
        category: '安全性',
        priority,
        description: '安全验证发现漏洞，需要立即修复',
        actionItems: [
          `修复 ${validationResult.securityValidation.criticalVulnerabilities} 个关键漏洞`,
          `修复 ${validationResult.securityValidation.highVulnerabilities} 个高危漏洞`,
          '进行全面的安全代码审查',
          '更新安全依赖和库'
        ]
      });
    }

    // 部署就绪改进建议
    if (!validationResult.deploymentReadiness.passed) {
      suggestions.push({
        category: '部署就绪',
        priority: 'medium',
        description: '部署就绪检查未通过，需要完善部署准备',
        actionItems: [
          validationResult.deploymentReadiness.buildSuccess ? '' : '修复构建问题',
          validationResult.deploymentReadiness.testsPass ? '' : '修复测试失败',
          validationResult.deploymentReadiness.dependenciesValid ? '' : '解决依赖问题',
          validationResult.deploymentReadiness.configurationValid ? '' : '修复配置问题',
          validationResult.deploymentReadiness.environmentCompatible ? '' : '解决环境兼容性问题'
        ].filter(Boolean)
      });
    }

    // 基于历史经验的建议
    try {
      const experienceSuggestions = await this.experienceStorage.generateApplicationSuggestions(
        {
          project: context.metadata?.project || 'unknown',
          files: context.files,
          technologies: this.extractTechnologies(context.files),
          validationScore: validationResult.overallScore
        }
      );

      for (const suggestion of experienceSuggestions.slice(0, 3)) {
        suggestions.push({
          category: '历史经验',
          priority: suggestion.implementationComplexity === 'low' ? 'low' : 'medium',
          description: suggestion.description,
          actionItems: suggestion.applicationGuidance
        });
      }
    } catch (error) {
      this.logger.warn('生成历史经验建议失败', error);
    }

    // 按优先级排序
    return suggestions.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * 分析质量趋势
   */
  private async analyzeQualityTrend(
    currentScore: number,
    context: HookContext
  ): Promise<{
    currentScore: number;
    previousScore?: number;
    trend: 'improving' | 'stable' | 'declining';
    trendAnalysis: string;
  }> {
    try {
      // 尝试获取历史质量分数
      const previousScore = await this.getPreviousQualityScore(context);
      
      let trend: 'improving' | 'stable' | 'declining' = 'stable';
      let trendAnalysis = '首次质量评估，无历史数据对比';

      if (previousScore !== undefined) {
        const scoreDiff = currentScore - previousScore;
        
        if (scoreDiff > 5) {
          trend = 'improving';
          trendAnalysis = `质量分数提升 ${scoreDiff} 分，项目质量持续改善`;
        } else if (scoreDiff < -5) {
          trend = 'declining';
          trendAnalysis = `质量分数下降 ${Math.abs(scoreDiff)} 分，需要关注质量回归`;
        } else {
          trend = 'stable';
          trendAnalysis = `质量分数变化 ${scoreDiff} 分，项目质量保持稳定`;
        }
      }

      return {
        currentScore,
        previousScore,
        trend,
        trendAnalysis
      };

    } catch (error) {
      this.logger.warn('分析质量趋势失败', error);
      return {
        currentScore,
        trend: 'stable',
        trendAnalysis: '无法获取历史数据，无法分析趋势'
      };
    }
  }

  // 私有辅助方法

  private async extractDesignDecisions(
    context: HookContext,
    validationResult: ComprehensiveValidationResult
  ): Promise<DesignDecision[]> {
    const decisions: DesignDecision[] = [];

    // 基于验证结果提取设计决策
    if (validationResult.overallScore >= 90) {
      decisions.push({
        id: `dd-${Date.now()}`,
        title: '高质量实现方案',
        description: '本次工作实现了高质量的解决方案',
        context: {
          project: context.metadata?.project || 'unknown',
          module: this.extractModuleName(context.files),
          files: context.files,
          timestamp: new Date()
        },
        options: [],
        selectedOption: '当前实现方案',
        rationale: `验证分数达到 ${validationResult.overallScore} 分，各项指标均达标`,
        impact: ['代码质量', '系统稳定性', '维护性'],
        tags: ['high-quality', 'best-practice']
      });
    }

    return decisions;
  }

  private async extractProblemSolutions(
    context: HookContext,
    validationResult: ComprehensiveValidationResult
  ): Promise<ProblemSolution[]> {
    const solutions: ProblemSolution[] = [];

    // 基于验证结果提取问题解决方案
    if (!validationResult.securityValidation.passed && 
        validationResult.securityValidation.vulnerabilitiesFound > 0) {
      
      for (const vulnerability of validationResult.securityValidation.vulnerabilityDetails) {
        solutions.push({
          id: `ps-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          problemTitle: `安全漏洞: ${vulnerability.type}`,
          problemDescription: vulnerability.description,
          category: 'security',
          severity: vulnerability.severity,
          context: {
            project: context.metadata?.project || 'unknown',
            environment: 'development',
            files: vulnerability.file ? [vulnerability.file] : context.files,
            errorMessage: vulnerability.description,
            discoveredAt: new Date()
          },
          solution: {
            description: '通过代码审查和安全扫描发现并修复',
            steps: [
              '运行安全扫描工具',
              '分析漏洞详情',
              '实施修复方案',
              '验证修复效果'
            ]
          },
          rootCause: '代码中存在安全漏洞',
          preventionMeasures: [
            '定期进行安全代码审查',
            '使用自动化安全扫描工具',
            '遵循安全编码规范'
          ],
          resolvedAt: new Date(),
          verificationMethod: '安全扫描验证',
          tags: ['security', vulnerability.type]
        });
      }
    }

    return solutions;
  }

  private async extractBestPractices(
    context: HookContext,
    validationResult: ComprehensiveValidationResult
  ): Promise<BestPractice[]> {
    const practices: BestPractice[] = [];

    // 基于验证结果提取最佳实践
    if (validationResult.functionalityValidation.functionalTestPassRate >= 95) {
      practices.push({
        id: `bp-${Date.now()}`,
        title: '高测试覆盖率实践',
        description: '实现了高质量的测试覆盖',
        category: 'testing',
        applicableScenarios: ['新功能开发', '代码重构'],
        content: {
          guidelines: [
            '编写全面的单元测试',
            '实现集成测试',
            '进行端到端测试',
            '保持测试代码质量'
          ]
        },
        benefits: [
          '提高代码质量',
          '减少回归错误',
          '增强重构信心',
          '改善文档效果'
        ],
        considerations: [
          '测试维护成本',
          '测试执行时间',
          '测试环境复杂性'
        ],
        relatedTools: ['Jest', 'Vitest', 'Playwright'],
        createdAt: new Date(),
        updatedAt: new Date(),
        usageCount: 1,
        tags: ['testing', 'quality', 'best-practice']
      });
    }

    return practices;
  }

  private generateResultMessage(report: ValidationReport): string {
    const { validationResult, qualityTrend } = report;
    
    if (validationResult.overallPassed) {
      return `工作后质量验证通过！整体分数: ${validationResult.overallScore}/100，质量趋势: ${qualityTrend.trend}`;
    } else {
      const failedAreas = [];
      if (!validationResult.functionalityValidation.passed) failedAreas.push('功能完整性');
      if (!validationResult.performanceBenchmark.passed) failedAreas.push('性能');
      if (!validationResult.securityValidation.passed) failedAreas.push('安全性');
      if (!validationResult.deploymentReadiness.passed) failedAreas.push('部署就绪');
      
      return `工作后质量验证未通过。整体分数: ${validationResult.overallScore}/100，需要改进: ${failedAreas.join('、')}`;
    }
  }

  private collectErrors(
    validationResult: ComprehensiveValidationResult,
    experienceStorageResult: any
  ): string[] {
    const errors: string[] = [];
    
    if (!validationResult.overallPassed) {
      errors.push(`质量验证未通过，整体分数: ${validationResult.overallScore}/100`);
    }
    
    errors.push(...experienceStorageResult.storageErrors);
    
    return errors;
  }

  private collectWarnings(
    validationResult: ComprehensiveValidationResult,
    experienceStorageResult: any
  ): string[] {
    const warnings: string[] = [];
    
    if (validationResult.overallScore < 85) {
      warnings.push('质量分数偏低，建议进行改进');
    }
    
    if (validationResult.performanceBenchmark.performanceRegression) {
      warnings.push('检测到性能回归');
    }
    
    if (experienceStorageResult.storageErrors.length > 0) {
      warnings.push('部分经验存储失败');
    }
    
    return warnings;
  }

  private calculateStorageSuccessRate(experienceStorageResult: any): number {
    const total = experienceStorageResult.designDecisionsStored +
                 experienceStorageResult.problemSolutionsStored +
                 experienceStorageResult.bestPracticesStored;
    const errors = experienceStorageResult.storageErrors.length;
    
    if (total === 0 && errors === 0) return 100;
    return Math.round((total / (total + errors)) * 100);
  }

  private extractModuleName(files: string[]): string {
    // 从文件路径中提取模块名称
    const commonPaths = files.map(f => f.split('/').slice(0, -1));
    if (commonPaths.length === 0) return 'unknown';
    
    const commonPath = commonPaths[0];
    for (let i = 1; i < commonPaths.length; i++) {
      for (let j = 0; j < commonPath.length; j++) {
        if (j >= commonPaths[i].length || commonPath[j] !== commonPaths[i][j]) {
          commonPath.splice(j);
          break;
        }
      }
    }
    
    return commonPath.length > 0 ? commonPath[commonPath.length - 1] : 'root';
  }

  private extractTechnologies(files: string[]): string[] {
    const technologies = new Set<string>();
    
    files.forEach(file => {
      const ext = file.split('.').pop()?.toLowerCase();
      switch (ext) {
        case 'ts':
        case 'tsx':
          technologies.add('typescript');
          break;
        case 'js':
        case 'jsx':
          technologies.add('javascript');
          break;
        case 'py':
          technologies.add('python');
          break;
        case 'java':
          technologies.add('java');
          break;
        case 'go':
          technologies.add('golang');
          break;
        case 'rs':
          technologies.add('rust');
          break;
      }
    });
    
    return Array.from(technologies);
  }

  private async getPreviousQualityScore(context: HookContext): Promise<number | undefined> {
    try {
      // 尝试从经验存储中获取历史质量分数
      const searchResult = await this.experienceStorage.retrieveExperience({
        type: 'all',
        project: context.metadata?.project,
        keywords: ['quality-score'],
        limit: 1
      });
      
      // 这里应该有更复杂的逻辑来提取历史分数
      // 简化实现，返回模拟数据
      return undefined;
    } catch (error) {
      this.logger.warn('获取历史质量分数失败', error);
      return undefined;
    }
  }
}