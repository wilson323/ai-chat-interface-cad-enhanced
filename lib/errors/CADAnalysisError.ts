// 创建自定义错误类
export class CADAnalysisError extends Error {
  public readonly code: string;
  public readonly severity: 'high' | 'medium' | 'low';

  constructor(params: {
    code: string;
    message: string;
    severity?: 'high' | 'medium' | 'low';
    originalError?: Error;
  }) {
    super(params.message);
    this.code = params.code;
    this.severity = params.severity || 'medium';
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      severity: this.severity
    };
  }
} 