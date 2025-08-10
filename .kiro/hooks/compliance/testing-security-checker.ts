/**
 * 测试和安全合规检查组件
 * 
 * 负责测试覆盖率检查、测试质量验证、安全扫描和漏洞检测
 */

import { mcpToolsManager } from '../core/mcp-tools-manager.js';
import {
  ComplianceResult,
  ComplianceIssue,
  MCPToolResult
} from '../types/index.js';

/**
 * 测试合规检查选项
 */
interface TestingComplianceOptions {
  /** 最低测试覆盖率 */
  minCoverageRate: number;
  /** 单元测试覆盖率要求 */
  unitTestCoverage: number;
  /** 集成测试覆盖率要求 */
  integrationTestCoverage: number;
  /** 关键路径覆盖率要求 */
  criticalPathCoverage: number;
  /** 是否检查测试质量 */
  checkTestQuality: boolean;
  /** 是否运行测试 */
  runTests: boolean;
}

/**
 * 安全合规检查选项
 */
interface SecurityComplianceOptions {
  /** 是否扫描敏感信息 */
  scanSecrets: boolean;
  /** 是否检查依赖安全 */
  checkDependencies: boolean;
  /** 是否进行漏洞扫描 */
  vulnerabilityScan: boolean;
  /** 允许的漏洞数量 */
  allowedVulnerabilities: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

/**
 * Windows环境合规检查选项
 */
interface WindowsComplianceOptions {
  /** 是否检查路径处理 */
  checkPathHandling: boolean;
  /** 是否检查PowerShell兼容性 */
  checkPowerShellCompatibility: boolean;
  /** 是否检查文件编码 */
  checkFileEncoding: boolean;
  /** 是否检查换行符 */
  checkLineEndings: boolean;
  /** 是否检查权限处理 */
  checkPermissions: boolean;
}

/**
 * 测试和安全合规检查器
 */
export class TestingSecurityChecker {
  /** 默认测试检查选项 */
  private static readonly DEFAULT_TESTING_OPTIONS: TestingComplianceOptions = {
    minCoverageRate: 85,
    unitTestCoverage: 80,
    integrationTestCoverage: 60,
    criticalPathCoverage: 90,
    checkTestQuality: true,
    runTests: true
  };

  /** 默认安全检查选项 */
  private static readonly DEFAULT_SECURITY_OPTIONS: SecurityComplianceOptions = {
    scanSecrets: true,
    checkDependencies: true,
    vulnerabilityScan: true,
    allowedVulnerabilities: {
      critical: 0,
      high: 0,
      medium: 2,
      low: 5
    }
  };

  /** 默认Windows检查选项 */
  private static readonly DEFAULT_WINDOWS_OPTIONS: WindowsComplianceOptions = {
    checkPathHandling: true,
    checkPowerShellCompatibility: true,
    checkFileEncoding: true,
    checkLineEndings: true,
    checkPermissions: true
  };

  /**
   * 构造函数
   */
  constructor() {
    this.logInfo('测试和安全合规检查器初始化完成');
  }

  /**
   * 执行测试合规检查
   * @param files 文件列表
   * @param options 检查选项
   * @returns 合规检查结果
   */
  public async checkTestingCompliance(
    files: string[],
    options: Partial<TestingComplianceOptions> = {}
  ): Promise<ComplianceResult> {
    const opts = { ...TestingSecurityChecker.DEFAULT_TESTING_OPTIONS, ...options };
    this.logInfo(`🧪 开始测试合规检查，文件数量: ${files.length}`);

    const issues: ComplianceIssue[] = [];
    const recommendations: string[] = [];

    try {
      // 测试覆盖率检查
      await this.checkTestCoverage(files, opts, issues);

      // 测试质量检查
      if (opts.checkTestQuality) {
        await this.checkTestQuality(files, issues);
      }

      // 运行测试
      if (opts.runTests) {
        await this.runTests(files, issues);
      }

      // 测试文件存在性检查
      await this.checkTestFileExistence(files, issues);

      // 生成建议
      this.generateTestingRecommendations(issues, recommendations);

    } catch (error) {
      this.logError('测试合规检查过程中出现错误', error);
      issues.push({
        severity: 'medium',
        category: '测试检查错误',
        description: `检查过程中出现错误: ${error.message}`,
        suggestion: '请手动运行测试确保代码质量'
      });
    }

    const score = this.calculateComplianceScore(issues);
    const passed = this.isCompliancePassed(issues);

    this.logInfo(`测试合规检查完成，评分: ${score}，通过: ${passed}`);

    return {
      passed,
      score,
      issues,
      recommendations,
      checkType: '测试合规检查',
      timestamp: new Date()
    };
  }

