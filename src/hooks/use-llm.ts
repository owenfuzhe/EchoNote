import { useCallback, useRef } from 'react'
import { createProvider } from '@/providers/llm'
import { ILLMProvider, Message, ChatOptions } from '@/providers/llm/types'
import { useSettingsStore, loadProviderApiKey } from '@/store/settings-store'

const ANALYZE_SYSTEM = `你是 EchoNotes AI，一个智能笔记助手。分析用户输入并返回结构化 JSON。

## 输出格式
{
  "summary": "一句话总结用户内容的核心意图",
  "atomic_ideas": [
    {
      "content": "原子想法内容",
      "type": "fact|thought|question|plan|feeling|commitment"
    }
  ],
  "insights": [
    {
      "type": "pattern|risk|opportunity|gap",
      "content": "洞察内容"
    }
  ],
  "action_items": [
    {
      "text": "待办事项",
      "priority": "high|medium|low"
    }
  ],
  "follow_up": "一个反向追问，帮助用户深入思考"
}

## 类型说明
- fact: 客观事实
- thought: 主观想法
- question: 疑问困惑
- plan: 计划打算
- feeling: 情绪感受
- commitment: 承诺约定

## 洞察类型
- pattern: 发现的行为模式
- risk: 潜在风险提示
- opportunity: 可把握的机会
- gap: 遗漏或不足

## 要求
1. 简洁精准，不要冗余
2. 中英文同等支持
3. 只返回有效 JSON，不要其他文字`

const IMAGE_SYSTEM = `你是 EchoNotes AI。分析图片并用 1-3 句话描述。
如果包含文字，请转录。如果是图表，请解释。
使用图片中文字的语言回复（中文或英文）。`

export interface AtomicIdea {
  content: string
  type: 'fact' | 'thought' | 'question' | 'plan' | 'feeling' | 'commitment'
}

export interface Insight {
  type: 'pattern' | 'risk' | 'opportunity' | 'gap'
  content: string
}

export interface ActionItem {
  text: string
  priority: 'high' | 'medium' | 'low'
}

export interface AnalyzeResult {
  summary: string
  atomic_ideas: AtomicIdea[]
  insights: Insight[]
  action_items: ActionItem[]
  follow_up: string
}

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

  const analyze = useCallback(
    async (content: string): Promise<AnalyzeResult> => {
      const provider = await getProvider()
      const messages: Message[] = [{ role: 'user', content }]
      const raw = await provider.chat(messages, { systemPrompt: ANALYZE_SYSTEM, temperature: 0.5 })
      const json = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const result = JSON.parse(json)
      
      if (!result.summary) result.summary = ''
      if (!result.atomic_ideas) result.atomic_ideas = []
      if (!result.insights) result.insights = []
      if (!result.action_items) result.action_items = []
      if (!result.follow_up) result.follow_up = ''
      
      return result
    },
    [getProvider]
  )

  async function* streamChat(
    messages: Message[],
    options?: ChatOptions
  ): AsyncGenerator<string, void, unknown> {
    const provider = await getProvider()
    yield* provider.chatStream(messages, options)
  }

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

  const embed = useCallback(
    async (text: string): Promise<number[]> => {
      const provider = await getProvider()
      return provider.embed(text)
    },
    [getProvider]
  )

  return { analyze, analyzeImage, streamChat, embed }
}
