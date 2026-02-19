import { ILLMProvider, LLMProviderId, ProviderConfig, PROVIDER_META } from './types'
import { AnthropicProvider } from './anthropic'
import { OpenAICompatibleProvider } from './openai-compatible'
import { OllamaProvider } from './ollama'

export function createProvider(config: ProviderConfig): ILLMProvider {
  const { id, apiKey, model, baseUrl } = config
  const meta = PROVIDER_META[id]

  switch (id) {
    case 'anthropic':
      return new AnthropicProvider(apiKey, model)

    case 'openai':
    case 'kimi':
    case 'qwen':
    case 'zai':
      return new OpenAICompatibleProvider(id, meta.name, apiKey, model, baseUrl)

    case 'ollama':
      return new OllamaProvider(model, baseUrl ?? 'http://localhost:11434')

    default:
      throw new Error(`Unknown provider: ${id}`)
  }
}

export { PROVIDER_META }
export type { ILLMProvider, LLMProviderId, ProviderConfig, Message, ChatOptions } from './types'
