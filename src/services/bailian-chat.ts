/**
 * 阿里云百炼大模型对话服务 - Web 适配版
 * 文档: https://help.aliyun.com/zh/dashscope/developer-reference/api-details
 */

const BAILIAN_BASE_URL = 'https://dashscope.aliyuncs.com/api/v1'
const DEFAULT_MODEL = 'qwen-max'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatOptions {
  /** 模型名称，默认 qwen-max */
  model?: string
  /** 温度参数，控制随机性，默认 0.7 */
  temperature?: number
  /** 最大生成 token 数，默认 2048 */
  maxTokens?: number
  /** 是否流式输出，默认 false */
  stream?: boolean
  /** 系统提示词 */
  systemPrompt?: string
}

export interface ChatResponse {
  /** AI 回复内容 */
  content: string
  /** 使用的模型 */
  model: string
  /** 总 token 数 */
  totalTokens?: number
  /** 完成时间戳 */
  timestamp: number
}

export interface ChatStreamChunk {
  /** 当前块的内容 */
  content: string
  /** 是否完成 */
  done: boolean
  /** 累计内容（流式模式） */
  accumulatedContent?: string
}

export class BailianChatError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly statusCode?: number
  ) {
    super(message)
    this.name = 'BailianChatError'
  }
}

/**
 * 发送聊天请求（非流式）
 * @param messages 消息列表
 * @param options 可选配置
 * @returns AI 回复
 */