  /**
   * 执行安全合规检查
   * @param files 文件列表
   * @param options 检查选项
   * @returns 合规检查结果
   */
  public async checkSecurityCompliance(
    files: string[],
    options: Partial<SecurityComplianceOptions> = {}
  ): Promise<ComplianceResult> {
    const opts = { ...TestingSecurityChecker.DEFAULT_SECURITY_OPTIONS, ...options };
    this.logInfo(`🔒 开始安全合规检查，文件数量: ${files.length}`);

    const issues: ComplianceIssue[] = [];
    const recommendations: string[] = [];

    try {
      // 漏洞扫描
      if (opts.vulnerabilityScan) {
        await this.performVulnerabilityScan(files, opts, issues);
      }

      // 敏感信息扫描
      if (opts.scanSecrets) {
        await this.scanForSecrets(files, issues);
      }

      // 依赖安全检查
      if (opts.checkDependencies) {
        await this.checkDependencySecurity(files, issues);
      }

      // 输入验证检查
      await this.checkInputValidation(files, issues);

      // 权限和认证检查
      await this.checkAuthenticationSecurity(files, issues);

      // 生成建议
      this.generateSecurityRecommendations(issues, recommendations);

    } catch (error) {
      this.logError('安全合规检查过程中出现错误', error);
      issues.push({
        severity: 'medium',
        category: '安全检查错误',
        description: `检查过程中出现错误: ${error.message}`,
        suggestion: '请手动进行安全检查'
      });
    }

    const score = this.calculateComplianceScore(issues);
    const passed = this.isCompliancePassed(issues);

    this.logInfo(`安全合规检查完成，评分: ${score}，通过: ${passed}`);

    return {
      passed,
      score,
      issues,
      recommendations,
      checkType: '安全合规检查',
      timestamp: new Date()
    };
  }

  /**
   * 执行Windows环境合规检查
   * @param files 文件列表
   * @param options 检查选项
   * @returns 合规检查结果
   */
  public async checkWindowsCompliance(
    files: string[],
    options: Partial<WindowsComplianceOptions> = {}
  ): Promise<ComplianceResult> {
    const opts = { ...TestingSecurityChecker.DEFAULT_WINDOWS_OPTIONS, ...options };
    this.logInfo(`🪟 开始Windows环境合规检查，文件数量: ${files.length}`);

    const issues: ComplianceIssue[] = [];
    const recommendations: string[] = [];

    try {
      // 路径处理检查
      if (opts.checkPathHandling) {
        await this.checkPathHandling(files, issues);
      }

      // PowerShell兼容性检查
      if (opts.checkPowerShellCompatibility) {
        await this.checkPowerShellCompatibility(files, issues);
      }

      // 文件编码检查
      if (opts.checkFileEncoding) {
        await this.checkFileEncoding(files, issues);
      }

      // 换行符检查
      if (opts.checkLineEndings) {
        await this.checkLineEndings(files, issues);
      }

      // 权限处理检查
      if (opts.checkPermissions) {
        await this.checkWindowsPermissions(files, issues);
      }

      // 生成建议
      this.generateWindowsRecommendations(issues, recommendations);

    } catch (error) {
      this.logError('Windows合规检查过程中出现错误', error);
      issues.push({
        severity: 'low',
        category: 'Windows兼容性检查错误',
        description: `检查过程中出现错误: ${error.message}`,
        suggestion: '请手动检查Windows环境兼容性'
      });
    }

    const score = this.calculateComplianceScore(issues);
    const passed = this.isCompliancePassed(issues);

    this.logInfo(`Windows环境合规检查完成，评分: ${score}，通过: ${passed}`);

    return {
      passed,
      score,
      issues,
      recommendations,
      checkType: 'Windows环境合规检查',
      timestamp: new Date()
    };
  }

