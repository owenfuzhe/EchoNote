/**
 * 笔记关联发现服务
 * 使用百炼大模型分析笔记间的语义关联
 */

import { Note } from "../store/note-store";

const BAILIAN_BASE_URL = "https://dashscope.aliyuncs.com/api/v1";
const DEFAULT_MODEL = "qwen-max";

export interface NoteRelation {
  sourceNoteId: string;
  targetNoteId: string;
  sourceTitle: string;
  targetTitle: string;
  similarity: number; // 0-100
  reason: string; // 关联原因
  tags: string[]; // 关联标签
}

export interface RelationAnalysisResult {
  relations: NoteRelation[];
  analyzedAt: string;
}

export class NoteRelationError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
    this.name = "NoteRelationError";
  }
}

/**
 * 分析笔记间的关联
 */
export async function analyzeNoteRelations(
  notes: Note[],
  options: {
    minSimilarity?: number;
    maxRelations?: number;
  } = {}
): Promise<RelationAnalysisResult> {
  const { minSimilarity = 60, maxRelations = 10 } = options;

  if (notes.length < 2) {
    return { relations: [], analyzedAt: new Date().toISOString() };
  }

  const apiKey = import.meta.env.VITE_BAILIAN_API_KEY;
  if (!apiKey) {
    throw new NoteRelationError("百炼 API Key 未配置");
  }

  // 准备笔记数据（限制内容长度）
  const noteSummaries = notes.map((note) => ({
    id: note.id,
    title: note.title || "无标题",
    content: note.content.slice(0, 500), // 限制长度
    tags: note.tags || [],
  }));

  const prompt = `分析以下笔记之间的语义关联。找出内容主题、关键词、概念上有重合或关联的笔记对。

笔记列表：
${JSON.stringify(noteSummaries, null, 2)}

请分析并返回关联结果，格式如下：
{
  "relations": [
    {
      "sourceNoteId": "笔记ID1",
      "targetNoteId": "笔记ID2", 
      "similarity": 85,
      "reason": "关联原因描述",
      "tags": ["标签1", "标签2"]
    }
  ]
}

要求：
1. 只返回相似度 >= ${minSimilarity} 的关联
2. 最多返回 ${maxRelations} 个关联
3. 每个关联必须有具体的 reason 说明
4. similarity 为 0-100 的整数
5. 返回合法的 JSON 格式，不要包含 markdown 代码块`;

  try {
    const response = await fetch(
      `${BAILIAN_BASE_URL}/services/aigc/text-generation/generation`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: DEFAULT_MODEL,
          input: {
            messages: [
              {
                role: "system",
                content:
                  "你是一个笔记关联分析助手。你的任务是分析笔记之间的语义关联，找出主题、概念、关键词上有重合的内容。",
              },
              {
                role: "user",
                content: prompt,
              },
            ],
          },
          parameters: {
            temperature: 0.3,
            max_tokens: 2000,
            result_format: "message",
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new NoteRelationError(
        errorData.message || `API 请求失败: ${response.status}`
      );
    }

    const data = await response.json();
    const content = data.output?.choices?.[0]?.message?.content;

    if (!content) {
      throw new NoteRelationError("API 返回内容为空");
    }

    // 解析 JSON
    let result: { relations: NoteRelation[] };
    try {
      // 尝试直接解析
      result = JSON.parse(content);
    } catch {
      // 尝试提取 JSON 代码块
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[1]);
      } else {
        // 尝试提取花括号内容
        const braceMatch = content.match(/\{[\s\S]*\}/);
        if (braceMatch) {
          result = JSON.parse(braceMatch[0]);
        } else {
          throw new Error("无法解析 JSON");
        }
      }
    }

    // 补充笔记标题
    const relations = result.relations
      .map((rel) => {
        const sourceNote = notes.find((n) => n.id === rel.sourceNoteId);
        const targetNote = notes.find((n) => n.id === rel.targetNoteId);
        return {
          ...rel,
          sourceTitle: sourceNote?.title || "未知笔记",
          targetTitle: targetNote?.title || "未知笔记",
        };
      })
      .filter((rel) => rel.similarity >= minSimilarity)
      .slice(0, maxRelations);

    return {
      relations,
      analyzedAt: new Date().toISOString(),
    };
  } catch (error) {
    if (error instanceof NoteRelationError) {
      throw error;
    }
    throw new NoteRelationError(
      error instanceof Error ? error.message : "关联分析失败"
    );
  }
}

/**
 * 获取笔记的关联推荐（本地简单实现，不调用 API）
 * 基于标签重叠和关键词匹配
 */
export function getLocalNoteRelations(
  notes: Note[],
  sourceNoteId: string,
  maxResults: number = 5
): NoteRelation[] {
  const sourceNote = notes.find((n) => n.id === sourceNoteId);
  if (!sourceNote) return [];

  const relations: NoteRelation[] = [];

  for (const targetNote of notes) {
    if (targetNote.id === sourceNoteId) continue;

    // 计算标签重叠度
    const sourceTags = new Set(sourceNote.tags || []);
    const targetTags = new Set(targetNote.tags || []);
    const commonTags = [...sourceTags].filter((tag) => targetTags.has(tag));

    // 计算关键词匹配（简单实现）
    const sourceKeywords = extractKeywords(sourceNote.content);
    const targetKeywords = extractKeywords(targetNote.content);
    const commonKeywords = sourceKeywords.filter((kw) =>
      targetKeywords.includes(kw)
    );

    // 综合相似度
    const tagScore = commonTags.length * 20;
    const keywordScore = commonKeywords.length * 5;
    const similarity = Math.min(100, tagScore + keywordScore);

    if (similarity >= 30) {
      relations.push({
        sourceNoteId: sourceNote.id,
        targetNoteId: targetNote.id,
        sourceTitle: sourceNote.title || "无标题",
        targetTitle: targetNote.title || "无标题",
        similarity,
        reason:
          commonTags.length > 0
            ? `共同标签: ${commonTags.join(", ")}`
            : `关键词重合: ${commonKeywords.slice(0, 3).join(", ")}`,
        tags: commonTags,
      });
    }
  }

  return relations
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, maxResults);
}

/**
 * 提取关键词（简单实现）
 */
function extractKeywords(content: string): string[] {
  // 简单的关键词提取：取长度在 2-10 之间的中文词汇
  const words = content.match(/[\u4e00-\u9fa5]{2,10}/g) || [];
  const freq: Record<string, number> = {};

  for (const word of words) {
    freq[word] = (freq[word] || 0) + 1;
  }

  // 返回出现频率较高的词
  return Object.entries(freq)
    .filter(([, count]) => count > 1)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([word]) => word);
}
