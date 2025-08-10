/**
 * 经验存储系统
 * 与 Memory MCP 工具集成，存储设计决策、问题解决方案和最佳实践
 */

import { MCPToolsManager } from '../core/mcp-tools-manager';
import { HookLogger } from '../core/hook-logger';

/**
 * 设计决策记录
 */
export interface DesignDecision {
  /** 决策ID */
  id: string;
  /** 决策标题 */
  title: string;
  /** 决策描述 */
  description: string;
  /** 决策上下文 */
  context: {
    /** 项目名称 */
    project: string;
    /** 模块名称 */
    module: string;
    /** 相关文件 */
    files: string[];
    /** 决策时间 */
    timestamp: Date;
  };
  /** 决策选项 */
  options: Array<{
    /** 选项名称 */
    name: string;
    /** 选项描述 */
    description: string;
    /** 优点 */
    pros: string[];
    /** 缺点 */
    cons: string[];
  }>;
  /** 选择的选项 */
  selectedOption: string;
  /** 决策理由 */
  rationale: string;
  /** 影响范围 */
  impact: string[];
  /** 相关标签 */
  tags: string[];
}

/**
 * 问题解决方案记录
 */
export interface ProblemSolution {
  /** 解决方案ID */
  id: string;
  /** 问题标题 */
  problemTitle: string;
  /** 问题描述 */
  problemDescription: string;
  /** 问题分类 */
  category: 'bug' | 'performance' | 'security' | 'architecture' | 'integration' | 'other';
  /** 严重程度 */
  severity: 'critical' | 'high' | 'medium' | 'low';
  /** 问题上下文 */
  context: {
    /** 项目名称 */
    project: string;
    /** 环境信息 */
    environment: string;
    /** 相关文件 */
    files: string[];
    /** 错误信息 */
    errorMessage?: string;
    /** 堆栈跟踪 */
    stackTrace?: string;
    /** 发现时间 */
    discoveredAt: Date;
  };
  /** 解决方案 */
  solution: {
    /** 解决方案描述 */
    description: string;
    /** 解决步骤 */
    steps: string[];
    /** 代码变更 */
    codeChanges?: Array<{
      file: string;
      changes: string;
    }>;
    /** 配置变更 */
    configChanges?: Record<string, any>;
  };
  /** 根本原因 */
  rootCause: string;
  /** 预防措施 */
  preventionMeasures: string[];
  /** 解决时间 */
  resolvedAt: Date;
  /** 验证方法 */
  verificationMethod: string;
  /** 相关标签 */
  tags: string[];
}

/**
 * 最佳实践记录
 */
export interface BestPractice {
  /** 实践ID */
  id: string;
  /** 实践标题 */
  title: string;
  /** 实践描述 */
  description: string;
  /** 实践分类 */
  category: 'coding' | 'testing' | 'deployment' | 'security' | 'performance' | 'architecture';
  /** 适用场景 */
  applicableScenarios: string[];
  /** 实践内容 */
  content: {
    /** 实践指南 */
    guidelines: string[];
    /** 代码示例 */
    codeExamples?: Array<{
      language: string;
      code: string;
      description: string;
    }>;
    /** 配置示例 */
    configExamples?: Array<{
      type: string;
      config: string;
      description: string;
    }>;
  };
  /** 收益 */
  benefits: string[];
  /** 注意事项 */
  considerations: string[];
  /** 相关工具 */
  relatedTools: string[];
  /** 创建时间 */
  createdAt: Date;
  /** 更新时间 */
  updatedAt: Date;
  /** 使用频率 */
  usageCount: number;
  /** 相关标签 */
  tags: string[];
}

/**
 * 经验检索查询
 */
