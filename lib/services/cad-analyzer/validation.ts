// CAD分析结果验证
import { CADAnalysisResult } from '@/lib/types/cad';

export interface ValidationRule {
  id: string;
  description: string;
  severity: 'error' | 'warning' | 'info';
  validate: (result: CADAnalysisResult) => boolean;
  message: (result: CADAnalysisResult) => string;
}

export interface ValidationResult {
  valid: boolean;
  issues: Array<{
    ruleId: string;
    description: string;
    severity: 'error' | 'warning' | 'info';
    message: string;
  }>;
}

// 定义验证规则
const validationRules: ValidationRule[] = [
  {
    id: 'required-entities',
    description: '验证CAD文件是否包含必要实体',
    severity: 'error',
    validate: (result) => {
      const totalEntities = Object.values(result.entities).reduce((sum, count) => sum + count, 0);
      return totalEntities > 0;
    },
    message: () => '文件不包含任何实体，可能为空文件或解析失败'
  },
  {
    id: 'valid-dimensions',
    description: '验证CAD文件尺寸是否有效',
    severity: 'warning',
    validate: (result) => {
      return result.dimensions.width > 0 && result.dimensions.height > 0;
    },
    message: (result) => `无效的文件尺寸: ${result.dimensions.width}x${result.dimensions.height} ${result.dimensions.unit}`
  },
  {
    id: 'metadata-completeness',
    description: '验证元数据完整性',
    severity: 'info',
    validate: (result) => {
      return !!result.metadata.author && !!result.metadata.createdAt;
    },
    message: () => '文件缺少作者或创建日期等重要元数据'
  },
  {
    id: 'layer-organization',
    description: '验证图层组织',
    severity: 'warning',
    validate: (result) => {
      return result.layers.length > 1;
    },
    message: () => '文件没有使用多个图层，这可能影响文件的组织结构'
  },
  // 可添加更多验证规则
];

// 验证CAD分析结果
export function validateCADAnalysisResult(result: CADAnalysisResult): ValidationResult {
  const issues = [];
  
  for (const rule of validationRules) {
    if (!rule.validate(result)) {
      issues.push({
        ruleId: rule.id,
        description: rule.description,
        severity: rule.severity,
        message: rule.message(result),
      });
    }
  }
  
  return {
    valid: issues.filter(issue => issue.severity === 'error').length === 0,
    issues,
  };
}

// 提供验证报告
export function generateValidationReport(validationResult: ValidationResult): string {
  const { valid, issues } = validationResult;
  
  let report = `## CAD文件验证报告\n\n`;
  report += `总体状态: ${valid ? '通过 ✓' : '有错误 ✗'}\n\n`;
  
  if (issues.length === 0) {
    report += '未发现任何问题，文件验证通过。\n';
  } else {
    report += '### 发现的问题\n\n';
    
    const errorCount = issues.filter(i => i.severity === 'error').length;
    const warningCount = issues.filter(i => i.severity === 'warning').length;
    const infoCount = issues.filter(i => i.severity === 'info').length;
    
    report += `* 错误: ${errorCount}\n`;
    report += `* 警告: ${warningCount}\n`;
    report += `* 信息: ${infoCount}\n\n`;
    
    report += '### 详细问题列表\n\n';
    
    issues.forEach(issue => {
      const icon = issue.severity === 'error' ? '❌' : (issue.severity === 'warning' ? '⚠️' : 'ℹ️');
      report += `${icon} **${issue.severity.toUpperCase()}**: ${issue.message}\n`;
      report += `   (${issue.description})\n\n`;
    });
  }
  
  return report;
} 