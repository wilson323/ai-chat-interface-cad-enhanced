/**
 * 合规检查核心组件
 * 
 * 支持多种编程语言的规范检查，包括Python PEP 8、TypeScript严格模式等
 */

import { mcpToolsManager } from '../core/mcp-tools-manager.js';
import {
  ComplianceResult,
  ComplianceIssue,
  MCPToolResult
} from '../types/index.js';

/**
 * Python合规检查选项
 */
interface PythonComplianceOptions {
  /** PEP 8检查 */
  pep8Check: boolean;
  /** 最大行长度 */
  maxLineLength: number;
  /** 最大复杂度 */
  maxComplexity: number;
  /** 类型注解检查 */
  typeAnnotationCheck: boolean;
  /** 异步编程检查 */
  asyncCheck: boolean;
  /** 异常处理检查 */
  exceptionHandlingCheck: boolean;
}

/**
 * TypeScript合规检查选项
 */
interface TypeScriptComplianceOptions {
  /** 严格模式检查 */
  strictMode: boolean;
  /** 禁止any类型 */
  noAnyType: boolean;
  /** 导入规范检查 */
  importCheck: boolean;
  /** 组件结构检查 */
  componentStructureCheck: boolean;
  /** ESLint检查 */
  eslintCheck: boolean;
}

/**
 * 合规检查器核心类
 */
export class ComplianceChecker {
  /** 默认Python检查选项 */
  private static readonly DEFAULT_PYTHON_OPTIONS: PythonComplianceOptions = {
    pep8Check: true,
    maxLineLength: 88,
    maxComplexity: 10,
    typeAnnotationCheck: true,
    asyncCheck: true,
    exceptionHandlingCheck: true
  };

  /** 默认TypeScript检查选项 */
  private static readonly DEFAULT_TYPESCRIPT_OPTIONS: TypeScriptComplianceOptions = {
    strictMode: true,
    noAnyType: true,
    importCheck: true,
    componentStructureCheck: true,
    eslintCheck: true
  };

  /**
   * 构造函数
   */
  constructor() {
    this.logInfo('合规检查器初始化完成');
  }

  /**
   * 执行Python合规检查
   * @param files Python文件列表
   * @param options 检查选项
   * @returns 合规检查结果
   */
  public async checkPythonCompliance(
    files: string[],
    options: Partial<PythonComplianceOptions> = {}
  ): Promise<ComplianceResult> {
    const pythonFiles = files.filter(f => f.endsWith('.py'));
    if (pythonFiles.length === 0) {
      return this.createPassedResult('Python合规检查', '无Python文件需要检查');
    }

    const opts = { ...ComplianceChecker.DEFAULT_PYTHON_OPTIONS, ...options };
    this.logInfo(`🐍 开始Python合规检查，文件数量: ${pythonFiles.length}`);

    const issues: ComplianceIssue[] = [];
    const recommendations: string[] = [];

    try {
      // PEP 8风格检查
      if (opts.pep8Check) {
        await this.checkPEP8Style(pythonFiles, opts, issues);
      }

      // 代码复杂度检查
      await this.checkPythonComplexity(pythonFiles, opts, issues);

      // 类型注解检查
      if (opts.typeAnnotationCheck) {
        await this.checkPythonTypeAnnotations(pythonFiles, issues);
      }

      // 异步编程检查
      if (opts.asyncCheck) {
        await this.checkPythonAsyncUsage(pythonFiles, issues);
      }

      // 异常处理检查
      if (opts.exceptionHandlingCheck) {
        await this.checkPythonExceptionHandling(pythonFiles, issues);
      }

      // 生成建议
      this.generatePythonRecommendations(issues, recommendations);

    } catch (error) {
      this.logError('Python合规检查过程中出现错误', error);
      issues.push({
        severity: 'medium',
        category: 'Python检查错误',
        description: `检查过程中出现错误: ${error.message}`,
        suggestion: '请手动检查Python代码规范'
      });
    }

    const score = this.calculateComplianceScore(issues);
    const passed = this.isCompliancePassed(issues);

    this.logInfo(`Python合规检查完成，评分: ${score}，通过: ${passed}`);

    return {
      passed,
      score,
      issues,
      recommendations,
      checkType: 'Python合规检查',
      timestamp: new Date()
    };
  }

