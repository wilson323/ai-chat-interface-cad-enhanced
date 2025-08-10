/**
 * TestingSecurityChecker 单元测试
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { TestingSecurityChecker } from '../testing-security-checker.js';
import { mcpToolsManager } from '../../core/mcp-tools-manager.js';
import { ComplianceResult, MCPToolResult } from '../../types/index.js';

// Mock MCP工具管理器
vi.mock('../../core/mcp-tools-manager.js', () => ({
  mcpToolsManager: {
    callTool: vi.fn()
  }
}));

describe('TestingSecurityChecker', () => {
  let checker: TestingSecurityChecker;
  let mockCallTool: Mock;

  beforeEach(() => {
    checker = new TestingSecurityChecker();
    mockCallTool = mcpToolsManager.callTool as Mock;
    mockCallTool.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('checkTestingCompliance', () => {
    it('应该执行完整的测试合规检查', async () => {
      // Given
      const files = ['src/utils.ts', 'src/utils.test.ts', 'src/api.ts'];
      
      mockCallTool.mockImplementation((tool: string, method: string) => {
        if (method === 'test_coverage') {
          return Promise.resolve({
            success: true,
            data: {
              percentage: 75, // 低于默认要求85%
              unitTestCoverage: 70, // 低于默认要求80%
              integrationTestCoverage: 50 // 低于默认要求60%
            }
          } as MCPToolResult);
        }
        
        if (method === 'test_run') {
          return Promise.resolve({
            success: true,
            data: {
              success: false,
              failedCount: 2,
              failedTests: [
                {
                  name: 'should calculate correctly',
                  file: 'src/utils.test.ts',
                  line: 10,
                  error: 'Expected 5 but got 4'
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
      const result = await checker.checkTestingCompliance(files);

      // Then
      expect(result.passed).toBe(false); // 有critical和high问题
      expect(result.issues.length).toBeGreaterThan(0);
      
      // 验证覆盖率问题
      expect(result.issues.some(i => i.category === '测试覆盖率')).toBe(true);
      expect(result.issues.some(i => i.category === '单元测试覆盖率')).toBe(true);
      expect(result.issues.some(i => i.category === '集成测试覆盖率')).toBe(true);
      
      // 验证测试失败问题
      expect(result.issues.some(i => i.category === '测试执行')).toBe(true);
      expect(result.issues.some(i => i.category === '测试失败')).toBe(true);

      // 验证MCP工具调用
      expect(mockCallTool).toHaveBeenCalledWith('serena', 'test_coverage', {
        files
      });
      expect(mockCallTool).toHaveBeenCalledWith('serena', 'test_run', {
        files: ['src/utils.test.ts']
      });
    });

    it('应该在没有测试文件时检查测试文件存在性', async () => {
      // Given
      const files = ['src/utils.ts', 'src/api.ts']; // 没有测试文件
      
      mockCallTool.mockResolvedValue({
        success: true,
        data: { percentage: 0 }
      } as MCPToolResult);

      // When
      const result = await checker.checkTestingCompliance(files);

      // Then
      expect(result.issues.some(i => i.category === '测试文件缺失')).toBe(true);
    });

    it('应该支持自定义测试检查选项', async () => {
      // Given
      const files = ['src/utils.ts', 'src/utils.test.ts'];
      const options = {
        minCoverageRate: 70,
        runTests: false,
        checkTestQuality: false
      };

      mockCallTool.mockResolvedValue({
        success: true,
        data: { percentage: 75 }
      } as MCPToolResult);

      // When
      await checker.checkTestingCompliance(files, options);

      // Then
      // 测试运行应该被跳过
      expect(mockCallTool).not.toHaveBeenCalledWith('serena', 'test_run', expect.any(Object));
      // 测试质量检查应该被跳过
      expect(mockCallTool).not.toHaveBeenCalledWith('serena', 'test_quality_check', expect.any(Object));
    });

    it('应该处理MCP工具调用失败的情况', async () => {
      // Given
      const files = ['src/utils.test.ts'];
      mockCallTool.mockRejectedValue(new Error('测试工具不可用'));

      // When
      const result = await checker.checkTestingCompliance(files);

      // Then
      expect(result.issues.some(i => i.category === '测试检查错误')).toBe(true);
      expect(result.issues.some(i => i.description.includes('检查过程中出现错误'))).toBe(true);
    });
  });

  describe('checkSecurityCompliance', () => {
    it('应该执行完整的安全合规检查', async () => {
      // Given
      const files = ['src/auth.ts', 'package.json'];
      
      mockCallTool.mockImplementation((tool: string, method: string) => {
        if (method === 'security_scan') {
          return Promise.resolve({
            success: true,
            data: {
              vulnerabilities: [
                {
                  severity: 'high',
                  description: 'SQL注入漏洞',
                  file: 'src/auth.ts',
                  line: 25,
                  id: 'CWE-89'
                },
                {
                  severity: 'critical',
                  description: '硬编码密码',
                  file: 'src/auth.ts',
                  line: 10,
                  id: 'CWE-798'
                }
              ]
            }
          } as MCPToolResult);
        }
        
        if (method === 'secret_scan') {
          return Promise.resolve({
            success: true,
            data: {
              secrets: [
                {
                  type: 'API密钥',
                  file: 'src/auth.ts',
                  line: 5
                }
              ]
            }
          } as MCPToolResult);
        }

        if (method === 'dependency_security_check') {
          return Promise.resolve({
            success: true,
            data: {
              vulnerabilities: [
                {
                  severity: 'high',
                  package: 'lodash',
                  version: '4.17.15',
                  file: 'package.json',
                  fixedVersion: '4.17.21'
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
      const result = await checker.checkSecurityCompliance(files);

      // Then
      expect(result.passed).toBe(false); // 有critical问题
      expect(result.issues.length).toBeGreaterThan(0);
      
      // 验证安全漏洞
      expect(result.issues.some(i => i.category === '安全漏洞')).toBe(true);
      expect(result.issues.some(i => i.severity === 'critical')).toBe(true);
      
      // 验证敏感信息泄露
      expect(result.issues.some(i => i.category === '敏感信息泄露')).toBe(true);
      
      // 验证依赖安全
      expect(result.issues.some(i => i.category === '依赖安全')).toBe(true);

      // 验证MCP工具调用
      expect(mockCallTool).toHaveBeenCalledWith('serena', 'security_scan', {
        files
      });
      expect(mockCallTool).toHaveBeenCalledWith('serena', 'secret_scan', {
        files
      });
      expect(mockCallTool).toHaveBeenCalledWith('serena', 'dependency_security_check', {
        files: ['package.json']
      });
    });

    it('应该检查漏洞数量是否超标', async () => {
      // Given
      const files = ['src/app.ts'];
      const options = {
        allowedVulnerabilities: {
          critical: 0,
          high: 1,
          medium: 2,
          low: 5
        }
      };
      
      mockCallTool.mockImplementation((tool: string, method: string) => {
        if (method === 'security_scan') {
          return Promise.resolve({
            success: true,
            data: {
              vulnerabilities: [
                { severity: 'high', description: '漏洞1', file: 'src/app.ts', line: 1 },
                { severity: 'high', description: '漏洞2', file: 'src/app.ts', line: 2 },
                { severity: 'high', description: '漏洞3', file: 'src/app.ts', line: 3 } // 超过允许的1个
              ]
            }
          } as MCPToolResult);
        }
        return Promise.resolve({ success: true, data: {} } as MCPToolResult);
      });

      // When
      const result = await checker.checkSecurityCompliance(files, options);

      // Then
      expect(result.issues.some(i => i.category === '漏洞数量超标')).toBe(true);
      expect(result.issues.some(i => i.description.includes('high级别漏洞数量超标'))).toBe(true);
    });

    it('应该支持自定义安全检查选项', async () => {
      // Given
      const files = ['src/app.ts'];
      const options = {
        scanSecrets: false,
        checkDependencies: false,
        vulnerabilityScan: false
      };

      mockCallTool.mockResolvedValue({
        success: true,
        data: {}
      } as MCPToolResult);

      // When
      await checker.checkSecurityCompliance(files, options);

      // Then
      // 这些检查应该被跳过
      expect(mockCallTool).not.toHaveBeenCalledWith('serena', 'security_scan', expect.any(Object));
      expect(mockCallTool).not.toHaveBeenCalledWith('serena', 'secret_scan', expect.any(Object));
      expect(mockCallTool).not.toHaveBeenCalledWith('serena', 'dependency_security_check', expect.any(Object));
    });
  });

  describe('checkWindowsCompliance', () => {
    it('应该执行完整的Windows环境合规检查', async () => {
      // Given
      const files = ['src/utils.ts', 'scripts/deploy.ps1', 'README.md'];
      
      mockCallTool.mockImplementation((tool: string, method: string) => {
        if (method === 'path_handling_check') {
          return Promise.resolve({
            success: true,
            data: {
              issues: [
                {
                  message: '使用了硬编码的路径分隔符',
                  file: 'src/utils.ts',
                  line: 15
                }
              ]
            }
          } as MCPToolResult);
        }
        
        if (method === 'powershell_compatibility_check') {
          return Promise.resolve({
            success: true,
            data: {
              issues: [
                {
                  message: 'PowerShell版本兼容性问题',
                  file: 'scripts/deploy.ps1',
                  line: 5
                }
              ]
            }
          } as MCPToolResult);
        }

        if (method === 'file_encoding_check') {
          return Promise.resolve({
            success: true,
            data: {
              issues: [
                {
                  encoding: 'gbk',
                  file: 'README.md'
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
      const result = await checker.checkWindowsCompliance(files);

      // Then
      expect(result.issues.length).toBeGreaterThan(0);
      
      // 验证路径处理问题
      expect(result.issues.some(i => i.category === 'Windows路径兼容性')).toBe(true);
      
      // 验证PowerShell兼容性问题
      expect(result.issues.some(i => i.category === 'PowerShell兼容性')).toBe(true);
      
      // 验证文件编码问题
      expect(result.issues.some(i => i.category === '文件编码')).toBe(true);

      // 验证MCP工具调用
      expect(mockCallTool).toHaveBeenCalledWith('serena', 'path_handling_check', {
        files: ['src/utils.ts'], // 只有代码文件
        platform: 'windows'
      });
      expect(mockCallTool).toHaveBeenCalledWith('serena', 'powershell_compatibility_check', {
        files: ['scripts/deploy.ps1'] // 只有PowerShell文件
      });
      expect(mockCallTool).toHaveBeenCalledWith('serena', 'file_encoding_check', {
        files,
        expectedEncoding: 'utf-8'
      });
    });

    it('应该在没有相关文件时跳过特定检查', async () => {
      // Given
      const files = ['README.md']; // 没有代码文件和PowerShell文件
      
      mockCallTool.mockResolvedValue({
        success: true,
        data: {}
      } as MCPToolResult);

      // When
      await checker.checkWindowsCompliance(files);

      // Then
      // 路径处理检查应该被跳过（没有代码文件）
      expect(mockCallTool).not.toHaveBeenCalledWith('serena', 'path_handling_check', expect.any(Object));
      // PowerShell检查应该被跳过（没有.ps1文件）
      expect(mockCallTool).not.toHaveBeenCalledWith('serena', 'powershell_compatibility_check', expect.any(Object));
      // 文件编码检查应该执行
      expect(mockCallTool).toHaveBeenCalledWith('serena', 'file_encoding_check', expect.any(Object));
    });

    it('应该支持自定义Windows检查选项', async () => {
      // Given
      const files = ['src/app.ts', 'script.ps1'];
      const options = {
        checkPathHandling: false,
        checkPowerShellCompatibility: false,
        checkFileEncoding: false
      };

      mockCallTool.mockResolvedValue({
        success: true,
        data: {}
      } as MCPToolResult);

      // When
      await checker.checkWindowsCompliance(files, options);

      // Then
      // 这些检查应该被跳过
      expect(mockCallTool).not.toHaveBeenCalledWith('serena', 'path_handling_check', expect.any(Object));
      expect(mockCallTool).not.toHaveBeenCalledWith('serena', 'powershell_compatibility_check', expect.any(Object));
      expect(mockCallTool).not.toHaveBeenCalledWith('serena', 'file_encoding_check', expect.any(Object));
    });
  });

  describe('评分和通过判断', () => {
    it('应该正确计算不同严重程度的评分', async () => {
      // Given
      const files = ['test.ts'];
      
      mockCallTool.mockImplementation((tool: string, method: string) => {
        if (method === 'security_scan') {
          return Promise.resolve({
            success: true,
            data: {
              vulnerabilities: [
                { severity: 'critical', description: '严重漏洞', file: 'test.ts', line: 1 },
                { severity: 'high', description: '高危漏洞', file: 'test.ts', line: 2 },
                { severity: 'medium', description: '中危漏洞', file: 'test.ts', line: 3 },
                { severity: 'low', description: '低危漏洞', file: 'test.ts', line: 4 }
              ]
            }
          } as MCPToolResult);
        }
        return Promise.resolve({ success: true, data: {} } as MCPToolResult);
      });

      // When
      const result = await checker.checkSecurityCompliance(files);

      // Then
      // 100 - 25(critical) - 15(high) - 8(medium) - 3(low) = 49
      expect(result.score).toBe(49);
      expect(result.passed).toBe(false); // 有critical和high问题
    });

    it('应该在没有critical和high问题时通过检查', async () => {
      // Given
      const files = ['test.ts'];
      
      mockCallTool.mockImplementation((tool: string, method: string) => {
        if (method === 'test_coverage') {
          return Promise.resolve({
            success: true,
            data: {
              percentage: 90, // 高于要求
              unitTestCoverage: 85,
              integrationTestCoverage: 70
            }
          } as MCPToolResult);
        }
        
        if (method === 'test_run') {
          return Promise.resolve({
            success: true,
            data: {
              success: true,
              failedCount: 0
            }
          } as MCPToolResult);
        }

        return Promise.resolve({ success: true, data: {} } as MCPToolResult);
      });

      // When
      const result = await checker.checkTestingCompliance(files);

      // Then
      expect(result.passed).toBe(true);
      expect(result.score).toBeGreaterThan(90);
    });
  });

  describe('建议生成', () => {
    it('应该为测试问题生成相应建议', async () => {
      // Given
      const files = ['src/utils.ts'];
      
      mockCallTool.mockImplementation((tool: string, method: string) => {
        if (method === 'test_coverage') {
          return Promise.resolve({
            success: true,
            data: { percentage: 70 }
          } as MCPToolResult);
        }
        return Promise.resolve({ success: true, data: {} } as MCPToolResult);
      });

      // When
      const result = await checker.checkTestingCompliance(files);

      // Then
      expect(result.recommendations).toContain('提高测试覆盖率，为核心功能添加更多测试');
      expect(result.recommendations).toContain('定期运行测试并监控覆盖率变化');
    });

    it('应该为安全问题生成相应建议', async () => {
      // Given
      const files = ['src/auth.ts'];
      
      mockCallTool.mockImplementation((tool: string, method: string) => {
        if (method === 'security_scan') {
          return Promise.resolve({
            success: true,
            data: {
              vulnerabilities: [
                { severity: 'high', description: '安全漏洞', file: 'src/auth.ts', line: 1 }
              ]
            }
          } as MCPToolResult);
        }
        
        if (method === 'secret_scan') {
          return Promise.resolve({
            success: true,
            data: {
              secrets: [
                { type: 'API密钥', file: 'src/auth.ts', line: 5 }
              ]
            }
          } as MCPToolResult);
        }

        return Promise.resolve({ success: true, data: {} } as MCPToolResult);
      });

      // When
      const result = await checker.checkSecurityCompliance(files);

      // Then
      expect(result.recommendations).toContain('立即修复发现的安全漏洞');
      expect(result.recommendations).toContain('移除代码中的敏感信息，使用环境变量管理');
      expect(result.recommendations).toContain('定期进行安全扫描和渗透测试');
    });

    it('应该为Windows问题生成相应建议', async () => {
      // Given
      const files = ['src/utils.ts'];
      
      mockCallTool.mockImplementation((tool: string, method: string) => {
        if (method === 'path_handling_check') {
          return Promise.resolve({
            success: true,
            data: {
              issues: [
                { message: '路径问题', file: 'src/utils.ts', line: 1 }
              ]
            }
          } as MCPToolResult);
        }
        return Promise.resolve({ success: true, data: {} } as MCPToolResult);
      });

      // When
      const result = await checker.checkWindowsCompliance(files);

      // Then
      expect(result.recommendations).toContain('使用跨平台的路径处理函数');
      expect(result.recommendations).toContain('在Windows环境中进行充分测试');
    });

    it('应该在没有问题时生成通过建议', async () => {
      // Given
      const files = ['test.ts'];
      
      mockCallTool.mockResolvedValue({
        success: true,
        data: {}
      } as MCPToolResult);

      // When
      const result = await checker.checkWindowsCompliance(files);

      // Then
      expect(result.recommendations).toContain('Windows环境兼容性良好');
    });
  });

  describe('错误处理', () => {
    it('应该优雅处理MCP工具不可用的情况', async () => {
      // Given
      const files = ['test.ts'];
      mockCallTool.mockRejectedValue(new Error('连接超时'));

      // When
      const result = await checker.checkTestingCompliance(files);

      // Then
      expect(result.issues.some(i => i.category === '测试检查错误')).toBe(true);
      expect(result.issues.some(i => i.description.includes('检查过程中出现错误'))).toBe(true);
    });

    it('应该处理部分检查失败的情况', async () => {
      // Given
      const files = ['test.ts'];
      
      mockCallTool.mockImplementation((tool: string, method: string) => {
        if (method === 'test_coverage') {
          return Promise.resolve({
            success: true,
            data: { percentage: 90 }
          } as MCPToolResult);
        }
        if (method === 'test_run') {
          throw new Error('测试运行失败');
        }
        return Promise.resolve({ success: true, data: {} } as MCPToolResult);
      });

      // When
      const result = await checker.checkTestingCompliance(files);

      // Then
      expect(result.issues.some(i => i.category === '测试运行')).toBe(true);
      expect(result.passed).toBe(false); // 有high级别的错误
    });
  });
});