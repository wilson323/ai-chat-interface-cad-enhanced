/**
 * 全局错误处理器
 * 提供统一的错误处理机制和错误类型
 */

// 标准API错误代码枚举
export enum ApiErrorCode {
  // 客户端错误 (4xx)
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  
  // 服务器错误 (5xx)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  GATEWAY_TIMEOUT = 'GATEWAY_TIMEOUT',
  
  // 特定业务错误
  CHAT_ENGINE_ERROR = 'CHAT_ENGINE_ERROR',
  REDIS_ERROR = 'REDIS_ERROR',
  FILE_PROCESSING_ERROR = 'FILE_PROCESSING_ERROR',
  AI_SERVICE_ERROR = 'AI_SERVICE_ERROR',
}

// API错误响应结构
export interface ApiErrorResponse {
  code: ApiErrorCode;
  message: string;
  details?: unknown;
  timestamp: string;
  path?: string;
  requestId?: string;
}

// 自定义API错误类
export class ApiError extends Error {
  public readonly code: ApiErrorCode;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(
    code: ApiErrorCode,
    message: string,
    statusCode: number = 500,
    details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }

  // 常用错误的静态工厂方法
  static badRequest(message: string, details?: unknown): ApiError {
    return new ApiError(ApiErrorCode.BAD_REQUEST, message, 400, details);
  }

  static unauthorized(message: string = '未授权访问', details?: unknown): ApiError {
    return new ApiError(ApiErrorCode.UNAUTHORIZED, message, 401, details);
  }

  static forbidden(message: string = '权限不足', details?: unknown): ApiError {
    return new ApiError(ApiErrorCode.FORBIDDEN, message, 403, details);
  }

  static notFound(message: string = '资源不存在', details?: unknown): ApiError {
    return new ApiError(ApiErrorCode.NOT_FOUND, message, 404, details);
  }

  static tooManyRequests(message: string = '请求频率过高', details?: unknown): ApiError {
    return new ApiError(ApiErrorCode.TOO_MANY_REQUESTS, message, 429, details);
  }

  static internalError(message: string = '服务器内部错误', details?: unknown): ApiError {
    return new ApiError(ApiErrorCode.INTERNAL_ERROR, message, 500, details);
  }

  static serviceUnavailable(message: string = '服务暂时不可用', details?: unknown): ApiError {
    return new ApiError(ApiErrorCode.SERVICE_UNAVAILABLE, message, 503, details);
  }

  // 将错误转换为标准响应格式
  toResponse(path?: string, requestId?: string): ApiErrorResponse {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: new Date().toISOString(),
      path,
      requestId
    };
  }
}

// 错误处理中间件（用于API路由）
export function errorHandler(error: unknown, path?: string): ApiErrorResponse {
  // 生成请求ID
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  
  // 如果是已知的API错误，直接返回格式化响应
  if (error instanceof ApiError) {
    return error.toResponse(path, requestId);
  }
  
  // 处理其他类型的错误
  console.error(`[${requestId}] Unhandled error:`, error);
  
  // 转换为通用错误
  const apiError = new ApiError(
    ApiErrorCode.INTERNAL_ERROR,
    error instanceof Error ? error.message : '发生未知错误',
    500,
    process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : String(error)) : undefined
  );
  
  return apiError.toResponse(path, requestId);
}

// 错误处理实用函数
export function handleAsyncError<T>(
  fn: () => Promise<T>,
  path?: string
): Promise<T> {
  return fn().catch((error) => {
    const errorResponse = errorHandler(error, path);
    
    // 记录错误日志
    console.error(`[${errorResponse.requestId}] Error in ${path || 'unknown'}:`, errorResponse);
    
    // 根据环境重新抛出错误或返回统一格式
    if (process.env.NODE_ENV === 'development') {
      throw error;
    } else {
      throw new ApiError(
        errorResponse.code,
        errorResponse.message,
        (error instanceof ApiError) ? error.statusCode : 500,
        errorResponse.details
      );
    }
  });
} 