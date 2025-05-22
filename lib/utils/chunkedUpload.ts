// 分块上传工具
export async function uploadChunked(
  file: File,
  url: string,
  options: {
    chunkSize?: number;
    onProgress?: (progress: number) => void;
    onChunkComplete?: (chunkIndex: number, totalChunks: number) => void;
    retries?: number;
    additionalData?: Record<string, string>;
  } = {}
) {
  const {
    chunkSize = 2 * 1024 * 1024, // 默认2MB分块
    onProgress = () => {},
    onChunkComplete = () => {},
    retries = 3,
    additionalData = {}
  } = options;
  
  // 计算块数
  const totalChunks = Math.ceil(file.size / chunkSize);
  const fileId = Date.now().toString() + '-' + Math.random().toString(36).substring(2, 15);
  
  // 创建分块
  const chunks: Blob[] = [];
  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    chunks.push(file.slice(start, end));
  }
  
  // 上传每个分块
  let uploadedChunks = 0;
  for (let i = 0; i < chunks.length; i++) {
    let attempts = 0;
    let success = false;
    
    while (attempts < retries && !success) {
      try {
        const formData = new FormData();
        formData.append('chunk', chunks[i]);
        formData.append('index', i.toString());
        formData.append('totalChunks', totalChunks.toString());
        formData.append('fileId', fileId);
        formData.append('fileName', file.name);
        
        // 添加额外数据
        Object.entries(additionalData).forEach(([key, value]) => {
          formData.append(key, value);
        });
        
        const response = await fetch(url, {
          method: 'POST',
          body: formData
        });
        
        if (!response.ok) {
          throw new Error(`上传分块失败: ${response.status}`);
        }
        
        success = true;
        uploadedChunks++;
        
        // 回调进度
        onProgress((uploadedChunks / totalChunks) * 100);
        onChunkComplete(i, totalChunks);
      } catch (error) {
        console.error(`上传分块 ${i} 失败 (尝试 ${attempts + 1}/${retries})`, error);
        attempts++;
        
        // 延迟后重试
        if (attempts < retries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
        }
      }
    }
    
    // 如果所有重试都失败了
    if (!success) {
      throw new Error(`上传分块 ${i} 失败，已达到最大重试次数`);
    }
  }
  
  // 完成上传
  const completeResponse = await fetch(`${url}/complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      fileId,
      fileName: file.name,
      totalChunks,
      ...additionalData
    })
  });
  
  if (!completeResponse.ok) {
    throw new Error('完成上传请求失败');
  }
  
  return await completeResponse.json();
} 