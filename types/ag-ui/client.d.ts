declare module '@ag-ui/client' {
  export class HttpAgent {
    constructor(config: {
      url: string
      headers?: Record<string, string>
    })
    
    runAgent(params: {
      forwardedProps: {
        formData: FormData
      }
    }): Promise<{
      state: {
        analysisResult: any
      }
    }>
  }
} 