export async function chat(
  messages: ChatMessage[],
  options: ChatOptions = {}
): Promise<ChatResponse> {
  const apiKey = import.meta.env.VITE_BAILIAN_API_KEY
  if (!apiKey) {
    throw new BailianChatError(
      '缺少百炼 API Key，请在 .env 中设置 VITE_BAILIAN_API_KEY',
      'MISSING_API_KEY'
    )
  }

  const model = options.model || DEFAULT_MODEL
  const temperature = options.temperature ?? 0.7
  const maxTokens = options.maxTokens ?? 2048

  // 准备消息列表
  let requestMessages = [...messages]
  if (options.systemPrompt) {
    // 检查是否已存在 system 消息
    const hasSystem = requestMessages.some((m) => m.role === 'system')
    if (!hasSystem) {
      requestMessages = [
        { role: 'system', content: options.systemPrompt },
        ...requestMessages,
      ]
    }
  }

  const requestBody = {
    model,
    input: {
      messages: requestMessages,
    },
    parameters: {
      temperature,
      max_tokens: maxTokens,
      result_format: 'message',
    },
  }

  // 发送请求
  let response: Response
  try {
    response = await fetch(`${BAILIAN_BASE_URL}/services/aigc/text-generation/generation`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })
  } catch (err: any) {
    throw new BailianChatError(
      `网络请求失败: ${err?.message || String(err)}`,
      'NETWORK_ERROR'
    )
  }

  // 处理 HTTP 错误
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`
    let errorCode = 'API_ERROR'

    try {
      const errorData = await response.json()
      errorMessage = errorData.message || errorData.error?.message || errorMessage
      errorCode = errorData.code || errorData.error?.code || errorCode
    } catch {
      const errorText = await response.text()
      if (errorText) {
        errorMessage += ` - ${errorText}`
      }
    }

    throw new BailianChatError(errorMessage, errorCode, response.status)
  }

  // 解析响应
  let data: any
  try {
    data = await response.json()
  } catch (err: any) {
    throw new BailianChatError(
      `解析响应失败: ${err?.message || String(err)}`,
      'PARSE_ERROR'
    )
  }

  // 检查业务错误
  if (data.code && data.code !== '200') {
    throw new BailianChatError(
      data.message || '未知错误',
      data.code,
      response.status
    )
  }

  // 提取回复内容
  const output = data.output
  if (!output) {
    throw new BailianChatError('响应中缺少输出内容', 'EMPTY_RESULT')
  }

  // 处理不同格式的响应
  let content: string
  if (output.choices && output.choices[0]) {
    // 标准格式
    content = output.choices[0].message?.content || output.choices[0].text || ''
  } else if (output.text) {
    // 简化格式
    content = output.text
  } else {
    content = JSON.stringify(output)
  }

  return {
    content: content.trim(),
    model: output.model || model,
    totalTokens: data.usage?.total_tokens,
    timestamp: Date.now(),
  }
}

/**
 * 发送聊天请求（流式）
 * @param messages 消息列表
 * @param options 可选配置
 * @param onChunk 流式回调函数
 */
export async function chatStream(
  messages: ChatMessage[],
  options: ChatOptions = {},
  onChunk: (chunk: ChatStreamChunk) => void
): Promise<void> {
  const apiKey = import.meta.env.VITE_BAILIAN_API_KEY
  if (!apiKey) {
    throw new BailianChatError(
      '缺少百炼 API Key，请在 .env 中设置 VITE_BAILIAN_API_KEY',
      'MISSING_API_KEY'
    )
  }

  const model = options.model || DEFAULT_MODEL
  const temperature = options.temperature ?? 0.7
  const maxTokens = options.maxTokens ?? 2048

  // 准备消息列表
  let requestMessages = [...messages]
  if (options.systemPrompt) {
    const hasSystem = requestMessages.some((m) => m.role === 'system')
    if (!hasSystem) {
      requestMessages = [
        { role: 'system', content: options.systemPrompt },
        ...requestMessages,
      ]
    }
  }

  const requestBody = {
    model,
    input: {
      messages: requestMessages,
    },
    parameters: {
      temperature,
      max_tokens: maxTokens,
      result_format: 'message',
      incremental_output: true,
    },
  }

  let response: Response
  try {
    response = await fetch(`${BAILIAN_BASE_URL}/services/aigc/text-generation/generation`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify(requestBody),
    })
  } catch (err: any) {
    throw new BailianChatError(
      `网络请求失败: ${err?.message || String(err)}`,
      'NETWORK_ERROR'
    )
  }

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`
    try {
      const errorData = await response.json()
      errorMessage = errorData.message || errorMessage
    } catch {
      const errorText = await response.text()
      if (errorText) errorMessage += ` - ${errorText}`
    }
    throw new BailianChatError(errorMessage, 'API_ERROR', response.status)
  }

  // 读取流式响应
  const reader = response.body?.getReader()
  if (!reader) {
    throw new BailianChatError('无法读取响应流', 'STREAM_ERROR')
  }

  const decoder = new TextDecoder()
  let accumulatedContent = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      const lines = chunk.split('\n')

      for (const line of lines) {
        if (line.startsWith('data:')) {
          const dataStr = line.slice(5).trim()
          if (dataStr === '[DONE]') {
            onChunk({ content: '', done: true, accumulatedContent })
            return
          }

          try {
            const data = JSON.parse(dataStr)
            const content = data.output?.choices?.[0]?.message?.content ||
                           data.output?.text || ''

            if (content) {
              accumulatedContent += content
              onChunk({
                content,
                done: false,
                accumulatedContent,
              })
            }
          } catch (e) {
            // 忽略解析失败的行
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }

  onChunk({ content: '', done: true, accumulatedContent })
}

/**
 * 生成 RAG 系统提示词
 * @param notesContent 笔记内容列表
 * @returns 系统提示词
 */
export function generateRAGPrompt(notesContent: string[]): string {
  const context = notesContent
    .map((content, index) => `\n--- 笔记 ${index + 1} ---\n${content}`)
    .join('\n')

  return `你是 EchoNote 的智能助手，专门帮助用户基于他们的笔记内容回答问题。

以下是与用户问题相关的笔记内容：
${context}

请基于上述笔记内容回答用户的问题。如果笔记中没有相关信息，请明确告知用户。
回答要求：
1. 保持简洁明了
2. 如果引用多条笔记，请说明来源
3. 如果信息不足，建议用户补充相关内容`
}

/**
 * 检查百炼聊天服务是否可用
 */
export async function checkChatAvailability(): Promise<{
  available: boolean
  message: string
}> {
  const apiKey = import.meta.env.VITE_BAILIAN_API_KEY
  if (!apiKey) {
    return {
      available: false,
      message: '未配置百炼 API Key',
    }
  }

  if (!apiKey.startsWith('sk-')) {
    return {
      available: false,
      message: 'API Key 格式不正确，百炼 Key 应以 sk- 开头',
    }
  }

  return {
    available: true,
    message: '百炼聊天服务已配置',
  }
}

// 默认导出
export default {
  chat,
  chatStream,
  generateRAGPrompt,
  checkChatAvailability,
}