export interface ExperienceQuery {
  /** 查询类型 */
  type: 'design-decision' | 'problem-solution' | 'best-practice' | 'all';
  /** 关键词 */
  keywords?: string[];
  /** 项目名称 */
  project?: string;
  /** 分类 */
  category?: string;
  /** 标签 */
  tags?: string[];
  /** 时间范围 */
  timeRange?: {
    start: Date;
    end: Date;
  };
  /** 结果限制 */
  limit?: number;
}

/**
 * 经验检索结果
 */
export interface ExperienceSearchResult {
  /** 设计决策 */
  designDecisions: DesignDecision[];
  /** 问题解决方案 */
  problemSolutions: ProblemSolution[];
  /** 最佳实践 */
  bestPractices: BestPractice[];
  /** 总数量 */
  totalCount: number;
  /** 相关性评分 */
  relevanceScores: Record<string, number>;
}

/**
 * 应用建议
 */
export interface ApplicationSuggestion {
  /** 建议ID */
  id: string;
  /** 建议类型 */
  type: 'design-decision' | 'problem-solution' | 'best-practice';
  /** 建议标题 */
  title: string;
  /** 建议描述 */
  description: string;
  /** 相关经验ID */
  relatedExperienceId: string;
  /** 适用性评分 */
  applicabilityScore: number;
  /** 应用指导 */
  applicationGuidance: string[];
  /** 预期收益 */
  expectedBenefits: string[];
  /** 实施复杂度 */
  implementationComplexity: 'low' | 'medium' | 'high';
  /** 风险评估 */
  risks: string[];
}

/**
 * 经验存储类
 * 与 Memory MCP 工具集成，管理知识库
 */
export class ExperienceStorage {
  private mcpTools: MCPToolsManager;
  private logger: HookLogger;

  constructor(mcpTools: MCPToolsManager) {
    this.mcpTools = mcpTools;
    this.logger = new HookLogger('ExperienceStorage');
  }

  /**
   * 存储设计决策
   * @param decision 设计决策记录
   * @returns 存储结果
   */
  async storeDesignDecision(decision: DesignDecision): Promise<boolean> {
    this.logger.info('存储设计决策', { id: decision.id, title: decision.title });

    try {
      if (await this.mcpTools.isMemoryAvailable()) {
        // 使用 Memory MCP 工具存储
        await this.mcpTools.callMemory('create_entities', {
          entities: [{
            name: `design-decision-${decision.id}`,
            entityType: 'DesignDecision',
            observations: [
              `标题: ${decision.title}`,
              `描述: ${decision.description}`,
              `项目: ${decision.context.project}`,
              `模块: ${decision.context.module}`,
              `选择的选项: ${decision.selectedOption}`,
              `决策理由: ${decision.rationale}`,
              `影响范围: ${decision.impact.join(', ')}`,
              `标签: ${decision.tags.join(', ')}`,
              `时间: ${decision.context.timestamp.toISOString()}`
            ]
          }]
        });

        // 创建与相关文件的关联
        if (decision.context.files.length > 0) {
          const relations = decision.context.files.map(file => ({
            from: `design-decision-${decision.id}`,
            to: `file-${file.replace(/[^a-zA-Z0-9]/g, '-')}`,
            relationType: 'affects'
          }));

          await this.mcpTools.callMemory('create_relations', { relations });
        }

        this.logger.info('设计决策存储成功', { id: decision.id });
        return true;
      } else {
        // 使用本地存储作为后备
        await this.storeToLocalStorage('design-decisions', decision.id, decision);
        this.logger.warn('Memory MCP 不可用，使用本地存储', { id: decision.id });
        return true;
      }
    } catch (error) {
      this.logger.error('存储设计决策失败', error, { id: decision.id });
      return false;
    }
  }

