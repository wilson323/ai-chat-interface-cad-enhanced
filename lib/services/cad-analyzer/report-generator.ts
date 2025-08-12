/**
 * CAD分析报告生成器
 * 用于基于分析结果生成综合报告
 */

import { CADAnalysisResult } from '@/lib/types/cad';
import { AIMultimodalAnalysisResult } from './ai-analyzer';
import { cadMetrics } from './metrics';

/**
 * 生成CAD分析报告
 * @param result 基础分析结果
 * @param aiResult AI分析结果(可选)
 * @param format 报告格式
 * @returns 报告Blob
 */
export async function generateCADReport(
  result: CADAnalysisResult,
  aiResult?: AIMultimodalAnalysisResult,
  format: 'html' | 'pdf' | 'json' = 'html'
): Promise<Blob> {
  const startTime = Date.now();
  
  try {
    let reportContent: string | object;
    
    switch (format) {
      case 'html':
        reportContent = generateHTMLReport(result, aiResult);
        break;
      case 'pdf':
        reportContent = await generatePDFReport(result, aiResult);
        break;
      case 'json':
        reportContent = generateJSONReport(result, aiResult);
        break;
      default:
        throw new Error(`不支持的报告格式: ${format}`);
    }
    
    // 转换为Blob
    let blob: Blob;
    if (typeof reportContent === 'string') {
      blob = new Blob(
        [reportContent], 
        { type: format === 'html' ? 'text/html' : 'application/octet-stream' }
      );
    } else {
      blob = new Blob(
        [JSON.stringify(reportContent, null, 2)], 
        { type: 'application/json' }
      );
    }
    
    // 记录生成时间
    const duration = Date.now() - startTime;
    cadMetrics.record('report_generation_time', duration, 'ms', {
      format,
      hasAIResult: String(!!aiResult)
    });
    
    return blob;
  } catch (error) {
    console.error('生成CAD报告失败:', error);
    cadMetrics.record('error_count', 1, 'count', {
      error: error instanceof Error ? error.message : String(error),
      component: 'report_generator'
    });
    throw error;
  }
}

/**
 * 生成HTML格式报告
 */
