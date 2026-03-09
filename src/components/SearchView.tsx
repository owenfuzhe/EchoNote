/**
 * 搜索页面 - 仿照图二设计
 */

import React, { useState } from "react";
import { Search, SlidersHorizontal, X, FileText } from "lucide-react";
import { useNoteStore, Note } from "../store/note-store";
import { MOCK_NOTES_200 } from "../services/mock-data";

interface SearchViewProps {
  onNavigate: (view: string, noteId?: string) => void;
  onClose: () => void;
}

// 使用生成的 200 篇 Mock 数据

export default function SearchView({ onNavigate, onClose }: SearchViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { notes: realNotes } = useNoteStore();
  
  const allNotes = [...realNotes, ...MOCK_NOTES_200];

  // 按时间分组
  const today = allNotes.filter(n => {
    const date = new Date(n.updatedAt);
    const now = new Date();
    return date.toDateString() === now.toDateString();
  });
  
  const yesterday = allNotes.filter(n => {
    const date = new Date(n.updatedAt);
    const now = new Date();
    const yest = new Date(now.getTime() - 86400000);
    return date.toDateString() === yest.toDateString();
  });
  
  const lastWeek = allNotes.filter(n => {
    const date = new Date(n.updatedAt);
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 86400000 * 7);
    return date < weekAgo;
  });

  const NoteItem = ({ note, key }: { note: Note; key?: string }) => (
    <button
      onClick={() => onNavigate("document", note.id)}
      className="w-full flex items-start gap-3 py-3 text-left"
    >
      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
        <FileText size={20} className="text-gray-400" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-base font-medium text-gray-900 mb-1 line-clamp-1">
          {note.title || "无标题"}
        </h3>
        <p className="text-sm text-gray-400">在 私人页面</p>
      </div>
    </button>
  );

  const TimeGroup = ({ title, notes }: { title: string; notes: Note[] }) => {
    if (notes.length === 0) return null;
    return (
      <div className="mb-6">
        <h2 className="text-sm text-gray-400 mb-2">{title}</h2>
        <div className="space-y-1">
          {notes.map((note) => (
            <NoteItem key={note.id} note={note} />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="absolute inset-x-0 top-0 bottom-[100px] z-[60] bg-white flex flex-col mx-auto max-w-md">
      {/* 顶部搜索栏 */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
        <div className="flex-1 flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2">
          <Search size={18} className="text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索或询问 AI"
            className="flex-1 bg-transparent text-gray-800 placeholder-gray-400 outline-none text-base"
          />
        </div>
        <button className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors">
          <SlidersHorizontal size={20} />
        </button>
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* 提示文字 */}
      <div className="px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-600">
              <path d="M12 2L9.19 8.63L2 9.24L7.46 13.97L5.82 21L12 17.27L18.18 21L16.54 13.97L22 9.24L14.81 8.63L12 2Z"/>
            </svg>
          </div>
          <span className="text-gray-700">向 AI 询问 Fu Owen 的 Notion 中的任何问题</span>
        </div>
      </div>

      {/* 搜索结果列表 */}
      <div className="flex-1 overflow-y-auto px-4">
        <TimeGroup title="今天" notes={today} />
        <TimeGroup title="昨天" notes={yesterday} />
        <TimeGroup title="上周" notes={lastWeek} />
      </div>
    </div>
  );
}
