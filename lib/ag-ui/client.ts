/**
 * AG-UI客户端 - 提供客户端AG-UI协议支持
 * AG-UI Client - Provides client-side AG-UI protocol support
 *
 * 本文件提供了一个简化的HttpAgent实现，用于客户端处理AG-UI协议
 * 调用关系: 被hooks/use-ag-ui-cad.tsx调用
 */

export interface HttpAgentOptions {
  url: string
  headers?: Record<string, string>
}

export interface RunAgentOptions {
  forwardedProps?: any
}

export class HttpAgent {
  private url: string
  private headers: Record<string, string>

  constructor(options: HttpAgentOptions) {
    this.url = options.url
    this.headers = options.headers || {}
  }

  /**
   * 运行Agent
   * Run agent
   */
  public async runAgent(options: RunAgentOptions = {}): Promise<any> {
    try {
      const response = await fetch(this.url, {
        method: "POST",
        headers: {
          ...this.headers,
        },
        body: options.forwardedProps?.formData,
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP error ${response.status}: ${errorText}`)
      }

      return await response.json()
    } catch (error) {
      console.error("Error running agent:", error)
      throw error
    }
  }
}