  /**
   * 存储问题解决方案
   * @param solution 问题解决方案记录
   * @returns 存储结果
   */
  async storeProblemSolution(solution: ProblemSolution): Promise<boolean> {
    this.logger.info('存储问题解决方案', { id: solution.id, title: solution.problemTitle });

    try {
      if (await this.mcpTools.isMemoryAvailable()) {
        await this.mcpTools.callMemory('create_entities', {
          entities: [{
            name: `problem-solution-${solution.id}`,
            entityType: 'ProblemSolution',
            observations: [
              `问题标题: ${solution.problemTitle}`,
              `问题描述: ${solution.problemDescription}`,
              `分类: ${solution.category}`,
              `严重程度: ${solution.severity}`,
              `项目: ${solution.context.project}`,
              `环境: ${solution.context.environment}`,
              `解决方案: ${solution.solution.description}`,
              `根本原因: ${solution.rootCause}`,
              `预防措施: ${solution.preventionMeasures.join('; ')}`,
              `验证方法: ${solution.verificationMethod}`,
              `标签: ${solution.tags.join(', ')}`,
              `发现时间: ${solution.context.discoveredAt.toISOString()}`,
              `解决时间: ${solution.resolvedAt.toISOString()}`
            ]
          }]
        });

        this.logger.info('问题解决方案存储成功', { id: solution.id });
        return true;
      } else {
        await this.storeToLocalStorage('problem-solutions', solution.id, solution);
        this.logger.warn('Memory MCP 不可用，使用本地存储', { id: solution.id });
        return true;
      }
    } catch (error) {
      this.logger.error('存储问题解决方案失败', error, { id: solution.id });
      return false;
    }
  }

  /**
   * 存储最佳实践
   * @param practice 最佳实践记录
   * @returns 存储结果
   */
  async storeBestPractice(practice: BestPractice): Promise<boolean> {
    this.logger.info('存储最佳实践', { id: practice.id, title: practice.title });

    try {
      if (await this.mcpTools.isMemoryAvailable()) {
        await this.mcpTools.callMemory('create_entities', {
          entities: [{
            name: `best-practice-${practice.id}`,
            entityType: 'BestPractice',
            observations: [
              `标题: ${practice.title}`,
              `描述: ${practice.description}`,
              `分类: ${practice.category}`,
              `适用场景: ${practice.applicableScenarios.join('; ')}`,
              `指南: ${practice.content.guidelines.join('; ')}`,
              `收益: ${practice.benefits.join('; ')}`,
              `注意事项: ${practice.considerations.join('; ')}`,
              `相关工具: ${practice.relatedTools.join(', ')}`,
              `使用频率: ${practice.usageCount}`,
              `标签: ${practice.tags.join(', ')}`,
              `创建时间: ${practice.createdAt.toISOString()}`,
              `更新时间: ${practice.updatedAt.toISOString()}`
            ]
          }]
        });

        this.logger.info('最佳实践存储成功', { id: practice.id });
        return true;
      } else {
        await this.storeToLocalStorage('best-practices', practice.id, practice);
        this.logger.warn('Memory MCP 不可用，使用本地存储', { id: practice.id });
        return true;
      }
    } catch (error) {
      this.logger.error('存储最佳实践失败', error, { id: practice.id });
      return false;
    }
  }

  /**
   * 检索经验
   * @param query 查询条件
   * @returns 检索结果
   */
  async retrieveExperience(query: ExperienceQuery): Promise<ExperienceSearchResult> {
    this.logger.info('检索经验', { query });

    try {
      if (await this.mcpTools.isMemoryAvailable()) {
        return await this.retrieveFromMemoryMCP(query);
      } else {
        return await this.retrieveFromLocalStorage(query);
      }
    } catch (error) {
      this.logger.error('检索经验失败', error);
      return {
        designDecisions: [],
        problemSolutions: [],
        bestPractices: [],
        totalCount: 0,
        relevanceScores: {}
      };
    }
  }

