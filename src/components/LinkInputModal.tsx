import React, { useState } from "react";
import { X, Link, Loader2 } from "lucide-react";

interface LinkInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (url: string) => void;
  isLoading?: boolean;
}

export default function LinkInputModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
}: LinkInputModalProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!url.trim()) {
      setError("请输入链接地址");
      return;
    }

    // 简单验证 URL 格式
    try {
      new URL(url);
    } catch {
      setError("链接格式不正确");
      return;
    }

    onSubmit(url.trim());
  };

  const handleClose = () => {
    setUrl("");
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <Link size={16} className="text-blue-600" />
            </div>
            <span className="font-semibold text-gray-900">添加链接</span>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors"
            disabled={isLoading}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5">
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              网页链接
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/article"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              disabled={isLoading}
              autoFocus
            />
            {error && (
              <p className="text-red-500 text-xs">{error}</p>
            )}
            <p className="text-gray-400 text-xs">
              支持微信公众号、知乎、普通网页等
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-500 rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  抓取中...
                </>
              ) : (
                "确认添加"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
