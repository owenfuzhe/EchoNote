/**
 * AI 待办提取服务 - Web 适配版
 * 使用阿里云百炼 qwen-max 模型从笔记内容中提取待办事项
 */

import { chat, ChatMessage, BailianChatError } from './bailian-chat'

export type TodoPriority = 'high' | 'medium' | 'low'

export interface TodoItem {
  id: string
  text: string
  priority: TodoPriority
  completed: boolean
  createdAt: string
}

export interface ExtractedTodo {
  text: string
  priority: TodoPriority
}

// 待办提取 Prompt
const TODO_EXTRACTION_PROMPT = `你是一个智能待办提取助手。请从以下笔记内容中提取所有待办事项（TODO/任务/行动项）。

要求：
1. 识别内容中的所有行动项、任务、待办事项
2. 包括明确的任务（如"完成报告"）和隐含的义务（如"明天要交作业"）
3. 为每个待办事项分配优先级：
   - high: 紧急、重要、有时间限制的任务
   - medium: 一般重要性的任务
   - low: 可选、不紧急的任务
4. 如果内容中没有待办事项，返回空数组

输出格式（必须严格遵循 JSON 格式）：
{
  "todos": [
    {"text": "待办事项1", "priority": "high"},
    {"text": "待办事项2", "priority": "medium"}
  ]
}

笔记内容：
`

export class TodoExtractorError extends Error {
  constructor(
    message: string,
    public readonly code?: string
  ) {
    super(message)
    this.name = 'TodoExtractorError'
  }
}

/**
 * 从笔记内容中提取待办事项
 * @param content 笔记内容
 * @returns 提取的待办事项列表
 */
export async function extractTodos(content: string): Promise<ExtractedTodo[]> {
  if (!content || content.trim().length === 0) {
    return []
  }

  const messages: ChatMessage[] = [
    {
      role: 'user',
      content: TODO_EXTRACTION_PROMPT + content,
    },
  ]

  try {
    const response = await chat(messages, {
      model: 'qwen-max',
      temperature: 0.3, // 低温度以获得更稳定的输出
      maxTokens: 1024,
    })

    // 解析 JSON 响应
    const parsed = parseTodoResponse(response.content)
    return parsed
  } catch (error) {
    if (error instanceof BailianChatError) {
      throw new TodoExtractorError(`提取失败: ${error.message}`, error.code)
    }
    if (error instanceof TodoExtractorError) {
      throw error
    }
    throw new TodoExtractorError(
      `提取失败: ${error instanceof Error ? error.message : String(error)}`,
      'UNKNOWN_ERROR'
    )
  }
}

/**
 * 解析 AI 响应，提取待办列表
 */
function parseTodoResponse(content: string): ExtractedTodo[] {
  try {
    // 尝试直接解析整个内容
    const data = JSON.parse(content)
    if (data.todos && Array.isArray(data.todos)) {
      return validateTodos(data.todos)
    }
  } catch {
    // 不是纯 JSON，尝试提取 JSON 块
  }

  // 尝试从 markdown 代码块中提取 JSON
  const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch) {
    try {
      const data = JSON.parse(codeBlockMatch[1].trim())
      if (data.todos && Array.isArray(data.todos)) {
        return validateTodos(data.todos)
      }
    } catch {
      // 解析失败，继续尝试其他方法
    }
  }

  // 尝试匹配最外层的大括号内容
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    try {
      const data = JSON.parse(jsonMatch[0])
      if (data.todos && Array.isArray(data.todos)) {
        return validateTodos(data.todos)
      }
    } catch {
      // 解析失败
    }
  }

  // 如果都无法解析，返回空数组
  console.warn('无法解析待办提取响应:', content)
  return []
}

/**
 * 验证并规范化待办事项列表
 */
function validateTodos(todos: any[]): ExtractedTodo[] {
  const validPriorities: TodoPriority[] = ['high', 'medium', 'low']

  return todos
    .filter((todo) => todo && typeof todo.text === 'string' && todo.text.trim().length > 0)
    .map((todo) => ({
      text: todo.text.trim(),
      priority: validPriorities.includes(todo.priority) ? todo.priority : 'medium',
    }))
}

/**
 * 创建新的待办事项对象
 */
export function createTodoItem(text: string, priority: TodoPriority = 'medium'): TodoItem {
  return {
    id: generateId(),
    text: text.trim(),
    priority,
    completed: false,
    createdAt: new Date().toISOString(),
  }
}

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * 检查待办提取服务是否可用
 */
export async function checkTodoExtractorAvailability(): Promise<{
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

  return {
    available: true,
    message: '待办提取服务已配置',
  }
}

// 默认导出
export default {
  extractTodos,
  createTodoItem,
  checkTodoExtractorAvailability,
}