  // ============================================================================
  // 测试检查方法
  // ============================================================================

  /**
   * 检查测试覆盖率
   */
  private async checkTestCoverage(
    files: string[],
    options: TestingComplianceOptions,
    issues: ComplianceIssue[]
  ): Promise<void> {
    this.logDebug('执行测试覆盖率检查');

    try {
      const result = await mcpToolsManager.callTool('serena', 'test_coverage', {
        files
      });

      if (result.success && result.data) {
        const coverage = result.data.percentage || 0;
        const unitCoverage = result.data.unitTestCoverage || 0;
        const integrationCoverage = result.data.integrationTestCoverage || 0;

        // 总体覆盖率检查
        if (coverage < options.minCoverageRate) {
          issues.push({
            severity: 'high',
            category: '测试覆盖率',
            description: `总体测试覆盖率不足: ${coverage}% (要求≥${options.minCoverageRate}%)`,
            suggestion: '增加单元测试和集成测试提高覆盖率'
          });
        }

        // 单元测试覆盖率检查
        if (unitCoverage < options.unitTestCoverage) {
          issues.push({
            severity: 'medium',
            category: '单元测试覆盖率',
            description: `单元测试覆盖率不足: ${unitCoverage}% (要求≥${options.unitTestCoverage}%)`,
            suggestion: '为核心业务逻辑添加单元测试'
          });
        }

        // 集成测试覆盖率检查
        if (integrationCoverage < options.integrationTestCoverage) {
          issues.push({
            severity: 'medium',
            category: '集成测试覆盖率',
            description: `集成测试覆盖率不足: ${integrationCoverage}% (要求≥${options.integrationTestCoverage}%)`,
            suggestion: '添加模块间交互的集成测试'
          });
        }

        this.logDebug(`测试覆盖率: 总体${coverage}%, 单元${unitCoverage}%, 集成${integrationCoverage}%`);
      }

    } catch (error) {
      this.logWarn('测试覆盖率检查失败', error);
      issues.push({
        severity: 'medium',
        category: '测试覆盖率检查',
        description: `覆盖率检查失败: ${error.message}`,
        suggestion: '请手动运行测试覆盖率工具'
      });
    }
  }

  /**
   * 检查测试质量
   */
  private async checkTestQuality(
    files: string[],
    issues: ComplianceIssue[]
  ): Promise<void> {
    const testFiles = files.filter(f => f.match(/\.(test|spec)\.(ts|tsx|py|js|jsx)$/));
    if (testFiles.length === 0) return;

    this.logDebug('执行测试质量检查');

    try {
      const result = await mcpToolsManager.callTool('serena', 'test_quality_check', {
        files: testFiles
      });

      if (result.success && result.data?.issues) {
        const qualityIssues = result.data.issues.map((issue: any) => ({
          severity: this.mapSeverity(issue.severity) || 'medium',
          category: '测试质量',
          description: issue.message,
          file: issue.file,
          line: issue.line,
          suggestion: issue.suggestion || '改进测试用例质量'
        }));

        issues.push(...qualityIssues);
        this.logDebug(`发现${qualityIssues.length}个测试质量问题`);
      }

    } catch (error) {
      this.logWarn('测试质量检查失败', error);
    }
  }

