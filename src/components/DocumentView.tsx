import React, { useState, useEffect, useCallback } from "react";
import { ChevronLeft, Share, MoreHorizontal, Sparkles, CheckSquare, History } from "lucide-react";
import { useNoteStore } from "../store/note-store";
import { chat, ChatMessage } from "../services/bailian-chat";
import { extractTodos, createTodoItem } from "../services/todo-extractor";
import ContextPanel from "./ContextPanel";

interface DocumentViewProps {
  onNavigate: (view: string, noteId?: string) => void;
  noteId: string | null;
}

export default function DocumentView({ onNavigate, noteId }: DocumentViewProps) {
  const { notes, updateNote, getNoteById } = useNoteStore();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isExtractingTodos, setIsExtractingTodos] = useState(false);
  const [showContextPanel, setShowContextPanel] = useState(false);

  const note = noteId ? getNoteById(noteId) : null;
  const isWechatRichNote =
    note?.type === "link" &&
    note?.tags?.includes("微信公众号") &&
    /<[^>]+>/.test(content);

  // 加载笔记数据
  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content);
    }
  }, [note]);

  // 自动保存
  const handleSave = useCallback(async () => {
    if (!noteId || !note) return;
    
    setIsSaving(true);
    await updateNote(noteId, { title, content });
    setTimeout(() => setIsSaving(false), 500);
  }, [noteId, note, title, content, updateNote]);

  // 防抖保存
  useEffect(() => {
    const timer = setTimeout(() => {
      if (title !== note?.title || content !== note?.content) {
        handleSave();
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [title, content, note, handleSave]);

  // AI 对话
  const handleSendMessage = async () => {
    if (!chatInput.trim() || !note) return;

    const userMessage: ChatMessage = { role: "user", content: chatInput };
    const newMessages = [...chatMessages, userMessage];
    setChatMessages(newMessages);
    setChatInput("");
    setIsChatLoading(true);

    try {
      // 构建包含笔记上下文的系统提示
      const systemPrompt = `你是 CrispyNote 的智能助手。用户正在查看以下笔记：

标题：${note.title}
内容：${note.content}

请基于笔记内容回答用户的问题。如果问题与笔记无关，也可以正常回答。`;

      const response = await chat(newMessages, {
        systemPrompt,
        temperature: 0.7,
      });

      setChatMessages([...newMessages, { role: "assistant", content: response.content }]);
    } catch (error) {
      console.error("Chat error:", error);
      setChatMessages([...newMessages, { role: "assistant", content: "抱歉，发生了错误，请稍后重试。" }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // 提取待办
  const handleExtractTodos = async () => {
    if (!content.trim() || !noteId) return;

    setIsExtractingTodos(true);
    try {
      const todos = await extractTodos(content);
      if (todos.length > 0) {
        const todoItems = todos.map(t => createTodoItem(t.text, t.priority));
        const currentTodos = note?.todos || [];
        await updateNote(noteId, { 
          todos: [...currentTodos, ...todoItems] 
        });
        alert(`已提取 ${todos.length} 个待办事项！`);
      } else {
        alert("未检测到待办事项");
      }
    } catch (error) {
      console.error("Extract todos error:", error);
      alert("提取失败，请检查 API 配置");
    } finally {
      setIsExtractingTodos(false);
    }
  };

  if (!note) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#f8f8f9]">
        <p className="text-gray-400">笔记不存在</p>
        <button 
          onClick={() => onNavigate("home")}
          className="mt-4 text-blue-500 hover:text-blue-600"
        >
          返回首页
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gradient-to-b from-[#b3d4e5] to-[#e6f0f5] overflow-hidden relative">
      {/* Header */}
      <header className="flex items-center justify-between px-4 pt-14 pb-6 z-10">
        <button
          onClick={() => onNavigate("home")}
          className="text-gray-900 p-2 hover:bg-black/5 rounded-full transition-colors"
        >
          <ChevronLeft size={28} strokeWidth={2.5} />
        </button>
        <div className="flex-1 flex flex-col items-center">
          <h1 className="text-[17px] font-bold text-gray-900 flex items-center gap-1 tracking-tight">
            {title || "Untitled"}
          </h1>
          <div className="flex items-center gap-1.5 text-[13px] text-gray-600 font-medium mt-0.5">
            <span className="opacity-70 text-sm">📁</span> 私人
            {isSaving && <span className="text-gray-400">· 保存中...</span>}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={handleExtractTodos}
            disabled={isExtractingTodos}
            className="text-gray-900 p-2 hover:bg-black/5 rounded-full transition-colors disabled:opacity-50"
            title="提取待办"
          >
            <CheckSquare size={24} strokeWidth={2} />
          </button>
          <button 
            onClick={() => setShowAIChat(!showAIChat)}
            className={`p-2 hover:bg-black/5 rounded-full transition-colors ${showAIChat ? 'text-blue-500' : 'text-gray-900'}`}
            title="AI 对话"
          >
            <Sparkles size={24} strokeWidth={2} />
          </button>
          <button className="text-gray-900 p-2 hover:bg-black/5 rounded-full transition-colors">
            <Share size={24} strokeWidth={2} />
          </button>
          <button 
            onClick={() => setShowContextPanel(true)}
            className="text-gray-900 p-2 hover:bg-black/5 rounded-full transition-colors"
            title="笔记溯源"
          >
            <History size={24} strokeWidth={2} />
          </button>
        </div>
      </header>

      {/* Document Content */}
      <div className="flex-1 bg-white rounded-t-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.08)] overflow-y-auto px-6 pt-8 relative z-20" style={{ paddingBottom: '120px' }}>
        <div className="flex items-start justify-between mb-8">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-[32px] font-bold text-gray-900 tracking-tight leading-tight w-full outline-none bg-transparent placeholder-gray-300"
            placeholder="Document Title"
          />
        </div>

        {isWechatRichNote ? (
          <article
            className="w-full min-h-[50vh] text-gray-800 text-[17px] leading-[1.75] break-words [&_img]:max-w-full [&_img]:h-auto [&_img]:my-4 [&_p]:my-4 [&_section]:my-4 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:my-5 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:my-4"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        ) : (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full min-h-[50vh] text-gray-800 text-[17px] leading-[1.6] outline-none resize-none bg-transparent"
            placeholder="开始输入内容..."
          />
        )}
      </div>

      {/* AI Chat Panel */}
      {showAIChat && (
        <div className="absolute bottom-20 left-4 right-4 bg-white rounded-2xl shadow-xl border border-gray-200 z-30 max-h-[60%] flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="font-semibold text-gray-900">AI 助手</span>
            <button 
              onClick={() => setShowAIChat(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[300px]">
            {chatMessages.length === 0 ? (
              <p className="text-gray-400 text-center text-sm">问我关于这篇笔记的任何问题...</p>
            ) : (
              chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm ${
                    msg.role === "user" 
                      ? "bg-blue-500 text-white" 
                      : "bg-gray-100 text-gray-800"
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))
            )}
            {isChatLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 px-4 py-2 rounded-2xl text-sm text-gray-500">
                  思考中...
                </div>
              </div>
            )}
          </div>

          <div className="p-3 border-t border-gray-100">
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder="输入消息..."
                className="flex-1 px-4 py-2 bg-gray-100 rounded-full text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSendMessage}
                disabled={!chatInput.trim() || isChatLoading}
                className="px-4 py-2 bg-blue-500 text-white rounded-full text-sm font-medium disabled:opacity-50"
              >
                发送
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Context Panel */}
      <ContextPanel
        noteId={noteId || ""}
        isOpen={showContextPanel}
        onClose={() => setShowContextPanel(false)}
      />
    </div>
  );
}
