import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ArrowRight,
  MessageSquare,
  Search,
  Lightbulb,
  FileText,
  Sparkles,
  Loader2,
} from "lucide-react";

interface SkillsDialProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSkill: (skillId: string) => void;
}

export default function SkillsDial({
  isOpen,
  onClose,
  onSelectSkill,
}: SkillsDialProps) {
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 技能按钮配置 - 与 CaptureMenu 的 captureButtons 格式一致
  const skillButtons = [
    {
      id: "chat",
      icon: MessageSquare,
      label: "AI 对话",
      description: "与 AI 助手自由对话",
      color: "text-blue-500",
      bgColor: "bg-blue-50",
      onClick: () => onSelectSkill("chat"),
    },
    {
      id: "search",
      icon: Search,
      label: "智能搜索",
      description: "搜索笔记和知识库",
      color: "text-purple-500",
      bgColor: "bg-purple-50",
      onClick: () => onSelectSkill("search"),
    },
    {
      id: "brainstorm",
      icon: Lightbulb,
      label: "头脑风暴",
      description: "激发创意和灵感",
      color: "text-amber-500",
      bgColor: "bg-amber-50",
      onClick: () => onSelectSkill("brainstorm"),
    },
    {
      id: "draft",
      icon: FileText,
      label: "起草文档",
      description: "快速生成文档草稿",
      color: "text-green-500",
      bgColor: "bg-green-50",
      onClick: () => onSelectSkill("draft"),
    },
  ];

  // 处理输入提交
  const handleSubmit = () => {
    if (!inputValue.trim()) return;
    onSelectSkill("chat");
    onClose();
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Escape") {
      onClose();
    }
  };

  // 自动聚焦
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 背景遮罩 - 与 CaptureMenu 完全一致 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[90] bg-black/30 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* 菜单面板 - 与 CaptureMenu 完全一致 */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] w-full max-w-sm px-4"
          >
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
              {/* 顶部标题栏 - 与 CaptureMenu 完全一致 */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h2 className="text-base font-semibold text-gray-900">
                  今日事，我来帮。
                </h2>
                <button
                  onClick={onClose}
                  disabled={isLoading}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all active:scale-95 disabled:opacity-50"
                >
                  <X size={18} />
                </button>
              </div>

              {/* 输入区域 - 与 CaptureMenu 的 URL 输入区域格式一致 */}
              <div className="px-5 pt-5">
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <Sparkles size={18} />
                  </div>
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="询问、搜索或创作任何内容..."
                    disabled={isLoading}
                    className="w-full pl-11 pr-12 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30 transition-all disabled:opacity-50"
                  />
                  <button
                    onClick={handleSubmit}
                    disabled={!inputValue.trim() || isLoading}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                      inputValue.trim() && !isLoading
                        ? "bg-blue-500 text-white hover:bg-blue-600 active:scale-95"
                        : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    {isLoading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <ArrowRight size={16} />
                    )}
                  </button>
                </div>
              </div>

              {/* 分隔文字 - 与 CaptureMenu 完全一致 */}
              <div className="px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-gray-100" />
                  <span className="text-xs text-gray-400 font-medium">
                    选择功能
                  </span>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>
              </div>

              {/* 功能按钮列表 - 与 CaptureMenu 完全一致 */}
              <div className="px-5 pb-6 space-y-2.5">
                {skillButtons.map((button, index) => (
                  <motion.button
                    key={button.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => {
                      button.onClick();
                      onClose();
                    }}
                    disabled={isLoading}
                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-full bg-gray-50 hover:bg-gray-100 active:scale-[0.98] transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {/* 图标 */}
                    <div
                      className={`w-10 h-10 rounded-full ${button.bgColor} ${button.color} flex items-center justify-center transition-transform group-hover:scale-110`}
                    >
                      <button.icon size={20} />
                    </div>

                    {/* 文字 */}
                    <div className="flex-1 text-left">
                      <span className="text-sm font-medium text-gray-900">
                        {button.label}
                      </span>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {button.description}
                      </p>
                    </div>

                    {/* 箭头指示 */}
                    <ArrowRight
                      size={16}
                      className="text-gray-300 group-hover:text-gray-500 transition-colors"
                    />
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
