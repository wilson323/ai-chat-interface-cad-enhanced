/**
 * @fileoverview Type definitions for CAD validation.
 * @file_zh-CN: CAD验证相关的类型定义。
 */

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

export type ValidationSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

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

export interface ValidationOptions {
  rules?: ValidationRuleType[];
  strictMode?: boolean;
  standards?: string[];  // 例如 "ISO", "ANSI", "GB"
  checkConnectivity?: boolean;
  checkInterference?: boolean;
  checkDimensions?: boolean;
}
