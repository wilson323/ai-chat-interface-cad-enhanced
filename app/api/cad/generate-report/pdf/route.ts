import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import { getAnalysisResult } from '@/lib/services/cad-analyzer/controller';
import { CADAnalysisResult } from '@/lib/types/cad';

/**
 * 生成PDF格式的CAD分析报告
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('id');
    const format = searchParams.get('format') || 'pdf';
    
    if (!fileId) {
      return NextResponse.json({ error: '缺少文件ID' }, { status: 400 });
    }
    
    // 获取分析结果
    const analysisResult = getAnalysisResult(fileId);
    if (!analysisResult) {
      return NextResponse.json({ error: '未找到分析结果' }, { status: 404 });
    }
    
    // 获取HTML报告（通过内部API调用）
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/cad/generate-report/html?id=${fileId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'text/html',
      },
    });
    
    if (!response.ok) {
      throw new Error(`获取HTML报告失败: ${response.status}`);
    }
    
    const htmlReport = await response.text();
    
    // 使用Puppeteer将HTML转换为PDF
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setContent(htmlReport, { waitUntil: 'networkidle0' });
    
    // 设置PDF选项
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm'
      }
    });
    
    await browser.close();
    
    // 设置响应头
    const headers = new Headers();
    headers.set('Content-Type', 'application/pdf');
    headers.set('Content-Disposition', `attachment; filename="cad-report-${fileId}.pdf"`);
    
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers
    });
  } catch (error) {
    console.error('生成PDF报告失败:', error);
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
    
    // 将数据发送到HTML端点以获取HTML报告
    const htmlResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/cad/generate-report/html`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        result,
        aiResult,
        domainResult,
        options
      }),
    });
    
    if (!htmlResponse.ok) {
      throw new Error(`获取HTML报告失败: ${htmlResponse.status}`);
    }
    
    const htmlReport = await htmlResponse.text();
    
    // 使用Puppeteer将HTML转换为PDF
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setContent(htmlReport, { waitUntil: 'networkidle0' });
    
    // 设置PDF选项
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm'
      }
    });
    
    await browser.close();
    
    // 返回PDF内容
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="cad-report-${(result as CADAnalysisResult).fileId || 'report'}.pdf"`
      }
    });
  } catch (error) {
    console.error('生成PDF报告失败:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : '生成报告失败'
    }, { status: 500 });
  }
} 