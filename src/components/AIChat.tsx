import React, { useState, useRef, useEffect, ChangeEvent, KeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Send,
  Sparkles,
  FileText,
  CheckSquare,
  ListTree,
  History,
  ChevronDown,
  AtSign,
  Paperclip,
  Search,
  Lightbulb,
  FileEdit,
} from "lucide-react";
import { GoogleGenAI } from "@google/genai";

type MessageRole = "user" | "model" | "system";

interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
}

export interface AIChatProps {
  isOpen: boolean;
  onClose: () => void;
  initialContext?: string;
}

// 系统提示词
const SYSTEM_PROMPT = `你是一个智能笔记助手，帮助用户整理思路、提取信息、生成内容。

## 角色设定
- 你是 EchoNote 的 AI 助手，语气友好、专业
- 你擅长理解和分析笔记内容，提供有价值的建议

## 核心能力
- 总结笔记要点
- 提取待办事项
- 生成内容大纲
- 回答关于笔记的问题
- 协助思考和创作

## 交互原则
- 回答简洁但有深度
- 使用 Markdown 格式让回复更易读
- 主动发现信息中的关键洞察`;

// 快捷操作配置
const QUICK_ACTIONS = [
  { id: "summarize", label: "总结这篇", icon: FileText },
  { id: "extract-todos", label: "提取待办", icon: CheckSquare },
  { id: "generate-outline", label: "生成大纲", icon: ListTree },
];

// 欢迎页面快捷选项
const WELCOME_SHORTCUTS = [
  {
    id: "search",
    label: "搜索任何内容",
    icon: Search,
    prompt: "帮我搜索相关信息",
  },
  {
    id: "brainstorm",
    label: "头脑风暴写作创意",
    icon: Lightbulb,
    prompt: "帮我头脑风暴一些写作创意",
  },
  {
    id: "draft",
    label: "起草项目方案",
    icon: FileEdit,
    prompt: "帮我起草一个项目方案",
  },
];