  /**
   * 运行测试
   */
  private async runTests(
    files: string[],
    issues: ComplianceIssue[]
  ): Promise<void> {
    const testFiles = files.filter(f => f.match(/\.(test|spec)\.(ts|tsx|py|js|jsx)$/));
    if (testFiles.length === 0) return;

    this.logDebug('运行测试');

    try {
      const result = await mcpToolsManager.callTool('serena', 'test_run', {
        files: testFiles
      });

      if (result.success && result.data) {
        const { success, failedCount, failedTests } = result.data;

        if (!success && failedCount > 0) {
          issues.push({
            severity: 'critical',
            category: '测试执行',
            description: `${failedCount}个测试失败`,
            suggestion: '修复失败的测试用例',
            file: failedTests?.[0]?.file
          });

          // 添加具体的失败测试信息
          if (failedTests && Array.isArray(failedTests)) {
            failedTests.slice(0, 5).forEach((test: any) => { // 最多显示5个失败测试
              issues.push({
                severity: 'high',
                category: '测试失败',
                description: `测试失败: ${test.name} - ${test.error}`,
                file: test.file,
                line: test.line,
                suggestion: '检查测试逻辑和被测试代码'
              });
            });
          }
        }

        this.logDebug(`测试运行结果: ${success ? '通过' : '失败'}, 失败数量: ${failedCount}`);
      }

    } catch (error) {
      this.logWarn('测试运行失败', error);
      issues.push({
        severity: 'high',
        category: '测试运行',
        description: `测试运行失败: ${error.message}`,
        suggestion: '检查测试环境和依赖配置'
      });
    }
  }

  /**
   * 检查测试文件存在性
   */
  private async checkTestFileExistence(
    files: string[],
    issues: ComplianceIssue[]
  ): Promise<void> {
    const testFiles = files.filter(f => f.match(/\.(test|spec)\.(ts|tsx|py|js|jsx)$/));
    const sourceFiles = files.filter(f => 
      f.match(/\.(ts|tsx|py|js|jsx)$/) && 
      !f.includes('test') && 
      !f.includes('spec') &&
      !f.includes('node_modules')
    );

    if (sourceFiles.length > 0 && testFiles.length === 0) {
      issues.push({
        severity: 'medium',
        category: '测试文件缺失',
        description: '没有找到测试文件',
        suggestion: '为新增的源代码文件添加对应的测试文件'
      });
    }

    // 检查测试文件与源文件的比例
    if (sourceFiles.length > 0) {
      const testRatio = testFiles.length / sourceFiles.length;
      if (testRatio < 0.5) { // 测试文件数量应该至少是源文件的50%
        issues.push({
          severity: 'medium',
          category: '测试文件比例',
          description: `测试文件比例过低: ${Math.round(testRatio * 100)}% (建议≥50%)`,
          suggestion: '为更多的源文件添加测试'
        });
      }
    }
  }

  // ============================================================================
  // 安全检查方法
  // ============================================================================