  /**
   * 执行TypeScript合规检查
   * @param files TypeScript文件列表
   * @param options 检查选项
   * @returns 合规检查结果
   */
  public async checkTypeScriptCompliance(
    files: string[],
    options: Partial<TypeScriptComplianceOptions> = {}
  ): Promise<ComplianceResult> {
    const tsFiles = files.filter(f => f.match(/\.(ts|tsx)$/));
    if (tsFiles.length === 0) {
      return this.createPassedResult('TypeScript合规检查', '无TypeScript文件需要检查');
    }

    const opts = { ...ComplianceChecker.DEFAULT_TYPESCRIPT_OPTIONS, ...options };
    this.logInfo(`📘 开始TypeScript合规检查，文件数量: ${tsFiles.length}`);

    const issues: ComplianceIssue[] = [];
    const recommendations: string[] = [];

    try {
      // ESLint检查
      if (opts.eslintCheck) {
        await this.checkESLint(tsFiles, issues);
      }

      // 严格模式检查
      if (opts.strictMode) {
        await this.checkTypeScriptStrictMode(tsFiles, issues);
      }

      // any类型检查
      if (opts.noAnyType) {
        await this.checkAnyTypeUsage(tsFiles, issues);
      }

      // 导入规范检查
      if (opts.importCheck) {
        await this.checkImportOrganization(tsFiles, issues);
      }

      // 组件结构检查
      if (opts.componentStructureCheck) {
        await this.checkComponentStructure(tsFiles, issues);
      }

      // 生成建议
      this.generateTypeScriptRecommendations(issues, recommendations);

    } catch (error) {
      this.logError('TypeScript合规检查过程中出现错误', error);
      issues.push({
        severity: 'medium',
        category: 'TypeScript检查错误',
        description: `检查过程中出现错误: ${error.message}`,
        suggestion: '请手动检查TypeScript代码规范'
      });
    }

    const score = this.calculateComplianceScore(issues);
    const passed = this.isCompliancePassed(issues);

    this.logInfo(`TypeScript合规检查完成，评分: ${score}，通过: ${passed}`);

    return {
      passed,
      score,
      issues,
      recommendations,
      checkType: 'TypeScript合规检查',
      timestamp: new Date()
    };
  }

  // ============================================================================
  // Python检查方法
  // ============================================================================

  /**
   * 检查PEP 8风格规范
   */
  private async checkPEP8Style(
    files: string[],
    options: PythonComplianceOptions,
    issues: ComplianceIssue[]
  ): Promise<void> {
    this.logDebug('执行PEP 8风格检查');

    try {
      const result = await mcpToolsManager.callTool('serena', 'style_check', {
        files,
        standard: 'pep8',
        maxLineLength: options.maxLineLength
      });

      if (result.success && result.data?.issues) {
        const styleIssues = result.data.issues.map((issue: any) => ({
          severity: this.mapSeverity(issue.severity) || 'medium',
          category: 'PEP 8风格',
          description: issue.message || issue.description,
          file: issue.file,
          line: issue.line,
          suggestion: issue.suggestion || '请按照PEP 8规范修复此问题',
          ruleId: issue.code
        }));

        issues.push(...styleIssues);
        this.logDebug(`发现${styleIssues.length}个PEP 8风格问题`);
      }

    } catch (error) {
      this.logWarn('PEP 8风格检查失败', error);
      issues.push({
        severity: 'low',
        category: 'PEP 8检查',
        description: `PEP 8检查失败: ${error.message}`,
        suggestion: '请手动运行flake8或black检查代码风格'
      });
    }
  }

