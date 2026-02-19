/**
 * Ollama provider — runs models fully on-device / local network.
 * Defaults to http://localhost:11434
 */
import { ILLMProvider, Message, ChatOptions } from './types'

interface OllamaMessage {
  role: string
  content: string
}

interface OllamaChatResponse {
  message: { content: string }
  done: boolean
}

export class OllamaProvider implements ILLMProvider {
  readonly id = 'ollama' as const
  readonly name = 'Ollama (Local)'
  private baseUrl: string
  private model: string

  constructor(model = 'llama3.2', baseUrl = 'http://localhost:11434') {
    this.model = model
    this.baseUrl = baseUrl.replace(/\/$/, '')
  }

  private toOllamaMessages(messages: Message[], systemPrompt?: string): OllamaMessage[] {
    const result: OllamaMessage[] = []
    if (systemPrompt) result.push({ role: 'system', content: systemPrompt })
    for (const m of messages) {
      result.push({
        role: m.role,
        content: typeof m.content === 'string' ? m.content : m.content.map((p) => p.text ?? '').join(''),
      })
    }
    return result
  }

  async chat(messages: Message[], options?: ChatOptions): Promise<string> {
    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        messages: this.toOllamaMessages(messages, options?.systemPrompt),
        stream: false,
        options: { temperature: options?.temperature ?? 0.7 },
      }),
    })
    if (!res.ok) throw new Error(`Ollama error: ${res.statusText}`)
    const data: OllamaChatResponse = await res.json()
    return data.message.content
  }

  async *chatStream(
    messages: Message[],
    options?: ChatOptions
  ): AsyncGenerator<string, void, unknown> {
    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        messages: this.toOllamaMessages(messages, options?.systemPrompt),
        stream: true,
        options: { temperature: options?.temperature ?? 0.7 },
      }),
    })
    if (!res.ok) throw new Error(`Ollama error: ${res.statusText}`)
    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const lines = decoder.decode(value).split('\n').filter(Boolean)
      for (const line of lines) {
        try {
          const chunk: OllamaChatResponse = JSON.parse(line)
          if (chunk.message?.content) yield chunk.message.content
        } catch {}
      }
    }
  }

  async embed(text: string): Promise<number[]> {
    const res = await fetch(`${this.baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.model, prompt: text }),
    })
    if (!res.ok) throw new Error(`Ollama embed error: ${res.statusText}`)
    const data = await res.json()
    return data.embedding
  }
}
