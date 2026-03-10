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
  MessageSquare,
  Brain,
  ArrowRight,
  Loader2,
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

// 欢迎页面功能选项 - 与 CaptureMenu 风格一致
const WELCOME_FEATURES = [
  {
    id: "chat",
    label: "AI 对话",
    description: "与 AI 助手自由对话",
    icon: MessageSquare,
    color: "text-blue-500",
    bgColor: "bg-blue-50",
    prompt: "",
  },
  {
    id: "search",
    label: "智能搜索",
    description: "搜索笔记和知识库",
    icon: Search,
    color: "text-purple-500",
    bgColor: "bg-purple-50",
    prompt: "帮我搜索相关笔记",
  },
  {
    id: "brainstorm",
    label: "头脑风暴",
    description: "激发创意和灵感",
    icon: Brain,
    color: "text-amber-500",
    bgColor: "bg-amber-50",
    prompt: "帮我头脑风暴一些创意",
  },
  {
    id: "draft",
    label: "起草文档",
    description: "快速生成文档草稿",
    icon: FileEdit,
    color: "text-green-500",
    bgColor: "bg-green-50",
    prompt: "帮我起草一个文档",
  },
];

// 快捷标签
const QUICK_TAGS = [
  { id: "summarize", label: "总结笔记" },
  { id: "extract-todos", label: "提取待办" },
  { id: "generate-outline", label: "生成大纲" },
  { id: "polish", label: "润色文字" },
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
      polish: "请帮我润色这段文字",
    };

    const prompt = prompts[actionId];
    if (prompt) {
      handleSend(prompt);
    }
  };

  // 处理功能按钮点击
  const handleFeatureClick = (featureId: string) => {
    const feature = WELCOME_FEATURES.find((f) => f.id === featureId);
    if (feature && feature.prompt) {
      handleSend(feature.prompt);
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
          {/* 背景遮罩 - 与 CaptureMenu 一致 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[90] bg-black/30 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* 菜单面板 - 与 CaptureMenu 一致的居中卡片样式 */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] w-full max-w-sm px-4"
          >
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col">
              {/* 顶部标题栏 - 与 CaptureMenu 一致 */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
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

              {/* 内容区域 - 可滚动 */}
              <div className="flex-1 overflow-y-auto">
                {/* 欢迎界面 - 未开始对话时显示 */}
                {!hasStartedChat && !isLoading && (
                  <div className="px-5 py-5">
                    {/* 副标题 */}
                    <p className="text-sm text-gray-500 mb-4">选择一项功能开始</p>

                    {/* 功能按钮列表 - 与 CaptureMenu 风格一致 */}
                    <div className="space-y-2.5">
                      {WELCOME_FEATURES.map((feature, index) => (
                        <motion.button
                          key={feature.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          onClick={() => handleFeatureClick(feature.id)}
                          disabled={isLoading}
                          className="w-full flex items-center gap-3 px-4 py-3.5 rounded-full bg-gray-50 hover:bg-gray-100 active:scale-[0.98] transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {/* 图标 */}
                          <div
                            className={`w-10 h-10 rounded-full ${feature.bgColor} ${feature.color} flex items-center justify-center transition-transform group-hover:scale-110`}
                          >
                            <feature.icon size={20} />
                          </div>

                          {/* 文字 */}
                          <div className="flex-1 text-left">
                            <span className="text-sm font-medium text-gray-900">
                              {feature.label}
                            </span>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {feature.description}
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

                    {/* 快捷标签 */}
                    <div className="mt-5">
                      <p className="text-xs text-gray-400 mb-3">快速开始</p>
                      <div className="flex flex-wrap gap-2">
                        {QUICK_TAGS.map((tag) => (
                          <button
                            key={tag.id}
                            onClick={() => handleQuickAction(tag.id)}
                            disabled={isLoading}
                            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-xs text-gray-600 transition-colors disabled:opacity-50"
                          >
                            {tag.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 对话消息列表 */}
                {hasStartedChat && (
                  <div className="px-4 py-4 space-y-4 max-h-[40vh] overflow-y-auto">
                    {messages.map((message) => (
                      <div key={message.id}>
                        {/* 系统消息 */}
                        {message.role === "system" && (
                          <div className="flex justify-center">
                            <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                              {message.content}
                            </span>
                          </div>
                        )}

                        {/* 用户消息 */}
                        {message.role === "user" && (
                          <div className="flex justify-end">
                            <div className="max-w-[80%] flex flex-col items-end">
                              <div className="px-4 py-2.5 rounded-2xl rounded-br-md bg-gray-900 text-white">
                                <p className="text-sm leading-relaxed whitespace-pre-wrap">
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
                              <div className="flex gap-2">
                                {/* AI 头像 */}
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                                  <Sparkles className="w-3.5 h-3.5 text-white" />
                                </div>
                                <div className="px-1 py-1 text-gray-800">
                                  <div
                                    className="text-sm leading-relaxed"
                                    dangerouslySetInnerHTML={{
                                      __html: renderMarkdown(message.content),
                                    }}
                                  />
                                </div>
                              </div>
                              <span className="text-[10px] text-gray-400 mt-1 px-1 ml-9">
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
                        <div className="flex gap-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                            <Sparkles className="w-3.5 h-3.5 text-white" />
                          </div>
                          <div className="px-3 py-2 bg-white rounded-2xl rounded-tl-md border border-gray-200">
                            <div className="flex items-center gap-1">
                              <span
                                className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                                style={{ animationDelay: "0ms" }}
                              />
                              <span
                                className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                                style={{ animationDelay: "150ms" }}
                              />
                              <span
                                className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
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

              {/* 底部输入区域 */}
              <div className="border-t border-gray-100 px-4 py-4 flex-shrink-0">
                <div className="relative">
                  <textarea
                    ref={inputRef}
                    value={inputText}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder="询问、搜索或创作任何内容..."
                    className="w-full bg-gray-50 rounded-2xl px-4 py-3 pr-12 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30 transition-all resize-none min-h-[44px] max-h-[120px]"
                    rows={1}
                    disabled={isLoading}
                  />
                  <button
                    onClick={() => handleSend()}
                    disabled={!inputText.trim() || isLoading}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                      inputText.trim() && !isLoading
                        ? "bg-blue-500 text-white hover:bg-blue-600 active:scale-95"
                        : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    {isLoading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Send size={16} />
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-gray-400 text-center mt-2">
                  按 Enter 发送 · Shift+Enter 换行
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
