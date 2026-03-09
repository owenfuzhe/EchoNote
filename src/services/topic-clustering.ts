/**
 * AI 主题聚类服务
 * 使用阿里云百炼 qwen-max 模型对笔记进行语义聚类
 */

import { chat, ChatMessage, BailianChatError } from './bailian-chat'
import type { Note } from '../store/note-store'

export interface Topic {
  id: string
  name: string
  icon: string
  count: number
  keywords: string[]
  preview: string
  lastUpdated: string
  noteIds: string[] // 关联的笔记ID列表
}

export interface TopicClusteringResult {
  topics: Topic[]
  unclassifiedNotes: string[] // 未分类的笔记ID
}

export class TopicClusteringError extends Error {
  constructor(
    message: string,
    public readonly code?: string
  ) {
    super(message)
    this.name = 'TopicClusteringError'
  }
}

// 主题聚类 Prompt
const TOPIC_CLUSTERING_PROMPT = `你是一个智能笔记分析助手。请分析以下笔记列表，将它们聚类成不同的主题。

要求：
1. 根据笔记内容的语义相似性进行分组
2. 每个主题应该有一个简洁明了的名称（4-8个字符）
3. 为每个主题选择一个合适的 emoji 图标
4. 提取每个主题的关键词（3-5个）
5. 生成一段简短的预览文本（50字以内），概括该主题的核心内容
6. 返回每个主题包含的笔记ID列表

输出格式（必须严格遵循 JSON 格式）：
{
  "topics": [
    {
      "id": "topic_1",
      "name": "主题名称",
      "icon": "📚",
      "keywords": ["关键词1", "关键词2", "关键词3"],
      "preview": "主题预览文本...",
      "noteIds": ["note_id_1", "note_id_2"]
    }
  ],
  "unclassifiedNotes": ["note_id_3"]
}

注意：
- 主题数量根据内容自然形成，建议 2-6 个主题
- 未分类的笔记ID放入 unclassifiedNotes 数组
- 每个笔记只能属于一个主题
- 只返回 JSON，不要有其他文字
- 如果没有足够笔记（少于2条），返回空 topics 数组

笔记列表：`;

/**
 * 格式化笔记列表供 AI 分析
 */
function formatNotesForClustering(notes: Note[]): string {
  return notes
    .map(
      (note, index) => `\n--- 笔记 ${index + 1} ---
ID: ${note.id}
标题: ${note.title}
标签: ${note.tags?.join(', ') || '无'}
内容: ${note.content.slice(0, 500)}${note.content.length > 500 ? '...' : ''}
更新时间: ${note.updatedAt}`
    )
    .join('\n');
}

/**
 * 生成相对时间字符串
 */
function getRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays === 1) return '昨天';
  if (diffDays < 7) return `${diffDays}天前`;
  return `${Math.floor(diffDays / 7)}周前`;
}

/**
 * 对笔记进行主题聚类
 * @param notes 笔记列表
 * @returns 聚类结果
 */
export async function clusterNotesByTopic(notes: Note[]): Promise<TopicClusteringResult> {
  // 如果笔记太少，不进行聚类
  if (notes.length < 2) {
    return {
      topics: [],
      unclassifiedNotes: notes.map((n) => n.id),
    };
  }

  const formattedNotes = formatNotesForClustering(notes);

  const messages: ChatMessage[] = [
    {
      role: 'user',
      content: TOPIC_CLUSTERING_PROMPT + formattedNotes,
    },
  ];

  try {
    const response = await chat(messages, {
      model: 'qwen-max',
      temperature: 0.4, // 适中温度以获得稳定的聚类结果
      maxTokens: 2048,
    });

    // 解析 JSON 响应
    const result = parseClusteringResponse(response.content, notes);

    // 为每个主题计算最后更新时间
    const topicsWithTime = result.topics.map((topic) => {
      const topicNotes = notes.filter((n) => topic.noteIds.includes(n.id));
      const latestNote = topicNotes.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )[0];

      return {
        ...topic,
        count: topic.noteIds.length,
        lastUpdated: latestNote ? getRelativeTime(latestNote.updatedAt) : '未知',
      };
    });

    return {
      topics: topicsWithTime,
      unclassifiedNotes: result.unclassifiedNotes,
    };
  } catch (error) {
    if (error instanceof BailianChatError) {
      throw new TopicClusteringError(`聚类失败: ${error.message}`, error.code);
    }
    if (error instanceof TopicClusteringError) {
      throw error;
    }
    throw new TopicClusteringError(
      `聚类失败: ${error instanceof Error ? error.message : String(error)}`,
      'UNKNOWN_ERROR'
    );
  }
}