  /**
   * 执行漏洞扫描
   */
  private async performVulnerabilityScan(
    files: string[],
    options: SecurityComplianceOptions,
    issues: ComplianceIssue[]
  ): Promise<void> {
    this.logDebug('执行漏洞扫描');

    try {
      const result = await mcpToolsManager.callTool('serena', 'security_scan', {
        files
      });

      if (result.success && result.data?.vulnerabilities) {
        const vulnerabilities = result.data.vulnerabilities;
        const vulnCounts = { critical: 0, high: 0, medium: 0, low: 0 };

        vulnerabilities.forEach((vuln: any) => {
          const severity = this.mapSecuritySeverity(vuln.severity);
          vulnCounts[severity]++;

          issues.push({
            severity,
            category: '安全漏洞',
            description: vuln.description || vuln.message,
            file: vuln.file,
            line: vuln.line,
            suggestion: vuln.recommendation || '请修复此安全漏洞',
            ruleId: vuln.id
          });
        });

        // 检查是否超过允许的漏洞数量
        Object.entries(vulnCounts).forEach(([severity, count]) => {
          const allowed = options.allowedVulnerabilities[severity as keyof typeof options.allowedVulnerabilities];
          if (count > allowed) {
            issues.push({
              severity: severity === 'critical' || severity === 'high' ? 'critical' : 'high',
              category: '漏洞数量超标',
              description: `${severity}级别漏洞数量超标: ${count} (允许≤${allowed})`,
              suggestion: `立即修复${severity}级别的安全漏洞`
            });
          }
        });

        this.logDebug(`发现漏洞: critical=${vulnCounts.critical}, high=${vulnCounts.high}, medium=${vulnCounts.medium}, low=${vulnCounts.low}`);
      }

    } catch (error) {
      this.logWarn('漏洞扫描失败', error);
      issues.push({
        severity: 'medium',
        category: '漏洞扫描',
        description: `漏洞扫描失败: ${error.message}`,
        suggestion: '请手动进行安全漏洞扫描'
      });
    }
  }

  /**
   * 扫描敏感信息
   */
  private async scanForSecrets(
    files: string[],
    issues: ComplianceIssue[]
  ): Promise<void> {
    this.logDebug('执行敏感信息扫描');

    try {
      const result = await mcpToolsManager.callTool('serena', 'secret_scan', {
        files
      });

      if (result.success && result.data?.secrets) {
        const secrets = result.data.secrets;

        secrets.forEach((secret: any) => {
          issues.push({
            severity: 'critical',
            category: '敏感信息泄露',
            description: `发现可能的敏感信息: ${secret.type}`,
            file: secret.file,
            line: secret.line,
            suggestion: '移除敏感信息，使用环境变量或安全配置文件'
          });
        });

        this.logDebug(`发现${secrets.length}个敏感信息泄露`);
      }

    } catch (error) {
      this.logWarn('敏感信息扫描失败', error);
    }
  }

  /**
   * 检查依赖安全
   */
  private async checkDependencySecurity(
    files: string[],
    issues: ComplianceIssue[]
  ): Promise<void> {
    const packageFiles = files.filter(f => 
      f.includes('package.json') || 
      f.includes('requirements.txt') ||
      f.includes('pyproject.toml') ||
      f.includes('Pipfile')
    );

    if (packageFiles.length === 0) return;

    this.logDebug('执行依赖安全检查');

    try {
      const result = await mcpToolsManager.callTool('serena', 'dependency_security_check', {
        files: packageFiles
      });

      if (result.success && result.data?.vulnerabilities) {
        const depVulns = result.data.vulnerabilities;

        depVulns.forEach((vuln: any) => {
          issues.push({
            severity: this.mapSecuritySeverity(vuln.severity),
            category: '依赖安全',
            description: `依赖包存在安全漏洞: ${vuln.package} ${vuln.version}`,
            file: vuln.file,
            suggestion: `更新${vuln.package}到安全版本${vuln.fixedVersion || '最新版本'}`
          });
        });

        this.logDebug(`发现${depVulns.length}个依赖安全问题`);
      }

    } catch (error) {
      this.logWarn('依赖安全检查失败', error);
    }
  }

  /**
   * 检查输入验证
   */
  private async checkInputValidation(
    files: string[],
    issues: ComplianceIssue[]
  ): Promise<void> {
    const codeFiles = files.filter(f => f.match(/\.(ts|tsx|py|js|jsx)$/));
    if (codeFiles.length === 0) return;

    this.logDebug('执行输入验证检查');

    try {
      const result = await mcpToolsManager.callTool('serena', 'input_validation_check', {
        files: codeFiles
      });

      if (result.success && result.data?.issues) {
        const validationIssues = result.data.issues.map((issue: any) => ({
          severity: 'high' as const,
          category: '输入验证',
          description: issue.message,
          file: issue.file,
          line: issue.line,
          suggestion: '添加适当的输入验证和清理'
        }));

        issues.push(...validationIssues);
        this.logDebug(`发现${validationIssues.length}个输入验证问题`);
      }

    } catch (error) {
      this.logWarn('输入验证检查失败', error);
    }
  }

