export interface HttpAgentOptions {
  url: string
  headers?: Record<string, string>
}

export class HttpAgent {
  constructor(private config: HttpAgentOptions) {}

  async runAgent(params: {
    forwardedProps: {
      formData: FormData
    }
  }): Promise<{ state: { analysisResult: any } }> {
    const response = await fetch(this.config.url, {
      method: 'POST',
      headers: this.config.headers,
      body: params.forwardedProps.formData
    })
    
    if (!response.ok) {
      throw new Error(`请求失败: ${response.statusText}`)
    }
    
    return {
      state: {
        analysisResult: await response.json()
      }
    }
  }
} 