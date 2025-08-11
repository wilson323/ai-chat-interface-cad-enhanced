export type Provider = 'dashscope' | 'deepseek' | 'moonshot' | 'zhipu' | 'openai'

export interface BaseModelConfig {
  id: string
  name: string
  provider: Provider
  baseUrl?: string
  apiKeyEnv?: string
}

export interface LlmModelConfig extends BaseModelConfig {
  kind: 'llm'
  supportsStream?: boolean
  default?: boolean
}

export interface EmbeddingModelConfig extends BaseModelConfig {
  kind: 'embedding'
  dimension?: number
}

export interface TtsModelConfig extends BaseModelConfig {
  kind: 'tts'
  voice?: string
  format?: 'mp3' | 'wav' | 'ogg'
}

export interface SttModelConfig extends BaseModelConfig {
  kind: 'stt'
  language?: string
}

export type AnyModelConfig = LlmModelConfig | EmbeddingModelConfig | TtsModelConfig | SttModelConfig

export interface UnifiedModelsConfig {
  llm: Array<LlmModelConfig>
  embedding: Array<EmbeddingModelConfig>
  tts: Array<TtsModelConfig>
  stt: Array<SttModelConfig>
  defaults: {
    llm: string
    embedding?: string
    tts?: string
    stt?: string
  }
}

export const MODELS: UnifiedModelsConfig = {
  llm: [
    { id: 'qwen-plus-2025-01-12', name: 'Qwen Plus', provider: 'dashscope', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', apiKeyEnv: 'EXTERNAL_AI_API_KEY', kind: 'llm', supportsStream: true, default: true },
    { id: 'qwen-max-latest', name: 'Qwen Max', provider: 'dashscope', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', apiKeyEnv: 'EXTERNAL_AI_API_KEY', kind: 'llm', supportsStream: true },
    { id: 'deepseek-chat', name: 'DeepSeek Chat', provider: 'deepseek', baseUrl: 'https://api.deepseek.com/v1', apiKeyEnv: 'EXTERNAL_AI_API_KEY', kind: 'llm', supportsStream: true },
  ],
  embedding: [
    { id: 'text-embedding-v1', name: 'Text Embedding', provider: 'deepseek', baseUrl: 'https://api.deepseek.com/v1', apiKeyEnv: 'EXTERNAL_AI_API_KEY', kind: 'embedding', dimension: 1536 },
  ],
  tts: [
    { id: 'qwen-tts-v1', name: 'Qwen TTS', provider: 'dashscope', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', apiKeyEnv: 'EXTERNAL_AI_API_KEY', kind: 'tts', voice: 'female', format: 'mp3' },
  ],
  stt: [
    { id: 'qwen-asr-v1', name: 'Qwen ASR', provider: 'dashscope', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', apiKeyEnv: 'EXTERNAL_AI_API_KEY', kind: 'stt', language: 'zh' },
  ],
  defaults: {
    llm: 'qwen-plus-2025-01-12',
    embedding: 'text-embedding-v1',
    tts: 'qwen-tts-v1',
    stt: 'qwen-asr-v1',
  }
}


