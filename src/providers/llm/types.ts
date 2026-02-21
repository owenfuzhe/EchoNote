export type LLMProviderId =
  | 'anthropic'
  | 'openai'
  | 'kimi'
  | 'qwen'
  | 'zai'
  | 'ollama'

export interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string | ContentPart[]
}

export interface ContentPart {
  type: 'text' | 'image_url'
  text?: string
  image_url?: { url: string; detail?: 'auto' | 'low' | 'high' }
}

export interface ChatOptions {
  temperature?: number
  maxTokens?: number
  systemPrompt?: string
}

export interface ILLMProvider {
  id: LLMProviderId
  name: string
  chat(messages: Message[], options?: ChatOptions): Promise<string>
  chatStream(messages: Message[], options?: ChatOptions): AsyncGenerator<string, void, unknown>
  embed(text: string): Promise<number[]>
}

export interface ProviderConfig {
  id: LLMProviderId
  apiKey: string
  model: string
  baseUrl?: string // for Ollama or self-hosted endpoints
  enabled: boolean
}

export interface ProviderMeta {
  name: string
  models: string[]
  defaultModel: string
  supportsVision: boolean
  supportsEmbeddings: boolean
  isLocal?: boolean
}

export const PROVIDER_META: Record<LLMProviderId, ProviderMeta> = {
  anthropic: {
    name: 'Claude (Anthropic)',
    models: ['claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001'],
    defaultModel: 'claude-sonnet-4-6',
    supportsVision: true,
    supportsEmbeddings: false,
  },
  openai: {
    name: 'OpenAI',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
    defaultModel: 'gpt-4o',
    supportsVision: true,
    supportsEmbeddings: true,
  },
  kimi: {
    name: 'Kimi (Moonshot AI)',
    models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
    defaultModel: 'moonshot-v1-32k',
    supportsVision: false,
    supportsEmbeddings: false,
  },
  qwen: {
    name: 'Qwen (Alibaba)',
    models: ['qwen-turbo', 'qwen-plus', 'qwen-max', 'qwen-long'],
    defaultModel: 'qwen-plus',
    supportsVision: true,
    supportsEmbeddings: true,
  },
  zai: {
    name: 'Zhipu AI (GLM)',
    models: ['glm-5', 'glm-4', 'glm-4v', 'glm-4-flash', 'glm-3-turbo'],
    defaultModel: 'glm-5',
    supportsVision: true,
    supportsEmbeddings: true,
  },
  ollama: {
    name: 'Ollama (Local)',
    models: ['llama3.2', 'qwen2.5', 'mistral', 'deepseek-r1'],
    defaultModel: 'llama3.2',
    supportsVision: false,
    supportsEmbeddings: true,
    isLocal: true,
  },
}
