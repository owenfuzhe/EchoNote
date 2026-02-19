import { useCallback, useRef } from 'react'
import { createProvider } from '@/providers/llm'
import { ILLMProvider, Message, ChatOptions } from '@/providers/llm/types'
import { useSettingsStore, loadProviderApiKey } from '@/store/settings-store'

// Prompts
const INTENT_SYSTEM = `You are EchoNotes AI. Analyze the user's input and respond in JSON with this shape:
{
  "intent": "one-line summary of what the user wants to accomplish",
  "action_items": [{ "id": "uuid", "text": "...", "priority": "low|medium|high", "completed": false }],
  "suggestions": ["suggestion 1", "suggestion 2"],
  "tags": ["tag1", "tag2"]
}
Be concise. Support Chinese and English equally well. Return only valid JSON.`

const IMAGE_SYSTEM = `You are EchoNotes AI. Analyze this image and describe what you see in 1-3 sentences.
If it contains text, transcribe it. If it contains a diagram or chart, explain it.
Respond in the same language as any text in the image (Chinese or English).`

export function useLLM() {
  const { activeProviderId, providers } = useSettingsStore()
  const providerRef = useRef<ILLMProvider | null>(null)

  const getProvider = useCallback(async (): Promise<ILLMProvider> => {
    const apiKey = await loadProviderApiKey(activeProviderId)
    if (!apiKey && activeProviderId !== 'ollama') {
      throw new Error(`No API key set for ${activeProviderId}. Go to Settings to add one.`)
    }
    const config = providers[activeProviderId]
    providerRef.current = createProvider({
      ...config,
      apiKey: apiKey ?? '',
    })
    return providerRef.current
  }, [activeProviderId, providers])

  /** Analyze text/voice content → intent + action items */
  const analyzeIntent = useCallback(
    async (content: string): Promise<{
      intent: string
      action_items: Array<{ id: string; text: string; priority: 'low' | 'medium' | 'high'; completed: boolean }>
      suggestions: string[]
      tags: string[]
    }> => {
      const provider = await getProvider()
      const messages: Message[] = [{ role: 'user', content }]
      const raw = await provider.chat(messages, { systemPrompt: INTENT_SYSTEM, temperature: 0.3 })
      // Strip possible markdown fences
      const json = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      return JSON.parse(json)
    },
    [getProvider]
  )

  /** Stream a general chat response (for interactive cells) */
  async function* streamChat(
    messages: Message[],
    options?: ChatOptions
  ): AsyncGenerator<string, void, unknown> {
    const provider = await getProvider()
    yield* provider.chatStream(messages, options)
  }

  /** Analyze an image → description string */
  const analyzeImage = useCallback(
    async (imageBase64: string): Promise<string> => {
      const provider = await getProvider()
      const messages: Message[] = [
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
            { type: 'text', text: 'Please analyze this image.' },
          ],
        },
      ]
      return provider.chat(messages, { systemPrompt: IMAGE_SYSTEM })
    },
    [getProvider]
  )

  /** Get embeddings for semantic memory (uses first embedding-capable provider) */
  const embed = useCallback(
    async (text: string): Promise<number[]> => {
      const provider = await getProvider()
      return provider.embed(text)
    },
    [getProvider]
  )

  return { analyzeIntent, analyzeImage, streamChat, embed }
}
