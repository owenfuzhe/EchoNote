import React, { useState, useEffect } from "react";
import { Search, Settings, Filter, ChevronDown, Clock, FileText, Image, Mic, Link, StickyNote, Archive, Sparkles, LayoutGrid, List } from "lucide-react";
import { useNoteStore, Note } from "../store/note-store";
import { MOCK_NOTES_200 } from "../services/mock-data";
import { generateTags, clusterNotes, TopicCluster } from "../services/ai-tagging";

interface LibraryViewProps {
  onNavigate: (view: string, noteId?: string) => void;
}

// 内容类型定义
const CONTENT_TYPES = [
  { id: "all", label: "不限类别", icon: null },
  { id: "article", label: "文章", icon: FileText },
  { id: "web", label: "网页", icon: Link },
  { id: "snippet", label: "片段", icon: StickyNote },
  { id: "note", label: "速记", icon: FileText },
  { id: "image", label: "图片", icon: Image },
  { id: "audio", label: "音频", icon: Mic },
];

// Mock 标签
const MOCK_TAGS = ["AI", "LLM", "架构", "产品", "设计", "研究", "阅读", "灵感"];

// Mock 笔记数据
const MOCK_NOTES: Note[] = [
  {
    id: "mock-1",
    title: "Karpathy 开源 autoresearch 一夜运行百次实验",
    content: "通过自动化脚本批量运行实验，收集数据并分析...",
    type: "link",
    tags: ["AI", "研究"],
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
  },
  {
    id: "mock-2",
    title: "OpenClaw 的爬虫工具功能强到离谱",
    content: "支持多平台、自动化、智能解析...",
    type: "link",
    tags: ["工具", "效率"],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: "mock-3",
    title: "字节系创业者想用 AI 做个游戏界的抖音",
    content: "AI 生成游戏内容、社交裂变、短视频形式...",
    type: "text",
    tags: ["AI", "产品", "创业"],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  },
];

