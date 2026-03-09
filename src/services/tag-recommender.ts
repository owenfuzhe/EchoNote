/**
 * AI 智能标签推荐服务 - Web 适配版
 * 使用阿里云百炼 qwen-max 模型从笔记内容中推荐相关标签
 */

import { chat, ChatMessage, BailianChatError } from './bailian-chat'

export interface RecommendedTag {
  name: string
  confidence: number // 0-1，推荐置信度
  reason?: string // 推荐理由（可选）
}

export interface TagRecommendationResult {
  tags: RecommendedTag[]
}

// 标签推荐 Prompt
const TAG_RECOMMENDATION_PROMPT = `你是一个智能标签推荐助手。请分析以下笔记内容，为其推荐3-8个合适的标签。

要求：
1. 标签应该简洁（2-6个汉字或1-3个英文单词）
2. 标签应该准确反映笔记的主题、类别或关键概念
3. 标签应该具有通用性，便于分类和检索
4. 避免过于宽泛的标签（如"笔记"、"内容"）
5. 优先选择具体的主题词、技术术语、地点、人名等
6. 如果内容涉及特定领域，使用领域专业术语

输出格式（必须严格遵循 JSON 格式）：
{
  "tags": [
    {"name": "标签1", "confidence": 0.95, "reason": "这是主要内容主题"},
    {"name": "标签2", "confidence": 0.85, "reason": "涉及此概念"},
    {"name": "标签3", "confidence": 0.75}
  ]
}

注意：
- confidence 范围 0-1，越高表示越相关
- reason 可选，简要说明推荐理由
- 只返回 JSON，不要有其他文字

笔记内容：
`

export class TagRecommenderError extends Error {
  constructor(
    message: string,
    public readonly code?: string
  ) {
    super(message)
    this.name = 'TagRecommenderError'
  }
}

/**
 * 从笔记内容中推荐标签
 * @param title 笔记标题
 * @param content 笔记内容
 * @param existingTags 已有标签列表（用于去重）
 * @returns 推荐的标签列表
 */
export async function recommendTags(
  title: string,
  content: string,
  existingTags: string[] = []
): Promise<RecommendedTag[]> {
  const fullContent = `标题：${title}\n\n内容：\n${content}`

  if (!content || content.trim().length === 0) {
    return []
  }

  const messages: ChatMessage[] = [
    {
      role: 'user',
      content: TAG_RECOMMENDATION_PROMPT + fullContent,
    },
  ]

  try {
    const response = await chat(messages, {
      model: 'qwen-max',
      temperature: 0.3, // 低温度以获得更稳定的输出
      maxTokens: 1024,
    })

    // 解析 JSON 响应
    const parsed = parseTagRecommendationResponse(response.content)

    // 过滤掉已存在的标签（不区分大小写）
    const existingSet = new Set(existingTags.map((t) => t.toLowerCase()))
    const filtered = parsed.filter((tag) => !existingSet.has(tag.name.toLowerCase()))

    return filtered
  } catch (error) {
    if (error instanceof BailianChatError) {
      throw new TagRecommenderError(`推荐失败: ${error.message}`, error.code)
    }
    if (error instanceof TagRecommenderError) {
      throw error
    }
    throw new TagRecommenderError(
      `推荐失败: ${error instanceof Error ? error.message : String(error)}`,
      'UNKNOWN_ERROR'
    )
  }
}

/**
 * 解析 AI 响应，提取推荐标签列表
 */
function parseTagRecommendationResponse(content: string): RecommendedTag[] {
  try {
    // 尝试直接解析整个内容
    const data = JSON.parse(content)
    if (data.tags && Array.isArray(data.tags)) {
      return validateTags(data.tags)
    }
  } catch {
    // 不是纯 JSON，尝试提取 JSON 块
  }

  // 尝试从 markdown 代码块中提取 JSON
  const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch) {
    try {
      const data = JSON.parse(codeBlockMatch[1].trim())
      if (data.tags && Array.isArray(data.tags)) {
        return validateTags(data.tags)
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
      if (data.tags && Array.isArray(data.tags)) {
        return validateTags(data.tags)
      }
    } catch {
      // 解析失败
    }
  }

  // 如果都无法解析，返回空数组
  console.warn('无法解析标签推荐响应:', content)
  return []
}

/**
 * 验证并规范化标签列表
 */
function validateTags(tags: any[]): RecommendedTag[] {
  return tags
    .filter((tag) => tag && typeof tag.name === 'string' && tag.name.trim().length > 0)
    .map((tag) => ({
      name: tag.name.trim(),
      confidence: typeof tag.confidence === 'number' ? Math.max(0, Math.min(1, tag.confidence)) : 0.8,
      reason: typeof tag.reason === 'string' ? tag.reason.trim() : undefined,
    }))
    .slice(0, 8) // 最多返回8个标签
}

/**
 * 根据置信度获取标签颜色
 * @param confidence 置信度 0-1
 * @returns 颜色值
 */
export function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.9) return '#10B981' // 绿色 - 高置信度
  if (confidence >= 0.7) return '#F59E0B' // 橙色 - 中等置信度
  return '#6B7280' // 灰色 - 低置信度
}

/**
 * 检查标签推荐服务是否可用
 */
export async function checkTagRecommenderAvailability(): Promise<{
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
    message: '标签推荐服务已配置',
  }
}

// 默认导出
export default {
  recommendTags,
  getConfidenceColor,
  checkTagRecommenderAvailability,
}
