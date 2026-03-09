/**
 * 笔记溯源面板组件
 * 显示 AI 生成内容的完整上下文
 */

import React, { useState, useEffect } from "react";
import {
  X,
  History,
  Bot,
  User,
  Clock,
  Sparkles,
  Link2,
  ChevronDown,
  ChevronUp,
  Trash2,
} from "lucide-react";
import {
  ContextTrace,
  getNoteProvenance,
  getContextGraphStats,
  clearContextGraph,
} from "../services/context-graph";

interface ContextPanelProps {
  noteId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ContextPanel({
  noteId,
  isOpen,
  onClose,
}: ContextPanelProps) {
  const [provenance, setProvenance] = useState<{
    traces: ContextTrace[];
    generatedByAI: boolean;
    generationCount: number;
    models: string[];
    firstGeneratedAt?: string;
    lastGeneratedAt?: string;
  } | null>(null);
  const [expandedTraces, setExpandedTraces] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState({
    totalTraces: 0,
    totalPrecedents: 0,
    totalLinks: 0,
  });

  useEffect(() => {
    if (isOpen && noteId) {
      const data = getNoteProvenance(noteId);
      setProvenance(data);
      setStats(getContextGraphStats());
    }
  }, [isOpen, noteId]);

  const toggleTrace = (traceId: string) => {
    const newExpanded = new Set(expandedTraces);
    if (newExpanded.has(traceId)) {
      newExpanded.delete(traceId);
    } else {
      newExpanded.add(traceId);
    }
    setExpandedTraces(newExpanded);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "未知时间";
    return new Date(dateStr).toLocaleString("zh-CN", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTriggerLabel = (trigger: ContextTrace["trigger"]) => {
    switch (trigger) {
      case "manual":
        return "用户触发";
      case "scheduled":
        return "定时任务";
      case "ai_suggested":
        return "AI 建议";
      default:
        return "未知";
    }
  };

  const getTypeLabel = (type: ContextTrace["type"]) => {
    switch (type) {
      case "ai_chat":
        return "AI 对话";
      case "web_search":
        return "联网搜索";
      case "podcast":
        return "播客生成";
      case "todo_extract":
        return "待办提取";
      case "tag_recommend":
        return "标签推荐";
      default:
        return "AI 生成";
    }
  };

  const getTypeColor = (type: ContextTrace["type"]) => {
    switch (type) {
      case "ai_chat":
        return "bg-blue-100 text-blue-700";
      case "web_search":
        return "bg-green-100 text-green-700";
      case "podcast":
        return "bg-purple-100 text-purple-700";
      case "todo_extract":
        return "bg-orange-100 text-orange-700";
      case "tag_recommend":
        return "bg-pink-100 text-pink-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 面板 */}
      <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[85vh] flex flex-col animate-slide-up">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <History size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">笔记溯源</h2>
              <p className="text-xs text-gray-500">
                {provenance?.generatedByAI
                  ? `AI 生成 · ${provenance.generationCount} 次交互`
                  : "用户手动创建"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* 概览卡片 */}
          {provenance?.generatedByAI && (
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-4 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={16} className="text-purple-500" />
                <span className="text-sm font-medium text-gray-900">
                  AI 生成概览
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/80 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1">首次生成</p>
                  <p className="text-sm font-medium text-gray-900">
                    {formatDate(provenance.firstGeneratedAt)}
                  </p>
                </div>
                <div className="bg-white/80 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1">最后更新</p>
                  <p className="text-sm font-medium text-gray-900">
                    {formatDate(provenance.lastGeneratedAt)}
                  </p>
                </div>
                <div className="bg-white/80 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1">使用模型</p>
                  <p className="text-sm font-medium text-gray-900">
                    {provenance.models.join(", ") || "默认模型"}
                  </p>
                </div>
                <div className="bg-white/80 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1">交互次数</p>
                  <p className="text-sm font-medium text-gray-900">
                    {provenance.generationCount} 次
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 决策痕迹时间线 */}
          {provenance && provenance.traces.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Clock size={16} className="text-gray-400" />
                决策痕迹
              </h3>
              <div className="space-y-3">
                {provenance.traces.map((trace, index) => (
                  <div
                    key={trace.id}
                    className="relative pl-6 pb-4 last:pb-0"
                  >
                    {/* 时间线 */}
                    {index < provenance.traces.length - 1 && (
                      <div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-gray-200" />
                    )}
                    <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                      <Bot size={12} className="text-blue-600" />
                    </div>

                    {/* 内容 */}
                    <div
                      className="bg-gray-50 rounded-xl p-3 cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => toggleTrace(trace.id)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${getTypeColor(
                            trace.type
                          )}`}
                        >
                          {getTypeLabel(trace.type)}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatDate(trace.generatedAt)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mb-1">
                        触发方式: {getTriggerLabel(trace.trigger)}
                      </p>

                      {/* 展开详情 */}
                      {expandedTraces.has(trace.id) && (
                        <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                          {trace.inputs.length > 0 && (
                            <div>
                              <p className="text-[10px] text-gray-400 mb-1">
                                输入内容
                              </p>
                              {trace.inputs.map((input, i) => (
                                <p
                                  key={i}
                                  className="text-xs text-gray-600 bg-white rounded-lg p-2 mb-1"
                                >
                                  {input.slice(0, 100)}
                                  {input.length > 100 && "..."}
                                </p>
                              ))}
                            </div>
                          )}
                          {trace.prompt && (
                            <div>
                              <p className="text-[10px] text-gray-400 mb-1">
                                使用的 Prompt
                              </p>
                              <p className="text-xs text-gray-600 bg-white rounded-lg p-2">
                                {trace.prompt.slice(0, 200)}
                                {trace.prompt.length > 200 && "..."}
                              </p>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-[10px] text-gray-400">
                            <span>模型: {trace.model}</span>
                          </div>
                        </div>
                      )}

                      {/* 展开提示 */}
                      <div className="flex items-center justify-center mt-2 text-gray-400">
                        {expandedTraces.has(trace.id) ? (
                          <ChevronUp size={14} />
                        ) : (
                          <ChevronDown size={14} />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Context Graph 统计 */}
          <div className="bg-gray-50 rounded-2xl p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Link2 size={16} className="text-gray-400" />
              Context Graph 统计
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <p className="text-xl font-bold text-gray-900">
                  {stats.totalTraces}
                </p>
                <p className="text-[10px] text-gray-500">决策痕迹</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-gray-900">
                  {stats.totalPrecedents}
                </p>
                <p className="text-[10px] text-gray-500">用户先例</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-gray-900">
                  {stats.totalLinks}
                </p>
                <p className="text-[10px] text-gray-500">跨系统关联</p>
              </div>
            </div>
          </div>
        </div>

        {/* 底部操作 */}
        <div className="px-6 py-4 border-t border-gray-100">
          <button
            onClick={() => {
              if (confirm("确定要清除所有 Context Graph 数据吗？")) {
                clearContextGraph();
                setStats(getContextGraphStats());
                setProvenance(null);
              }
            }}
            className="w-full flex items-center justify-center gap-2 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors text-sm font-medium"
          >
            <Trash2 size={16} />
            清除 Context Graph 数据
          </button>
        </div>
      </div>
    </div>
  );
}
