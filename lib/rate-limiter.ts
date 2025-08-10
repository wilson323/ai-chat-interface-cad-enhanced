// 简易速率限制器占位实现（可扩展为基于内存/Redis令牌桶）
export const rateLimiter = {
  async limit(identifier: string): Promise<{ success: boolean }> {
    void identifier
    return { success: true }
  }
}


