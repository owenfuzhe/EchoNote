/**
 * AI 助手弹窗 - 仿照图一设计
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Search,
  Sparkles,
  Edit3,
  ChevronRight,
  AtSign,
  Paperclip,
  Globe,
  ArrowUp,
} from "lucide-react";

interface SkillsDialProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSkill: (skillId: string) => void;
  anchorRef: React.RefObject<HTMLElement>;
}

export default function SkillsDial({
  isOpen,
  onClose,
  onSelectSkill,
}: SkillsDialProps) {
  const [inputValue, setInputValue] = useState("");

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {/* 背景遮罩 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[90] bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 弹窗 - 仿照 CaptureMenu 居中 */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ type: "spring", damping: 25, stiffness: 350 }}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] w-full max-w-sm px-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[80vh] overflow-y-auto">
          {/* 顶部栏 */}
        <div className="flex items-center justify-between px-4 py-3">
          <button className="w-10 h-10 rounded-full flex items-center justify-center text-gray-600">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </button>
          <button className="flex items-center gap-1 px-4 py-2 bg-gray-100 rounded-full text-sm text-gray-700">
            <Sparkles size={16} />
            <span>Automatic</span>
            <ChevronRight size={16} className="rotate-90" />
          </button>
          <button className="w-10 h-10 rounded-full flex items-center justify-center text-gray-600">
            <Edit3 size={20} />
          </button>
        </div>

        {/* 主要内容区 */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-32">
          {/* 简笔画图标 */}
          <div className="w-20 h-20 mb-6">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              {/* 简笔画小人 */}
              <circle cx="50" cy="25" r="15" fill="none" stroke="black" strokeWidth="3"/>
              <path d="M50 40 L50 70" stroke="black" strokeWidth="3" strokeLinecap="round"/>
              <path d="M35 55 L50 45 L65 55" stroke="black" strokeWidth="3" strokeLinecap="round"/>
              <path d="M50 70 L35 90" stroke="black" strokeWidth="3" strokeLinecap="round"/>
              <path d="M50 70 L65 90" stroke="black" strokeWidth="3" strokeLinecap="round"/>
              {/* 闪电 */}
              <path d="M70 20 L75 10 L80 20 L85 15 L80 30 L75 25 L70 30 Z" fill="black"/>
            </svg>
          </div>

          {/* 标题 */}
          <h1 className="text-2xl font-semibold text-gray-900 mb-8">
            今日事，我来帮。
          </h1>

          {/* 三个选项 - 纯文字 */}
          <div className="w-full max-w-md space-y-4">
            <button
              onClick={() => onSelectSkill("search")}
              className="w-full flex items-center gap-3 text-left"
            >
              <Search size={20} className="text-gray-500" />
              <span className="text-gray-800">搜索任何内容</span>
            </button>
            <button
              onClick={() => onSelectSkill("brainstorm")}
              className="w-full flex items-center gap-3 text-left"
            >
              <Sparkles size={20} className="text-gray-500" />
              <span className="text-gray-800">头脑风暴写作创意</span>
            </button>
            <button
              onClick={() => onSelectSkill("draft")}
              className="w-full flex items-center gap-3 text-left"
            >
              <Edit3 size={20} className="text-gray-500" />
              <span className="text-gray-800">起草项目方案</span>
            </button>
          </div>
        </div>

        {/* 底部输入框 */}
        <div className="px-4 pb-8">
          <div className="bg-gray-100 rounded-3xl p-4">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="询问、搜索或创作任何内容..."
              className="w-full bg-transparent text-gray-800 placeholder-gray-400 outline-none text-base mb-3"
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm text-gray-500">
                  <AtSign size={16} />
                </button>
                <button className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm text-gray-500">
                  <Paperclip size={16} />
                </button>
                <button className="flex items-center gap-1 text-sm text-gray-500">
                  <Globe size={16} />
                  <span>全部信息源</span>
                  <ChevronRight size={14} className="rotate-90" />
                </button>
              </div>
              <button className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-white">
                <ArrowUp size={20} />
              </button>
            </div>
          </div>
        </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
