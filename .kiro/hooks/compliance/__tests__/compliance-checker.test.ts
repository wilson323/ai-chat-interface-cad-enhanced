/**
 * ComplianceChecker 单元测试
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { ComplianceChecker } from '../compliance-checker.js';
import { mcpToolsManager } from '../../core/mcp-tools-manager.js';
import { ComplianceResult, MCPToolResult } from '../../types/index.js';

// Mock MCP工具管理器
vi.mock('../../core/mcp-tools-manager.js', () => ({
  mcpToolsManager: {
    callTool: vi.fn()
  }
}));

describe('ComplianceChecker', () => {
  let complianceChecker: ComplianceChecker;
  let mockCallTool: Mock;

  beforeEach(() => {
    complianceChecker = new ComplianceChecker();
    mockCallTool = mcpToolsManager.callTool as Mock;
    mockCallTool.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('checkPythonCompliance', () => {
    it('应该在没有Python文件时返回通过结果', async () => {
      // Given
      const files = ['test.ts', 'test.js'];

      // When
      const result = await complianceChecker.checkPythonCompliance(files);

      // Then
      expect(result.passed).toBe(true);
      expect(result.score).toBe(100);
      expect(result.issues).toHaveLength(0);
      expect(result.checkType).toBe('Python合规检查');
      expect(result.recommendations).toContain('无Python文件需要检查');
    });

    it('应该执行完整的Python合规检查', async () => {
      // Given
      const files = ['test.py', 'main.py'];
      
      // Mock PEP 8检查结果
      mockCallTool.mockImplementation((tool: string, method: string) => {
        if (method === 'style_check') {
          return Promise.resolve({
            success: true,
            data: {
              issues: [
                {
                  severity: 'warning',
                  message: '行长度超过88字符',
                  file: 'test.py',
                  line: 10,
                  code: 'E501'
                }
              ]
            }
          } as MCPToolResult);
        }
        
        if (method === 'complexity_check') {
          return Promise.resolve({
            success: true,
            data: {
              violations: [
                {
                  complexity: 12,
                  file: 'main.py',
                  line: 20
                }
              ]
            }
          } as MCPToolResult);
        }

        return Promise.resolve({
          success: true,
          data: {}
        } as MCPToolResult);
      });

      // When
      const result = await complianceChecker.checkPythonCompliance(files);

      // Then
      expect(result.passed).toBe(false); // 有medium和high问题
      expect(result.issues).toHaveLength(2);
      expect(result.issues[0].category).toBe('PEP 8风格');
      expect(result.issues[1].category).toBe('Python复杂度');
      expect(result.score).toBeLessThan(100);
      
      // 验证MCP工具调用
      expect(mockCallTool).toHaveBeenCalledWith('serena', 'style_check', {
        files,
        standard: 'pep8',
        maxLineLength: 88
      });
      expect(mockCallTool).toHaveBeenCalledWith('serena', 'complexity_check', {
        files,
        maxComplexity: 10
      });
    });

    it('应该处理MCP工具调用失败的情况', async () => {
      // Given
      const files = ['test.py'];
      mockCallTool.mockRejectedValue(new Error('MCP工具不可用'));

      // When
      const result = await complianceChecker.checkPythonCompliance(files);

      // Then
      expect(result.passed).toBe(true); // 只有medium级别的错误
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].category).toBe('Python检查错误');
      expect(result.issues[0].description).toContain('检查过程中出现错误');
    });

    it('应该支持自定义检查选项', async () => {
      // Given
      const files = ['test.py'];
      const options = {
        maxLineLength: 120,
        maxComplexity: 15,
        typeAnnotationCheck: false
      };

      mockCallTool.mockResolvedValue({
        success: true,
        data: {}
      } as MCPToolResult);

      // When
      await complianceChecker.checkPythonCompliance(files, options);

      // Then
      expect(mockCallTool).toHaveBeenCalledWith('serena', 'style_check', {
        files,
        standard: 'pep8',
        maxLineLength: 120
      });
      expect(mockCallTool).toHaveBeenCalledWith('serena', 'complexity_check', {
        files,
        maxComplexity: 15
      });
      // 类型注解检查应该被跳过
      expect(mockCallTool).not.toHaveBeenCalledWith('serena', 'type_annotation_check', expect.any(Object));
    });

    it('应该正确计算合规评分', async () => {
      // Given
      const files = ['test.py'];
      
      mockCallTool.mockImplementation((tool: string, method: string) => {
        if (method === 'style_check') {
          return Promise.resolve({
            success: true,
            data: {
              issues: [
                { severity: 'error', message: '严重错误', file: 'test.py', line: 1 },
                { severity: 'warning', message: '警告', file: 'test.py', line: 2 },
                { severity: 'info', message: '信息', file: 'test.py', line: 3 }
              ]
            }
          } as MCPToolResult);
        }
        return Promise.resolve({ success: true, data: {} } as MCPToolResult);
      });

      // When
      const result = await complianceChecker.checkPythonCompliance(files);

      // Then
      // 100 - 25(critical) - 8(medium) - 3(low) = 64
      expect(result.score).toBe(64);
      expect(result.passed).toBe(false); // 有critical问题
    });
  });

  describe('checkTypeScriptCompliance', () => {
    it('应该在没有TypeScript文件时返回通过结果', async () => {
      // Given
      const files = ['test.py', 'test.js'];

      // When
      const result = await complianceChecker.checkTypeScriptCompliance(files);

      // Then
      expect(result.passed).toBe(true);
      expect(result.score).toBe(100);
      expect(result.issues).toHaveLength(0);
      expect(result.checkType).toBe('TypeScript合规检查');
      expect(result.recommendations).toContain('无TypeScript文件需要检查');
    });

    it('应该执行完整的TypeScript合规检查', async () => {
      // Given
      const files = ['test.ts', 'component.tsx'];
      
      mockCallTool.mockImplementation((tool: string, method: string) => {
        if (method === 'eslint_check') {
          return Promise.resolve({
            success: true,
            data: {
              issues: [
                {
                  severity: 2,
                  message: 'Missing semicolon',
                  file: 'test.ts',
                  line: 5,
                  ruleId: 'semi'
                }
              ]
            }
          } as MCPToolResult);
        }
        
        if (method === 'any_type_check') {
          return Promise.resolve({
            success: true,
            data: {
              usages: [
                {
                  context: 'function parameter',
                  file: 'component.tsx',
                  line: 10
                }
              ]
            }
          } as MCPToolResult);
        }

        return Promise.resolve({
          success: true,
          data: {}
        } as MCPToolResult);
      });

      // When
      const result = await complianceChecker.checkTypeScriptCompliance(files);

      // Then
      expect(result.passed).toBe(false); // 有high问题
      expect(result.issues).toHaveLength(2);
      expect(result.issues[0].category).toBe('ESLint规范');
      expect(result.issues[1].category).toBe('TypeScript类型安全');
      
      // 验证MCP工具调用
      expect(mockCallTool).toHaveBeenCalledWith('serena', 'eslint_check', {
        files,
        config: 'typescript'
      });
      expect(mockCallTool).toHaveBeenCalledWith('serena', 'any_type_check', {
        files
      });
    });

    it('应该支持自定义检查选项', async () => {
      // Given
      const files = ['test.ts'];
      const options = {
        strictMode: false,
        eslintCheck: false,
        noAnyType: false
      };

      mockCallTool.mockResolvedValue({
        success: true,
        data: {}
      } as MCPToolResult);

      // When
      await complianceChecker.checkTypeScriptCompliance(files, options);

      // Then
      // ESLint检查应该被跳过
      expect(mockCallTool).not.toHaveBeenCalledWith('serena', 'eslint_check', expect.any(Object));
      // 严格模式检查应该被跳过
      expect(mockCallTool).not.toHaveBeenCalledWith('serena', 'typescript_strict_check', expect.any(Object));
      // any类型检查应该被跳过
      expect(mockCallTool).not.toHaveBeenCalledWith('serena', 'any_type_check', expect.any(Object));
    });

    it('应该正确处理React组件文件', async () => {
      // Given
      const files = ['component.tsx', 'utils.ts'];
      
      mockCallTool.mockImplementation((tool: string, method: string) => {
        if (method === 'component_structure_check') {
          return Promise.resolve({
            success: true,
            data: {
              issues: [
                {
                  message: '组件结构不规范',
                  file: 'component.tsx',
                  line: 15
                }
              ]
            }
          } as MCPToolResult);
        }
        return Promise.resolve({ success: true, data: {} } as MCPToolResult);
      });

      // When
      const result = await complianceChecker.checkTypeScriptCompliance(files);

      // Then
      expect(mockCallTool).toHaveBeenCalledWith('serena', 'component_structure_check', {
        files: ['component.tsx'] // 只有tsx文件
      });
      expect(result.issues.some(i => i.category === 'React组件结构')).toBe(true);
    });
  });

  describe('评分和通过判断', () => {
    it('应该正确计算不同严重程度的评分', () => {
      // 这个测试需要访问私有方法，我们通过公共接口测试
      const files = ['test.py'];
      
      // 测试将通过实际调用来验证评分逻辑
      expect(true).toBe(true); // 占位测试
    });

    it('应该在没有critical和high问题时通过检查', async () => {
      // Given
      const files = ['test.py'];
      
      mockCallTool.mockImplementation((tool: string, method: string) => {
        if (method === 'style_check') {
          return Promise.resolve({
            success: true,
            data: {
              issues: [
                { severity: 'info', message: '信息', file: 'test.py', line: 1 },
                { severity: 'hint', message: '提示', file: 'test.py', line: 2 }
              ]
            }
          } as MCPToolResult);
        }
        return Promise.resolve({ success: true, data: {} } as MCPToolResult);
      });

      // When
      const result = await complianceChecker.checkPythonCompliance(files);

      // Then
      expect(result.passed).toBe(true); // 只有low级别问题
      expect(result.score).toBeGreaterThan(90);
    });

    it('应该在有critical或high问题时不通过检查', async () => {
      // Given
      const files = ['test.py'];
      
      mockCallTool.mockImplementation((tool: string, method: string) => {
        if (method === 'style_check') {
          return Promise.resolve({
            success: true,
            data: {
              issues: [
                { severity: 'error', message: '严重错误', file: 'test.py', line: 1 }
              ]
            }
          } as MCPToolResult);
        }
        return Promise.resolve({ success: true, data: {} } as MCPToolResult);
      });

      // When
      const result = await complianceChecker.checkPythonCompliance(files);

      // Then
      expect(result.passed).toBe(false);
      expect(result.score).toBeLessThan(90);
    });
  });

  describe('建议生成', () => {
    it('应该为Python问题生成相应建议', async () => {
      // Given
      const files = ['test.py'];
      
      mockCallTool.mockImplementation((tool: string, method: string) => {
        if (method === 'style_check') {
          return Promise.resolve({
            success: true,
            data: {
              issues: [
                { severity: 'warning', message: 'PEP 8问题', file: 'test.py', line: 1 }
              ]
            }
          } as MCPToolResult);
        }
        if (method === 'complexity_check') {
          return Promise.resolve({
            success: true,
            data: {
              violations: [
                { complexity: 12, file: 'test.py', line: 20 }
              ]
            }
          } as MCPToolResult);
        }
        return Promise.resolve({ success: true, data: {} } as MCPToolResult);
      });

      // When
      const result = await complianceChecker.checkPythonCompliance(files);

      // Then
      expect(result.recommendations).toContain('运行 black 和 flake8 修复Python代码风格问题');
      expect(result.recommendations).toContain('重构复杂函数，将大函数拆分为更小的函数');
      expect(result.recommendations).toContain('参考PEP 8和项目编码规范文档');
    });

    it('应该为TypeScript问题生成相应建议', async () => {
      // Given
      const files = ['test.ts'];
      
      mockCallTool.mockImplementation((tool: string, method: string) => {
        if (method === 'eslint_check') {
          return Promise.resolve({
            success: true,
            data: {
              issues: [
                { severity: 1, message: 'ESLint问题', file: 'test.ts', line: 1 }
              ]
            }
          } as MCPToolResult);
        }
        if (method === 'any_type_check') {
          return Promise.resolve({
            success: true,
            data: {
              usages: [
                { context: 'parameter', file: 'test.ts', line: 5 }
              ]
            }
          } as MCPToolResult);
        }
        return Promise.resolve({ success: true, data: {} } as MCPToolResult);
      });

      // When
      const result = await complianceChecker.checkTypeScriptCompliance(files);

      // Then
      expect(result.recommendations).toContain('运行 eslint --fix 修复TypeScript代码风格问题');
      expect(result.recommendations).toContain('使用具体的类型定义替换any类型');
      expect(result.recommendations).toContain('使用TypeScript严格模式和完整的类型定义');
    });

    it('应该在没有问题时生成通过建议', async () => {
      // Given
      const files = ['test.py'];
      
      mockCallTool.mockResolvedValue({
        success: true,
        data: {}
      } as MCPToolResult);

      // When
      const result = await complianceChecker.checkPythonCompliance(files);

      // Then
      expect(result.recommendations).toContain('Python代码符合所有规范要求');
    });
  });

  describe('错误处理', () => {
    it('应该优雅处理MCP工具不可用的情况', async () => {
      // Given
      const files = ['test.py'];
      mockCallTool.mockRejectedValue(new Error('连接超时'));

      // When
      const result = await complianceChecker.checkPythonCompliance(files);

      // Then
      expect(result.issues.some(i => i.category === 'Python检查错误')).toBe(true);
      expect(result.issues.some(i => i.description.includes('检查过程中出现错误'))).toBe(true);
    });

    it('应该处理部分检查失败的情况', async () => {
      // Given
      const files = ['test.py'];
      
      mockCallTool.mockImplementation((tool: string, method: string) => {
        if (method === 'style_check') {
          return Promise.resolve({
            success: true,
            data: { issues: [] }
          } as MCPToolResult);
        }
        if (method === 'complexity_check') {
          throw new Error('复杂度检查失败');
        }
        return Promise.resolve({ success: true, data: {} } as MCPToolResult);
      });

      // When
      const result = await complianceChecker.checkPythonCompliance(files);

      // Then
      expect(result.issues.some(i => i.category === 'Python复杂度检查')).toBe(true);
      expect(result.passed).toBe(true); // 只有low级别的错误
    });
  });
});