  /**
   * 生成应用建议
   * @param context 当前上下文
   * @param query 查询条件
   * @returns 应用建议列表
   */
  async generateApplicationSuggestions(
    context: Record<string, any>,
    query?: ExperienceQuery
  ): Promise<ApplicationSuggestion[]> {
    this.logger.info('生成应用建议', { context });

    try {
      // 检索相关经验
      const searchQuery: ExperienceQuery = query || {
        type: 'all',
        keywords: this.extractKeywordsFromContext(context),
        project: context.project,
        limit: 10
      };

      const searchResult = await this.retrieveExperience(searchQuery);
      const suggestions: ApplicationSuggestion[] = [];

      // 为设计决策生成建议
      for (const decision of searchResult.designDecisions) {
        const applicabilityScore = this.calculateApplicabilityScore(decision, context);
        if (applicabilityScore > 0.6) {
          suggestions.push({
            id: `suggestion-${decision.id}`,
            type: 'design-decision',
            title: `应用设计决策: ${decision.title}`,
            description: `基于类似场景的设计决策，建议考虑 ${decision.selectedOption}`,
            relatedExperienceId: decision.id,
            applicabilityScore,
            applicationGuidance: [
              `参考决策理由: ${decision.rationale}`,
              `考虑影响范围: ${decision.impact.join(', ')}`,
              '根据当前项目特点进行适当调整'
            ],
            expectedBenefits: [
              '基于历史经验的成熟方案',
              '减少设计决策的不确定性',
              '提高架构一致性'
            ],
            implementationComplexity: this.assessImplementationComplexity(decision),
            risks: [
              '需要根据当前项目特点进行调整',
              '可能存在技术栈差异'
            ]
          });
        }
      }

      // 为问题解决方案生成建议
      for (const solution of searchResult.problemSolutions) {
        const applicabilityScore = this.calculateApplicabilityScore(solution, context);
        if (applicabilityScore > 0.7) {
          suggestions.push({
            id: `suggestion-${solution.id}`,
            type: 'problem-solution',
            title: `预防问题: ${solution.problemTitle}`,
            description: `基于历史问题，建议采取预防措施`,
            relatedExperienceId: solution.id,
            applicabilityScore,
            applicationGuidance: [
              `根本原因: ${solution.rootCause}`,
              ...solution.preventionMeasures.map(measure => `预防措施: ${measure}`),
              `验证方法: ${solution.verificationMethod}`
            ],
            expectedBenefits: [
              '避免重复问题',
              '提高系统稳定性',
              '减少调试时间'
            ],
            implementationComplexity: 'low',
            risks: [
              '需要验证预防措施的适用性'
            ]
          });
        }
      }

      // 为最佳实践生成建议
      for (const practice of searchResult.bestPractices) {
        const applicabilityScore = this.calculateApplicabilityScore(practice, context);
        if (applicabilityScore > 0.5) {
          suggestions.push({
            id: `suggestion-${practice.id}`,
            type: 'best-practice',
            title: `应用最佳实践: ${practice.title}`,
            description: practice.description,
            relatedExperienceId: practice.id,
            applicabilityScore,
            applicationGuidance: practice.content.guidelines,
            expectedBenefits: practice.benefits,
            implementationComplexity: this.assessPracticeComplexity(practice),
            risks: practice.considerations
          });
        }
      }

      // 按适用性评分排序
      suggestions.sort((a, b) => b.applicabilityScore - a.applicabilityScore);

      this.logger.info('应用建议生成完成', { count: suggestions.length });
      return suggestions.slice(0, query?.limit || 5);

    } catch (error) {
      this.logger.error('生成应用建议失败', error);
      return [];
    }
  }

  /**
   * 更新经验使用统计
   * @param experienceId 经验ID
   * @param type 经验类型
   */
  async updateUsageStatistics(experienceId: string, type: string): Promise<void> {
    this.logger.info('更新使用统计', { experienceId, type });

    try {
      if (await this.mcpTools.isMemoryAvailable()) {
        await this.mcpTools.callMemory('add_observations', {
          observations: [{
            entityName: `${type}-${experienceId}`,
            contents: [`使用时间: ${new Date().toISOString()}`]
          }]
        });
      }
    } catch (error) {
      this.logger.error('更新使用统计失败', error);
    }
  }

