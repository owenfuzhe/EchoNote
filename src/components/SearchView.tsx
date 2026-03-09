/**
 * 搜索页面 - 集成 Fuse.js 智能搜索引擎
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Search, SlidersHorizontal, X, FileText, Clock, Tag } from "lucide-react";
import { useNoteStore, Note } from "../store/note-store";
import { MOCK_NOTES_200 } from "../services/mock-data";
import { searchEngine, SearchResult, HighlightSegment } from "../services/search-engine";

interface SearchViewProps {
  onNavigate: (view: string, noteId?: string) => void;
  onClose: () => void;
}

// 防抖钩子
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// 格式化日期
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (dateOnly.getTime() === today.getTime()) {
    return `今天 ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
  } else if (dateOnly.getTime() === yesterday.getTime()) {
    return `昨天 ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
  } else {
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  }
}

export default function SearchView({ onNavigate, onClose }: SearchViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const { notes: realNotes } = useNoteStore();

  const allNotes = useMemo(() => [...realNotes, ...MOCK_NOTES_200], [realNotes]);

  // 初始化搜索引擎
  useEffect(() => {
    searchEngine.init(allNotes);
  }, [allNotes]);

  // 防抖搜索词
  const debouncedQuery = useDebounce(searchQuery, 200);

  // 执行搜索
  useEffect(() => {
    if (debouncedQuery.trim()) {
      setIsSearching(true);
      const results = searchEngine.search(debouncedQuery);
      setSearchResults(results);

      // 获取搜索建议
      const suggs = searchEngine.getSuggestions(debouncedQuery, 5);
      setSuggestions(suggs);

      setIsSearching(false);
    } else {
      setSearchResults([]);
      setSuggestions([]);
    }
  }, [debouncedQuery]);

  // 处理 ESC 键关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // 高亮文本组件
  const HighlightedText = ({ segments }: { segments: HighlightSegment[] }) => (
    <>
      {segments.map((segment, idx) => (
        segment.isHighlight ? (
          <span key={idx} className="bg-yellow-200 text-yellow-900 font-medium rounded px-0.5">
            {segment.text}
          </span>
        ) : (
          <span key={idx}>{segment.text}</span>
        )
      ))}
    </>
  );

  // 渲染搜索结果项
  const SearchResultItem = ({ result }: { result: SearchResult }) => {
    const { item, matches } = result;

    // 获取标题高亮
    const titleMatches = matches.filter(m => m.key === 'title');
    const titleSegments = titleMatches.length > 0
      ? searchEngine.highlight(item.title, titleMatches)
      : [{ text: item.title || "无标题", isHighlight: false }];

    // 获取内容高亮（截断）
    const contentMatches = matches.filter(m => m.key === 'content');
    const contentPreview = contentMatches.length > 0
      ? searchEngine.highlightWithTruncation(item.content, contentMatches, 80)
      : [{ text: item.content.slice(0, 80) + (item.content.length > 80 ? '...' : ''), isHighlight: false }];

    return (
      <button
        onClick={() => onNavigate("document", item.id)}
        className="w-full flex items-start gap-3 py-3 px-2 text-left hover:bg-gray-50 rounded-lg transition-colors"
      >
        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
          <FileText size={20} className="text-gray-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-medium text-gray-900 mb-1 line-clamp-1">
            <HighlightedText segments={titleSegments} />
          </h3>
          <p className="text-sm text-gray-500 line-clamp-2 mb-1">
            <HighlightedText segments={contentPreview} />
          </p>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Clock size={12} />
            <span>{formatDate(item.updatedAt)}</span>
            {item.tags && item.tags.length > 0 && (
              <>
                <span className="mx-1">·</span>
                <Tag size={12} />
                <span>{item.tags.slice(0, 2).join(', ')}</span>
              </>
            )}
          </div>
        </div>
      </button>
    );
  };

  // 渲染建议项
  const SuggestionItem = ({ suggestion, onClick }: { suggestion: string; onClick: () => void }) => (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors"
    >
      <Search size={16} className="text-gray-400" />
      <span className="text-sm text-gray-700">{suggestion}</span>
    </button>
  );

  // 按时间分组显示最近笔记
  const RecentNotes = () => {
    const sortedNotes = [...allNotes].sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    ).slice(0, 10);

    return (
      <div className="space-y-1">
        <h2 className="text-sm font-medium text-gray-900 px-4 py-2">最近笔记</h2>
        {sortedNotes.map((note) => (
          <button
            key={note.id}
            onClick={() => onNavigate("document", note.id)}
            className="w-full flex items-start gap-3 py-3 px-2 text-left hover:bg-gray-50 rounded-lg transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
              <FileText size={20} className="text-gray-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-medium text-gray-900 mb-1 line-clamp-1">
                {note.title || "无标题"}
              </h3>
              <p className="text-sm text-gray-400">
                {formatDate(note.updatedAt)} · 在 私人页面
              </p>
            </div>
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="absolute inset-x-0 top-0 bottom-[100px] z-[60] bg-white flex flex-col mx-auto max-w-md">
      {/* 顶部搜索栏 */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
        <div className="flex-1 flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2">
          <Search size={18} className="text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索笔记、内容或标签..."
            className="flex-1 bg-transparent text-gray-800 placeholder-gray-400 outline-none text-base"
            autoFocus
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center"
            >
              <X size={12} className="text-white" />
            </button>
          )}
        </div>
        <button className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors">
          <SlidersHorizontal size={20} />
        </button>
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* 搜索建议列表 */}
      {suggestions.length > 0 && !isSearching && (
        <div className="border-b border-gray-100">
          {suggestions.map((suggestion, idx) => (
            <SuggestionItem
              key={idx}
              suggestion={suggestion}
              onClick={() => setSearchQuery(suggestion.replace(/^#/, ''))}
            />
          ))}
        </div>
      )}

      {/* 搜索结果或最近笔记 */}
      <div className="flex-1 overflow-y-auto px-4 py-2">
        {searchQuery.trim() ? (
          // 搜索结果
          <>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-500">
                找到 {searchResults.length} 个结果
              </span>
              {isSearching && (
                <span className="text-xs text-gray-400">搜索中...</span>
              )}
            </div>

            {searchResults.length > 0 ? (
              <div className="space-y-1">
                {searchResults.map((result) => (
                  <SearchResultItem key={result.item.id} result={result} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <Search size={24} className="text-gray-400" />
                </div>
                <h3 className="text-base font-medium text-gray-900 mb-1">未找到相关笔记</h3>
                <p className="text-sm text-gray-500">尝试使用其他关键词或检查拼写</p>
              </div>
            )}
          </>
        ) : (
          // 最近笔记
          <RecentNotes />
        )}
      </div>

      {/* 底部提示 */}
      <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
        <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-white rounded border text-gray-400">ESC</kbd>
            关闭
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-white rounded border text-gray-400">↑↓</kbd>
            选择
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-white rounded border text-gray-400">Enter</kbd>
            打开
          </span>
        </div>
      </div>
    </div>
  );
}
