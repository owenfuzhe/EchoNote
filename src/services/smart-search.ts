/**
 * 智能搜索推荐服务
 * 基于用户笔记内容提供个性化搜索推荐
 */

import { useNoteStore } from "../store/note-store";
import { searchWeb, SearchResult } from "./search";

// =============================================================================
// Types
// =============================================================================

export interface SearchRecommendation {
  /** 推荐标题 */
  title: string;
  /** 推荐原因 */
  reason: string;
  /** 搜索关键词 */
  query: string;
  /** 相关笔记ID */
  relatedNoteIds: string[];
  /** 推荐类型 */
  type: 'knowledge_gap' | 'trending' | 'related' | 'deep_dive';
}

export interface SmartSearchOptions {
  /** 推荐数量 */
  limit?: number;
  /** 是否包含实时搜索 */
  includeRealtime?: boolean;
}

// =============================================================================
// 关键词提取
// =============================================================================

/**
 * 从笔记内容提取关键词
 * 简单的 TF-IDF 实现
 */
function extractKeywords(text: string, topN: number = 10): string[] {
  // 中文分词（简化版）
  const words = text
    .toLowerCase()
    .replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 2);

  // 停用词
  const stopWords = new Set([
    '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这', '那', '这些', '那些', '这个', '那个', '之', '与', '及', '等', '或', '但', '而', '因为', '所以', '如果', '虽然', '然而', '因此', '可以', '可能', '需要', '进行', '通过', '根据', '对于', '关于', '作为', '以及', '但是', '还是', '只是', '不过', '然后', '接着', '于是', '比如', '例如', '等等', '其他', '一些', '一下', '一种', '一个', '一些', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'up', 'down', 'out', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'and', 'but', 'if', 'or', 'because', 'until', 'while', 'this', 'that', 'these', 'those', 'they', 'them', 'their', 'what', 'which', 'who', 'whom', 'whose', 'this', 'that', 'am', 'it', 'its', 'itself', 'he', 'she', 'her', 'hers', 'him', 'his', 'himself', 'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours', 'yourself', 'yourselves', 'them', 'themselves', 'what', 'whatever', 'which', 'whichever', 'who', 'whoever', 'whom', 'whose', 'why', 'how', 'where', 'wherever', 'when', 'whenever', 'however', 'whatever', 'whichever', 'whoever', 'whomever'
  ]);

  // 统计词频
  const wordFreq: Map<string, number> = new Map();
  for (const word of words) {
    if (!stopWords.has(word) && word.length >= 2) {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    }
  }

  // 返回高频词
  return Array.from(wordFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([word]) => word);
}

// =============================================================================
// 推荐生成
// =============================================================================

/**
 * 分析笔记内容，生成知识缺口推荐
 */
function generateKnowledgeGapRecommendations(
  notes: { title: string; content: string; tags: string[] }[],
  keywords: string[]
): SearchRecommendation[] {
  const recommendations: SearchRecommendation[] = [];

  // 常见技术领域关键词映射
  const techDomains: Record<string, string[]> = {
    'AI': ['人工智能', '机器学习', '深度学习', '神经网络', '大模型', 'LLM', 'GPT', 'Claude', 'AI Agent'],
    '前端': ['React', 'Vue', 'Angular', 'TypeScript', 'Next.js', 'Tailwind', 'CSS', 'HTML'],
    '后端': ['Node.js', 'Python', 'Go', 'Java', 'Rust', '微服务', 'API', '数据库'],
    'DevOps': ['Docker', 'Kubernetes', 'CI/CD', 'GitHub Actions', 'Terraform', 'AWS'],
    '移动': ['iOS', 'Android', 'React Native', 'Flutter', 'Swift', 'Kotlin'],
    '数据': ['数据分析', '数据可视化', 'SQL', 'Pandas', '大数据', '数据仓库'],
  };

  // 检查每个领域的关键词覆盖情况
  for (const [domain, domainKeywords] of Object.entries(techDomains)) {
    const hasKeyword = domainKeywords.some(kw =>
      keywords.some(noteKw => noteKw.toLowerCase().includes(kw.toLowerCase()))
    );

    if (hasKeyword) {
      // 找到相关笔记
      const relatedNotes = notes.filter(note =>
        domainKeywords.some(kw =>
          note.title.toLowerCase().includes(kw.toLowerCase()) ||
          note.content.toLowerCase().includes(kw.toLowerCase()) ||
          note.tags.some(tag => tag.toLowerCase().includes(kw.toLowerCase()))
        )
      );

      // 检查是否有缺失的子主题
      const missingTopics = domainKeywords.filter(kw =>
        !keywords.some(noteKw => noteKw.toLowerCase().includes(kw.toLowerCase()))
      );

      if (missingTopics.length > 0 && relatedNotes.length > 0) {
        recommendations.push({
          title: `${domain}进阶：${missingTopics.slice(0, 3).join('、')}`,
          reason: `你记录了 ${relatedNotes.length} 篇${domain}相关内容，可以深入了解这些进阶主题`,
          query: `${domain} ${missingTopics[0]}`,
          relatedNoteIds: relatedNotes.map(n => n.id || ''),
          type: 'knowledge_gap',
        });
      }
    }
  }

  return recommendations;
}