  // 私有辅助方法

  private async retrieveFromMemoryMCP(query: ExperienceQuery): Promise<ExperienceSearchResult> {
    const searchKeywords = query.keywords?.join(' ') || '';
    const searchResults = await this.mcpTools.callMemory('search_nodes', {
      query: searchKeywords
    });

    const designDecisions: DesignDecision[] = [];
    const problemSolutions: ProblemSolution[] = [];
    const bestPractices: BestPractice[] = [];
    const relevanceScores: Record<string, number> = {};

    // 解析搜索结果
    for (const node of searchResults.nodes || []) {
      if (node.entityType === 'DesignDecision') {
        const decision = this.parseDesignDecisionFromNode(node);
        if (decision) {
          designDecisions.push(decision);
          relevanceScores[decision.id] = node.relevanceScore || 0;
        }
      } else if (node.entityType === 'ProblemSolution') {
        const solution = this.parseProblemSolutionFromNode(node);
        if (solution) {
          problemSolutions.push(solution);
          relevanceScores[solution.id] = node.relevanceScore || 0;
        }
      } else if (node.entityType === 'BestPractice') {
        const practice = this.parseBestPracticeFromNode(node);
        if (practice) {
          bestPractices.push(practice);
          relevanceScores[practice.id] = node.relevanceScore || 0;
        }
      }
    }

    return {
      designDecisions,
      problemSolutions,
      bestPractices,
      totalCount: designDecisions.length + problemSolutions.length + bestPractices.length,
      relevanceScores
    };
  }

  private async retrieveFromLocalStorage(query: ExperienceQuery): Promise<ExperienceSearchResult> {
    // 本地存储的简单实现
    return {
      designDecisions: [],
      problemSolutions: [],
      bestPractices: [],
      totalCount: 0,
      relevanceScores: {}
    };
  }

  private async storeToLocalStorage(type: string, id: string, data: any): Promise<void> {
    // 本地存储的简单实现
    this.logger.info('存储到本地存储', { type, id });
  }

  private extractKeywordsFromContext(context: Record<string, any>): string[] {
    const keywords: string[] = [];
    
    if (context.files) {
      keywords.push(...context.files.map((f: string) => f.split('/').pop()?.split('.')[0]).filter(Boolean));
    }
    
    if (context.technologies) {
      keywords.push(...context.technologies);
    }
    
    if (context.modules) {
      keywords.push(...context.modules);
    }

    return keywords;
  }

  private calculateApplicabilityScore(experience: any, context: Record<string, any>): number {
    let score = 0.5; // 基础分数

    // 项目匹配
    if (experience.context?.project === context.project) {
      score += 0.2;
    }

    // 技术栈匹配
    if (context.technologies && experience.tags) {
      const matchingTechs = context.technologies.filter((tech: string) => 
        experience.tags.includes(tech)
      );
      score += (matchingTechs.length / context.technologies.length) * 0.2;
    }

    // 时间相关性（越新越相关）
    if (experience.createdAt || experience.context?.timestamp) {
      const experienceDate = new Date(experience.createdAt || experience.context.timestamp);
      const daysSince = (Date.now() - experienceDate.getTime()) / (1000 * 60 * 60 * 24);
      score += Math.max(0, (365 - daysSince) / 365) * 0.1;
    }

    return Math.min(1, score);
  }

  private assessImplementationComplexity(decision: DesignDecision): 'low' | 'medium' | 'high' {
    if (decision.impact.length <= 2) return 'low';
    if (decision.impact.length <= 5) return 'medium';
    return 'high';
  }

  private assessPracticeComplexity(practice: BestPractice): 'low' | 'medium' | 'high' {
    if (practice.content.guidelines.length <= 3) return 'low';
    if (practice.content.guidelines.length <= 6) return 'medium';
    return 'high';
  }

