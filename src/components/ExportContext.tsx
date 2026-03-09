/**
 * Export Context 组件
 * 导出 Context Graph 为 JSON/Markdown，可粘贴到外部 Agent
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Copy, Check, Download, Rocket } from "lucide-react";
import { Note } from "../store/note-store";
import { getNoteProvenance } from "../services/context-graph";

interface ExportContextProps {
  notes: Note[];
  isOpen: boolean;
  onClose: () => void;
}

export default function ExportContext({
  notes,
  isOpen,
  onClose,
}: ExportContextProps) {
  const [copied, setCopied] = useState(false);
  const [format, setFormat] = useState<"json" | "markdown">("json");

  // 生成 Context Graph 导出数据
  const generateExport = () => {
    const exportData = {
      meta: {
        exportedAt: new Date().toISOString(),
        app: "EchoNote",
        version: "2.0",
        noteCount: notes.length,
      },
      contextGraph: {
        nodes: notes.map((note) => ({
          id: note.id,
          type: note.type,
          title: note.title,
          content: note.content.slice(0, 500), // 限制长度
          tags: note.tags,
          createdAt: note.createdAt,
          updatedAt: note.updatedAt,
        })),
        traces: notes.map((note) => {
          const provenance = getNoteProvenance(note.id);
          return {
            noteId: note.id,
            generatedByAI: provenance.generatedByAI,
            generationCount: provenance.generationCount,
            models: provenance.models,
            traces: provenance.traces,
          };
        }),
      },
      summary: {
        totalNotes: notes.length,
        aiGeneratedNotes: notes.filter((n) =>
          getNoteProvenance(n.id).generatedByAI
        ).length,
        topTags: getTopTags(notes),
        timeRange: getTimeRange(notes),
      },
    };

    if (format === "json") {
      return JSON.stringify(exportData, null, 2);
    } else {
      return generateMarkdown(exportData);
    }
  };

  // 生成 Markdown 格式
  const generateMarkdown = (data: any) => {
    let md = `# EchoNote Context Export\n\n`;
    md += `**Exported:** ${new Date(data.meta.exportedAt).toLocaleString()}\n\n`;
    md += `## Summary\n\n`;
    md += `- **Total Notes:** ${data.summary.totalNotes}\n`;
    md += `- **AI Generated:** ${data.summary.aiGeneratedNotes}\n`;
    md += `- **Time Range:** ${data.summary.timeRange}\n\n`;

    md += `## Notes\n\n`;
    data.contextGraph.nodes.forEach((node: any, index: number) => {
      md += `### ${index + 1}. ${node.title}\n\n`;
      md += `**Type:** ${node.type}\n\n`;
      md += `**Tags:** ${node.tags?.join(", ") || "None"}\n\n`;
      md += `**Content:**\n\n${node.content}\n\n`;
      md += `---\n\n`;
    });

    return md;
  };

  // 获取热门标签
  const getTopTags = (notes: Note[]) => {
    const tagCounts: Record<string, number> = {};
    notes.forEach((note) => {
      note.tags?.forEach((tag) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });
    return Object.entries(tagCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([tag]) => tag);
  };

  // 获取时间范围
  const getTimeRange = (notes: Note[]) => {
    if (notes.length === 0) return "N/A";
    const dates = notes.map((n) => new Date(n.createdAt).getTime());
    const min = new Date(Math.min(...dates));
    const max = new Date(Math.max(...dates));
    return `${min.toLocaleDateString()} - ${max.toLocaleDateString()}`;
  };

  const handleCopy = () => {
    const content = generateExport();
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const content = generateExport();
    const blob = new Blob([content], {
      type: format === "json" ? "application/json" : "text/markdown",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `echonote-context-${Date.now()}.${format === "json" ? "json" : "md"}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  const exportContent = generateExport();

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center">
      {/* 背景遮罩 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 面板 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[80vh] flex flex-col"
      >
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <Rocket size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Export Context</h2>
              <p className="text-xs text-gray-500">
                {notes.length} notes · {format.toUpperCase()}
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

        {/* 格式选择 */}
        <div className="px-6 py-3 border-b border-gray-100">
          <div className="flex gap-2">
            <button
              onClick={() => setFormat("json")}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                format === "json"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              JSON
            </button>
            <button
              onClick={() => setFormat("markdown")}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                format === "markdown"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Markdown
            </button>
          </div>
        </div>

        {/* 内容预览 */}
        <div className="flex-1 overflow-auto p-6">
          <pre className="bg-gray-50 rounded-xl p-4 text-xs text-gray-700 overflow-auto max-h-[300px]">
            {exportContent.slice(0, 2000)}
            {exportContent.length > 2000 && "\n\n... (truncated)"}
          </pre>
        </div>

        {/* 操作按钮 */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors"
          >
            {copied ? (
              <>
                <Check size={18} />
                已复制
              </>
            ) : (
              <>
                <Copy size={18} />
                复制到剪贴板
              </>
            )}
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
          >
            <Download size={18} />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
