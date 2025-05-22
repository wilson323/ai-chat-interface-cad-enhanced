/**
 * AG-UI服务端运行时 - 提供服务端AG-UI协议支持
 * AG-UI Server Runtime - Provides server-side AG-UI protocol support
 *
 * 本文件提供了一个简化的AgentRuntime实现，用于服务端处理AG-UI协议
 * 调用关系: 被app/api/ag-ui/cad-analysis/route.ts调用
 */

export interface Tool {
  name: string
  description: string
  execute: (params: any) => Promise<any>
}

export interface AgentRuntimeOptions {
  threadId: string
  runId: string
  tools?: Tool[]
}

export class AgentRuntime {
  private threadId: string
  private runId: string
  private tools: Map<string, Tool>
  private state: Record<string, any> = {}

  constructor(options: AgentRuntimeOptions) {
    this.threadId = options.threadId
    this.runId = options.runId
    this.tools = new Map()

    // 注册工具
    if (options.tools) {
      for (const tool of options.tools) {
        this.tools.set(tool.name, tool)
      }
    }
  }

  /**
   * 运行工具
   * Run a tool
   */
  public async runTool(toolName: string, params: any): Promise<any> {
    const tool = this.tools.get(toolName)
    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`)
    }

    try {
      return await tool.execute(params)
    } catch (error) {
      console.error(`Error executing tool ${toolName}:`, error)
      throw error
    }
  }

  /**
   * 更新状态
   * Update state
   */
  public updateState(newState: Record<string, any>): void {
    this.state = {
      ...this.state,
      ...newState,
    }
  }

  /**
   * 获取状态
   * Get state
   */
  public getState(): Record<string, any> {
    return {
      ...this.state,
      threadId: this.threadId,
      runId: this.runId,
    }
  }
}
