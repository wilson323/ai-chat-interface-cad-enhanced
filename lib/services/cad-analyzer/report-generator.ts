// CAD专业报告生成器
import { CADAnalysisResult } from '@/lib/types/cad';
import { validateCADAnalysisResult, generateValidationReport } from './validation';

export interface ReportOptions {
  includeValidation: boolean;
  includeScreenshots: boolean;
  includeMetadata: boolean;
  includeStatistics: boolean;
  includeAIInsights: boolean;
  format: 'pdf' | 'html' | 'markdown';
}

export async function generateCADReport(
  result: CADAnalysisResult, 
  options: Partial<ReportOptions> = {}
): Promise<string | Blob> {
  const defaultOptions: ReportOptions = {
    includeValidation: true,
    includeScreenshots: true,
    includeMetadata: true,
    includeStatistics: true,
    includeAIInsights: true,
    format: 'markdown',
    ...options
  };
  
  // 生成报告内容
  let reportContent = '';
  
  // 标题部分
  reportContent += `# CAD文件分析报告\n\n`;
  reportContent += `**文件名:** ${result.fileName}\n`;
  reportContent += `**文件类型:** ${result.fileType.toUpperCase()}\n`;
  reportContent += `**文件大小:** ${formatFileSize(result.fileSize)}\n`;
  reportContent += `**分析日期:** ${new Date().toLocaleString()}\n\n`;
  
  // 验证结果
  if (defaultOptions.includeValidation) {
    const validationResult = validateCADAnalysisResult(result);
    const validationReport = generateValidationReport(validationResult);
    reportContent += `${validationReport}\n\n`;
  }
  
  // 元数据
  if (defaultOptions.includeMetadata) {
    reportContent += `## 文件元数据\n\n`;
    reportContent += `* **作者:** ${result.metadata.author || '未知'}\n`;
    reportContent += `* **创建时间:** ${formatDate(result.metadata.createdAt)}\n`;
    
    if (result.metadata.modifiedAt) {
      reportContent += `* **修改时间:** ${formatDate(result.metadata.modifiedAt)}\n`;
    }
    
    reportContent += `* **软件:** ${result.metadata.software || '未知'}\n`;
    
    if (result.metadata.version) {
      reportContent += `* **版本:** ${result.metadata.version}\n`;
    }
    
    reportContent += `\n`;
  }
  
  // 统计信息
  if (defaultOptions.includeStatistics) {
    reportContent += `## 统计信息\n\n`;
    
    // 实体统计
    reportContent += `### 实体统计\n\n`;
    reportContent += `| 实体类型 | 数量 |\n`;
    reportContent += `|---------|------|\n`;
    
    Object.entries(result.entities).forEach(([type, count]) => {
      reportContent += `| ${capitalizeFirstLetter(type)} | ${count} |\n`;
    });
    
    // 图层信息
    reportContent += `\n### 图层信息\n\n`;
    reportContent += `总计 ${result.layers.length} 个图层:\n\n`;
    
    result.layers.forEach(layer => {
      reportContent += `* ${layer}\n`;
    });
    
    // 尺寸信息
    reportContent += `\n### 尺寸信息\n\n`;
    reportContent += `* **宽度:** ${result.dimensions.width} ${result.dimensions.unit}\n`;
    reportContent += `* **高度:** ${result.dimensions.height} ${result.dimensions.unit}\n`;
    
    reportContent += `\n`;
  }
  
  // AI分析洞见
  if (defaultOptions.includeAIInsights && result.aiInsights) {
    reportContent += `## AI分析洞见\n\n`;
    reportContent += `${result.aiInsights.summary}\n\n`;
    
    if (result.aiInsights.recommendations && result.aiInsights.recommendations.length > 0) {
      reportContent += `### 改进建议\n\n`;
      
      result.aiInsights.recommendations.forEach(recommendation => {
        reportContent += `* ${recommendation}\n`;
      });
    }
    
    reportContent += `\n`;
  }
  
  // 风险分析
  if (result.risks && result.risks.length > 0) {
    reportContent += `## 风险分析\n\n`;
    
    const highRisks = result.risks.filter(risk => risk.level === 'high');
    const mediumRisks = result.risks.filter(risk => risk.level === 'medium');
    const lowRisks = result.risks.filter(risk => risk.level === 'low');
    
    if (highRisks.length > 0) {
      reportContent += `### 高风险问题\n\n`;
      highRisks.forEach(risk => {
        reportContent += `* **${risk.type}:** ${risk.description}\n`;
      });
      reportContent += `\n`;
    }
    
    if (mediumRisks.length > 0) {
      reportContent += `### 中等风险问题\n\n`;
      mediumRisks.forEach(risk => {
        reportContent += `* **${risk.type}:** ${risk.description}\n`;
      });
      reportContent += `\n`;
    }
    
    if (lowRisks.length > 0) {
      reportContent += `### 低风险问题\n\n`;
      lowRisks.forEach(risk => {
        reportContent += `* **${risk.type}:** ${risk.description}\n`;
      });
      reportContent += `\n`;
    }
  }
  
  // 根据格式转换报告
  if (defaultOptions.format === 'pdf') {
    // 使用PDF生成库将Markdown转换为PDF
    // 此处需要特定的PDF库实现
    return generatePDF(reportContent);
  } else if (defaultOptions.format === 'html') {
    // 转换为HTML
    return markdownToHTML(reportContent);
  } else {
    // 默认返回Markdown
    return reportContent;
  }
}

// 格式化工具函数
function formatFileSize(sizeInBytes: number): string {
  if (sizeInBytes < 1024) {
    return `${sizeInBytes} B`;
  } else if (sizeInBytes < 1024 * 1024) {
    return `${(sizeInBytes / 1024).toFixed(2)} KB`;
  } else {
    return `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`;
  }
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleString();
  } catch (e) {
    return dateString || '未知';
  }
}

function capitalizeFirstLetter(string: string): string {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

async function generatePDF(markdownContent: string): Promise<Blob> {
  // 此处应调用PDF生成API或库
  // 示例实现
  const response = await fetch('/api/generate-pdf', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ content: markdownContent })
  });
  
  return await response.blob();
}

function markdownToHTML(markdown: string): string {
  // 简单的Markdown到HTML转换
  return markdown
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>')
    .replace(/\| (.*) \|/g, '<tr><td>$1</td></tr>')
    .replace(/<tr><td>(.*) \| (.*)<\/td><\/tr>/g, '<tr><td>$1</td><td>$2</td></tr>')
    .replace(/\n\n/g, '<p></p>');
} 