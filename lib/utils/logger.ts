/**
 * 生产级日志管理系统
 * 统一管理所有日志输出，支持分级、过滤和格式化
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

interface LogContext {
  module?: string;
  function?: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  [key: string]: unknown;
}

interface LogMessage {
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: Error;
  timestamp: Date;
}

class Logger {
  private static instance: Logger;
  private minLevel: LogLevel;
  private isProduction: boolean;
  private logQueue: LogMessage[] = [];
  private maxQueueSize = 1000;

  private constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.minLevel = this.isProduction ? LogLevel.WARN : LogLevel.DEBUG;
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.minLevel;
  }

  private formatMessage(msg: LogMessage): string {
    const timestamp = msg.timestamp.toISOString();
    const levelName = LogLevel[msg.level];
    const context = msg.context ? JSON.stringify(msg.context) : '';
    const error = msg.error ? `\nError: ${msg.error.message}\nStack: ${msg.error.stack}` : '';
    
    return `[${timestamp}] [${levelName}] ${msg.message} ${context}${error}`;
  }

  private log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    if (!this.shouldLog(level)) return;

    const logMessage: LogMessage = {
      level,
      message,
      context,
      error,
      timestamp: new Date()
    };

    // 在生产环境中只记录到队列，不直接输出到控制台
    if (this.isProduction) {
      this.addToQueue(logMessage);
      
      // 只有错误和致命错误才输出到控制台
      if (level >= LogLevel.ERROR) {
        console.error(this.formatMessage(logMessage));
      }
    } else {
      // 开发环境直接输出
      const formatted = this.formatMessage(logMessage);
      switch (level) {
        case LogLevel.DEBUG:
          console.debug(formatted);
          break;
        case LogLevel.INFO:
          console.info(formatted);
          break;
        case LogLevel.WARN:
          console.warn(formatted);
          break;
        case LogLevel.ERROR:
        case LogLevel.FATAL:
          console.error(formatted);
          break;
      }
    }
  }

  private addToQueue(msg: LogMessage): void {
    this.logQueue.push(msg);
    if (this.logQueue.length > this.maxQueueSize) {
      this.logQueue.shift(); // 移除最旧的日志
    }
  }

  // 公共方法
  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: LogContext, error?: Error): void {
    this.log(LogLevel.WARN, message, context, error);
  }

  error(message: string, context?: LogContext, error?: Error): void {
    this.log(LogLevel.ERROR, message, context, error);
  }

  fatal(message: string, context?: LogContext, error?: Error): void {
    this.log(LogLevel.FATAL, message, context, error);
  }

  // 获取日志队列（用于监控面板）
  getLogs(count?: number): LogMessage[] {
    return count ? this.logQueue.slice(-count) : [...this.logQueue];
  }

  // 清空日志队列
  clearLogs(): void {
    this.logQueue = [];
  }

  // 设置日志级别
  setLevel(level: LogLevel): void {
    this.minLevel = level;
  }
}

// 导出单例实例
export const logger = Logger.getInstance();

// 便捷方法
export const log = {
  debug: (message: string, context?: LogContext) => logger.debug(message, context),
  info: (message: string, context?: LogContext) => logger.info(message, context),
  warn: (message: string, context?: LogContext, error?: Error) => logger.warn(message, context, error),
  error: (message: string, context?: LogContext, error?: Error) => logger.error(message, context, error),
  fatal: (message: string, context?: LogContext, error?: Error) => logger.fatal(message, context, error),
}; 