import { NextRequest, NextResponse } from 'next/server';
import { cadMetrics } from '@/lib/services/cad-analyzer/metrics';
// types removed to avoid import error; use runtime-safe handling
import type { CADAnalysisResult } from '@/lib/types/cad';
import type { AIMultimodalAnalysisResult } from '@/lib/services/cad-analyzer/ai-analyzer';
import type { ValidationResult } from '@/lib/services/cad-analyzer/validation';
import { jsPDF } from 'jspdf';
import { Readable } from 'stream';

/**
 * CAD报告生成API端点
 * 接收CAD分析结果、AI分析和验证结果，生成综合报告
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  try {
    const data = await request.json();
    const { 
      cadResult, 
      aiResult, 
      validationResult, 
      options 
    } = data;
    
    // 验证请求数据
    if (!cadResult) {
      return NextResponse.json(
        { error: 'Missing CAD result data' },
        { status: 400 }
      );
    }
    
    // 获取报告格式
    const format = options?.format || 'pdf';
    
    // 记录API调用
    cadMetrics.record('api_call_count', 1, 'count', {
      endpoint: 'generate-report',
      format,
      fileType: cadResult.fileType || 'unknown'
    });
    
    // 生成报告
    let reportBlob: Blob;
    switch (format) {
      case 'pdf':
        reportBlob = await generatePDFReport(cadResult, aiResult, validationResult, options);
        break;
      case 'html':
        reportBlob = await generateHTMLReport(cadResult, aiResult, validationResult, options);
        break;
      default:
        reportBlob = await generateJSONReport(cadResult, aiResult, validationResult, options);
    }
    
    // 创建响应头
    const headers = new Headers();
    headers.set('Content-Type', getContentType(format));
    headers.set('Content-Disposition', `attachment; filename="CAD分析报告_${cadResult.id}.${format}"`);
    
    // 记录处理时间
    const duration = Date.now() - startTime;
    cadMetrics.record('report_generation_time', duration, 'ms', {
      format,
      fileType: cadResult.fileType || 'unknown'
    });
    
    return new NextResponse(reportBlob, { 
      status: 200,
      headers
    });
  } catch (error) {
    console.error('CAD报告生成失败:', error);
    
    // 记录错误
    cadMetrics.record('error_count', 1, 'count', {
      error: error instanceof Error ? error.message : String(error),
      endpoint: 'generate-report'
    });
    
    return NextResponse.json(
      { error: 'Failed to generate CAD report', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/**
 * 生成PDF报告
 */
