"use client"

import React from "react"

// 这个文件配置Monaco编辑器的Web Worker
// 解决"You must define a function MonacoEnvironment.getWorkerUrl or MonacoEnvironment.getWorker"错误

export function setupMonacoEnvironment(): void {
  // 定义全局Monaco环境
  (window as any).MonacoEnvironment = {
    getWorkerUrl: (_moduleId: string, label: string) => {
      // 根据语言类型返回不同的worker
      if (label === "json") {
        return "/monaco-editor-workers/json.worker.js"
      }
      if (label === "css" || label === "scss" || label === "less") {
        return "/monaco-editor-workers/css.worker.js"
      }
      if (label === "html" || label === "handlebars" || label === "razor") {
        return "/monaco-editor-workers/html.worker.js"
      }
      if (label === "typescript" || label === "javascript") {
        return "/monaco-editor-workers/ts.worker.js"
      }
      return "/monaco-editor-workers/editor.worker.js"
    },
  }
}

// 创建一个组件来初始化Monaco环境
export function MonacoEnvironment() {
  // 在客户端组件挂载时设置Monaco环境
  React.useEffect(() => {
    setupMonacoEnvironment()
  }, [])

  return null // 这个组件不渲染任何内容
}
