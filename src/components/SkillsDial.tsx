/**
 * AI 助手弹窗 - 简化版设计
 */

import React, { useState, useRef, useEffect } from "react";
import {
  X,
  Search,
  Sparkles,
  Edit3,
  ChevronDown,
  AtSign,
  Paperclip,
  Globe,
  ArrowUp,
  History,
  MessageSquare,
  Lightbulb,
  FileText,
  TrendingUp,
  BookOpen,
} from "lucide-react";
import { getSmartSearchRecommendations, getRealtimeSuggestions, SearchRecommendation } from "../services/smart-search";
import { useNoteStore } from "../store/note-store";

interface SkillsDialProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSkill: (skillId: string) => void;
}

// 技能选项配置
const SKILL_OPTIONS = [
  {
    id: "chat",
    label: "AI 对话",
    description: "与 AI 助手自由对话",
    icon: MessageSquare,
    color: "from-blue-500 to-purple-500",
  },
  {
    id: "search",
    label: "智能搜索",
    description: "搜索笔记和知识库",
    icon: Search,
    color: "from-emerald-500 to-teal-500",
  },
  {
    id: "brainstorm",
    label: "头脑风暴",
    description: "激发创意和灵感",
    icon: Lightbulb,
    color: "from-amber-500 to-orange-500",
  },
  {
    id: "draft",
    label: "起草文档",
    description: "快速生成文档草稿",
    icon: FileText,
    color: "from-rose-500 to-pink-500",
  },
];

// 模式选项
const MODES = ["Automatic", "Search", "Creative", "Precise"];

export default function SkillsDial({
  isOpen,
  onClose,
  onSelectSkill,
}: SkillsDialProps) {
  const [inputValue, setInputValue] = useState("");
  const [selectedMode, setSelectedMode] = useState("Automatic");
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  const [recommendations, setRecommendations] = useState<SearchRecommendation[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const modeDropdownRef = useRef<HTMLDivElement>(null);
  const notes = useNoteStore(state => state.notes);

  // 自动聚焦输入框 + ESC 关闭
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      // 加载智能推荐
      loadRecommendations();
      
      // 添加 ESC 键监听
      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      document.addEventListener('keydown', handleEsc);
      return () => document.removeEventListener('keydown', handleEsc);
    }
  }, [isOpen, onClose]);

  // 加载智能推荐
  const loadRecommendations = async () => {
    try {
      const recs = await getSmartSearchRecommendations({ limit: 3 });
      setRecommendations(recs);
    } catch (e) {
      console.error('加载推荐失败:', e);
    }
  };

  // 输入变化时获取实时建议
  useEffect(() => {
    if (inputValue.trim().length >= 2) {
      const newSuggestions = getRealtimeSuggestions(inputValue, notes);
      setSuggestions(newSuggestions);
      setShowSuggestions(newSuggestions.length > 0);
    } else {
      setShowSuggestions(false);
    }
  }, [inputValue, notes]);

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modeDropdownRef.current && !modeDropdownRef.current.contains(e.target as Node)) {
        setShowModeDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && inputValue.trim()) {
      onSelectSkill("chat");
      onClose();
    }
    if (e.key === "Escape") {
      onClose();
    }
  };

  // 处理发送
  const handleSend = () => {
    if (inputValue.trim()) {
      onSelectSkill("chat");
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90]">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 弹窗 */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] w-full max-w-md px-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* 顶部栏 */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            {/* 历史按钮 */}
            <button
              onClick={() => onSelectSkill("history")}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
            >
              <History size={20} />
            </button>

            {/* 模式下拉 */}
            <div className="relative" ref={modeDropdownRef}>
              <button
                onClick={() => setShowModeDropdown(!showModeDropdown)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
              >
                <Sparkles size={14} className="text-blue-500" />
                <span>{selectedMode}</span>
                <ChevronDown
                  size={14}
                  className={`transition-transform ${showModeDropdown ? "rotate-180" : ""}`}
                />
              </button>

              {showModeDropdown && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white rounded-xl shadow-lg border border-gray-100 py-1 min-w-[140px] z-10">
                  {MODES.map((mode) => (
                    <button
                      key={mode}
                      onClick={() => {
                        setSelectedMode(mode);
                        setShowModeDropdown(false);
                      }}
                      className={`w-full px-4 py-2 text-sm text-left transition-colors ${
                        selectedMode === mode
                          ? "bg-blue-50 text-blue-600"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 关闭按钮 */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onClose();
              }}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer z-[110]"
              type="button"
            >
              <X size={20} />
            </button>
          </div>

          {/* 主要内容区 */}
          <div className="px-5 py-6">
            {/* 欢迎标题 */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-blue-500/25">
                <Sparkles size={28} className="text-white" />
              </div>
              <h1 className="text-xl font-semibold text-gray-900">
                今日事，我来帮。
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                选择一项功能开始
              </p>
            </div>

            {/* 技能选项网格 */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {SKILL_OPTIONS.map((skill) => (
                <button
                  key={skill.id}
                  onClick={() => {
                    onSelectSkill(skill.id);
                    onClose();
                  }}
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-gray-50 hover:bg-gray-100 active:scale-95 transition-all group"
                >
                  <div
                    className={`w-10 h-10 rounded-xl bg-gradient-to-br ${skill.color} flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow`}
                  >
                    <skill.icon size={20} className="text-white" />
                  </div>
                  <div className="text-center">
                    <span className="text-sm font-medium text-gray-900">
                      {skill.label}
                    </span>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {skill.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            {/* 快捷提示 */}
            <div className="space-y-2 mb-6">
              <p className="text-xs text-gray-400 font-medium">快速开始</p>
              <div className="flex flex-wrap gap-2">
                {["总结笔记", "提取待办", "生成大纲", "润色文字"].map((hint) => (
                  <button
                    key={hint}
                    onClick={() => {
                      setInputValue(hint);
                      inputRef.current?.focus();
                    }}
                    className="px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                  >
                    {hint}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 底部输入框 */}
          <div className="px-4 pb-4">
            <div className="bg-gray-100 rounded-2xl p-3">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="询问、搜索或创作任何内容..."
                className="w-full bg-transparent text-gray-800 placeholder-gray-400 outline-none text-base mb-3 px-1"
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm text-gray-500 hover:text-gray-700 transition-colors">
                    <AtSign size={16} />
                  </button>
                  <button className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm text-gray-500 hover:text-gray-700 transition-colors">
                    <Paperclip size={16} />
                  </button>
                  <button className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-sm text-gray-500 hover:bg-white transition-colors">
                    <Globe size={14} />
                    <span>全部信息源</span>
                    <ChevronDown size={12} />
                  </button>
                </div>
                <button
                  onClick={handleSend}
                  disabled={!inputValue.trim()}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                    inputValue.trim()
                      ? "bg-gray-900 text-white hover:bg-gray-800 active:scale-95"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  <ArrowUp size={18} />
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-400 text-center mt-2">
              按 Enter 发送 · Shift+Enter 换行
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
