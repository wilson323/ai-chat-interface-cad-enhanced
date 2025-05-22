// 创建处理队列实用工具
export function createQueue(options: {
  concurrency: number;
  timeout: number;
}) {
  const { concurrency = 2, timeout = 120_000 } = options;
  const queue: Array<() => Promise<any>> = [];
  let running = 0;

  const runNext = async () => {
    if (queue.length === 0 || running >= concurrency) return;
    
    running++;
    const task = queue.shift()!;
    
    try {
      return await Promise.race([
        task(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('处理超时')), timeout)
        )
      ]);
    } finally {
      running--;
      runNext();
    }
  };

  return {
    add: async <T>(task: () => Promise<T>): Promise<T> => {
      return new Promise((resolve, reject) => {
        queue.push(async () => {
          try {
            const result = await task();
            resolve(result);
            return result;
          } catch (error) {
            reject(error);
            throw error;
          }
        });
        
        if (running < concurrency) {
          runNext();
        }
      });
    }
  };
} 