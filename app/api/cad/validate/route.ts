import { NextRequest, NextResponse } from 'next/server';

import { cadMetrics } from '@/lib/services/cad-analyzer/metrics';
import type { ValidationOptions, ValidationResult } from '@/lib/services/cad-analyzer/validation';
import { validateCADDesignBasic } from '@/lib/services/cad-analyzer/validation';
import type { CADAnalysisResult } from '@/lib/types/cad';

/**
 * CAD设计验证API端点
 * 接收CAD分析结果，验证其是否符合设计标准和规范
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  try {
    const data = await request.json();
    const { cadResult, options } = data;
    
    // 验证请求数据
    if (!cadResult) {
      return NextResponse.json(
        { error: 'Missing CAD result data' },
        { status: 400 }
      );
    }
    
    // 记录API调用
    cadMetrics.record('api_call_count', 1, 'count', {
      endpoint: 'validate',
      fileType: cadResult.fileType || 'unknown'
    });
    
    // 执行验证
    let validationResult: ValidationResult;
    
    if (process.env.USE_EXTERNAL_VALIDATION_SERVICE === 'true') {
      // 调用外部验证服务
      validationResult = await callExternalValidationService(cadResult, options);
    } else {
      // 使用内置验证逻辑
      validationResult = validateCADDesignBasic(cadResult);
    }
    
    // 记录处理时间
    const duration = Date.now() - startTime;
    cadMetrics.record('validation_duration', duration, 'ms', {
      fileType: cadResult.fileType || 'unknown',
      passed: validationResult.passed.toString()
    });
    
    return NextResponse.json(validationResult);
  } catch (error) {
    console.error('CAD验证失败:', error);
    
    // 记录错误
    cadMetrics.record('error_count', 1, 'count', {
      error: error instanceof Error ? error.message : String(error),
      endpoint: 'validate'
    });
    
    return NextResponse.json(
      { error: 'Failed to validate CAD design', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/**
 * 调用外部验证服务
 */
async function callExternalValidationService(
  cadResult: CADAnalysisResult,
  options?: ValidationOptions
): Promise<ValidationResult> {
  try {
    // 构建请求体
    const requestBody = {
      cadData: cadResult,
      options: options || {}
    };
    
    // 调用外部验证服务
    const response = await fetch(process.env.EXTERNAL_VALIDATION_SERVICE_URL || 'http://localhost:5000/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.EXTERNAL_VALIDATION_SERVICE_KEY || ''}`
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`External validation service error: ${response.status} ${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('外部验证服务调用失败:', error);
    
    // 如果外部服务失败，回退到基本验证
    return validateCADDesignBasic(cadResult);
  }
} 