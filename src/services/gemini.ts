/**
 * Google Gemini API 服务
 * 用于晨间洞察等 AI 分析功能
 */

export interface GeminiMessage {
  role: 'user' | 'model'
  parts: { text: string }[]
}

export interface GeminiOptions {
  model?: string
  temperature?: number
  maxOutputTokens?: number
}

export interface GeminiResponse {
  content: string
  model: string
  timestamp: number
}

export interface InsightConnection {
  sourceNote: string
  targetNote: string
  relation: string
}

export interface MorningInsightResult {
  totalConnections: number
  connections: InsightConnection[]
  summary: string
}

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta'
const DEFAULT_MODEL = 'gemini-2.0-flash'

export class GeminiError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly statusCode?: number
  ) {
    super(message)
    this.name = 'GeminiError'
  }
}

/**
 * 发送 Gemini 请求
 * @param messages 消息列表
 * @param options 可选配置
 * @returns AI 回复
 */
export async function generateContent(
  messages: GeminiMessage[],
  options: GeminiOptions = {}
): Promise<GeminiResponse> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  if (!apiKey) {
    throw new GeminiError(
      '缺少 Gemini API Key，请在 .env 中设置 VITE_GEMINI_API_KEY',
      'MISSING_API_KEY'
    )
  }

  const model = options.model || DEFAULT_MODEL
  const temperature = options.temperature ?? 0.3
  const maxOutputTokens = options.maxOutputTokens ?? 2048

  // 构建请求体
  const contents = messages.map((m) => ({
    role: m.role,
    parts: m.parts,
  }))

  const requestBody = {
    contents,
    generationConfig: {
      temperature,
      maxOutputTokens,
      responseMimeType: 'application/json',
    },
  }

  let response: Response
  try {
    response = await fetch(
      `${GEMINI_BASE_URL}/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    )
  } catch (err: any) {
    throw new GeminiError(
      `网络请求失败: ${err?.message || String(err)}`,
      'NETWORK_ERROR'
    )
  }

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`
    try {
      const errorData = await response.json()
      errorMessage = errorData.error?.message || errorMessage
    } catch {
      const errorText = await response.text()
      if (errorText) {
        errorMessage += ` - ${errorText}`
      }
    }
    throw new GeminiError(errorMessage, 'API_ERROR', response.status)
  }

  let data: any
  try {
    data = await response.json()
  } catch (err: any) {
    throw new GeminiError(
      `解析响应失败: ${err?.message || String(err)}`,
      'PARSE_ERROR'
    )
  }

  if (data.error) {
    throw new GeminiError(
      data.error.message || '未知错误',
      data.error.code || 'API_ERROR'
    )
  }

  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

  return {
    content: content.trim(),
    model: data.modelVersion || model,
    timestamp: Date.now(),
  }
}

/**
 * 分析昨日笔记与历史笔记的关联
 * @param yesterdayNotes 昨日笔记列表
 * @param historicalNotes 历史笔记列表
 * @returns 关联分析结果
 */
export async function analyzeNoteConnections(
  yesterdayNotes: Array<{ id: string; title: string; content: string; tags?: string[] }>,
  historicalNotes: Array<{ id: string; title: string; content: string; tags?: string[] }>
): Promise<MorningInsightResult> {
  if (yesterdayNotes.length === 0) {
    return {
      totalConnections: 0,
      connections: [],
      summary: '昨日没有新笔记',
    }
  }

  const prompt = `分析昨日笔记与历史笔记的关联，以 JSON 格式返回结果。

昨日笔记：
${yesterdayNotes.map((n, i) => `${i + 1}. ${n.title}\n${n.content.slice(0, 500)}${n.content.length > 500 ? '...' : ''}\n标签：${n.tags?.join(', ') || '无'}`).join('\n\n')}

历史笔记：
${historicalNotes.map((n, i) => `${i + 1}. ${n.title}\n${n.content.slice(0, 300)}${n.content.length > 300 ? '...' : ''}\n标签：${n.tags?.join(', ') || '无'}`).join('\n\n')}

请分析昨日笔记与历史笔记之间的潜在关联，包括：
1. 主题相似性
2. 标签重叠
3. 内容互补性
4. 可以整合或深化的方向

返回 JSON 格式：
{
  "totalConnections": 关联数量,
  "connections": [
    {
      "sourceNote": "昨日笔记标题",
      "targetNote": "历史笔记标题",
      "relation": "关联描述（20字以内）"
    }
  ],
  "summary": "一句话总结"
}`

  const response = await generateContent(
    [{ role: 'user', parts: [{ text: prompt }] }],
    { temperature: 0.3 }
  )

  try {
    const result = JSON.parse(response.content) as MorningInsightResult
    return result
  } catch (e) {
    // 如果解析失败，返回空结果
    return {
      totalConnections: 0,
      connections: [],
      summary: '分析完成，但未发现明显关联',
    }
  }
}

/**
 * 检查 Gemini 服务是否可用
 */
export async function checkGeminiAvailability(): Promise<{
  available: boolean
  message: string
}> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  if (!apiKey) {
    return {
      available: false,
      message: '未配置 Gemini API Key',
    }
  }

  try {
    await generateContent(
      [{ role: 'user', parts: [{ text: 'Hello' }] }],
      { maxOutputTokens: 10 }
    )
    return {
      available: true,
      message: 'Gemini 服务已配置',
    }
  } catch (e: any) {
    return {
      available: false,
      message: `服务检查失败: ${e.message}`,
    }
  }
}

export default {
  generateContent,
  analyzeNoteConnections,
  checkGeminiAvailability,
}
