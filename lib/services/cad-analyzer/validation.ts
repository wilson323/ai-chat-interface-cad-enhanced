// CAD设计验证模块
import type { CADAnalysisResult } from '@/lib/types/cad';

import { cadMetrics } from './metrics';

// 验证规则类型
export type ValidationRuleType = 
  | 'geometry' 
  | 'structure' 
  | 'dimensions' 
  | 'layers' 
  | 'materials' 
  | 'compliance' 
  | 'mechanical' 
  | 'electrical' 
  | 'plumbing' 
  | 'architecture';

// 验证规则的严重性
export type ValidationSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

// 验证问题
export interface ValidationIssue {
  id: string;
  title: string;
  description: string;
  severity: ValidationSeverity;
  ruleType: ValidationRuleType;
  affectedElements?: string[];
  recommendation?: string;
  reference?: string;
}

// 验证结果
export interface ValidationResult {
  passed: boolean;
  score: number; // 0-100分
  issueCount: number;
  criticalIssueCount: number;
  highIssueCount: number;
  mediumIssueCount: number;
  lowIssueCount: number;
  infoIssueCount: number;
  issues: ValidationIssue[];
  summary: string;
}

// 验证选项
export interface ValidationOptions {
  rules?: ValidationRuleType[];
  strictMode?: boolean;
  standards?: string[];  // 例如 "ISO", "ANSI", "GB"
  checkConnectivity?: boolean;
  checkInterference?: boolean;
  checkDimensions?: boolean;
}

// 默认验证选项
const DEFAULT_VALIDATION_OPTIONS: ValidationOptions = {
  strictMode: false,
  checkConnectivity: true,
  checkInterference: true,
  checkDimensions: true,
};

/**
 * 验证CAD设计
 */
export async function validateCADDesign(
  cadResult: CADAnalysisResult,
  options: Partial<ValidationOptions> = {}
): Promise<ValidationResult> {
  const startTime = Date.now();
  
  // 合并选项
  const mergedOptions: ValidationOptions = {
    ...DEFAULT_VALIDATION_OPTIONS,
    ...options
  };
  
  try {
    console.log(`开始验证CAD设计: ${cadResult.fileName}`);
    
    // 调用验证API
    const response = await fetch('/api/cad/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        cadResult,
        options: mergedOptions
      })
    });
    
    if (!response.ok) {
      throw new Error(`设计验证请求失败: ${response.status}`);
    }
    
    const validationResult = await response.json();
    
    // 记录验证指标
    const duration = Date.now() - startTime;
    cadMetrics.record('validation_duration', duration, 'ms', {
      fileType: cadResult.fileType,
      passed: validationResult.passed.toString()
    });
    
    return validationResult;
  } catch (error) {
    console.error('CAD设计验证失败:', error);
    
    // 生成一个基本的验证结果
    const fallbackResult: ValidationResult = {
      passed: false,
      score: 0,
      issueCount: 1,
      criticalIssueCount: 0,
      highIssueCount: 0,
      mediumIssueCount: 1,
      lowIssueCount: 0,
      infoIssueCount: 0,
      issues: [{
        id: 'validation-error',
        title: '验证过程失败',
        description: `验证过程中发生错误: ${error instanceof Error ? error.message : String(error)}`,
        severity: 'medium',
        ruleType: 'geometry',
        recommendation: '请稍后重试或联系技术支持'
      }],
      summary: '验证过程失败，无法确定设计是否符合标准'
    };
    
    // 记录验证错误
    cadMetrics.record('validation_error', 1, 'count', {
      error: error instanceof Error ? error.message : String(error)
    });
    
    return fallbackResult;
  }
}

/**
 * 基本的CAD设计验证
 * 这个是本地实现的简单验证，不如服务器端验证全面
 */