export default function AIChat({ isOpen, onClose, initialContext }: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMode, setSelectedMode] = useState("Automatic");
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const modeDropdownRef = useRef<HTMLDivElement>(null);

  const modes = ["Automatic", "Search", "Creative", "Precise"];

  // 获取 API Key
  const getApiKey = () => {
    return import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem("gemini_api_key") || "";
  };

  // 初始化对话历史
  useEffect(() => {
    if (isOpen && initialContext && messages.length === 0) {
      const contextMessage: Message = {
        id: Date.now().toString(),
        role: "system",
        content: "已加载当前笔记内容",
        timestamp: new Date(),
      };
      setMessages([contextMessage]);
    }
  }, [isOpen, initialContext, messages.length]);

  // 重置对话
  const handleNewChat = () => {
    setMessages([]);
    setInputText("");
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }
  };

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

  // 滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 输入框自动聚焦
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // 处理键盘事件 - ESC 关闭弹窗
  useEffect(() => {
    if (!isOpen) return;

    // 禁用背景滚动
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    // 使用 capture 阶段确保优先处理
    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  // 处理输入框高度自适应
  const handleInputChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + "px";
  };

  // 调用 Gemini API
  const callGeminiAPI = async (userMessage: string, history: Message[]) => {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error("请设置 Gemini API Key（VITE_GEMINI_API_KEY）");
    }

    const genAI = new GoogleGenAI({ apiKey });

    const contents: { role: string; parts: { text: string }[] }[] = [
      { role: "user", parts: [{ text: SYSTEM_PROMPT }] },
      { role: "model", parts: [{ text: "好的，我是你的智能笔记助手。" }] },
    ];

    if (initialContext) {
      contents.push(
        { role: "user", parts: [{ text: `以下是我的笔记内容：\n\n${initialContext}` }] },
        { role: "model", parts: [{ text: "我已了解您的笔记内容，请问有什么我可以帮助您的？" }] }
      );
    }

    history
      .filter((msg) => msg.role !== "system")
      .forEach((msg) => {
        contents.push({
          role: msg.role,
          parts: [{ text: msg.content }],
        });
      });

    contents.push({
      role: "user",
      parts: [{ text: userMessage }],
    });

    const response = await genAI.models.generateContent({
      model: "gemini-2.0-flash",
      contents,
    });

    return response.text || "抱歉，我暂时没有理解您的问题。";
  };

  // 发送消息
  const handleSend = async (text?: string) => {
    const messageText = text || inputText.trim();
    if (!messageText || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: messageText,
      timestamp: new Date(),
    };

    if (!text) {
      setInputText("");
      if (inputRef.current) {
        inputRef.current.style.height = "auto";
      }
    }

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const responseText = await callGeminiAPI(messageText, messages);

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: "model",
        content: responseText,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiResponse]);
    } catch (error) {
      console.error("AI Chat Error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "model",
        content: error instanceof Error ? error.message : "抱歉，发生了错误，请稍后重试。",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // 处理快捷操作
  const handleQuickAction = (actionId: string) => {
    const prompts: Record<string, string> = {
      summarize: "请帮我总结这份笔记的主要内容和关键要点",
      "extract-todos": "请从这份笔记中提取所有待办事项和行动项",
      "generate-outline": "请为这份笔记生成一个结构化的大纲",
    };

    const prompt = prompts[actionId];
    if (prompt) {
      handleSend(prompt);
    }
  };

  // 处理欢迎页面快捷选项
  const handleWelcomeShortcut = (shortcutId: string) => {
    const shortcut = WELCOME_SHORTCUTS.find((s) => s.id === shortcutId);
    if (shortcut) {
      handleSend(shortcut.prompt);
    }
  };

  // 处理 Enter 键发送
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 简单的 Markdown 渲染
  const renderMarkdown = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/`(.*?)`/g, "<code class='bg-black/10 px-1 rounded text-sm font-mono'>$1</code>")
      .replace(/### (.*)/g, "<h3 class='font-bold text-base mt-3 mb-2'>$1</h3>")
      .replace(/## (.*)/g, "<h2 class='font-bold text-lg mt-4 mb-2'>$1</h2>")
      .replace(/# (.*)/g, "<h1 class='font-bold text-xl mt-4 mb-2'>$1</h1>")
      .replace(/- (.*)/g, "<li class='ml-4'>• $1</li>")
      .replace(/\n/g, "<br/>");
  };

  // 格式化时间
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
  };

  const hasStartedChat = messages.filter((m) => m.role !== "system").length > 0;

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
            className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm cursor-pointer"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
          />

          {/* 聊天面板 */}
          <motion.div
            ref={chatContainerRef}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-[100]"
          >
            <div className="h-full bg-[#fafafa] dark:bg-[#1a1a1a] flex flex-col overflow-hidden">
              {/* 顶部栏 */}
              <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-[#1a1a1a] border-b border-gray-100 dark:border-gray-800">
                {/* 左侧：历史按钮 */}
                <button
                  onClick={() => {}}
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  title="历史记录"
                >
                  <History className="w-5 h-5" />
                </button>

                {/* 中间：模式下拉 */}
                <div className="relative" ref={modeDropdownRef}>
                  <button
                    onClick={() => setShowModeDropdown(!showModeDropdown)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    {selectedMode}
                    <ChevronDown className={`w-4 h-4 transition-transform ${showModeDropdown ? "rotate-180" : ""}`} />
                  </button>

                  <AnimatePresence>
                    {showModeDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 py-1 min-w-[140px] z-10"
                      >
                        {modes.map((mode) => (
                          <button
                            key={mode}
                            onClick={() => {
                              setSelectedMode(mode);
                              setShowModeDropdown(false);
                            }}
                            className={`w-full px-4 py-2 text-sm text-left transition-colors ${
                              selectedMode === mode
                                ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                                : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                            }`}
                          >
                            {mode}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* 右侧：关闭按钮 */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onClose();
                  }}
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer z-[110]"
                  title="关闭"
                  type="button"
                  aria-label="关闭"
                >
                  <X className="w-5 h-5 pointer-events-none" />
                </button>
              </div>

              {/* 消息列表区域 */}
              <div className="flex-1 overflow-y-auto">
                {/* 欢迎界面 - 未开始对话时显示 */}
                {!hasStartedChat && !isLoading && (
                  <div className="h-full flex flex-col items-center justify-center px-6">
                    {/* 大 Logo */}
                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center mb-6 shadow-lg shadow-blue-500/25">
                      <Sparkles className="w-10 h-10 text-white" />
                    </div>

                    {/* 主标题 */}
                    <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-12">
                      今日事，我来帮。
                    </h1>

                    {/* 快捷选项卡片 */}
                    <div className="w-full max-w-md space-y-3">
                      {WELCOME_SHORTCUTS.map((shortcut, index) => (
                        <motion.button
                          key={shortcut.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          onClick={() => handleWelcomeShortcut(shortcut.id)}
                          className="w-full flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all text-left group"
                        >
                          <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 transition-colors">
                            <shortcut.icon className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-blue-500 transition-colors" />
                          </div>
                          <span className="text-gray-700 dark:text-gray-300 font-medium">
                            {shortcut.label}
                          </span>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 对话消息列表 */}
                {hasStartedChat && (
                  <div className="px-4 py-6 space-y-6 w-full">
                    {messages.map((message) => (
                      <div key={message.id}>
                        {/* 系统消息 */}
                        {message.role === "system" && (
                          <div className="flex justify-center">
                            <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
                              {message.content}
                            </span>
                          </div>
                        )}

                        {/* 用户消息 */}
                        {message.role === "user" && (
                          <div className="flex justify-end">
                            <div className="max-w-[80%] flex flex-col items-end">
                              <div className="px-5 py-3 rounded-2xl rounded-br-md bg-gray-900 dark:bg-blue-600 text-white">
                                <p className="text-[15px] leading-relaxed whitespace-pre-wrap">
                                  {message.content}
                                </p>
                              </div>
                              <span className="text-[10px] text-gray-400 mt-1 px-1">
                                {formatTime(message.timestamp)}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* AI 消息 */}
                        {message.role === "model" && (
                          <div className="flex justify-start">
                            <div className="max-w-[85%] flex flex-col items-start">
                              <div className="flex gap-3">
                                {/* AI 头像 */}
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 mt-1">
                                  <Sparkles className="w-4 h-4 text-white" />
                                </div>
                                <div className="px-1 py-1 text-gray-800 dark:text-gray-200">
                                  <div
                                    className="text-[15px] leading-relaxed"
                                    dangerouslySetInnerHTML={{
                                      __html: renderMarkdown(message.content),
                                    }}
                                  />
                                </div>
                              </div>
                              <span className="text-[10px] text-gray-400 mt-1 px-1 ml-11">
                                {formatTime(message.timestamp)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* 加载动画 */}
                    {isLoading && (
                      <div className="flex justify-start">
                        <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                            <Sparkles className="w-4 h-4 text-white" />
                          </div>
                          <div className="px-4 py-3 bg-white dark:bg-gray-800 rounded-2xl rounded-tl-md border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-1.5">
                              <span
                                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                                style={{ animationDelay: "0ms" }}
                              />
                              <span
                                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                                style={{ animationDelay: "150ms" }}
                              />
                              <span
                                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                                style={{ animationDelay: "300ms" }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* 快捷操作栏（仅在加载上下文时显示） */}
              {initialContext && hasStartedChat && messages.length < 4 && !isLoading && (
                <div className="bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 px-4 py-3">
                  <p className="text-xs text-gray-400 mb-2">快捷操作</p>
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    {QUICK_ACTIONS.map((action) => (
                      <button
                        key={action.id}
                        onClick={() => handleQuickAction(action.id)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-colors whitespace-nowrap"
                      >
                        <action.icon className="w-4 h-4" />
                        {action.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 底部输入区域 */}
              <div className="bg-white dark:bg-[#1a1a1a] border-t border-gray-100 dark:border-gray-800 px-4 py-4">
                <div className="w-full">
                  {/* 输入框容器 */}
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-3xl px-4 py-3">
                    <textarea
                      ref={inputRef}
                      value={inputText}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                      placeholder="询问、搜索或创作任何内容..."
                      className="w-full bg-transparent border-none outline-none resize-none text-[15px] text-gray-800 dark:text-gray-200 placeholder-gray-400 max-h-[200px] min-h-[24px] py-1"
                      rows={1}
                      disabled={isLoading}
                    />

                    {/* 底部工具栏 */}
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                      {/* 左侧工具按钮 */}
                      <div className="flex items-center gap-1">
                        <button
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                          title="提及"
                        >
                          <AtSign className="w-4 h-4" />
                        </button>
                        <button
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                          title="附件"
                        >
                          <Paperclip className="w-4 h-4" />
                        </button>
                        <button className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm">
                          <span>全部信息源</span>
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* 右侧发送按钮 */}
                      <button
                        onClick={() => handleSend()}
                        disabled={!inputText.trim() || isLoading}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                          inputText.trim() && !isLoading
                            ? "bg-gray-900 dark:bg-blue-600 text-white hover:bg-gray-800 dark:hover:bg-blue-500 active:scale-95"
                            : "bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
                        }`}
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* 提示文字 */}
                  <p className="text-[11px] text-gray-400 text-center mt-2">
                    按 Enter 发送 · Shift+Enter 换行
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