/**
 * 生成相关主题推荐
 */
function generateRelatedRecommendations(
  notes: { title: string; content: string; tags: string[] }[],
  keywords: string[]
): SearchRecommendation[] {
  const recommendations: SearchRecommendation[] = [];

  // 基于标签聚类
  const tagGroups: Map<string, string[]> = new Map();
  for (const note of notes) {
    for (const tag of note.tags) {
      if (!tagGroups.has(tag)) {
        tagGroups.set(tag, []);
      }
      tagGroups.get(tag)!.push(note.id || '');
    }
  }

  // 为每个标签组生成推荐
  for (const [tag, noteIds] of tagGroups.entries()) {
    if (noteIds.length >= 2) {
      recommendations.push({
        title: `${tag}最新进展`,
        reason: `你有 ${noteIds.length} 篇关于"${tag}"的笔记，看看有什么新动态`,
        query: `${tag} 最新`,
        relatedNoteIds: noteIds,
        type: 'trending',
      });
    }
  }

  return recommendations.slice(0, 3);
}

// =============================================================================
// 主函数
// =============================================================================

/**
 * 获取智能搜索推荐
 * 基于用户笔记内容生成个性化推荐
 */
export async function getSmartSearchRecommendations(
  options: SmartSearchOptions = {}
): Promise<SearchRecommendation[]> {
  const { limit = 5, includeRealtime = false } = options;

  try {
    // 获取所有笔记
    const noteStore = useNoteStore.getState();
    const notes = noteStore.notes;

    if (notes.length === 0) {
      // 如果没有笔记，返回默认推荐
      return [
        {
          title: 'AI 人工智能最新进展',
          reason: '探索 AI 领域的最新动态',
          query: 'AI 人工智能 最新进展 2024',
          relatedNoteIds: [],
          type: 'trending',
        },
        {
          title: '前端开发技术趋势',
          reason: '了解前端技术的最新发展方向',
          query: '前端开发 技术趋势 2024',
          relatedNoteIds: [],
          type: 'trending',
        },
        {
          title: '产品经理必读书籍',
          reason: '提升产品思维的经典书单',
          query: '产品经理 必读书籍 推荐',
          relatedNoteIds: [],
          type: 'related',
        },
      ];
    }

    // 合并所有笔记内容
    const allContent = notes
      .map(n => `${n.title} ${n.content} ${n.tags.join(' ')}`)
      .join(' ');

    // 提取关键词
    const keywords = extractKeywords(allContent, 20);

    // 生成推荐
    const recommendations: SearchRecommendation[] = [];

    // 知识缺口推荐
    const gapRecommendations = generateKnowledgeGapRecommendations(notes, keywords);
    recommendations.push(...gapRecommendations);

    // 相关主题推荐
    const relatedRecommendations = generateRelatedRecommendations(notes, keywords);
    recommendations.push(...relatedRecommendations);

    // 如果需要实时搜索，执行搜索并补充结果
    if (includeRealtime && recommendations.length < limit) {
      try {
        const searchResults = await searchWeb(keywords.slice(0, 3).join(' '), { limit: 3 });
        for (const result of searchResults.slice(0, limit - recommendations.length)) {
          recommendations.push({
            title: result.title,
            reason: `相关搜索结果：${result.source}`,
            query: result.title,
            relatedNoteIds: [],
            type: 'related',
          });
        }
      } catch (e) {
        console.error('实时搜索失败:', e);
      }
    }

    return recommendations.slice(0, limit);
  } catch (error) {
    console.error('生成推荐失败:', error);
    return [];
  }
}

/**
 * 根据输入内容实时推荐搜索关键词
 */
export function getRealtimeSuggestions(
  input: string,
  notes: { title: string; content: string; tags: string[] }[]
): string[] {
  if (!input.trim() || input.length < 2) {
    return [];
  }

  const suggestions: string[] = [];
  const lowerInput = input.toLowerCase();

  // 从笔记标题中匹配
  for (const note of notes) {
    if (note.title.toLowerCase().includes(lowerInput)) {
      suggestions.push(note.title);
    }
  }

  // 从标签中匹配
  for (const note of notes) {
    for (const tag of note.tags) {
      if (tag.toLowerCase().includes(lowerInput) && !suggestions.includes(tag)) {
        suggestions.push(tag);
      }
    }
  }

  // 添加常见搜索扩展
  const extensions = ['教程', '最佳实践', '案例分析', '工具推荐', '最新进展'];
  for (const ext of extensions) {
    const suggestion = `${input} ${ext}`;
    if (!suggestions.includes(suggestion)) {
      suggestions.push(suggestion);
    }
  }

  return suggestions.slice(0, 5);
}

// =============================================================================
// Default Export
// =============================================================================

export default {
  getSmartSearchRecommendations,
  getRealtimeSuggestions,
};