  /**
   * 检查认证和授权安全
   */
  private async checkAuthenticationSecurity(
    files: string[],
    issues: ComplianceIssue[]
  ): Promise<void> {
    const authFiles = files.filter(f => 
      f.includes('auth') || 
      f.includes('login') || 
      f.includes('session') ||
      f.includes('jwt')
    );

    if (authFiles.length === 0) return;

    this.logDebug('执行认证安全检查');

    try {
      const result = await mcpToolsManager.callTool('serena', 'auth_security_check', {
        files: authFiles
      });

      if (result.success && result.data?.issues) {
        const authIssues = result.data.issues.map((issue: any) => ({
          severity: this.mapSecuritySeverity(issue.severity) || 'high',
          category: '认证安全',
          description: issue.message,
          file: issue.file,
          line: issue.line,
          suggestion: issue.suggestion || '加强认证和授权机制'
        }));

        issues.push(...authIssues);
        this.logDebug(`发现${authIssues.length}个认证安全问题`);
      }

    } catch (error) {
      this.logWarn('认证安全检查失败', error);
    }
  }

  // ============================================================================
  // Windows环境检查方法
  // ============================================================================

  /**
   * 检查路径处理
   */
  private async checkPathHandling(
    files: string[],
    issues: ComplianceIssue[]
  ): Promise<void> {
    const codeFiles = files.filter(f => f.match(/\.(ts|tsx|py|js|jsx)$/));
    if (codeFiles.length === 0) return;

    this.logDebug('执行路径处理检查');

    try {
      const result = await mcpToolsManager.callTool('serena', 'path_handling_check', {
        files: codeFiles,
        platform: 'windows'
      });

      if (result.success && result.data?.issues) {
        const pathIssues = result.data.issues.map((issue: any) => ({
          severity: 'medium' as const,
          category: 'Windows路径兼容性',
          description: issue.message,
          file: issue.file,
          line: issue.line,
          suggestion: '使用跨平台的路径处理函数（如path.join()）'
        }));

        issues.push(...pathIssues);
        this.logDebug(`发现${pathIssues.length}个路径处理问题`);
      }

    } catch (error) {
      this.logWarn('路径处理检查失败', error);
    }
  }

  /**
   * 检查PowerShell兼容性
   */
  private async checkPowerShellCompatibility(
    files: string[],
    issues: ComplianceIssue[]
  ): Promise<void> {
    const psFiles = files.filter(f => f.endsWith('.ps1'));
    if (psFiles.length === 0) return;

    this.logDebug('执行PowerShell兼容性检查');

    try {
      const result = await mcpToolsManager.callTool('serena', 'powershell_compatibility_check', {
        files: psFiles
      });

      if (result.success && result.data?.issues) {
        const psIssues = result.data.issues.map((issue: any) => ({
          severity: 'low' as const,
          category: 'PowerShell兼容性',
          description: issue.message,
          file: issue.file,
          line: issue.line,
          suggestion: '确保脚本在PowerShell 5.1+和PowerShell Core中都能运行'
        }));

        issues.push(...psIssues);
        this.logDebug(`发现${psIssues.length}个PowerShell兼容性问题`);
      }

    } catch (error) {
      this.logWarn('PowerShell兼容性检查失败', error);
    }
  }