export default function LibraryView({ onNavigate }: LibraryViewProps) {
  const { notes: realNotes, fetchNotes } = useNoteStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedType, setSelectedType] = useState("all");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");
  const [viewMode, setViewMode] = useState<"list" | "card">("list");

  // 合并真实数据和 Mock 数据
  const allNotes = [...realNotes, ...MOCK_NOTES];

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // 筛选逻辑
  const filteredNotes = allNotes.filter((note) => {
    // 搜索筛选
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchTitle = note.title?.toLowerCase().includes(query);
      const matchContent = note.content?.toLowerCase().includes(query);
      if (!matchTitle && !matchContent) return false;
    }

    // 类型筛选
    if (selectedType !== "all") {
      // 简化处理：根据内容判断类型
      const typeMap: Record<string, string[]> = {
        article: ["text"],
        web: ["link"],
        snippet: ["text"],
        note: ["text"],
        image: ["image"],
        audio: ["voice"],
      };
      const allowedTypes = typeMap[selectedType] || [];
      if (!allowedTypes.includes(note.type)) return false;
    }

    // 标签筛选
    if (selectedTags.length > 0) {
      const hasSelectedTag = selectedTags.some((tag) =>
        note.tags?.includes(tag)
      );
      if (!hasSelectedTag) return false;
    }

    return true;
  });

  // 排序
  const sortedNotes = [...filteredNotes].sort((a, b) => {
    const timeA = new Date(a.updatedAt).getTime();
    const timeB = new Date(b.updatedAt).getTime();
    return sortBy === "newest" ? timeB - timeA : timeA - timeB;
  });

  // 切换标签选择
  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  // 获取类型标签
  const getTypeLabel = (type: string) => {
    const found = CONTENT_TYPES.find((t) => t.id === type);
    return found?.label || "其他";
  };

  // 格式化时间
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours < 1) return "刚刚";
    if (hours < 24) return `${hours}小时前`;
    if (hours < 48) return "1天前";
    return `${Math.floor(hours / 24)}天前`;
  };

  // 获取当前筛选摘要
  const getFilterSummary = () => {
    if (selectedType === "all" && selectedTags.length === 0) {
      return "不限类别";
    }
    const parts = [];
    if (selectedType !== "all") {
      parts.push(getTypeLabel(selectedType));
    }
    if (selectedTags.length > 0) {
      parts.push(`${selectedTags.length}个标签`);
    }
    return parts.join(" · ");
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-b from-white to-gray-50" style={{ paddingBottom: '120px' }}>
      {/* Header */}
      <header className="flex items-center justify-between px-6 pt-14 pb-4 sticky top-0 bg-white/70 backdrop-blur-xl z-10">
        <h1 className="text-[20px] font-bold text-gray-900">记忆库</h1>
        <div className="flex items-center gap-2">
          <button className="p-2 text-gray-600 hover:bg-white/50 rounded-full transition-colors">
            <Settings size={20} />
          </button>
        </div>
      </header>

      <div className="px-6">
        {/* Search */}
        <div className="relative mb-4">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索笔记..."
            className="w-full pl-11 pr-4 py-3 bg-white/60 backdrop-blur-md rounded-xl text-gray-800 placeholder-gray-400 outline-none transition-all focus:bg-white/80 text-base"
          />
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-3 mb-6 overflow-x-auto hide-scrollbar">
          {/* 排序 */}
          <button 
            onClick={() => setSortBy(sortBy === "newest" ? "oldest" : "newest")}
            className="flex items-center gap-1 px-3 py-2 bg-white/60 backdrop-blur-md rounded-lg text-sm text-gray-700 hover:bg-white/80 transition-all flex-shrink-0"
          >
            <Clock size={14} />
            <span>{sortBy === "newest" ? "从新到旧" : "从旧到新"}</span>
          </button>

          {/* 类别筛选 */}
          <button 
            onClick={() => setShowFilterModal(true)}
            className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm transition-all flex-shrink-0 ${
              selectedType !== "all" || selectedTags.length > 0
                ? "bg-blue-500 text-white"
                : "bg-white/60 backdrop-blur-md text-gray-700 hover:bg-white/80"
            }`}
          >
            <Filter size={14} />
            <span>{getFilterSummary()}</span>
            <ChevronDown size={14} />
          </button>

          {/* 视图切换 */}
          <button
            onClick={() => setViewMode(viewMode === "list" ? "card" : "list")}
            className="flex items-center gap-1 px-3 py-2 bg-white/60 backdrop-blur-md rounded-lg text-sm text-gray-700 hover:bg-white/80 transition-all flex-shrink-0"
          >
            {viewMode === "list" ? (
              <>
                <LayoutGrid size={14} />
                <span>卡片视图</span>
              </>
            ) : (
              <>
                <List size={14} />
                <span>标题列表</span>
              </>
            )}
          </button>
        </div>

        {/* 标题列表视图 */}
        {viewMode === "list" && (
          <div className="space-y-1">
            {sortedNotes.map((note) => (
              <button
                key={note.id}
                onClick={() => onNavigate("document", note.id)}
                className="w-full text-left py-4 border-b border-gray-100 last:border-0 group"
              >
                <div className="flex items-start gap-3">
                  {/* 未读指示器 */}
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />

                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 mb-1 line-clamp-2 text-[15px]">
                      {note.title || "无标题"}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span>xiaohongshu.com</span>
                      <span>·</span>
                      <span>{getTypeLabel(note.type)}</span>
                      <span>·</span>
                      <span>{formatTime(note.updatedAt)}</span>
                    </div>
                  </div>

                  {/* 类型图标 */}
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <FileText size={16} className="text-gray-500" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* 文章卡片视图 */}
        {viewMode === "card" && (
          <div className="grid grid-cols-2 gap-4">
            {sortedNotes.map((note) => (
              <button
                key={note.id}
                onClick={() => onNavigate("document", note.id)}
                className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-left hover:shadow-md transition-shadow"
              >
                {/* 封面图占位 */}
                <div className="w-full aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl mb-3 flex items-center justify-center overflow-hidden">
                  <div className="w-12 h-12 rounded-full bg-white/50 flex items-center justify-center">
                    <FileText size={24} className="text-gray-400" />
                  </div>
                </div>

                {/* 标题 */}
                <h3 className="font-medium text-gray-900 mb-2 line-clamp-2 text-[15px]">
                  {note.title || "无标题"}
                </h3>

                {/* 来源和时间 */}
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span>xiaohongshu.com</span>
                  <span>·</span>
                  <span>{formatTime(note.updatedAt)}</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {sortedNotes.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-white/60 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Filter size={24} className="text-gray-400" />
            </div>
            <p className="text-gray-500 mb-1">没有找到匹配的笔记</p>
            <p className="text-sm text-gray-400">尝试调整筛选条件</p>
          </div>
        )}
      </div>

      {/* Filter Modal */}
      {showFilterModal && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center">
          {/* 背景遮罩 */}
          <div 
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setShowFilterModal(false)}
          />

          {/* 弹窗 */}
          <div className="relative w-full max-w-md bg-white rounded-t-3xl shadow-2xl max-h-[80vh] overflow-auto animate-slide-up">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <button 
                onClick={() => setShowFilterModal(false)}
                className="text-gray-500 text-base"
              >
                取消
              </button>
              <h2 className="text-base font-semibold text-gray-900">筛选类别</h2>
              <button 
                onClick={() => setShowFilterModal(false)}
                className="px-4 py-1.5 bg-blue-500 text-white rounded-lg text-sm font-medium"
              >
                完成
              </button>
            </div>

            {/* 类型选择 */}
            <div className="p-6">
              {/* 不限类别 */}
              <button
                onClick={() => setSelectedType("all")}
                className={`w-full py-3 rounded-xl text-center font-medium mb-4 transition-all ${
                  selectedType === "all"
                    ? "bg-blue-50 text-blue-600"
                    : "bg-gray-50 text-gray-700"
                }`}
              >
                不限类别
              </button>

              {/* 类型网格 */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                {CONTENT_TYPES.filter(t => t.id !== "all").map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setSelectedType(type.id)}
                    className={`flex items-center justify-between p-4 rounded-xl transition-all ${
                      selectedType === type.id
                        ? "bg-blue-50 border-2 border-blue-200"
                        : "bg-gray-50 border-2 border-transparent"
                    }`}
                  >
                    <span className={`font-medium ${
                      selectedType === type.id ? "text-blue-700" : "text-gray-700"
                    }`}>
                      {type.label}
                    </span>
                    {type.icon && (
                      <type.icon size={20} className={
                        selectedType === type.id ? "text-blue-600" : "text-gray-400"
                      } />
                    )}
                  </button>
                ))}
              </div>

              {/* 标签筛选 */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-500 mb-3">标签</h3>
                <div className="flex flex-wrap gap-2">
                  {MOCK_TAGS.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                        selectedTags.includes(tag)
                          ? "bg-blue-500 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* 已归档开关 */}
              <div className="flex items-center justify-between py-4 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <Archive size={18} className="text-gray-400" />
                  <span className="text-gray-700">切换查看已归档内容</span>
                </div>
                <button
                  onClick={() => setShowArchived(!showArchived)}
                  className={`w-12 h-6 rounded-full transition-colors relative ${
                    showArchived ? "bg-blue-500" : "bg-gray-300"
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${
                    showArchived ? "translate-x-6" : "translate-x-0.5"
                  }`} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
