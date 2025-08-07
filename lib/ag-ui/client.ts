/**
 * @fileoverview Provides a client-side implementation for the AG-UI protocol.
 * @file_zh-CN: 提供AG-UI协议的客户端实现。
 *
 * This file contains a simplified HttpAgent for handling AG-UI protocol on the client.
 * It is primarily used by the `use-ag-ui-cad` hook.
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
