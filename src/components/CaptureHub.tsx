import { useState, useRef, useCallback } from "react";
import { Plus, Infinity, FileText, Image, Link2, Mic } from "lucide-react";

interface CaptureHubProps {
  onAIChat: () => void;
  onVoiceCapture: () => void;
  onFileCapture: () => void;
  onImageCapture: () => void;
  onLinkCapture: () => void;
}

export default function CaptureHub({
  onAIChat,
  onVoiceCapture,
  onFileCapture,
  onImageCapture,
  onLinkCapture,
}: CaptureHubProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isPressing, setIsPressing] = useState(false);
  const pressTimer = useRef<NodeJS.Timeout | null>(null);
  const LONG_PRESS_DURATION = 500; // ms

  // 处理 AI 按钮按下
  const handleAIPressStart = useCallback(() => {
    setIsPressing(true);
    pressTimer.current = setTimeout(() => {
      // 长按触发语音
      setIsPressing(false);
      onVoiceCapture();
    }, LONG_PRESS_DURATION);
  }, [onVoiceCapture]);

  // 处理 AI 按钮释放
  const handleAIPressEnd = useCallback(() => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    
    if (isPressing) {
      // 短按触发对话
      setIsPressing(false);
      onAIChat();
    }
  }, [isPressing, onAIChat]);

  // 处理 AI 按钮离开（防止误触）
  const handleAIPressLeave = useCallback(() => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    setIsPressing(false);
  }, []);

  return (
    <>
      {/* Glassmorphism Pill */}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50">
        <div className="bg-white/85 backdrop-blur-xl rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.15)] p-1.5 flex items-center gap-1 border border-white/50">
          {/* AI Core Button */}
          <button
            onMouseDown={handleAIPressStart}
            onMouseUp={handleAIPressEnd}
            onMouseLeave={handleAIPressLeave}
            onTouchStart={handleAIPressStart}
            onTouchEnd={handleAIPressEnd}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${
              isPressing
                ? "bg-blue-600 scale-95"
                : "bg-gradient-to-tr from-blue-500 via-purple-500 to-pink-500 hover:scale-105"
            }`}
          >
            <Infinity
              size={24}
              className="text-white"
              strokeWidth={2.5}
            />
          </button>

          {/* Divider */}
          <div className="w-px h-6 bg-gray-200 mx-1" />

          {/* Multi-modal Capture Button */}
          <button
            onClick={() => setShowMenu(!showMenu)}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
              showMenu
                ? "bg-gray-800 text-white rotate-45"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <Plus size={20} strokeWidth={2.5} />
          </button>
        </div>

        {/* Expanded Menu */}
        {showMenu && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 flex gap-2">
            <button
              onClick={() => {
                onFileCapture();
                setShowMenu(false);
              }}
              className="w-11 h-11 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-700 hover:bg-gray-50 transition-all hover:scale-110"
            >
              <FileText size={18} />
            </button>
            <button
              onClick={() => {
                onImageCapture();
                setShowMenu(false);
              }}
              className="w-11 h-11 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-700 hover:bg-gray-50 transition-all hover:scale-110"
            >
              <Image size={18} />
            </button>
            <button
              onClick={() => {
                onLinkCapture();
                setShowMenu(false);
              }}
              className="w-11 h-11 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-700 hover:bg-gray-50 transition-all hover:scale-110"
            >
              <Link2 size={18} />
            </button>
            <button
              onClick={() => {
                onVoiceCapture();
                setShowMenu(false);
              }}
              className="w-11 h-11 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-700 hover:bg-gray-50 transition-all hover:scale-110"
            >
              <Mic size={18} />
            </button>
          </div>
        )}
      </div>

      {/* Backdrop for menu */}
      {showMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowMenu(false)}
        />
      )}
    </>
  );
}