function generateHTMLReport(
  result: CADAnalysisResult,
  aiResult?: AIMultimodalAnalysisResult
): string {
  // 生成HTML内容
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CAD分析报告: ${result.fileName}</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    h1, h2, h3 {
      color: #2563eb;
    }
    .header {
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 10px;
      margin-bottom: 20px;
    }
    .section {
      margin-bottom: 30px;
      padding: 20px;
      background-color: #f9fafb;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }
    th {
      background-color: #f3f4f6;
      font-weight: 600;
    }
    .metadata-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 16px;
    }
    .metadata-item {
      background-color: #fff;
      padding: 12px;
      border-radius: 4px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .metadata-label {
      font-weight: 600;
      color: #4b5563;
      margin-bottom: 4px;
    }
    .metadata-value {
      color: #1f2937;
    }
    .entity-chart {
      height: 300px;
      margin-bottom: 20px;
    }
    .ai-insights {
      background-color: #eff6ff;
      border-left: 4px solid #3b82f6;
    }
    .issue {
      margin-bottom: 12px;
      padding: 12px;
      border-radius: 4px;
    }
    .issue.critical {
      background-color: #fee2e2;
      border-left: 4px solid #ef4444;
    }
    .issue.high {
      background-color: #ffedd5;
      border-left: 4px solid #f97316;
    }
    .issue.medium {
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
    }
    .issue.low {
      background-color: #ecfdf5;
      border-left: 4px solid #10b981;
    }
    .footer {
      margin-top: 40px;
      text-align: center;
      color: #6b7280;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>CAD分析报告</h1>
    <p>文件: ${result.fileName} (${result.fileType.toUpperCase()})</p>
    <p>生成时间: ${new Date().toLocaleString()}</p>
  </div>
  
  <div class="section">
    <h2>文件概述</h2>
    <div class="metadata-grid">
      <div class="metadata-item">
        <div class="metadata-label">文件类型</div>
        <div class="metadata-value">${result.fileType.toUpperCase()}</div>
      </div>
      <div class="metadata-item">
        <div class="metadata-label">尺寸</div>
        <div class="metadata-value">
          ${result.dimensions.width} x ${result.dimensions.height}
          ${result.dimensions.depth ? ` x ${result.dimensions.depth}` : ''}
          ${result.dimensions.unit}
        </div>
      </div>
      <div class="metadata-item">
        <div class="metadata-label">图层数量</div>
        <div class="metadata-value">${result.layers.length}</div>
      </div>
      <div class="metadata-item">
        <div class="metadata-label">组件数量</div>
        <div class="metadata-value">${(result.components?.length || 0)}</div>
      </div>
      ${result.metadata?.complexityScore ? `
      <div class="metadata-item">
        <div class="metadata-label">复杂度评分</div>
        <div class="metadata-value">${result.metadata.complexityScore}/100</div>
      </div>
      ` : ''}
      ${result.metadata?.format ? `
      <div class="metadata-item">
        <div class="metadata-label">格式</div>
        <div class="metadata-value">${result.metadata.format}</div>
      </div>
      ` : ''}
      ${result.metadata?.version ? `
      <div class="metadata-item">
        <div class="metadata-label">版本</div>
        <div class="metadata-value">${result.metadata.version}</div>
      </div>
      ` : ''}
      ${result.metadata?.creationDate ? `
      <div class="metadata-item">
        <div class="metadata-label">创建日期</div>
        <div class="metadata-value">${(() => { const v = (result.metadata as Record<string, unknown> | undefined)?.creationDate; return (typeof v === 'string' || typeof v === 'number' || v instanceof Date) ? new Date(v as string | number | Date).toLocaleString() : '' })()}</div>
      </div>
      ` : ''}
    </div>
  </div>
  
  <div class="section">
    <h2>实体统计</h2>
    <table>
      <thead>
        <tr>
          <th>实体类型</th>
          <th>数量</th>
        </tr>
      </thead>
      <tbody>
        ${Object.entries(result.entities)
          .filter(([_, count]) => count > 0)
          .map(([type, count]) => `
            <tr>
              <td>${type}</td>
              <td>${count}</td>
            </tr>
          `).join('')}
      </tbody>
    </table>
  </div>
  
  <div class="section">
    <h2>图层信息</h2>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>图层名称</th>
        </tr>
      </thead>
      <tbody>
        ${result.layers.map((layer, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${layer}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  
  <div class="section">
    <h2>组件列表</h2>
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>名称</th>
          <th>类型</th>
          <th>材质</th>
          <th>位置</th>
        </tr>
      </thead>
      <tbody>
        ${(result.components ?? []).map(component => `
          <tr>
            <td>${component.id}</td>
            <td>${component.name}</td>
            <td>${component.type}</td>
            <td>${component.material || '-'}</td>
            <td>[${component.position.join(', ')}]</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  
  ${result.materials && result.materials.length > 0 ? `
  <div class="section">
    <h2>材质信息</h2>
    <table>
      <thead>
        <tr>
          <th>名称</th>
          <th>颜色</th>
          <th>密度</th>
          <th>属性</th>
        </tr>
      </thead>
      <tbody>
        ${result.materials.map(material => `
          <tr>
            <td>${material.name}</td>
            <td>
              <div style="display: inline-block; width: 20px; height: 20px; background-color: ${material.color}; border: 1px solid #ccc; vertical-align: middle;"></div>
              ${material.color}
            </td>
            <td>${material.density ? `${material.density} g/cm³` : '-'}</td>
            <td>${material.properties ? Object.entries(material.properties).map(([key, value]) => `${key}: ${value}`).join('<br>') : '-'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}
  
  ${result.measurements && result.measurements.length > 0 ? `
  <div class="section">
    <h2>测量结果</h2>
    <table>
      <thead>
        <tr>
          <th>类型</th>
          <th>值</th>
          <th>单位</th>
          <th>标签</th>
        </tr>
      </thead>
      <tbody>
        ${result.measurements.map(measurement => `
          <tr>
            <td>${measurement.type}</td>
            <td>${measurement.value}</td>
            <td>${measurement.unit}</td>
            <td>${measurement.label || '-'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}
  
  ${result.massProperties ? `
  <div class="section">
    <h2>质量属性</h2>
    <div class="metadata-grid">
      ${Object.entries(result.massProperties).map(([key, value]) => `
        <div class="metadata-item">
          <div class="metadata-label">${formatPropertyName(key)}</div>
          <div class="metadata-value">${Array.isArray(value) ? value.join(', ') : value}</div>
        </div>
      `).join('')}
    </div>
  </div>
  ` : ''}
  
  ${aiResult ? `
  <div class="section ai-insights">
    <h2>AI分析洞察</h2>
    <div class="metadata-item">
      <div class="metadata-label">总体摘要</div>
      <div class="metadata-value">${aiResult.summary}</div>
    </div>
    
    <div class="metadata-item">
      <div class="metadata-label">专业领域洞察</div>
      <div class="metadata-value">${aiResult.categorySpecificInsights}</div>
    </div>
    
    <div class="metadata-item">
      <div class="metadata-label">置信度</div>
      <div class="metadata-value">${aiResult.confidenceScore !== undefined ? (aiResult.confidenceScore * 100).toFixed(1) : '—'}%</div>
    </div>
    
    ${aiResult.visualAnalysis?.detectedComponents && aiResult.visualAnalysis.detectedComponents.length > 0 ? `
    <h3>检测到的组件</h3>
    <table>
      <thead>
        <tr>
          <th>类型</th>
          <th>数量</th>
          <th>位置</th>
          <th>置信度</th>
        </tr>
      </thead>
      <tbody>
        ${aiResult.visualAnalysis.detectedComponents.map(comp => `
          <tr>
            <td>${comp.type}</td>
            <td>${comp.count}</td>
            <td>${comp.location || '-'}</td>
            <td>${(comp.confidence * 100).toFixed(1)}%</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    ` : ''}
    
    ${aiResult.technicalAnalysis?.technicalIssues && aiResult.technicalAnalysis.technicalIssues.length > 0 ? `
    <h3>技术问题</h3>
    <div>
      ${aiResult.technicalAnalysis.technicalIssues.map(issue => `
        <div class="issue ${issue.severity}">
          <strong>${issue.category}</strong>: ${issue.description}
          <p><strong>影响</strong>: ${issue.impact}</p>
          <p><strong>严重程度</strong>: ${formatSeverity(issue.severity)}</p>
        </div>
      `).join('')}
    </div>
    ` : ''}
    
    ${aiResult.optimizationSuggestions?.designImprovements && aiResult.optimizationSuggestions.designImprovements.length > 0 ? `
    <h3>优化建议</h3>
    <table>
      <thead>
        <tr>
          <th>领域</th>
          <th>建议</th>
          <th>收益</th>
          <th>实施难度</th>
        </tr>
      </thead>
      <tbody>
        ${aiResult.optimizationSuggestions.designImprovements.map(improvement => `
          <tr>
            <td>${improvement.area}</td>
            <td>${improvement.suggestion}</td>
            <td>${improvement.benefit}</td>
            <td>${formatDifficulty(improvement.implementationDifficulty || 'medium')}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    ` : ''}
  </div>
  ` : ''}
  
  <div class="footer">
    <p>CAD分析报告 | 生成时间: ${new Date().toLocaleString()}</p>
  </div>
</body>
</html>
  `;
}

/**
 * 生成PDF格式报告
 */
async function generatePDFReport(
  result: CADAnalysisResult,
  aiResult?: AIMultimodalAnalysisResult
): Promise<string> {
  // 在实际项目中，这里应该使用PDF生成库
  // 例如jsPDF, pdfmake或者通过服务端API
  
  // 为了简单起见，这里先生成HTML，然后未来可以替换为真正的PDF生成
  const htmlContent = generateHTMLReport(result, aiResult);
  
  // 这里返回HTML内容，实际项目中应该返回PDF的ArrayBuffer或Blob
  // 例如使用jsPDF:
  // const doc = new jsPDF();
  // doc.html(htmlContent, {
  //   callback: function(doc) {
  //     return doc.output('arraybuffer');
  //   }
  // });
  
  return htmlContent;
}

/**
 * 生成JSON格式报告
 */
function generateJSONReport(
  result: CADAnalysisResult,
  aiResult?: AIMultimodalAnalysisResult
): object {
  return {
    reportType: 'CAD Analysis Report',
    generatedAt: new Date().toISOString(),
    fileInfo: {
      fileName: result.fileName,
      fileType: result.fileType,
      fileId: result.fileId
    },
    dimensions: result.dimensions,
    metadata: result.metadata || {},
    statistics: {
      componentCount: (result.components?.length || 0),
      layerCount: result.layers.length,
      entityCounts: result.entities,
      materialCount: result.materials?.length || 0
    },
    components: (result.components ?? []).map(component => ({
      id: component.id,
      name: component.name,
      type: component.type,
      material: component.material,
      position: component.position
    })),
    layers: result.layers,
    materials: result.materials || [],
    measurements: result.measurements || [],
    massProperties: result.massProperties,
    aiAnalysis: aiResult ? {
      summary: aiResult.summary,
      categoryInsights: aiResult.categorySpecificInsights,
      confidenceScore: aiResult.confidenceScore,
      visualAnalysis: aiResult.visualAnalysis,
      technicalIssues: aiResult.technicalAnalysis?.technicalIssues,
      optimizationSuggestions: aiResult.optimizationSuggestions
    } : undefined
  };
}

/**
 * 格式化属性名称
 */
function formatPropertyName(name: string): string {
  return name
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase());
}

/**
 * 格式化严重程度
 */
function formatSeverity(severity: string): string {
  switch (severity) {
    case 'critical': return '严重';
    case 'high': return '高';
    case 'medium': return '中';
    case 'low': return '低';
    default: return severity;
  }
}

/**
 * 格式化难度
 */
function formatDifficulty(difficulty: string): string {
  switch (difficulty) {
    case 'high': return '高';
    case 'medium': return '中';
    case 'low': return '低';
    default: return difficulty;
  }
}