async function generatePDFReport(
  cadResult: CADAnalysisResult,
  aiResult?: AIMultimodalAnalysisResult,
  validationResult?: ValidationResult,
  options?: any
): Promise<Blob> {
  // 创建PDF文档
  const doc = new jsPDF();
  
  // 设置标题
  doc.setFontSize(22);
  doc.text('CAD分析报告', 105, 15, { align: 'center' });
  
  // 添加报告日期
  doc.setFontSize(10);
  doc.text(`生成日期: ${new Date().toLocaleDateString()}`, 105, 22, { align: 'center' });
  
  // 添加文件信息
  doc.setFontSize(12);
  doc.text(`文件名: ${cadResult.fileName}`, 20, 30);
  doc.text(`文件类型: ${cadResult.fileType.toUpperCase()}`, 20, 38);
  doc.text(`文件大小: ${formatFileSize(cadResult.fileSize)}`, 20, 46);
  
  // 添加基本分析结果
  doc.setFontSize(16);
  doc.text('基本分析', 20, 60);
  
  doc.setFontSize(12);
  let yPos = 70;
  
  // 实体信息
  doc.text('实体统计:', 20, yPos);
  yPos += 8;
  
  const entityEntries = Object.entries(cadResult.entities).filter(([_, count]) => count > 0);
  for (const [type, count] of entityEntries) {
    doc.text(`- ${formatEntityType(type)}: ${count}`, 30, yPos);
    yPos += 7;
    
    // 防止内容超出页面
    if (yPos > 280) {
      doc.addPage();
      yPos = 20;
    }
  }
  
  // 尺寸信息
  yPos += 5;
  doc.text('尺寸信息:', 20, yPos);
  yPos += 8;
  doc.text(`- 宽度: ${cadResult.dimensions.width} ${cadResult.dimensions.unit}`, 30, yPos);
  yPos += 7;
  doc.text(`- 高度: ${cadResult.dimensions.height} ${cadResult.dimensions.unit}`, 30, yPos);
  yPos += 7;
  if (cadResult.dimensions.depth) {
    doc.text(`- 深度: ${cadResult.dimensions.depth} ${cadResult.dimensions.unit}`, 30, yPos);
    yPos += 7;
  }
  
  // 添加AI分析结果
  if (aiResult) {
    // 检查是否需要新页面
    if (yPos > 220) {
      doc.addPage();
      yPos = 20;
    } else {
      yPos += 10;
    }
    
    doc.setFontSize(16);
    doc.text('AI分析', 20, yPos);
    yPos += 10;
    
    doc.setFontSize(12);
    
    // 摘要
    const summaryLines = splitTextToLines(aiResult.summary, 150);
    doc.text('摘要:', 20, yPos);
    yPos += 8;
    
    for (const line of summaryLines) {
      doc.text(line, 30, yPos);
      yPos += 7;
      
      // 防止内容超出页面
      if (yPos > 280) {
        doc.addPage();
        yPos = 20;
      }
    }
    
    // 技术问题
    if (aiResult.technicalAnalysis?.technicalIssues.length) {
      yPos += 5;
      doc.text('技术问题:', 20, yPos);
      yPos += 8;
      
      for (const issue of aiResult.technicalAnalysis.technicalIssues) {
        doc.text(`- ${issue.category}: ${issue.description}`, 30, yPos);
        yPos += 7;
        doc.text(`  影响: ${issue.impact}`, 30, yPos);
        yPos += 10;
        
        // 防止内容超出页面
        if (yPos > 280) {
          doc.addPage();
          yPos = 20;
        }
      }
    }
    
    // 优化建议
    if (aiResult.optimizationSuggestions?.workflowImprovements?.length) {
      yPos += 5;
      doc.text('优化建议:', 20, yPos);
      yPos += 8;
      
      for (const improvement of (aiResult.optimizationSuggestions as any).workflowImprovements) {
        const lines = splitTextToLines(improvement, 150);
        for (const line of lines) {
          doc.text(`- ${line}`, 30, yPos);
          yPos += 7;
          
          // 防止内容超出页面
          if (yPos > 280) {
            doc.addPage();
            yPos = 20;
          }
        }
      }
    }
  }
  
  // 添加验证结果
  if (validationResult) {
    // 检查是否需要新页面
    if (yPos > 220) {
      doc.addPage();
      yPos = 20;
    } else {
      yPos += 10;
    }
    
    doc.setFontSize(16);
    doc.text('设计验证', 20, yPos);
    yPos += 10;
    
    doc.setFontSize(12);
    
    // 验证摘要
    doc.text(`验证结果: ${validationResult.passed ? '通过' : '未通过'}`, 20, yPos);
    yPos += 7;
    doc.text(`验证分数: ${validationResult.score}/100`, 20, yPos);
    yPos += 10;
    
    const summaryLines = splitTextToLines(validationResult.summary, 150);
    for (const line of summaryLines) {
      doc.text(line, 20, yPos);
      yPos += 7;
      
      // 防止内容超出页面
      if (yPos > 280) {
        doc.addPage();
        yPos = 20;
      }
    }
    
    // 验证问题
    if (validationResult.issues.length > 0) {
      yPos += 5;
      doc.text('发现的问题:', 20, yPos);
      yPos += 8;
      
      for (const issue of validationResult.issues) {
        doc.text(`- ${issue.title}`, 30, yPos);
        yPos += 7;
        
        const descLines = splitTextToLines(issue.description, 140);
        for (const line of descLines) {
          doc.text(line, 35, yPos);
          yPos += 7;
          
          // 防止内容超出页面
          if (yPos > 280) {
            doc.addPage();
            yPos = 20;
          }
        }
        
        if (issue.recommendation) {
          doc.text('建议:', 35, yPos);
          yPos += 7;
          
          const recLines = splitTextToLines(issue.recommendation, 135);
          for (const line of recLines) {
            doc.text(line, 40, yPos);
            yPos += 7;
            
            // 防止内容超出页面
            if (yPos > 280) {
              doc.addPage();
              yPos = 20;
            }
          }
        }
        
        yPos += 3;
      }
    }
  }
  
  // 添加页码
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.text(`第 ${i} 页 / 共 ${pageCount} 页`, 105, 287, { align: 'center' });
  }
  
  return doc.output('blob');
}

/**
 * 生成HTML报告
 */
