// 创建自定义错误类
export class CADAnalysisError extends Error {
  fileInfo: {
    name: string;
    size: number;
    type: string;
  };

  constructor(options: {
    message: string;
    fileInfo: {
      name: string;
      size: number;
      type: string;
    };
  }) {
    super(options.message);
    this.name = 'CADAnalysisError';
    this.fileInfo = options.fileInfo;
  }
} 