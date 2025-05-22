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

// 错误边界组件
export function createErrorBoundary(Component: React.ComponentType<any>) {
  return class ErrorBoundary extends React.Component<any, { hasError: boolean; error: Error | null }> {
    constructor(props: any) {
      super(props);
      this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error) {
      return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
      captureException(error);
    }

    render() {
      if (this.state.hasError) {
        return (
          <div className="error-boundary-container">
            <h2>出现了一些问题</h2>
            <p>请刷新页面或联系管理员</p>
            <button onClick={() => this.setState({ hasError: false, error: null })}>
              重试
            </button>
          </div>
        );
      }

      return <Component {...this.props} />;
    }
  };
} 