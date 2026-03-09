import React, { useState, useRef, useCallback } from "react";
import {
  Home,
  BookOpen,
  Search,
  Plus,
  Infinity,
} from "lucide-react";
import SkillsDial from "./SkillsDial";

interface BottomNavProps {
  currentView: string;
  onNavigate: (view: string) => void;
  onAIChat?: () => void;
  onVoiceCapture?: () => void;
  onCaptureMenu?: () => void;
  onSelectSkill?: (skillId: string) => void;
  onSearch?: () => void;
}

export default function BottomNav({
  currentView,
  onNavigate,
  onAIChat,
  onVoiceCapture,
  onCaptureMenu,
  onSelectSkill,
  onSearch,
}: BottomNavProps) {
  const [isPressing, setIsPressing] = useState(false);
  const [showSkillsDial, setShowSkillsDial] = useState(false);
  const pressTimer = useRef<NodeJS.Timeout | null>(null);
  const LONG_PRESS_DURATION = 600; // ms - slightly longer for skills dial

  // 处理 AI 按钮按下
  const handleAIPressStart = useCallback(() => {
    setIsPressing(true);
    pressTimer.current = setTimeout(() => {
      setIsPressing(false);
      setShowSkillsDial(true); // 显示技能转盘
    }, LONG_PRESS_DURATION);
  }, []);

  // 处理 AI 按钮释放
  const handleAIPressEnd = useCallback(() => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }

    if (isPressing && !showSkillsDial) {
      setIsPressing(false);
      // 单击也打开 SkillsDial，不再打开 AIChat
      setShowSkillsDial(true);
    }
  }, [isPressing, showSkillsDial]);

  // 处理 AI 按钮离开（防止误触）
  const handleAIPressLeave = useCallback(() => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    setIsPressing(false);
  }, []);

  // 处理技能选择
  const handleSelectSkill = useCallback((skillId: string) => {
    setShowSkillsDial(false);
    onSelectSkill?.(skillId);
  }, [onSelectSkill]);
  return (
    <nav className="absolute bottom-8 left-0 right-0 px-6 flex justify-between items-center pointer-events-none z-50" aria-label="主导航">
      {/* Left Pill */}
      <div className="bg-white/95 backdrop-blur-xl rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-1.5 flex items-center gap-1.5 pointer-events-auto border border-gray-100">
        <>
          <button
            onClick={() => onNavigate("home")}
            className={`w-[52px] h-[44px] flex items-center justify-center rounded-[14px] transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:scale-95 ${currentView === "home" ? "bg-[#f0f5ff] text-blue-600 font-medium" : "text-gray-500 hover:text-gray-700"}`}
            aria-label="主页"
            aria-current={currentView === "home" ? "page" : undefined}
          >
            <Home
              size={22}
              strokeWidth={2.5}
              fill={currentView === "home" ? "currentColor" : "none"}
              aria-hidden="true"
            />
          </button>
          <button
            onClick={() => onNavigate("library")}
            className={`w-[52px] h-[44px] flex items-center justify-center rounded-[14px] transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:scale-95 ${currentView === "library" ? "bg-[#f0f5ff] text-blue-600 font-medium" : "text-gray-500 hover:text-gray-700"}`}
            aria-label="记忆库"
            aria-current={currentView === "library" ? "page" : undefined}
          >
            <BookOpen size={22} strokeWidth={2.5} aria-hidden="true" />
          </button>
          <button
            onClick={onSearch}
            className={`w-[52px] h-[44px] flex items-center justify-center rounded-[14px] transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:scale-95 ${currentView === "search" ? "bg-[#f0f5ff] text-blue-600 font-medium" : "text-gray-500 hover:text-gray-700"}`}
            aria-label="搜索"
            aria-current={currentView === "search" ? "page" : undefined}
          >
            <Search size={22} strokeWidth={2.5} aria-hidden="true" />
          </button>
        </>
      </div>

      {/* Right Pill */}
      <div className="bg-white/95 backdrop-blur-xl rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] h-[56px] px-3.5 flex items-center gap-3 pointer-events-auto border border-gray-100">
        {/* AI Core Button */}
        <button
          onMouseDown={handleAIPressStart}
          onMouseUp={handleAIPressEnd}
          onMouseLeave={handleAIPressLeave}
          onTouchStart={handleAIPressStart}
          onTouchEnd={handleAIPressEnd}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
            isPressing
              ? "bg-blue-600 scale-95"
              : "bg-gradient-to-tr from-blue-500 via-purple-500 to-pink-500 hover:scale-105"
          }`}
          aria-label="AI 助手"
        >
          <Infinity size={20} className="text-white" strokeWidth={2.5} />
        </button>

        {/* Multi-modal Capture Button */}
        <button
          onClick={onCaptureMenu}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 bg-gray-100 text-gray-700 hover:bg-gray-200"
          aria-label="添加"
        >
          <Plus size={18} strokeWidth={2.5} />
        </button>
      </div>

      {/* Skills Dial */}
      <SkillsDial
        isOpen={showSkillsDial}
        onClose={() => setShowSkillsDial(false)}
        onSelectSkill={handleSelectSkill}
        anchorRef={{ current: null }}
      />
    </nav>
  );
}
