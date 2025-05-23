import { NextRequest, NextResponse } from 'next/server';
import { getAnalysisResult } from '@/lib/services/cad-analyzer/controller';
import { CADAnalysisResult, AIMultimodalAnalysisResult, DomainSpecificAnalysis } from '@/lib/types/cad';
import { CAD_FILE_TYPE_MAP } from '@/lib/services/cad-analyzer/cad-analyzer-service';

/**
 * 生成HTML格式的CAD分析报告
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('id');
    
    if (!fileId) {
      return NextResponse.json({ error: '缺少文件ID' }, { status: 400 });
    }
    
    // 获取分析结果
    const analysisResult = getAnalysisResult(fileId);
    if (!analysisResult) {
      return NextResponse.json({ error: '未找到分析结果' }, { status: 404 });
    }
    
    // 生成HTML报告
    const html = generateHTMLReport(analysisResult);
    
    // 设置响应头
    const headers = new Headers();
    headers.set('Content-Type', 'text/html');
    headers.set('Content-Disposition', `inline; filename="cad-report-${fileId}.html"`);
    
    return new NextResponse(html, {
      status: 200,
      headers
    });
  } catch (error) {
    console.error('生成HTML报告失败:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : '生成报告失败'
    }, { status: 500 });
  }
}

/**
 * 接收POST请求，基于请求体中的数据生成报告
 */
export async function POST(request: NextRequest) {
  try {
    // 解析请求体
    const body = await request.json();
    const { result, aiResult, domainResult, options } = body;
    
    if (!result) {
      return NextResponse.json({ error: '缺少分析结果数据' }, { status: 400 });
    }
    
    // 生成HTML报告
    const html = generateHTMLReport(
      result as CADAnalysisResult, 
      aiResult as AIMultimodalAnalysisResult, 
      domainResult as DomainSpecificAnalysis,
      options
    );
    
    // 返回HTML内容
    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html'
      }
    });
  } catch (error) {
    console.error('生成HTML报告失败:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : '生成报告失败'
    }, { status: 500 });
  }
}

/**
 * 生成HTML格式的报告
 */
