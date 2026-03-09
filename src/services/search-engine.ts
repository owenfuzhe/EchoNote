/**
 * 智能搜索引擎 - 基于 Fuse.js
 * 支持模糊匹配、权重配置、结果高亮
 */

import Fuse from 'fuse.js';
import { Note } from '../store/note-store';

// 搜索结果接口
export interface SearchResult {
  item: Note;
  score: number;
  matches: Array<{
    key: string;
    value: string;
    indices: Array<[number, number]>;
  }>;
}

// 高亮文本接口
export interface HighlightSegment {
  text: string;
  isHighlight: boolean;
}

// Fuse.js 配置选项
const fuseOptions: Fuse.IFuseOptions<Note> = {
  // 搜索字段及权重
  keys: [
    { name: 'title', weight: 0.6 },      // 标题权重最高
    { name: 'content', weight: 0.3 },    // 内容次之
    { name: 'tags', weight: 0.1 }        // 标签辅助
  ],
  // 模糊匹配阈值：0.0 = 完全匹配, 1.0 = 匹配所有
  threshold: 0.4,
  // 距离阈值（用于长文本）
  distance: 100,
  // 是否包含匹配位置信息（用于高亮）
  includeMatches: true,
  // 忽略位置（提升性能）
  ignoreLocation: true,
  // 最小匹配字符数
  minMatchCharLength: 2,
  // 是否包含分数
  includeScore: true,
  // 是否按分数排序
  shouldSort: true,
};

class SearchEngine {
  private fuse: Fuse<Note> | null = null;
  private notes: Note[] = [];

  /**
   * 初始化搜索引擎
   * @param notes 笔记列表
   */
  init(notes: Note[]): void {
    this.notes = notes;
    this.fuse = new Fuse(notes, fuseOptions);
  }

  /**
   * 更新搜索索引
   * @param notes 新的笔记列表
   */
  updateIndex(notes: Note[]): void {
    this.notes = notes;
    if (this.fuse) {
      this.fuse.setCollection(notes);
    } else {
      this.fuse = new Fuse(notes, fuseOptions);
    }
  }

  /**
   * 执行搜索
   * @param query 搜索关键词
   * @returns 搜索结果列表
   */
  search(query: string): SearchResult[] {
    if (!this.fuse || !query.trim()) {
      return [];
    }

    const results = this.fuse.search(query);
    return results.map((result) => ({
      item: result.item,
      score: result.score ?? 1,
      matches: result.matches?.map((match) => ({
        key: match.key ?? '',
        value: Array.isArray(match.value) ? match.value[0] : match.value ?? '',
        indices: match.indices,
      })) ?? [],
    }));
  }

  /**
   * 获取所有笔记（按时间排序）
   * @returns 所有笔记列表
   */
  getAllNotes(): Note[] {
    return this.notes;
  }

  /**
   * 根据 ID 获取笔记
   * @param id 笔记 ID
   * @returns 笔记或 undefined
   */
  getNoteById(id: string): Note | undefined {
    return this.notes.find((note) => note.id === id);
  }

  /**
   * 获取搜索建议
   * 基于笔记标题的前缀匹配
   * @param query 搜索关键词
   * @param limit 返回数量限制
   * @returns 建议列表
   */
  getSuggestions(query: string, limit: number = 5): string[] {
    if (!query.trim() || query.length < 2) {
      return [];
    }

    const suggestions = new Set<string>();
    const lowerQuery = query.toLowerCase();

    for (const note of this.notes) {
      // 标题建议
      if (note.title.toLowerCase().includes(lowerQuery)) {
        suggestions.add(note.title);
      }

      // 标签建议
      note.tags?.forEach((tag) => {
        if (tag.toLowerCase().includes(lowerQuery)) {
          suggestions.add(`#${tag}`);
        }
      });

      if (suggestions.size >= limit) {
        break;
      }
    }

    return Array.from(suggestions).slice(0, limit);
  }

  /**
   * 高亮匹配文本
   * 将匹配文本分割为高亮和非高亮段
   * @param text 原始文本
   * @param matches 匹配信息
   * @returns 高亮段数组
   */
  highlight(text: string, matches: Array<{ indices: Array<[number, number]> }>): HighlightSegment[] {
    if (!matches || matches.length === 0) {
      return [{ text, isHighlight: false }];
    }

    // 合并所有匹配区间
    const allIndices: Array<[number, number]> = [];
    matches.forEach((match) => {
      match.indices.forEach((index) => {
        allIndices.push([index[0], index[1]]);
      });
    });

    // 合并重叠区间
    const mergedIndices = this.mergeIntervals(allIndices.sort((a, b) => a[0] - b[0]));

    // 构建高亮段
    const segments: HighlightSegment[] = [];
    let lastIndex = 0;

    for (const [start, end] of mergedIndices) {
      // 添加非高亮部分
      if (start > lastIndex) {
        segments.push({
          text: text.slice(lastIndex, start),
          isHighlight: false,
        });
      }
      // 添加高亮部分
      segments.push({
        text: text.slice(start, end + 1),
        isHighlight: true,
      });
      lastIndex = end + 1;
    }

    // 添加剩余非高亮部分
    if (lastIndex < text.length) {
      segments.push({
        text: text.slice(lastIndex),
        isHighlight: false,
      });
    }

    return segments;
  }

  /**
   * 合并重叠区间
   * @param intervals 区间数组
   * @returns 合并后的区间数组
   */
  private mergeIntervals(intervals: Array<[number, number]>): Array<[number, number]> {
    if (intervals.length === 0) return [];

    const merged: Array<[number, number]> = [intervals[0]];

    for (let i = 1; i < intervals.length; i++) {
      const [currentStart, currentEnd] = intervals[i];
      const [lastStart, lastEnd] = merged[merged.length - 1];

      if (currentStart <= lastEnd + 1) {
        // 重叠或相邻，合并
        merged[merged.length - 1] = [lastStart, Math.max(lastEnd, currentEnd)];
      } else {
        merged.push([currentStart, currentEnd]);
      }
    }

    return merged;
  }

  /**
   * 截断文本并高亮
   * @param text 原始文本
   * @param matches 匹配信息
   * @param maxLength 最大长度
   * @returns 处理后的高亮段数组
   */
  highlightWithTruncation(
    text: string,
    matches: Array<{ indices: Array<[number, number]> }>,
    maxLength: number = 100
  ): HighlightSegment[] {
    if (!matches || matches.length === 0) {
      const truncated = text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
      return [{ text: truncated, isHighlight: false }];
    }

    // 找到第一个匹配位置
    const firstMatch = matches[0].indices[0];
    if (!firstMatch) {
      const truncated = text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
      return [{ text: truncated, isHighlight: false }];
    }

    // 围绕匹配位置截断文本
    const [matchStart] = firstMatch;
    let start = Math.max(0, matchStart - maxLength / 2);
    let end = Math.min(text.length, start + maxLength);

    // 调整起始位置确保不超出边界
    if (end - start < maxLength) {
      start = Math.max(0, end - maxLength);
    }

    const truncatedText = (start > 0 ? '...' : '') + text.slice(start, end) + (end < text.length ? '...' : '');

    // 调整匹配索引以适应截断后的文本
    const offset = start > 0 ? start - 3 : start;
    const adjustedMatches = matches.map((match) => ({
      indices: match.indices
        .map(([s, e]) => [s - offset, e - offset] as [number, number])
        .filter(([s, e]) => s >= 0 && e < truncatedText.length),
    }));

    return this.highlight(truncatedText, adjustedMatches);
  }
}

// 导出单例实例
export const searchEngine = new SearchEngine();
export default searchEngine;
