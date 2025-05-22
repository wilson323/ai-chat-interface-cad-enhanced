/**
 * AG-UI适配器工厂 - 创建不同类型的AG-UI适配器
 * AG-UI Adapter Factory - Creates different types of AG-UI adapters
 *
 * 本文件提供了一个工厂函数，用于创建不同类型的AG-UI适配器
 * 调用关系: 可被任何需要创建AG-UI适配器的代码调用
 */

import { AgUICoreAdapter } from "./core-adapter"
import { mergeConfig, type AgUIConfig } from "./config"

export type AdapterType = "core" | "fastgpt" | "openai" | "anthropic" | "custom"

export interface AdapterOptions {
  config?: Partial<AgUIConfig>
  type?: AdapterType
  customAdapter?: any
}

export function createAdapter(options: AdapterOptions = {}): AgUICoreAdapter {
  const config = mergeConfig(options.config)
  const type = options.type || "core"

  switch (type) {
    case "core":
      return new AgUICoreAdapter({
        debug: config.debug,
        proxyUrl: config.endpoints.chat,
      })

    case "fastgpt":
      // 这里可以返回一个专门为FastGPT定制的适配器
      return new AgUICoreAdapter({
        debug: config.debug,
        proxyUrl: config.endpoints.chat,
      })

    case "openai":
      // 这里可以返回一个专门为OpenAI定制的适配器
      return new AgUICoreAdapter({
        debug: config.debug,
        proxyUrl: config.endpoints.chat,
      })

    case "anthropic":
      // 这里可以返回一个专门为Anthropic定制的适配器
      return new AgUICoreAdapter({
        debug: config.debug,
        proxyUrl: config.endpoints.chat,
      })

    case "custom":
      // 使用用户提供的自定义适配器
      if (!options.customAdapter) {
        throw new Error("Custom adapter not provided")
      }
      return options.customAdapter

    default:
      throw new Error(`Unknown adapter type: ${type}`)
  }
}