function generateHTMLReport(
  result: CADAnalysisResult,
  aiResult?: AIMultimodalAnalysisResult,
  domainResult?: DomainSpecificAnalysis,
  options?: any
): string {
  // 获取文件类型显示名称
  const fileTypeDisplay = CAD_FILE_TYPE_MAP[result.fileType] || result.fileType;
  
  // 格式化实体数据
  const entitiesHtml = Object.entries(result.entities || {})
    .map(([key, value]) => `
      <tr>
        <td>${key}</td>
        <td>${value}</td>
      </tr>
    `).join('');
  
  // 格式化图层数据
  const layersHtml = (result.layers || [])
    .map(layer => `
      <tr>
        <td>${layer.name}</td>
        <td>${layer.color || 'N/A'}</td>
        <td>${layer.entityCount || 0}</td>
      </tr>
    `).join('');
  
  // 格式化AI分析结果
  let aiAnalysisHtml = '';
  if (aiResult) {
    const observationsHtml = (aiResult.observations || [])
      .map(obs => `<li>${obs}</li>`)
      .join('');
    
    const recommendationsHtml = (aiResult.recommendations || [])
      .map(rec => `<li>${rec}</li>`)
      .join('');
    
    const issuesHtml = (aiResult.issues || [])
      .map(issue => `
        <div class="issue-card">
          <h4>${issue.title}</h4>
          <p><strong>描述:</strong> ${issue.description}</p>
          <p><strong>严重程度:</strong> ${issue.severity}</p>
          ${issue.solution ? `<p><strong>解决方案:</strong> ${issue.solution}</p>` : ''}
        </div>
      `)
      .join('');
    
    const componentsHtml = (aiResult.components || [])
      .map(comp => `
        <tr>
          <td>${comp.name}</td>
          <td>${comp.description}</td>
          <td>${comp.count}</td>
        </tr>
      `)
      .join('');
    
    const materialsHtml = (aiResult.materialEstimation || [])
      .map(mat => `
        <tr>
          <td>${mat.material}</td>
          <td>${mat.amount} ${mat.unit}</td>
        </tr>
      `)
      .join('');
    
    aiAnalysisHtml = `
      <div class="report-section ai-analysis">
        <h2>AI分析结果</h2>
        
        <div class="summary-card">
          <h3>总结</h3>
          <p>${aiResult.summary}</p>
          
          ${aiResult.manufacturingDifficulty ? `
            <div class="difficulty-rating">
              <h4>制造难度: ${aiResult.manufacturingDifficulty.level}</h4>
              <p>${aiResult.manufacturingDifficulty.explanation}</p>
            </div>
          ` : ''}
        </div>
        
        <div class="observations">
          <h3>观察结果</h3>
          <ul>${observationsHtml}</ul>
        </div>
        
        ${recommendationsHtml ? `
          <div class="recommendations">
            <h3>建议</h3>
            <ul>${recommendationsHtml}</ul>
          </div>
        ` : ''}
        
        ${issuesHtml ? `
          <div class="issues">
            <h3>发现的问题</h3>
            <div class="issues-grid">${issuesHtml}</div>
          </div>
        ` : ''}
        
        ${componentsHtml ? `
          <div class="components">
            <h3>识别的组件</h3>
            <table class="data-table">
              <thead>
                <tr>
                  <th>名称</th>
                  <th>描述</th>
                  <th>数量</th>
                </tr>
              </thead>
              <tbody>
                ${componentsHtml}
              </tbody>
            </table>
          </div>
        ` : ''}
        
        ${materialsHtml ? `
          <div class="materials">
            <h3>材料估算</h3>
            <table class="data-table">
              <thead>
                <tr>
                  <th>材料</th>
                  <th>用量</th>
                </tr>
              </thead>
              <tbody>
                ${materialsHtml}
              </tbody>
            </table>
          </div>
        ` : ''}
        
        <div class="analysis-meta">
          <p>分析版本: ${aiResult.analysisVersion || '1.0'}</p>
          <p>分析时间: ${new Date(aiResult.analysisTimestamp || Date.now()).toLocaleString()}</p>
        </div>
      </div>
    `;
  }
  
  // 格式化领域分析结果
  let domainAnalysisHtml = '';
  if (domainResult) {
    const insightsHtml = (domainResult.insights || [])
      .map(insight => `
        <div class="insight-card">
          <h4>${insight.title}</h4>
          <p>${insight.description}</p>
          <div class="confidence-bar" style="--confidence: ${insight.confidence * 100}%;">
            <span>置信度: ${Math.round(insight.confidence * 100)}%</span>
          </div>
          ${insight.reference ? `<p class="reference">参考: ${insight.reference}</p>` : ''}
        </div>
      `)
      .join('');
    
    const standardsHtml = (domainResult.standards || [])
      .map(std => `
        <tr>
          <td>${std.name}</td>
          <td class="compliance-${std.compliance}">
            ${std.compliance === 'compliant' ? '符合' : 
              std.compliance === 'non-compliant' ? '不符合' : 
              std.compliance === 'warning' ? '警告' : '不适用'}
          </td>
          <td>${std.details}</td>
        </tr>
      `)
      .join('');
    
    const metricsHtml = Object.entries(domainResult.metrics || {})
      .map(([key, value]) => `
        <tr>
          <td>${key}</td>
          <td>${value}</td>
        </tr>
      `)
      .join('');
    
    const recommendationsHtml = (domainResult.expertRecommendations || [])
      .map(rec => `<li>${rec}</li>`)
      .join('');
    
    domainAnalysisHtml = `
      <div class="report-section domain-analysis">
        <h2>${getDomainDisplayName(domainResult.domain)}专业分析</h2>
        
        <div class="insights">
          <h3>专业见解</h3>
          <div class="insights-grid">${insightsHtml}</div>
        </div>
        
        ${standardsHtml ? `
          <div class="standards">
            <h3>标准合规性</h3>
            <table class="data-table">
              <thead>
                <tr>
                  <th>标准</th>
                  <th>合规状态</th>
                  <th>详情</th>
                </tr>
              </thead>
              <tbody>
                ${standardsHtml}
              </tbody>
            </table>
          </div>
        ` : ''}
        
        ${metricsHtml ? `
          <div class="metrics">
            <h3>关键指标</h3>
            <table class="data-table">
              <thead>
                <tr>
                  <th>指标</th>
                  <th>值</th>
                </tr>
              </thead>
              <tbody>
                ${metricsHtml}
              </tbody>
            </table>
          </div>
        ` : ''}
        
        ${recommendationsHtml ? `
          <div class="expert-recommendations">
            <h3>专家建议</h3>
            <ul>${recommendationsHtml}</ul>
          </div>
        ` : ''}
      </div>
    `;
  }
  
  // 主HTML模板
  return `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>CAD分析报告 - ${result.fileName}</title>
      <style>
        :root {
          --primary-color: #2563eb;
          --secondary-color: #4f46e5;
          --accent-color: #f59e0b;
          --text-color: #334155;
          --background-color: #ffffff;
          --card-background: #f8fafc;
          --success-color: #10b981;
          --warning-color: #f59e0b;
          --error-color: #ef4444;
          --info-color: #3b82f6;
        }
        
        @media (prefers-color-scheme: dark) {
          :root {
            --primary-color: #3b82f6;
            --secondary-color: #6366f1;
            --accent-color: #f59e0b;
            --text-color: #e2e8f0;
            --background-color: #1e293b;
            --card-background: #0f172a;
            --success-color: #10b981;
            --warning-color: #f59e0b;
            --error-color: #ef4444;
            --info-color: #3b82f6;
          }
        }
        
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        
        body {
          font-family: 'Segoe UI', 'Arial', sans-serif;
          line-height: 1.6;
          color: var(--text-color);
          background-color: var(--background-color);
          padding: 0;
        }
        
        .report-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
        }
        
        .report-header {
          border-bottom: 2px solid var(--primary-color);
          padding-bottom: 1rem;
          margin-bottom: 2rem;
        }
        
        .report-header h1 {
          color: var(--primary-color);
          font-size: 2rem;
          margin-bottom: 0.5rem;
        }
        
        .file-info {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
          background-color: var(--card-background);
          padding: 1.5rem;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        
        .file-info-item {
          display: flex;
          flex-direction: column;
        }
        
        .file-info-item label {
          font-weight: bold;
          font-size: 0.9rem;
          color: var(--primary-color);
          margin-bottom: 0.25rem;
        }
        
        .file-info-item span {
          font-size: 1.1rem;
        }
        
        .report-section {
          margin-bottom: 2.5rem;
          padding: 1.5rem;
          background-color: var(--card-background);
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        
        .report-section h2 {
          color: var(--primary-color);
          font-size: 1.5rem;
          margin-bottom: 1.2rem;
          border-bottom: 1px solid var(--primary-color);
          padding-bottom: 0.5rem;
        }
        
        .report-section h3 {
          color: var(--secondary-color);
          font-size: 1.25rem;
          margin: 1.2rem 0 0.8rem 0;
        }
        
        .data-table {
          width: 100%;
          border-collapse: collapse;
          margin: 1rem 0;
        }
        
        .data-table th, .data-table td {
          padding: 0.75rem;
          text-align: left;
          border-bottom: 1px solid #ddd;
        }
        
        .data-table th {
          background-color: rgba(0, 0, 0, 0.05);
          font-weight: bold;
          color: var(--primary-color);
        }
        
        .data-table tr:nth-child(even) {
          background-color: rgba(0, 0, 0, 0.02);
        }
        
        .thumbnail-container {
          text-align: center;
          margin: 1.5rem 0;
        }
        
        .thumbnail-container img {
          max-width: 100%;
          max-height: 400px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        
        .issues-grid, .insights-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1rem;
          margin: 1rem 0;
        }
        
        .issue-card, .insight-card {
          padding: 1rem;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          background-color: rgba(0, 0, 0, 0.02);
        }
        
        .issue-card h4, .insight-card h4 {
          color: var(--secondary-color);
          margin-bottom: 0.5rem;
        }
        
        .confidence-bar {
          margin-top: 0.5rem;
          height: 8px;
          width: 100%;
          background-color: #e2e8f0;
          border-radius: 4px;
          overflow: hidden;
          position: relative;
        }
        
        .confidence-bar::before {
          content: '';
          position: absolute;
          height: 100%;
          width: var(--confidence, 0%);
          background-color: var(--success-color);
          border-radius: 4px;
        }
        
        .confidence-bar span {
          display: block;
          font-size: 0.8rem;
          margin-top: 0.25rem;
        }
        
        .compliance-compliant {
          color: var(--success-color);
          font-weight: bold;
        }
        
        .compliance-warning {
          color: var(--warning-color);
          font-weight: bold;
        }
        
        .compliance-non-compliant {
          color: var(--error-color);
          font-weight: bold;
        }
        
        .compliance-not-applicable {
          color: var(--text-color);
          opacity: 0.6;
        }
        
        .summary-card {
          padding: 1.5rem;
          background-color: rgba(0, 0, 0, 0.02);
          border-radius: 8px;
          margin-bottom: 1.5rem;
        }
        
        .difficulty-rating {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid rgba(0, 0, 0, 0.1);
        }
        
        .analysis-meta {
          margin-top: 2rem;
          padding-top: 1rem;
          border-top: 1px solid rgba(0, 0, 0, 0.1);
          font-size: 0.9rem;
          color: var(--text-color);
          opacity: 0.8;
        }
        
        .report-footer {
          text-align: center;
          margin-top: 2rem;
          padding-top: 1rem;
          border-top: 1px solid rgba(0, 0, 0, 0.1);
          font-size: 0.9rem;
          color: var(--text-color);
          opacity: 0.8;
        }
        
        @media print {
          body {
            background-color: white;
            color: black;
          }
          
          .report-container {
            max-width: none;
            padding: 0;
          }
          
          .report-section, .file-info {
            break-inside: avoid;
            box-shadow: none;
            border: 1px solid #ddd;
          }
        }
      </style>
    </head>
    <body>
      <div class="report-container">
        <div class="report-header">
          <h1>CAD分析报告</h1>
          <p>生成时间: ${new Date().toLocaleString()}</p>
        </div>
        
        <div class="file-info">
          <div class="file-info-item">
            <label>文件名</label>
            <span>${result.fileName}</span>
          </div>
          
          <div class="file-info-item">
            <label>文件类型</label>
            <span>${fileTypeDisplay}</span>
          </div>
          
          <div class="file-info-item">
            <label>文件大小</label>
            <span>${formatFileSize(result.fileSize)}</span>
          </div>
          
          <div class="file-info-item">
            <label>分析时间</label>
            <span>${new Date(result.analysisTime || Date.now()).toLocaleString()}</span>
          </div>
          
          <div class="file-info-item">
            <label>处理用时</label>
            <span>${result.processingTimeMs ? `${result.processingTimeMs}ms` : 'N/A'}</span>
          </div>
        </div>
        
        ${result.thumbnail ? `
          <div class="thumbnail-container">
            <h2>模型预览</h2>
            <img src="${result.thumbnail}" alt="CAD模型预览" />
          </div>
        ` : ''}
        
        <div class="report-section basic-info">
          <h2>基本信息</h2>
          
          <h3>尺寸信息</h3>
          <table class="data-table">
            <tr>
              <th>宽度</th>
              <td>${result.dimensions.width} ${result.dimensions.unit}</td>
            </tr>
            <tr>
              <th>高度</th>
              <td>${result.dimensions.height} ${result.dimensions.unit}</td>
            </tr>
            ${result.dimensions.depth !== undefined ? `
              <tr>
                <th>深度</th>
                <td>${result.dimensions.depth} ${result.dimensions.unit}</td>
              </tr>
            ` : ''}
          </table>
          
          <h3>实体统计</h3>
          <table class="data-table">
            <thead>
              <tr>
                <th>类型</th>
                <th>数量</th>
              </tr>
            </thead>
            <tbody>
              ${entitiesHtml || '<tr><td colspan="2">无实体数据</td></tr>'}
            </tbody>
          </table>
          
          <h3>图层信息</h3>
          <table class="data-table">
            <thead>
              <tr>
                <th>名称</th>
                <th>颜色</th>
                <th>实体数量</th>
              </tr>
            </thead>
            <tbody>
              ${layersHtml || '<tr><td colspan="3">无图层数据</td></tr>'}
            </tbody>
          </table>
        </div>
        
        ${aiAnalysisHtml || ''}
        
        ${domainAnalysisHtml || ''}
        
        <div class="report-footer">
          <p>本报告由AI-CAD解读引擎自动生成</p>
          <p>© ${new Date().getFullYear()} CAD解读智能体</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * 格式化文件大小
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return bytes + ' bytes';
  } else if (bytes < 1024 * 1024) {
    return (bytes / 1024).toFixed(2) + ' KB';
  } else if (bytes < 1024 * 1024 * 1024) {
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  } else {
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  }
}

/**
 * 获取领域名称的显示值
 */
function getDomainDisplayName(domain: string): string {
  const domainMap: Record<string, string> = {
    'mechanical': '机械工程',
    'architectural': '建筑工程',
    'electrical': '电气工程',
    'plumbing': '管道工程'
  };
  
  return domainMap[domain] || domain;
} 