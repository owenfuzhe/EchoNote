import Anthropic from '@anthropic-ai/sdk'
import { ILLMProvider, Message, ChatOptions } from './types'

export class AnthropicProvider implements ILLMProvider {
  readonly id = 'anthropic' as const
  readonly name = 'Claude (Anthropic)'
  private client: Anthropic
  private model: string

  constructor(apiKey: string, model = 'claude-sonnet-4-6') {
    this.client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
    this.model = model
  }

  private toAnthropicMessages(messages: Message[]): Anthropic.MessageParam[] {
    return messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content:
          typeof m.content === 'string'
            ? m.content
            : m.content.map((part) =>
                part.type === 'text'
                  ? { type: 'text' as const, text: part.text! }
                  : {
                      type: 'image' as const,
                      source: { 
                        type: 'base64' as const, 
                        data: part.image_url!.url,
                        media_type: 'image/jpeg' as const
                      },
                    }
              ),
      }))
  }

  async chat(messages: Message[], options?: ChatOptions): Promise<string> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: options?.maxTokens ?? 4096,
      system: options?.systemPrompt,
      messages: this.toAnthropicMessages(messages),
      temperature: options?.temperature ?? 0.7,
    })
    return response.content[0].type === 'text' ? response.content[0].text : ''
  }

  async *chatStream(
    messages: Message[],
    options?: ChatOptions
  ): AsyncGenerator<string, void, unknown> {
    const stream = this.client.messages.stream({
      model: this.model,
      max_tokens: options?.maxTokens ?? 4096,
      system: options?.systemPrompt,
      messages: this.toAnthropicMessages(messages),
      temperature: options?.temperature ?? 0.7,
    })

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        yield event.delta.text
      }
    }
  }

  async embed(_text: string): Promise<number[]> {
    throw new Error(
      'Anthropic does not support embeddings. Configure OpenAI or Qwen as embedding provider.'
    )
  }
}