  /**
   * 检查文件编码
   */
  private async checkFileEncoding(
    files: string[],
    issues: ComplianceIssue[]
  ): Promise<void> {
    this.logDebug('执行文件编码检查');

    try {
      const result = await mcpToolsManager.callTool('serena', 'file_encoding_check', {
        files,
        expectedEncoding: 'utf-8'
      });

      if (result.success && result.data?.issues) {
        const encodingIssues = result.data.issues.map((issue: any) => ({
          severity: 'low' as const,
          category: '文件编码',
          description: `文件编码不是UTF-8: ${issue.encoding}`,
          file: issue.file,
          suggestion: '将文件编码转换为UTF-8'
        }));

        issues.push(...encodingIssues);
        this.logDebug(`发现${encodingIssues.length}个文件编码问题`);
      }

    } catch (error) {
      this.logWarn('文件编码检查失败', error);
    }
  }

  /**
   * 检查换行符
   */
  private async checkLineEndings(
    files: string[],
    issues: ComplianceIssue[]
  ): Promise<void> {
    this.logDebug('执行换行符检查');

    try {
      const result = await mcpToolsManager.callTool('serena', 'line_endings_check', {
        files,
        expectedLineEnding: 'lf'
      });

      if (result.success && result.data?.issues) {
        const lineEndingIssues = result.data.issues.map((issue: any) => ({
          severity: 'low' as const,
          category: '换行符',
          description: `文件使用了不一致的换行符: ${issue.lineEnding}`,
          file: issue.file,
          suggestion: '统一使用LF换行符'
        }));

        issues.push(...lineEndingIssues);
        this.logDebug(`发现${lineEndingIssues.length}个换行符问题`);
      }

    } catch (error) {
      this.logWarn('换行符检查失败', error);
    }
  }

  /**
   * 检查Windows权限处理
   */
  private async checkWindowsPermissions(
    files: string[],
    issues: ComplianceIssue[]
  ): Promise<void> {
    const codeFiles = files.filter(f => f.match(/\.(ts|tsx|py|js|jsx)$/));
    if (codeFiles.length === 0) return;

    this.logDebug('执行Windows权限处理检查');

    try {
      const result = await mcpToolsManager.callTool('serena', 'windows_permissions_check', {
        files: codeFiles
      });

      if (result.success && result.data?.issues) {
        const permissionIssues = result.data.issues.map((issue: any) => ({
          severity: 'medium' as const,
          category: 'Windows权限处理',
          description: issue.message,
          file: issue.file,
          line: issue.line,
          suggestion: '考虑Windows权限模型的特殊性'
        }));

        issues.push(...permissionIssues);
        this.logDebug(`发现${permissionIssues.length}个权限处理问题`);
      }

    } catch (error) {
      this.logWarn('Windows权限处理检查失败', error);
    }
  }

  // ============================================================================
  // 工具方法
  // ============================================================================

  /**
   * 计算合规评分
   */
  private calculateComplianceScore(issues: ComplianceIssue[]): number {
    let score = 100;

    issues.forEach(issue => {
      switch (issue.severity) {
        case 'critical':
          score -= 25;
          break;
        case 'high':
          score -= 15;
          break;
        case 'medium':
          score -= 8;
          break;
        case 'low':
          score -= 3;
          break;
      }
    });

    return Math.max(0, Math.round(score));
  }

  /**
   * 判断合规检查是否通过
   */
  private isCompliancePassed(issues: ComplianceIssue[]): boolean {
    const criticalIssues = issues.filter(i => i.severity === 'critical');
    const highIssues = issues.filter(i => i.severity === 'high');
    
    return criticalIssues.length === 0 && highIssues.length === 0;
  }

  /**
   * 映射严重程度
   */
  private mapSeverity(severity: string): ComplianceIssue['severity'] {
    switch (severity?.toLowerCase()) {
      case 'error':
      case 'critical':
        return 'critical';
      case 'warning':
      case 'high':
        return 'high';
      case 'info':
      case 'medium':
        return 'medium';
      case 'hint':
      case 'low':
        return 'low';
      default:
        return 'medium';
    }
  }