async function generateHTMLReport(
  cadResult: CADAnalysisResult,
  aiResult?: AIMultimodalAnalysisResult,
  validationResult?: ValidationResult,
  options?: any
): Promise<Blob> {
  let html = `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>CAD分析报告 - ${cadResult.fileName}</title>
      <style>
        body {
          font-family: 'Arial', sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 1000px;
          margin: 0 auto;
          padding: 20px;
        }
        h1, h2, h3 {
          color: #2c3e50;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 1px solid #eee;
        }
        .section {
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 1px solid #eee;
        }
        .metadata {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 15px;
        }
        .metadata-item {
          background-color: #f8f9fa;
          padding: 10px;
          border-radius: 5px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        th, td {
          padding: 12px 15px;
          text-align: left;
          border-bottom: 1px solid #ddd;
        }
        th {
          background-color: #f8f9fa;
        }
        tr:hover {
          background-color: #f1f1f1;
        }
        .issue {
          background-color: #fff8f8;
          border-left: 4px solid #e74c3c;
          padding: 10px 15px;
          margin-bottom: 15px;
        }
        .issue-critical {
          border-left-color: #e74c3c;
        }
        .issue-high {
          border-left-color: #f39c12;
        }
        .issue-medium {
          border-left-color: #3498db;
        }
        .issue-low {
          border-left-color: #2ecc71;
        }
        .recommendation {
          background-color: #f0f9ff;
          border-left: 4px solid #3498db;
          padding: 10px 15px;
          margin-bottom: 15px;
        }
        .footer {
          text-align: center;
          font-size: 0.8em;
          color: #7f8c8d;
          margin-top: 50px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>CAD分析报告</h1>
        <p>生成日期: ${new Date().toLocaleDateString()}</p>
      </div>
      
      <div class="section">
        <h2>文件信息</h2>
        <div class="metadata">
          <div class="metadata-item">
            <strong>文件名:</strong> ${cadResult.fileName}
          </div>
          <div class="metadata-item">
            <strong>文件类型:</strong> ${cadResult.fileType.toUpperCase()}
          </div>
          <div class="metadata-item">
            <strong>文件大小:</strong> ${formatFileSize(cadResult.fileSize)}
          </div>
          <div class="metadata-item">
            <strong>创建工具:</strong> ${cadResult.metadata?.software || '未知'}
          </div>
          <div class="metadata-item">
            <strong>作者:</strong> ${cadResult.metadata?.author || '未知'}
          </div>
          <div class="metadata-item">
            <strong>创建日期:</strong> ${cadResult.metadata?.createdAt || '未知'}
          </div>
        </div>
      </div>
      
      <div class="section">
        <h2>几何分析</h2>
        <table>
          <thead>
            <tr>
              <th>实体类型</th>
              <th>数量</th>
            </tr>
          </thead>
          <tbody>
            ${Object.entries(cadResult.entities)
              .filter(([_, count]) => count > 0)
              .map(([type, count]) => `
                <tr>
                  <td>${formatEntityType(type)}</td>
                  <td>${count}</td>
                </tr>
              `).join('')}
          </tbody>
        </table>
        
        <h3>尺寸信息</h3>
        <div class="metadata">
          <div class="metadata-item">
            <strong>宽度:</strong> ${cadResult.dimensions.width} ${cadResult.dimensions.unit}
          </div>
          <div class="metadata-item">
            <strong>高度:</strong> ${cadResult.dimensions.height} ${cadResult.dimensions.unit}
          </div>
          ${cadResult.dimensions.depth ? `
            <div class="metadata-item">
              <strong>深度:</strong> ${cadResult.dimensions.depth} ${cadResult.dimensions.unit}
            </div>
          ` : ''}
        </div>
        
        <h3>图层信息</h3>
        <p>此图纸包含 ${cadResult.layers.length} 个图层</p>
        <table>
          <thead>
            <tr>
              <th>图层名称</th>
            </tr>
          </thead>
          <tbody>
            ${Array.isArray(cadResult.layers) ? cadResult.layers.map((layer: any) => `
              <tr>
                <td>${typeof layer === 'string' ? layer : (layer?.name || '')}</td>
              </tr>
            `).join('') : ''}
          </tbody>
        </table>
      </div>
  `;
  
  // 添加AI分析结果
  if (aiResult) {
    html += `
      <div class="section">
        <h2>AI增强分析</h2>
        ${typeof aiResult.confidenceScore === 'number' ? `<div class="metadata-item"><strong>信心分数:</strong> ${(aiResult.confidenceScore * 100).toFixed(1)}%</div>` : ''}
        
        <h3>总体摘要</h3>
        <p>${aiResult.summary}</p>
        
        <h3>专业领域见解</h3>
        <p>${aiResult.categorySpecificInsights}</p>
        
        ${aiResult.technicalAnalysis?.technicalIssues?.length ? `
          <h3>技术问题分析</h3>
          ${aiResult.technicalAnalysis.technicalIssues.map((issue: any) => `
            <div class="issue ${issue.severity ? `issue-${issue.severity}` : 'issue-medium'}">
              <h4>${issue.category}</h4>
              <p>${issue.description}</p>
              <p><strong>影响:</strong> ${issue.impact}</p>
            </div>
          `).join('')}
        ` : ''}
        
        ${(aiResult.optimizationSuggestions as any)?.workflowImprovements && (aiResult.optimizationSuggestions as any).workflowImprovements.length ? `
          <h3>优化建议</h3>
          ${(aiResult.optimizationSuggestions as any).workflowImprovements.map((improvement: any) => `
            <div class="recommendation">
              <p>${improvement}</p>
            </div>
          `).join('')}
        ` : ''}
      </div>
    `;
  }
  
  // 添加验证结果
  if (validationResult) {
    html += `
      <div class="section">
        <h2>设计验证</h2>
        
        ${validationResult.passed ? `
          <div style="background-color: #e6ffe6; padding: 15px; border-radius: 5px;">
            <p><strong>✓ 验证通过</strong> - 得分: ${validationResult.score}/100</p>
          </div>
        ` : `
          <div style="background-color: #ffe6e6; padding: 15px; border-radius: 5px;">
            <p><strong>✗ 验证失败</strong> - 得分: ${validationResult.score}/100</p>
          </div>
        `}
        
        <p>${validationResult.summary}</p>
        
        ${validationResult.issues.length > 0 ? `
          <h3>发现的问题</h3>
          ${validationResult.issues.map(issue => `
            <div class="issue issue-${issue.severity}">
              <h4>${issue.title}</h4>
              <p>${issue.description}</p>
              ${issue.recommendation ? `<p><strong>建议:</strong> ${issue.recommendation}</p>` : ''}
            </div>
          `).join('')}
        ` : ''}
      </div>
    `;
  }
  
  // 添加页脚
  html += `
      <div class="footer">
        <p>报告生成于 ${new Date().toLocaleString()}</p>
      </div>
    </body>
    </html>
  `;
  
  return new Blob([html], { type: 'text/html' });
}

