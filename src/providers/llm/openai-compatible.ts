/**
 * Single adapter for all OpenAI-compatible providers:
 *   - OpenAI (gpt-4o, etc.)
 *   - Kimi / Moonshot AI   → https://api.moonshot.cn/v1
 *   - Qwen / Alibaba       → https://dashscope.aliyuncs.com/compatible-mode/v1
 *   - Zhipu AI (ZAI/GLM)  → https://open.bigmodel.cn/api/paas/v4/
 */
import OpenAI from 'openai'
import { ILLMProvider, LLMProviderId, Message, ChatOptions } from './types'

const BASE_URLS: Partial<Record<LLMProviderId, string>> = {
  openai: 'https://api.openai.com/v1',
  kimi: 'https://api.moonshot.cn/v1',
  qwen: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  zai: 'https://open.bigmodel.cn/api/coding/paas/v4/',
}

const EMBEDDING_BASE_URLS: Partial<Record<LLMProviderId, string>> = {
  openai: 'https://api.openai.com/v1',
  qwen: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  zai: 'https://open.bigmodel.cn/api/paas/v4/',
}

const EMBEDDING_MODELS: Partial<Record<LLMProviderId, string>> = {
  openai: 'text-embedding-3-small',
  qwen: 'text-embedding-v3',
  zai: 'embedding-3',
}

export class OpenAICompatibleProvider implements ILLMProvider {
  readonly id: LLMProviderId
  readonly name: string
  private client: OpenAI
  private embeddingClient: OpenAI | null = null
  private model: string

  constructor(
    providerId: LLMProviderId,
    name: string,
    apiKey: string,
    model: string,
    customBaseUrl?: string
  ) {
    this.id = providerId
    this.name = name
    this.model = model
    this.client = new OpenAI({
      apiKey,
      baseURL: customBaseUrl ?? BASE_URLS[providerId],
      dangerouslyAllowBrowser: true,
    })
    
    const embBaseUrl = EMBEDDING_BASE_URLS[providerId]
    if (embBaseUrl && embBaseUrl !== (customBaseUrl ?? BASE_URLS[providerId])) {
      this.embeddingClient = new OpenAI({
        apiKey,
        baseURL: embBaseUrl,
        dangerouslyAllowBrowser: true,
      })
    }
  }

  private convert(messages: Message[]): OpenAI.ChatCompletionMessageParam[] {
    return messages.map((m) => {
      if (m.role === 'user') {
        return {
          role: 'user' as const,
          content: typeof m.content === 'string'
            ? m.content
            : m.content.map((p) =>
                p.type === 'text'
                  ? { type: 'text' as const, text: p.text! }
                  : { type: 'image_url' as const, image_url: { url: p.image_url!.url } }
              ),
        }
      } else if (m.role === 'assistant') {
        return {
          role: 'assistant' as const,
          content: typeof m.content === 'string' ? m.content : '',
        }
      } else {
        return {
          role: 'system' as const,
          content: typeof m.content === 'string' ? m.content : '',
        }
      }
    })
  }

  private withSystem(messages: Message[], systemPrompt?: string): OpenAI.ChatCompletionMessageParam[] {
    if (!systemPrompt) return this.convert(messages)
    return [
      { role: 'system' as const, content: systemPrompt },
      ...this.convert(messages),
    ]
  }

  async chat(messages: Message[], options?: ChatOptions): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: this.withSystem(messages, options?.systemPrompt),
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 4096,
    })
    return response.choices[0]?.message?.content ?? ''
  }

  async *chatStream(
    messages: Message[],
    options?: ChatOptions
  ): AsyncGenerator<string, void, unknown> {
    const stream = await this.client.chat.completions.create({
      model: this.model,
      messages: this.withSystem(messages, options?.systemPrompt),
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 4096,
      stream: true,
    })
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content
      if (delta) yield delta
    }
  }

  async embed(text: string): Promise<number[]> {
    const embModel = EMBEDDING_MODELS[this.id]
    if (!embModel) throw new Error(`${this.name} does not support embeddings`)
    const client = this.embeddingClient ?? this.client
    const res = await client.embeddings.create({ model: embModel, input: text })
    return res.data[0].embedding
  }
}