  /**
   * 检查Python代码复杂度
   */
  private async checkPythonComplexity(
    files: string[],
    options: PythonComplianceOptions,
    issues: ComplianceIssue[]
  ): Promise<void> {
    this.logDebug('执行Python复杂度检查');

    try {
      const result = await mcpToolsManager.callTool('serena', 'complexity_check', {
        files,
        maxComplexity: options.maxComplexity
      });

      if (result.success && result.data?.violations) {
        const complexityIssues = result.data.violations.map((violation: any) => ({
          severity: violation.complexity > 15 ? 'high' : 'medium',
          category: 'Python复杂度',
          description: `函数复杂度过高: ${violation.complexity} (最大允许: ${options.maxComplexity})`,
          file: violation.file,
          line: violation.line,
          suggestion: '建议重构函数，将复杂逻辑拆分为更小的函数'
        }));

        issues.push(...complexityIssues);
        this.logDebug(`发现${complexityIssues.length}个复杂度问题`);
      }

    } catch (error) {
      this.logWarn('Python复杂度检查失败', error);
      issues.push({
        severity: 'low',
        category: 'Python复杂度检查',
        description: `复杂度检查失败: ${error.message}`,
        suggestion: '请手动检查函数复杂度'
      });
    }
  }

  /**
   * 检查Python类型注解
   */
  private async checkPythonTypeAnnotations(
    files: string[],
    issues: ComplianceIssue[]
  ): Promise<void> {
    this.logDebug('执行Python类型注解检查');

    try {
      const result = await mcpToolsManager.callTool('serena', 'type_annotation_check', {
        files
      });

      if (result.success && result.data?.missing) {
        const annotationIssues = result.data.missing.map((missing: any) => ({
          severity: 'medium' as const,
          category: 'Python类型注解',
          description: `缺少类型注解: ${missing.function || missing.variable}`,
          file: missing.file,
          line: missing.line,
          suggestion: '为函数参数、返回值和复杂变量添加类型注解'
        }));

        issues.push(...annotationIssues);
        this.logDebug(`发现${annotationIssues.length}个类型注解问题`);
      }

    } catch (error) {
      this.logWarn('Python类型注解检查失败', error);
      // 不添加错误到issues，因为这是可选检查
    }
  }

  /**
   * 检查Python异步编程使用
   */
  private async checkPythonAsyncUsage(
    files: string[],
    issues: ComplianceIssue[]
  ): Promise<void> {
    this.logDebug('执行Python异步编程检查');

    try {
      const result = await mcpToolsManager.callTool('serena', 'async_check', {
        files
      });

      if (result.success && result.data?.issues) {
        const asyncIssues = result.data.issues.map((issue: any) => ({
          severity: 'medium' as const,
          category: 'Python异步编程',
          description: issue.message,
          file: issue.file,
          line: issue.line,
          suggestion: issue.suggestion || '请检查异步函数的正确使用'
        }));

        issues.push(...asyncIssues);
        this.logDebug(`发现${asyncIssues.length}个异步编程问题`);
      }

    } catch (error) {
      this.logWarn('Python异步编程检查失败', error);
    }
  }

  /**
   * 检查Python异常处理
   */
  private async checkPythonExceptionHandling(
    files: string[],
    issues: ComplianceIssue[]
  ): Promise<void> {
    this.logDebug('执行Python异常处理检查');

    try {
      const result = await mcpToolsManager.callTool('serena', 'exception_check', {
        files
      });

      if (result.success && result.data?.issues) {
        const exceptionIssues = result.data.issues.map((issue: any) => ({
          severity: 'medium' as const,
          category: 'Python异常处理',
          description: issue.message,
          file: issue.file,
          line: issue.line,
          suggestion: issue.suggestion || '请添加适当的异常处理'
        }));

        issues.push(...exceptionIssues);
        this.logDebug(`发现${exceptionIssues.length}个异常处理问题`);
      }

    } catch (error) {
      this.logWarn('Python异常处理检查失败', error);
    }
  }

  // ============================================================================
  // TypeScript检查方法
  // ============================================================================