export function validateCADDesignBasic(
  cadResult: CADAnalysisResult
): ValidationResult {
  const issues: ValidationIssue[] = [];
  
  // 检查实体数量
  const entityCount = Object.values(cadResult.entities).reduce((sum, count) => sum + count, 0);
  if (entityCount === 0) {
    issues.push({
      id: 'no-entities',
      title: '无有效实体',
      description: '设计中没有找到任何有效的几何实体',
      severity: 'critical',
      ruleType: 'geometry',
      recommendation: '检查文件是否正确导出或是否为空白设计'
    });
  }
  
  // 检查图层
  if (cadResult.layers.length === 0) {
    issues.push({
      id: 'no-layers',
      title: '无图层信息',
      description: '设计中没有定义图层',
      severity: 'medium',
      ruleType: 'layers',
      recommendation: '考虑使用图层组织设计元素以提高可读性'
    });
  }
  
  // 检查尺寸
  if (cadResult.dimensions.width === 0 || cadResult.dimensions.height === 0) {
    issues.push({
      id: 'invalid-dimensions',
      title: '无效的尺寸',
      description: '设计的宽度或高度为零',
      severity: 'high',
      ruleType: 'dimensions',
      recommendation: '检查设计单位和比例设置'
    });
  }
  
  // 检查元数据
  if (!cadResult.metadata?.author || cadResult.metadata?.author === '未知') {
    issues.push({
      id: 'missing-author',
      title: '缺少作者信息',
      description: '设计文件缺少作者信息',
      severity: 'low',
      ruleType: 'compliance',
      recommendation: '添加作者信息以便于追踪和管理'
    });
  }
  
  // 根据文件类型进行特定检查
  if (cadResult.fileType === 'dwg' || cadResult.fileType === 'dxf') {
    // 2D图纸特定检查
    checkForText(cadResult, issues);
    checkForDimensions(cadResult, issues);
  } else if (['step', 'stp', 'iges', 'igs'].includes(cadResult.fileType)) {
    // 3D模型特定检查
    checkForSolids(cadResult, issues);
    checkForShells(cadResult, issues);
  }
  
  // 计算验证分数和状态
  const criticalIssues = issues.filter(i => i.severity === 'critical');
  const highIssues = issues.filter(i => i.severity === 'high');
  const mediumIssues = issues.filter(i => i.severity === 'medium');
  const lowIssues = issues.filter(i => i.severity === 'low');
  
  // 根据问题的严重性计算分数
  let score = 100;
  criticalIssues.forEach(() => score -= 25);
  highIssues.forEach(() => score -= 10);
  mediumIssues.forEach(() => score -= 5);
  lowIssues.forEach(() => score -= 1);
  
  // 确保分数在0-100范围内
  score = Math.max(0, Math.min(100, score));
  
  // 生成验证结果
  const result: ValidationResult = {
    passed: criticalIssues.length === 0 && highIssues.length === 0,
    score,
    issueCount: issues.length,
    criticalIssueCount: criticalIssues.length,
    highIssueCount: highIssues.length,
    mediumIssueCount: mediumIssues.length,
    lowIssueCount: lowIssues.length,
    infoIssueCount: 0,
    issues,
    summary: generateValidationSummary(score, issues)
  };
  
  return result;
}

/**
 * 检查是否有文本元素
 */
function checkForText(cadResult: CADAnalysisResult, issues: ValidationIssue[]): void {
  if (cadResult.entities.text === 0) {
    issues.push({
      id: 'no-text',
      title: '无文本注释',
      description: '设计中没有文本标注或注释',
      severity: 'medium',
      ruleType: 'compliance',
      recommendation: '添加适当的文本标注以提高设计的可读性和可理解性'
    });
  }
}

/**
 * 检查是否有尺寸标注
 */
function checkForDimensions(cadResult: CADAnalysisResult, issues: ValidationIssue[]): void {
  if (cadResult.entities.dimensions === 0) {
    issues.push({
      id: 'no-dimension-annotations',
      title: '无尺寸标注',
      description: '设计中没有尺寸标注',
      severity: 'high',
      ruleType: 'dimensions',
      recommendation: '添加尺寸标注以确保设计意图的准确传达'
    });
  }
}

/**
 * 检查是否有实体
 */
function checkForSolids(cadResult: CADAnalysisResult, issues: ValidationIssue[]): void {
  if (!cadResult.entities.solids || cadResult.entities.solids === 0) {
    issues.push({
      id: 'no-solids',
      title: '无实体模型',
      description: '3D设计中没有实体模型',
      severity: 'high',
      ruleType: 'geometry',
      recommendation: '检查模型是否完整，或者是否只包含表面而非实体'
    });
  }
}

/**
 * 检查是否有外壳
 */
function checkForShells(cadResult: CADAnalysisResult, issues: ValidationIssue[]): void {
  const shells = cadResult.entities.shells ?? 0
  const solids = cadResult.entities.solids ?? 0
  if (shells === 0) {
    if (solids === 0) {
      issues.push({
        id: 'no-shells',
        title: '无外壳',
        description: '3D设计中没有外壳定义',
        severity: 'medium',
        ruleType: 'geometry',
        recommendation: '检查模型的拓扑结构是否完整'
      });
    }
  }
}

/**
 * 生成验证摘要
 */
function generateValidationSummary(score: number, issues: ValidationIssue[]): string {
  if (issues.length === 0) {
    return '设计验证通过，未发现任何问题';
  }
  
  const criticalCount = issues.filter(i => i.severity === 'critical').length;
  const highCount = issues.filter(i => i.severity === 'high').length;
  const mediumCount = issues.filter(i => i.severity === 'medium').length;
  const lowCount = issues.filter(i => i.severity === 'low').length;
  
  let summary = `设计验证完成，得分: ${score}/100。`;
  
  if (criticalCount > 0) {
    summary += ` 发现 ${criticalCount} 个严重问题，`;
  }
  
  if (highCount > 0) {
    summary += ` ${highCount} 个高优先级问题，`;
  }
  
  if (mediumCount > 0) {
    summary += ` ${mediumCount} 个中等问题，`;
  }
  
  if (lowCount > 0) {
    summary += ` ${lowCount} 个低优先级问题。`;
  }
  
  if (criticalCount > 0 || highCount > 0) {
    summary += ' 建议在使用前解决这些问题。';
  } else if (mediumCount > 0) {
    summary += ' 建议在时间允许的情况下解决这些问题。';
  } else {
    summary += ' 这些问题不影响设计的基本功能。';
  }
  
  return summary;
} 