  private parseDesignDecisionFromNode(node: any): DesignDecision | null {
    // 从 Memory MCP 节点解析设计决策
    try {
      const observations = node.observations || [];
      const id = node.name.replace('design-decision-', '');
      
      return {
        id,
        title: this.extractObservationValue(observations, '标题'),
        description: this.extractObservationValue(observations, '描述'),
        context: {
          project: this.extractObservationValue(observations, '项目'),
          module: this.extractObservationValue(observations, '模块'),
          files: [],
          timestamp: new Date(this.extractObservationValue(observations, '时间'))
        },
        options: [],
        selectedOption: this.extractObservationValue(observations, '选择的选项'),
        rationale: this.extractObservationValue(observations, '决策理由'),
        impact: this.extractObservationValue(observations, '影响范围').split(', '),
        tags: this.extractObservationValue(observations, '标签').split(', ')
      };
    } catch (error) {
      this.logger.error('解析设计决策失败', error);
      return null;
    }
  }

  private parseProblemSolutionFromNode(node: any): ProblemSolution | null {
    // 从 Memory MCP 节点解析问题解决方案
    try {
      const observations = node.observations || [];
      const id = node.name.replace('problem-solution-', '');
      
      return {
        id,
        problemTitle: this.extractObservationValue(observations, '问题标题'),
        problemDescription: this.extractObservationValue(observations, '问题描述'),
        category: this.extractObservationValue(observations, '分类') as any,
        severity: this.extractObservationValue(observations, '严重程度') as any,
        context: {
          project: this.extractObservationValue(observations, '项目'),
          environment: this.extractObservationValue(observations, '环境'),
          files: [],
          discoveredAt: new Date(this.extractObservationValue(observations, '发现时间'))
        },
        solution: {
          description: this.extractObservationValue(observations, '解决方案'),
          steps: []
        },
        rootCause: this.extractObservationValue(observations, '根本原因'),
        preventionMeasures: this.extractObservationValue(observations, '预防措施').split('; '),
        resolvedAt: new Date(this.extractObservationValue(observations, '解决时间')),
        verificationMethod: this.extractObservationValue(observations, '验证方法'),
        tags: this.extractObservationValue(observations, '标签').split(', ')
      };
    } catch (error) {
      this.logger.error('解析问题解决方案失败', error);
      return null;
    }
  }

  private parseBestPracticeFromNode(node: any): BestPractice | null {
    // 从 Memory MCP 节点解析最佳实践
    try {
      const observations = node.observations || [];
      const id = node.name.replace('best-practice-', '');
      
      return {
        id,
        title: this.extractObservationValue(observations, '标题'),
        description: this.extractObservationValue(observations, '描述'),
        category: this.extractObservationValue(observations, '分类') as any,
        applicableScenarios: this.extractObservationValue(observations, '适用场景').split('; '),
        content: {
          guidelines: this.extractObservationValue(observations, '指南').split('; ')
        },
        benefits: this.extractObservationValue(observations, '收益').split('; '),
        considerations: this.extractObservationValue(observations, '注意事项').split('; '),
        relatedTools: this.extractObservationValue(observations, '相关工具').split(', '),
        createdAt: new Date(this.extractObservationValue(observations, '创建时间')),
        updatedAt: new Date(this.extractObservationValue(observations, '更新时间')),
        usageCount: parseInt(this.extractObservationValue(observations, '使用频率')) || 0,
        tags: this.extractObservationValue(observations, '标签').split(', ')
      };
    } catch (error) {
      this.logger.error('解析最佳实践失败', error);
      return null;
    }
  }

  private extractObservationValue(observations: string[], key: string): string {
    const observation = observations.find(obs => obs.startsWith(`${key}: `));
    return observation ? observation.substring(key.length + 2) : '';
  }
}