  /**
   * 检查ESLint规范
   */
  private async checkESLint(
    files: string[],
    issues: ComplianceIssue[]
  ): Promise<void> {
    this.logDebug('执行ESLint检查');

    try {
      const result = await mcpToolsManager.callTool('serena', 'eslint_check', {
        files,
        config: 'typescript'
      });

      if (result.success && result.data?.issues) {
        const eslintIssues = result.data.issues.map((issue: any) => ({
          severity: this.mapESLintSeverity(issue.severity),
          category: 'ESLint规范',
          description: issue.message,
          file: issue.file,
          line: issue.line,
          suggestion: issue.suggestion || '请按照ESLint规则修复此问题',
          ruleId: issue.ruleId
        }));

        issues.push(...eslintIssues);
        this.logDebug(`发现${eslintIssues.length}个ESLint问题`);
      }

    } catch (error) {
      this.logWarn('ESLint检查失败', error);
      issues.push({
        severity: 'low',
        category: 'ESLint检查',
        description: `ESLint检查失败: ${error.message}`,
        suggestion: '请手动运行eslint检查代码规范'
      });
    }
  }

  /**
   * 检查TypeScript严格模式
   */
  private async checkTypeScriptStrictMode(
    files: string[],
    issues: ComplianceIssue[]
  ): Promise<void> {
    this.logDebug('执行TypeScript严格模式检查');

    try {
      const result = await mcpToolsManager.callTool('serena', 'typescript_strict_check', {
        files
      });

      if (result.success && result.data?.issues) {
        const strictIssues = result.data.issues.map((issue: any) => ({
          severity: 'high' as const,
          category: 'TypeScript严格模式',
          description: issue.message,
          file: issue.file,
          line: issue.line,
          suggestion: '启用TypeScript严格模式并修复相关问题'
        }));

        issues.push(...strictIssues);
        this.logDebug(`发现${strictIssues.length}个严格模式问题`);
      }

    } catch (error) {
      this.logWarn('TypeScript严格模式检查失败', error);
    }
  }

  /**
   * 检查any类型使用
   */
  private async checkAnyTypeUsage(
    files: string[],
    issues: ComplianceIssue[]
  ): Promise<void> {
    this.logDebug('执行any类型使用检查');

    try {
      const result = await mcpToolsManager.callTool('serena', 'any_type_check', {
        files
      });

      if (result.success && result.data?.usages) {
        const anyTypeIssues = result.data.usages.map((usage: any) => ({
          severity: 'medium' as const,
          category: 'TypeScript类型安全',
          description: `发现any类型使用: ${usage.context}`,
          file: usage.file,
          line: usage.line,
          suggestion: '使用具体的类型定义替换any类型'
        }));

        issues.push(...anyTypeIssues);
        this.logDebug(`发现${anyTypeIssues.length}个any类型使用`);
      }

    } catch (error) {
      this.logWarn('any类型检查失败', error);
    }
  }

  /**
   * 检查导入组织规范
   */
  private async checkImportOrganization(
    files: string[],
    issues: ComplianceIssue[]
  ): Promise<void> {
    this.logDebug('执行导入组织检查');

    try {
      const result = await mcpToolsManager.callTool('serena', 'import_check', {
        files
      });

      if (result.success && result.data?.issues) {
        const importIssues = result.data.issues.map((issue: any) => ({
          severity: 'low' as const,
          category: 'TypeScript导入规范',
          description: issue.message,
          file: issue.file,
          line: issue.line,
          suggestion: '按照导入规范组织import语句'
        }));

        issues.push(...importIssues);
        this.logDebug(`发现${importIssues.length}个导入规范问题`);
      }

    } catch (error) {
      this.logWarn('导入组织检查失败', error);
    }
  }

