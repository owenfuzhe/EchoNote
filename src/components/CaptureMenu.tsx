import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ArrowRight,
  FileText,
  Music,
  Image,
  Globe,
  Youtube,
  Clipboard,
  Link2,
  Loader2,
} from "lucide-react";

interface CaptureMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onFileCapture: (type: "pdf" | "audio") => void;
  onImageCapture: () => void;
  onLinkCapture: (url?: string) => void;
  onYoutubeCapture: (url: string) => void;
  onTextCapture: (text: string) => void;
  isLoading?: boolean;
}

export default function CaptureMenu({
  isOpen,
  onClose,
  onFileCapture,
  onImageCapture,
  onLinkCapture,
  onYoutubeCapture,
  onTextCapture,
  isLoading = false,
}: CaptureMenuProps) {
  const [urlInput, setUrlInput] = useState("");
  const [activeMode, setActiveMode] = useState<"url" | "youtube" | null>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);

  // 功能按钮配置
  const captureButtons = [
    {
      id: "pdf",
      icon: FileText,
      label: "PDF",
      description: "上传 PDF 文件",
      color: "text-red-500",
      bgColor: "bg-red-50",
      onClick: () => onFileCapture("pdf"),
    },
    {
      id: "audio",
      icon: Music,
      label: "音频",
      description: "上传音频文件",
      color: "text-purple-500",
      bgColor: "bg-purple-50",
      onClick: () => onFileCapture("audio"),
    },
    {
      id: "image",
      icon: Image,
      label: "图片",
      description: "上传图片文件",
      color: "text-green-500",
      bgColor: "bg-green-50",
      onClick: onImageCapture,
    },
    {
      id: "website",
      icon: Globe,
      label: "网站",
      description: "抓取网页内容",
      color: "text-blue-500",
      bgColor: "bg-blue-50",
      onClick: () => {
        setActiveMode("url");
        setTimeout(() => urlInputRef.current?.focus(), 100);
      },
    },
    {
      id: "youtube",
      icon: Youtube,
      label: "YouTube",
      description: "输入 YouTube 链接",
      color: "text-rose-500",
      bgColor: "bg-rose-50",
      onClick: () => {
        setActiveMode("youtube");
        setTimeout(() => urlInputRef.current?.focus(), 100);
      },
    },
    {
      id: "text",
      icon: Clipboard,
      label: "复制的文字",
      description: "粘贴文字内容",
      color: "text-amber-500",
      bgColor: "bg-amber-50",
      onClick: async () => {
        try {
          const text = await navigator.clipboard.readText();
          if (text.trim()) {
            onTextCapture(text);
          }
        } catch (err) {
          console.error("Failed to read clipboard:", err);
          // 如果无法读取剪贴板，创建一个提示让用户手动粘贴
          const fallbackText = prompt("请粘贴您要添加的文字内容：");
          if (fallbackText?.trim()) {
            onTextCapture(fallbackText);
          }
        }
      },
    },
  ];

  // 处理 URL 提交
  const handleUrlSubmit = () => {
    if (!urlInput.trim()) return;

    if (activeMode === "youtube") {
      onYoutubeCapture(urlInput.trim());
    } else {
      onLinkCapture(urlInput.trim());
    }
    setUrlInput("");
    setActiveMode(null);
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleUrlSubmit();
    }
    if (e.key === "Escape") {
      if (activeMode) {
        setActiveMode(null);
        setUrlInput("");
      } else {
        onClose();
      }
    }
  };

  // 获取当前 placeholder
  const getPlaceholder = () => {
    if (activeMode === "youtube") return "输入 YouTube 链接...";
    return "从网上查找来源...";
  };

  // 获取当前输入框图标
  const getInputIcon = () => {
    if (activeMode === "youtube") return Youtube;
    return Link2;
  };

  const InputIcon = getInputIcon();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 背景遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[90] bg-black/30 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* 菜单面板 */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] w-full max-w-sm px-4"
          >
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
              {/* 顶部标题栏 */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h2 className="text-base font-semibold text-gray-900">
                  生成音频概览时参考网站
                </h2>
                <button
                  onClick={onClose}
                  disabled={isLoading}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all active:scale-95 disabled:opacity-50"
                >
                  <X size={18} />
                </button>
              </div>

              {/* URL 输入区域 */}
              <div className="px-5 pt-5">
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <InputIcon size={18} />
                  </div>
                  <input
                    ref={urlInputRef}
                    type="text"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={getPlaceholder()}
                    disabled={isLoading}
                    className="w-full pl-11 pr-12 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30 transition-all disabled:opacity-50"
                  />
                  <button
                    onClick={handleUrlSubmit}
                    disabled={!urlInput.trim() || isLoading}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                      urlInput.trim() && !isLoading
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

              {/* 分隔文字 */}
              <div className="px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-gray-100" />
                  <span className="text-xs text-gray-400 font-medium">
                    或上传文件
                  </span>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>
              </div>

              {/* 功能按钮列表 */}
              <div className="px-5 pb-6 space-y-2.5">
                {captureButtons.map((button, index) => (
                  <motion.button
                    key={button.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => {
                      button.onClick();
                      if (button.id !== "website" && button.id !== "youtube") {
                        // 这些模式不立即关闭菜单，而是触发相应功能
                      }
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