/**
 * 解析 AI 响应，提取聚类结果
 */
function parseClusteringResponse(content: string, allNotes: Note[]): TopicClusteringResult {
  let data: any;

  try {
    // 尝试直接解析整个内容
    data = JSON.parse(content);
  } catch {
    // 尝试从 markdown 代码块中提取 JSON
    const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      try {
        data = JSON.parse(codeBlockMatch[1].trim());
      } catch {
        // 解析失败，继续尝试其他方法
      }
    }

    // 尝试匹配最外层的大括号内容
    if (!data) {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          data = JSON.parse(jsonMatch[0]);
        } catch {
          // 解析失败
        }
      }
    }
  }

  if (!data || !Array.isArray(data.topics)) {
    console.warn('无法解析聚类响应:', content);
    return {
      topics: [],
      unclassifiedNotes: allNotes.map((n) => n.id),
    };
  }

  // 验证并规范化主题数据
  const validTopics: Topic[] = data.topics
    .filter(
      (topic: any) =>
        topic &&
        typeof topic.name === 'string' &&
        topic.name.trim().length > 0 &&
        Array.isArray(topic.noteIds) &&
        topic.noteIds.length > 0
    )
    .map((topic: any, index: number) => ({
      id: topic.id || `topic_${index + 1}`,
      name: topic.name.trim(),
      icon: topic.icon || '📄',
      count: topic.noteIds.length,
      keywords: Array.isArray(topic.keywords) ? topic.keywords.slice(0, 5) : [],
      preview:
        typeof topic.preview === 'string'
          ? topic.preview.slice(0, 50)
          : `${topic.noteIds.length} 条相关笔记`,
      lastUpdated: '未知',
      noteIds: topic.noteIds.filter((id: any) => typeof id === 'string'),
    }));

  // 处理未分类笔记
  const classifiedIds = new Set(validTopics.flatMap((t) => t.noteIds));
  const unclassifiedNotes =
    Array.isArray(data.unclassifiedNotes) && data.unclassifiedNotes.length > 0
      ? data.unclassifiedNotes.filter((id: any) => typeof id === 'string')
      : allNotes.filter((n) => !classifiedIds.has(n.id)).map((n) => n.id);

  return {
    topics: validTopics,
    unclassifiedNotes,
  };
}

/**
 * 检查主题聚类服务是否可用
 */
export async function checkTopicClusteringAvailability(): Promise<{
  available: boolean
  message: string
}> {
  const apiKey = import.meta.env.VITE_BAILIAN_API_KEY;
  if (!apiKey) {
    return {
      available: false,
      message: '未配置百炼 API Key',
    };
  }

  return {
    available: true,
    message: '主题聚类服务已配置',
  };
}

/**
 * 获取指定主题下的所有笔记
 */
export function getNotesByTopic(topic: Topic, allNotes: Note[]): Note[] {
  const noteIdSet = new Set(topic.noteIds);
  return allNotes.filter((note) => noteIdSet.has(note.id));
}

// 默认导出
export default {
  clusterNotesByTopic,
  getNotesByTopic,
  checkTopicClusteringAvailability,
};
