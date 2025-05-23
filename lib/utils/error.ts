// 错误处理工具
interface ErrorWithContext extends Error {
  context?: any;
}

export function captureException(error: Error | ErrorWithContext): void {
  // 记录错误到控制台
  console.error("捕获的错误:", error.message, error.stack);
  
  // 如果有自定义上下文，也记录
  if ('context' in error && error.context) {
    console.error("错误上下文:", error.context);
  }
  
  // 如果在生产环境，发送到错误监控服务
  if (process.env.NODE_ENV === 'production') {
    // 例如：发送到Sentry
    if (typeof window !== 'undefined' && 'Sentry' in window) {
      (window as any).Sentry.captureException(error);
    }
  }
}

// 用户友好错误类
export class UserFriendlyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserFriendlyError';
  }
}

// 错误处理辅助函数
export function handleAsyncError<T>(
  promise: Promise<T>,
  fallbackValue?: T
): Promise<T | undefined> {
  return promise.catch((error) => {
    captureException(error);
    return fallbackValue;
  });
}

// 安全的JSON解析
export function safeJsonParse<T>(jsonString: string, fallback: T): T {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    captureException(error as Error);
    return fallback;
  }
}

// 错误重试机制
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        captureException(lastError);
        throw lastError;
      }
      
      // 指数退避
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
} 