/**
 * 生成JSON报告
 */
function generateJSONReport(
  cadResult: CADAnalysisResult,
  aiResult?: AIMultimodalAnalysisResult,
  validationResult?: ValidationResult,
  options?: any
): Promise<Blob> {
  // 创建报告对象
  const report = {
    meta: {
      generatedAt: new Date().toISOString(),
      reportVersion: '1.0.0',
      reportOptions: options
    },
    fileInfo: {
      id: cadResult.id,
      fileName: cadResult.fileName,
      fileType: cadResult.fileType,
      fileSize: cadResult.fileSize,
      dimensions: cadResult.dimensions,
      metadata: cadResult.metadata
    },
    geometryAnalysis: {
      entities: cadResult.entities,
      layers: cadResult.layers,
      totalEntityCount: Object.values(cadResult.entities).reduce((sum, count) => sum + count, 0)
    }
  };
  
  // 添加设备信息
  if (cadResult.devices && cadResult.devices.length > 0) {
    Object.assign(report, {
      deviceAnalysis: {
        deviceCount: cadResult.devices.length,
        devices: cadResult.devices
      }
    });
  }
  
  // 添加布线信息
  if (cadResult.wiring && cadResult.wiring.details.length > 0) {
    Object.assign(report, {
      wiringAnalysis: cadResult.wiring
    });
  }
  
  // 添加AI分析
  if (aiResult) {
    Object.assign(report, {
      aiAnalysis: aiResult
    });
  }
  
  // 添加验证结果
  if (validationResult) {
    Object.assign(report, {
      validationResults: validationResult
    });
  }
  
  return Promise.resolve(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }));
}

/**
 * 获取内容类型
 */
function getContentType(format: any): string {
  switch (format) {
    case 'pdf': return 'application/pdf';
    case 'html': return 'text/html';
    case 'json': return 'application/json';
    default: return 'application/octet-stream';
  }
}

/**
 * 将文本拆分为行以适应宽度
 */
function splitTextToLines(text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (testLine.length <= maxWidth) {
      currentLine = testLine;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  return lines;
}

/**
 * 格式化文件大小
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}

/**
 * 格式化实体类型名称
 */
function formatEntityType(type: string): string {
  // 将蛇形命名转为空格分隔的首字母大写格式
  return type
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
} 