  /**
   * 检查组件结构规范
   */
  private async checkComponentStructure(
    files: string[],
    issues: ComplianceIssue[]
  ): Promise<void> {
    const componentFiles = files.filter(f => f.match(/\.(tsx|jsx)$/));
    if (componentFiles.length === 0) return;

    this.logDebug('执行组件结构检查');

    try {
      const result = await mcpToolsManager.callTool('serena', 'component_structure_check', {
        files: componentFiles
      });

      if (result.success && result.data?.issues) {
        const structureIssues = result.data.issues.map((issue: any) => ({
          severity: 'medium' as const,
          category: 'React组件结构',
          description: issue.message,
          file: issue.file,
          line: issue.line,
          suggestion: '按照React组件最佳实践重构组件结构'
        }));

        issues.push(...structureIssues);
        this.logDebug(`发现${structureIssues.length}个组件结构问题`);
      }

    } catch (error) {
      this.logWarn('组件结构检查失败', error);
    }
  }

  // ============================================================================
  // 工具方法
  // ============================================================================

  /**
   * 创建通过的检查结果
   */
  private createPassedResult(checkType: string, message: string): ComplianceResult {
    return {
      passed: true,
      score: 100,
      issues: [],
      recommendations: [message],
      checkType,
      timestamp: new Date()
    };
  }

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
    
    // 没有严重和高危问题才算通过
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
   * 映射ESLint严重程度
   */
  private mapESLintSeverity(severity: number): ComplianceIssue['severity'] {
    switch (severity) {
      case 2:
        return 'high';
      case 1:
        return 'medium';
      case 0:
        return 'low';
      default:
        return 'medium';
    }
  }

  /**
   * 生成Python建议
   */
  private generatePythonRecommendations(
    issues: ComplianceIssue[],
    recommendations: string[]
  ): void {
    if (issues.length === 0) {
      recommendations.push('Python代码符合所有规范要求');
      return;
    }

    const categories = new Set(issues.map(i => i.category));

    if (categories.has('PEP 8风格')) {
      recommendations.push('运行 black 和 flake8 修复Python代码风格问题');
    }

    if (categories.has('Python复杂度')) {
      recommendations.push('重构复杂函数，将大函数拆分为更小的函数');
    }

    if (categories.has('Python类型注解')) {
      recommendations.push('为函数添加完整的类型注解，使用mypy进行类型检查');
    }

    if (categories.has('Python异步编程')) {
      recommendations.push('检查异步函数的正确使用，确保proper await使用');
    }

    if (categories.has('Python异常处理')) {
      recommendations.push('添加适当的异常处理，避免裸露的except语句');
    }

    recommendations.push('参考PEP 8和项目编码规范文档');
  }

  /**
   * 生成TypeScript建议
   */
  private generateTypeScriptRecommendations(
    issues: ComplianceIssue[],
    recommendations: string[]
  ): void {
    if (issues.length === 0) {
      recommendations.push('TypeScript代码符合所有规范要求');
      return;
    }

    const categories = new Set(issues.map(i => i.category));

    if (categories.has('ESLint规范')) {
      recommendations.push('运行 eslint --fix 修复TypeScript代码风格问题');
    }

    if (categories.has('TypeScript严格模式')) {
      recommendations.push('在tsconfig.json中启用strict模式');
    }

    if (categories.has('TypeScript类型安全')) {
      recommendations.push('使用具体的类型定义替换any类型');
    }

    if (categories.has('TypeScript导入规范')) {
      recommendations.push('按照导入规范组织import语句，使用绝对路径');
    }

    if (categories.has('React组件结构')) {
      recommendations.push('按照React最佳实践重构组件结构');
    }

    recommendations.push('使用TypeScript严格模式和完整的类型定义');
  }

  // ============================================================================
  // 日志方法
  // ============================================================================

  private logDebug(message: string, data?: any): void {
    console.debug(`[ComplianceChecker] DEBUG: ${message}`, data || '');
  }

  private logInfo(message: string, data?: any): void {
    console.info(`[ComplianceChecker] INFO: ${message}`, data || '');
  }

  private logWarn(message: string, error?: Error): void {
    console.warn(`[ComplianceChecker] WARN: ${message}`, error || '');
  }

  private logError(message: string, error?: Error): void {
    console.error(`[ComplianceChecker] ERROR: ${message}`, error || '');
  }
}