  /**
   * 映射安全严重程度
   */
  private mapSecuritySeverity(severity: string): ComplianceIssue['severity'] {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return 'critical';
      case 'high':
        return 'high';
      case 'medium':
        return 'medium';
      case 'low':
        return 'low';
      default:
        return 'medium';
    }
  }

  /**
   * 生成测试建议
   */
  private generateTestingRecommendations(
    issues: ComplianceIssue[],
    recommendations: string[]
  ): void {
    if (issues.length === 0) {
      recommendations.push('测试覆盖率和质量符合要求');
      return;
    }

    const categories = new Set(issues.map(i => i.category));

    if (categories.has('测试覆盖率') || categories.has('单元测试覆盖率') || categories.has('集成测试覆盖率')) {
      recommendations.push('提高测试覆盖率，为核心功能添加更多测试');
    }

    if (categories.has('测试执行') || categories.has('测试失败')) {
      recommendations.push('修复失败的测试用例，确保所有测试都能通过');
    }

    if (categories.has('测试质量')) {
      recommendations.push('改进测试用例质量，使用更好的断言和测试数据');
    }

    if (categories.has('测试文件缺失') || categories.has('测试文件比例')) {
      recommendations.push('为新功能添加相应的测试文件');
    }

    recommendations.push('定期运行测试并监控覆盖率变化');
  }

  /**
   * 生成安全建议
   */
  private generateSecurityRecommendations(
    issues: ComplianceIssue[],
    recommendations: string[]
  ): void {
    if (issues.length === 0) {
      recommendations.push('未发现安全问题');
      return;
    }

    const categories = new Set(issues.map(i => i.category));

    if (categories.has('安全漏洞') || categories.has('漏洞数量超标')) {
      recommendations.push('立即修复发现的安全漏洞');
    }

    if (categories.has('敏感信息泄露')) {
      recommendations.push('移除代码中的敏感信息，使用环境变量管理');
    }

    if (categories.has('依赖安全')) {
      recommendations.push('更新存在安全漏洞的依赖包');
    }

    if (categories.has('输入验证')) {
      recommendations.push('加强输入验证和数据清理');
    }

    if (categories.has('认证安全')) {
      recommendations.push('改进认证和授权机制');
    }

    recommendations.push('定期进行安全扫描和渗透测试');
    recommendations.push('建立安全开发生命周期(SDLC)');
  }

  /**
   * 生成Windows建议
   */
  private generateWindowsRecommendations(
    issues: ComplianceIssue[],
    recommendations: string[]
  ): void {
    if (issues.length === 0) {
      recommendations.push('Windows环境兼容性良好');
      return;
    }

    const categories = new Set(issues.map(i => i.category));

    if (categories.has('Windows路径兼容性')) {
      recommendations.push('使用跨平台的路径处理函数');
    }

    if (categories.has('PowerShell兼容性')) {
      recommendations.push('确保PowerShell脚本在不同版本中的兼容性');
    }

    if (categories.has('文件编码')) {
      recommendations.push('统一使用UTF-8文件编码');
    }

    if (categories.has('换行符')) {
      recommendations.push('配置Git自动处理换行符转换');
    }

    if (categories.has('Windows权限处理')) {
      recommendations.push('考虑Windows权限模型的特殊性');
    }

    recommendations.push('在Windows环境中进行充分测试');
  }

  // ============================================================================
  // 日志方法
  // ============================================================================

  private logDebug(message: string, data?: any): void {
    console.debug(`[TestingSecurityChecker] DEBUG: ${message}`, data || '');
  }

  private logInfo(message: string, data?: any): void {
    console.info(`[TestingSecurityChecker] INFO: ${message}`, data || '');
  }

  private logWarn(message: string, error?: Error): void {
    console.warn(`[TestingSecurityChecker] WARN: ${message}`, error || '');
  }

  private logError(message: string, error?: Error): void {
    console.error(`[TestingSecurityChecker] ERROR: ${message}`, error || '');
  }
}