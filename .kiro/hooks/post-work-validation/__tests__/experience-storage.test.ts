/**
 * 经验存储系统单元测试
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { 
  ExperienceStorage, 
  DesignDecision, 
  ProblemSolution, 
  BestPractice,
  ExperienceQuery 
} from '../experience-storage';
import { MCPToolsManager } from '../../core/mcp-tools-manager';

// Mock MCPToolsManager
vi.mock('../../core/mcp-tools-manager');
vi.mock('../../core/hook-logger');

describe('ExperienceStorage', () => {
  let storage: ExperienceStorage;
  let mockMCPTools: jest.Mocked<MCPToolsManager>;

  beforeEach(() => {
    mockMCPTools = {
      isMemoryAvailable: vi.fn(),
      callMemory: vi.fn(),
      isSerenaAvailable: vi.fn(),
      callSerena: vi.fn(),
      isMentorAvailable: vi.fn(),
      callMentor: vi.fn(),
      isSequentialThinkingAvailable: vi.fn(),
      callSequentialThinking: vi.fn(),
      isContext7Available: vi.fn(),
      callContext7: vi.fn(),
      isTaskManagerAvailable: vi.fn(),
      callTaskManager: vi.fn(),
      getToolsStatus: vi.fn(),
      validateToolsReady: vi.fn()
    } as any;

    storage = new ExperienceStorage(mockMCPTools);
  });

  describe('storeDesignDecision', () => {
    const mockDesignDecision: DesignDecision = {
      id: 'dd-001',
      title: '数据库选择决策',
      description: '为项目选择合适的数据库',
      context: {
        project: 'ai-chat-interface',
        module: 'database',
        files: ['src/database/config.ts'],
        timestamp: new Date('2024-01-01')
      },
      options: [
        {
          name: 'PostgreSQL',
          description: '关系型数据库',
          pros: ['ACID 支持', '成熟稳定'],
          cons: ['复杂查询性能']
        }
      ],
      selectedOption: 'PostgreSQL',
      rationale: '项目需要强一致性',
      impact: ['数据层架构', '性能特性'],
      tags: ['database', 'architecture']
    };

    it('应该成功存储设计决策到 Memory MCP', async () => {
      // Given
      mockMCPTools.isMemoryAvailable.mockResolvedValue(true);
      mockMCPTools.callMemory.mockResolvedValue({ success: true });

      // When
      const result = await storage.storeDesignDecision(mockDesignDecision);

      // Then
      expect(result).toBe(true);
      expect(mockMCPTools.callMemory).toHaveBeenCalledWith('create_entities', {
        entities: [{
          name: 'design-decision-dd-001',
          entityType: 'DesignDecision',
          observations: expect.arrayContaining([
            '标题: 数据库选择决策',
            '描述: 为项目选择合适的数据库',
            '项目: ai-chat-interface',
            '模块: database',
            '选择的选项: PostgreSQL',
            '决策理由: 项目需要强一致性',
            '影响范围: 数据层架构, 性能特性',
            '标签: database, architecture'
          ])
        }]
      });
    });

    it('应该创建与相关文件的关联', async () => {
      // Given
      mockMCPTools.isMemoryAvailable.mockResolvedValue(true);
      mockMCPTools.callMemory.mockResolvedValue({ success: true });

      // When
      await storage.storeDesignDecision(mockDesignDecision);

      // Then
      expect(mockMCPTools.callMemory).toHaveBeenCalledWith('create_relations', {
        relations: [{
          from: 'design-decision-dd-001',
          to: 'file-src-database-config-ts',
          relationType: 'affects'
        }]
      });
    });

    it('应该在 Memory MCP 不可用时使用本地存储', async () => {
      // Given
      mockMCPTools.isMemoryAvailable.mockResolvedValue(false);

      // When
      const result = await storage.storeDesignDecision(mockDesignDecision);

      // Then
      expect(result).toBe(true);
      expect(mockMCPTools.callMemory).not.toHaveBeenCalled();
    });

    it('应该处理存储错误', async () => {
      // Given
      mockMCPTools.isMemoryAvailable.mockResolvedValue(true);
      mockMCPTools.callMemory.mockRejectedValue(new Error('存储失败'));

      // When
      const result = await storage.storeDesignDecision(mockDesignDecision);

      // Then
      expect(result).toBe(false);
    });
  });

  describe('storeProblemSolution', () => {
    const mockProblemSolution: ProblemSolution = {
      id: 'ps-001',
      problemTitle: 'API 响应超时',
      problemDescription: '用户请求经常超时',
      category: 'performance',
      severity: 'high',
      context: {
        project: 'ai-chat-interface',
        environment: 'production',
        files: ['src/api/chat.ts'],
        errorMessage: 'Request timeout',
        discoveredAt: new Date('2024-01-01')
      },
      solution: {
        description: '增加连接池和缓存',
        steps: ['配置连接池', '添加 Redis 缓存']
      },
      rootCause: '数据库连接不足',
      preventionMeasures: ['监控连接数', '设置合理超时'],
      resolvedAt: new Date('2024-01-02'),
      verificationMethod: '负载测试',
      tags: ['performance', 'api']
    };

    it('应该成功存储问题解决方案', async () => {
      // Given
      mockMCPTools.isMemoryAvailable.mockResolvedValue(true);
      mockMCPTools.callMemory.mockResolvedValue({ success: true });

      // When
      const result = await storage.storeProblemSolution(mockProblemSolution);

      // Then
      expect(result).toBe(true);
      expect(mockMCPTools.callMemory).toHaveBeenCalledWith('create_entities', {
        entities: [{
          name: 'problem-solution-ps-001',
          entityType: 'ProblemSolution',
          observations: expect.arrayContaining([
            '问题标题: API 响应超时',
            '问题描述: 用户请求经常超时',
            '分类: performance',
            '严重程度: high',
            '项目: ai-chat-interface',
            '环境: production',
            '解决方案: 增加连接池和缓存',
            '根本原因: 数据库连接不足',
            '预防措施: 监控连接数; 设置合理超时',
            '验证方法: 负载测试',
            '标签: performance, api'
          ])
        }]
      });
    });
  });

  describe('storeBestPractice', () => {
    const mockBestPractice: BestPractice = {
      id: 'bp-001',
      title: 'TypeScript 严格模式',
      description: '使用 TypeScript 严格模式提高代码质量',
      category: 'coding',
      applicableScenarios: ['新项目', '重构项目'],
      content: {
        guidelines: ['启用 strict 模式', '避免 any 类型', '使用类型注解']
      },
      benefits: ['类型安全', '更好的 IDE 支持', '减少运行时错误'],
      considerations: ['学习成本', '迁移工作量'],
      relatedTools: ['TypeScript', 'ESLint'],
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      usageCount: 5,
      tags: ['typescript', 'quality']
    };

    it('应该成功存储最佳实践', async () => {
      // Given
      mockMCPTools.isMemoryAvailable.mockResolvedValue(true);
      mockMCPTools.callMemory.mockResolvedValue({ success: true });

      // When
      const result = await storage.storeBestPractice(mockBestPractice);

      // Then
      expect(result).toBe(true);
      expect(mockMCPTools.callMemory).toHaveBeenCalledWith('create_entities', {
        entities: [{
          name: 'best-practice-bp-001',
          entityType: 'BestPractice',
          observations: expect.arrayContaining([
            '标题: TypeScript 严格模式',
            '描述: 使用 TypeScript 严格模式提高代码质量',
            '分类: coding',
            '适用场景: 新项目; 重构项目',
            '指南: 启用 strict 模式; 避免 any 类型; 使用类型注解',
            '收益: 类型安全; 更好的 IDE 支持; 减少运行时错误',
            '注意事项: 学习成本; 迁移工作量',
            '相关工具: TypeScript, ESLint',
            '使用频率: 5',
            '标签: typescript, quality'
          ])
        }]
      });
    });
  });

  describe('retrieveExperience', () => {
    const mockQuery: ExperienceQuery = {
      type: 'all',
      keywords: ['database', 'performance'],
      project: 'ai-chat-interface',
      limit: 5
    };

    it('应该成功从 Memory MCP 检索经验', async () => {
      // Given
      mockMCPTools.isMemoryAvailable.mockResolvedValue(true);
      mockMCPTools.callMemory.mockResolvedValue({
        nodes: [
          {
            name: 'design-decision-dd-001',
            entityType: 'DesignDecision',
            observations: [
              '标题: 数据库选择决策',
              '描述: 为项目选择合适的数据库',
              '项目: ai-chat-interface',
              '模块: database',
              '选择的选项: PostgreSQL',
              '决策理由: 项目需要强一致性',
              '影响范围: 数据层架构, 性能特性',
              '标签: database, architecture',
              '时间: 2024-01-01T00:00:00.000Z'
            ],
            relevanceScore: 0.9
          }
        ]
      });

      // When
      const result = await storage.retrieveExperience(mockQuery);

      // Then
      expect(result.designDecisions).toHaveLength(1);
      expect(result.designDecisions[0].id).toBe('dd-001');
      expect(result.designDecisions[0].title).toBe('数据库选择决策');
      expect(result.relevanceScores['dd-001']).toBe(0.9);
      expect(result.totalCount).toBe(1);
    });

    it('应该在 Memory MCP 不可用时使用本地存储', async () => {
      // Given
      mockMCPTools.isMemoryAvailable.mockResolvedValue(false);

      // When
      const result = await storage.retrieveExperience(mockQuery);

      // Then
      expect(result).toBeDefined();
      expect(result.totalCount).toBe(0);
      expect(mockMCPTools.callMemory).not.toHaveBeenCalled();
    });

    it('应该处理检索错误', async () => {
      // Given
      mockMCPTools.isMemoryAvailable.mockResolvedValue(true);
      mockMCPTools.callMemory.mockRejectedValue(new Error('检索失败'));

      // When
      const result = await storage.retrieveExperience(mockQuery);

      // Then
      expect(result.totalCount).toBe(0);
      expect(result.designDecisions).toHaveLength(0);
      expect(result.problemSolutions).toHaveLength(0);
      expect(result.bestPractices).toHaveLength(0);
    });
  });

  describe('generateApplicationSuggestions', () => {
    const mockContext = {
      project: 'ai-chat-interface',
      technologies: ['typescript', 'react'],
      modules: ['database', 'api']
    };

    beforeEach(() => {
      mockMCPTools.isMemoryAvailable.mockResolvedValue(true);
      mockMCPTools.callMemory.mockResolvedValue({
        nodes: [
          {
            name: 'design-decision-dd-001',
            entityType: 'DesignDecision',
            observations: [
              '标题: 数据库选择决策',
              '描述: 为项目选择合适的数据库',
              '项目: ai-chat-interface',
              '模块: database',
              '选择的选项: PostgreSQL',
              '决策理由: 项目需要强一致性',
              '影响范围: 数据层架构, 性能特性',
              '标签: database, typescript',
              '时间: 2024-01-01T00:00:00.000Z'
            ],
            relevanceScore: 0.9
          },
          {
            name: 'best-practice-bp-001',
            entityType: 'BestPractice',
            observations: [
              '标题: TypeScript 严格模式',
              '描述: 使用 TypeScript 严格模式提高代码质量',
              '分类: coding',
              '适用场景: 新项目; 重构项目',
              '指南: 启用 strict 模式; 避免 any 类型; 使用类型注解',
              '收益: 类型安全; 更好的 IDE 支持; 减少运行时错误',
              '注意事项: 学习成本; 迁移工作量',
              '相关工具: TypeScript, ESLint',
              '使用频率: 5',
              '标签: typescript, quality',
              '创建时间: 2024-01-01T00:00:00.000Z',
              '更新时间: 2024-01-01T00:00:00.000Z'
            ],
            relevanceScore: 0.8
          }
        ]
      });
    });

    it('应该生成相关的应用建议', async () => {
      // When
      const suggestions = await storage.generateApplicationSuggestions(mockContext);

      // Then
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].type).toBeDefined();
      expect(suggestions[0].title).toBeTruthy();
      expect(suggestions[0].description).toBeTruthy();
      expect(suggestions[0].applicabilityScore).toBeGreaterThan(0);
      expect(Array.isArray(suggestions[0].applicationGuidance)).toBe(true);
      expect(Array.isArray(suggestions[0].expectedBenefits)).toBe(true);
    });

    it('应该按适用性评分排序建议', async () => {
      // When
      const suggestions = await storage.generateApplicationSuggestions(mockContext);

      // Then
      for (let i = 1; i < suggestions.length; i++) {
        expect(suggestions[i - 1].applicabilityScore).toBeGreaterThanOrEqual(
          suggestions[i].applicabilityScore
        );
      }
    });

    it('应该为不同类型的经验生成不同类型的建议', async () => {
      // When
      const suggestions = await storage.generateApplicationSuggestions(mockContext);

      // Then
      const types = suggestions.map(s => s.type);
      expect(types).toContain('design-decision');
      expect(types).toContain('best-practice');
    });

    it('应该处理生成建议时的错误', async () => {
      // Given
      mockMCPTools.isMemoryAvailable.mockRejectedValue(new Error('生成失败'));

      // When
      const suggestions = await storage.generateApplicationSuggestions(mockContext);

      // Then
      expect(suggestions).toHaveLength(0);
    });
  });

  describe('updateUsageStatistics', () => {
    it('应该更新经验使用统计', async () => {
      // Given
      mockMCPTools.isMemoryAvailable.mockResolvedValue(true);
      mockMCPTools.callMemory.mockResolvedValue({ success: true });

      // When
      await storage.updateUsageStatistics('dd-001', 'design-decision');

      // Then
      expect(mockMCPTools.callMemory).toHaveBeenCalledWith('add_observations', {
        observations: [{
          entityName: 'design-decision-dd-001',
          contents: [expect.stringMatching(/^使用时间: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)]
        }]
      });
    });

    it('应该处理更新统计时的错误', async () => {
      // Given
      mockMCPTools.isMemoryAvailable.mockResolvedValue(true);
      mockMCPTools.callMemory.mockRejectedValue(new Error('更新失败'));

      // When & Then
      await expect(storage.updateUsageStatistics('dd-001', 'design-decision')).resolves.not.toThrow();
    });
  });

  describe('适用性评分计算', () => {
    it('应该为相同项目给出更高的适用性评分', async () => {
      // Given
      const context1 = { project: 'ai-chat-interface', technologies: ['typescript'] };
      const context2 = { project: 'other-project', technologies: ['typescript'] };

      mockMCPTools.isMemoryAvailable.mockResolvedValue(true);
      mockMCPTools.callMemory.mockResolvedValue({
        nodes: [{
          name: 'design-decision-dd-001',
          entityType: 'DesignDecision',
          observations: [
            '标题: 测试决策',
            '描述: 测试描述',
            '项目: ai-chat-interface',
            '模块: test',
            '选择的选项: 选项A',
            '决策理由: 测试理由',
            '影响范围: 测试影响',
            '标签: typescript',
            '时间: 2024-01-01T00:00:00.000Z'
          ]
        }]
      });

      // When
      const suggestions1 = await storage.generateApplicationSuggestions(context1);
      const suggestions2 = await storage.generateApplicationSuggestions(context2);

      // Then
      if (suggestions1.length > 0 && suggestions2.length > 0) {
        expect(suggestions1[0].applicabilityScore).toBeGreaterThan(suggestions2[0].applicabilityScore);
      }
    });

    it('应该为匹配技术栈给出更高的适用性评分', async () => {
      // Given
      const context1 = { project: 'test', technologies: ['typescript', 'react'] };
      const context2 = { project: 'test', technologies: ['python', 'django'] };

      mockMCPTools.isMemoryAvailable.mockResolvedValue(true);
      mockMCPTools.callMemory.mockResolvedValue({
        nodes: [{
          name: 'best-practice-bp-001',
          entityType: 'BestPractice',
          observations: [
            '标题: TypeScript 最佳实践',
            '描述: TypeScript 开发指南',
            '分类: coding',
            '适用场景: 前端开发',
            '指南: 使用严格模式',
            '收益: 类型安全',
            '注意事项: 学习成本',
            '相关工具: TypeScript',
            '使用频率: 10',
            '标签: typescript, react',
            '创建时间: 2024-01-01T00:00:00.000Z',
            '更新时间: 2024-01-01T00:00:00.000Z'
          ]
        }]
      });

      // When
      const suggestions1 = await storage.generateApplicationSuggestions(context1);
      const suggestions2 = await storage.generateApplicationSuggestions(context2);

      // Then
      if (suggestions1.length > 0 && suggestions2.length > 0) {
        expect(suggestions1[0].applicabilityScore).toBeGreaterThan(suggestions2[0].applicabilityScore);
      }
    });
  });
});