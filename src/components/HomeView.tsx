import { useEffect, useState, useMemo } from "react";
import { Bell, Clock, ArrowRight, MoreHorizontal, Headphones, FileText, Play, Pause } from "lucide-react";
import { useNoteStore, Note } from "../store/note-store";

interface HomeViewProps {
  onNavigate: (view: string, noteId?: string) => void;
}

// Mock 数据 - 快速消化（播客 + 简报）
const mockQuickDigest = [
  {
    id: "digest-1",
    title: "DeepSeek 并发方案",
    summary: "异步处理队列、连接池管理、超时重试机制...",
    type: "podcast",
    duration: "12:34",
    isPlaying: false,
  },
  {
    id: "digest-2",
    title: "UI 设计心理学",
    summary: "认知负荷、视觉层次、反馈机制三大核心原则",
    type: "brief",
    readTime: "3 min",
  },
];

// Mock 数据 - 深度探索（Context Graph 洞察）
const mockDeepInsights = [
  {
    id: "insight-1",
    type: "connection",
    title: "发现知识关联",
    description: "你的「AI Agent 架构」笔记与「DeepSeek 并发方案」存在 3 处技术概念重合",
    action: "查看关联图谱",
  },
  {
    id: "insight-2",
    type: "gap",
    title: "知识缺口提醒",
    description: "你记录了 5 篇关于 LLM 的文章，但缺少「Prompt Engineering」相关内容",
    action: "获取学习建议",
  },
];

export default function HomeView({ onNavigate }: HomeViewProps) {
  const { notes, fetchNotes } = useNoteStore();
  const [isLoading, setIsLoading] = useState(true);
  const [playingPodcast, setPlayingPodcast] = useState<string | null>(null);

  useEffect(() => {
    const loadNotes = async () => {
      await fetchNotes();
      setIsLoading(false);
    };
    loadNotes();
  }, [fetchNotes]);

  // 最近记忆 - 横向滚动
  const recentNotes = useMemo(() => {
    return notes.slice(0, 6);
  }, [notes]);

  // 格式化时间
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) return "刚刚";
    if (hours < 24) return `${hours}小时前`;
    return `${Math.floor(hours / 24)}天前`;
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gradient-to-b from-white to-gray-50">
        <div className="text-gray-400 text-sm">加载中...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-b from-white to-gray-50" style={{ paddingBottom: '120px' }}>
      {/* Header - 字体大小与记忆库一致 */}
      <header className="flex items-center justify-between px-6 pt-14 pb-4 sticky top-0 bg-white/70 backdrop-blur-xl z-10">
        <h1 className="text-[20px] font-bold text-gray-900">主页</h1>
        <button className="text-gray-600 hover:text-gray-900 transition-colors p-2 hover:bg-white/50 rounded-full">
          <Bell size={20} strokeWidth={2} />
        </button>
      </header>

      <div className="px-6">
        {/* Section 1: 最近记忆 - 灰色上层卡片，横向滚动 */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[15px] font-semibold text-gray-900">最近</h2>
            <button 
              onClick={() => onNavigate("library")}
              className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              更多 <ArrowRight size={12} />
            </button>
          </div>
          
          {recentNotes.length === 0 ? (
            <div className="bg-gray-100 rounded-2xl p-6 text-center">
              <p className="text-sm text-gray-500">暂无笔记</p>
              <p className="text-xs text-gray-400 mt-1">点击右下角 + 开始记录</p>
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-3 hide-scrollbar -mx-6 px-6">
              {recentNotes.map((note) => (
                <button
                  key={note.id}
                  onClick={() => onNavigate("document", note.id)}
                  className="flex-shrink-0 w-[160px] bg-white rounded-2xl overflow-hidden hover:shadow-md transition-all text-left group border border-gray-100"
                >
                  {/* 灰色上层背景 - 仿照图片 */}
                  <div className="w-full h-24 bg-gray-100 relative">
                    <div className="absolute bottom-3 left-3">
                      <div className="w-8 h-8 rounded-lg bg-white/90 flex items-center justify-center shadow-sm">
                        <FileText size={18} className="text-gray-500" />
                      </div>
                    </div>
                  </div>
                  {/* 白色下层内容 */}
                  <div className="p-3">
                    <h3 className="font-medium text-gray-900 mb-2 line-clamp-2 text-[14px]">
                      {note.title || "无标题"}
                    </h3>
                    <p className="text-[12px] text-gray-400">
                      {formatTime(note.updatedAt)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Section 2: 快速消化 - 播客 + 简报 */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[15px] font-semibold text-gray-900">快速消化</h2>
            <span className="text-xs text-gray-400">AI 生成</span>
          </div>
          
          <div className="space-y-3">
            {mockQuickDigest.map((item) => (
              <div
                key={item.id}
                className="bg-white/60 backdrop-blur-md rounded-xl p-4 hover:bg-white/80 transition-all"
              >
                <div className="flex items-start gap-3">
                  {/* 类型图标 */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    item.type === "podcast" 
                      ? "bg-purple-100" 
                      : "bg-blue-100"
                  }`}>
                    {item.type === "podcast" ? (
                      <Headphones size={20} className="text-purple-600" />
                    ) : (
                      <FileText size={20} className="text-blue-600" />
                    )}
                  </div>
                  
                  {/* 内容 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full ${
                        item.type === "podcast" 
                          ? "bg-purple-100 text-purple-700" 
                          : "bg-blue-100 text-blue-700"
                      }`}>
                        {item.type === "podcast" ? "播客" : "简报"}
                      </span>
                      <span className="text-[11px] text-gray-400">
                        {item.type === "podcast" ? item.duration : item.readTime}
                      </span>
                    </div>
                    <h3 className="font-medium text-gray-900 mb-1 text-[14px]">{item.title}</h3>
                    <p className="text-[13px] text-gray-500 line-clamp-1">{item.summary}</p>
                  </div>
                  
                  {/* 操作按钮 */}
                  {item.type === "podcast" && (
                    <button 
                      onClick={() => setPlayingPodcast(playingPodcast === item.id ? null : item.id)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                        playingPodcast === item.id
                          ? "bg-purple-500 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {playingPodcast === item.id ? (
                        <Pause size={14} />
                      ) : (
                        <Play size={14} className="ml-0.5" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 3: 深度探索 - Context Graph 洞察 */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[15px] font-semibold text-gray-900">深度探索</h2>
            <span className="text-xs text-gray-400">Context Graph</span>
          </div>
          
          <div className="space-y-3">
            {mockDeepInsights.map((insight) => (
              <div
                key={insight.id}
                className="bg-gradient-to-r from-gray-50 to-white rounded-xl p-4 border border-gray-100 hover:shadow-sm transition-all"
              >
                <div className="flex items-start gap-3">
                  {/* 类型图标 */}
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    insight.type === "connection" ? "bg-blue-100" :
                    insight.type === "gap" ? "bg-amber-100" : "bg-green-100"
                  }`}>
                    {insight.type === "connection" && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-600">
                        <circle cx="7" cy="7" r="3" />
                        <circle cx="17" cy="17" r="3" />
                        <path d="M10 10 14 14" />
                      </svg>
                    )}
                    {insight.type === "gap" && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-600">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 8v4" />
                        <path d="M12 16h.01" />
                      </svg>
                    )}
                  </div>
                  
                  {/* 内容 */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 mb-1 text-[14px]">{insight.title}</h3>
                    <p className="text-[13px] text-gray-600 mb-2">{insight.description}</p>
                    <button className="text-[13px] text-blue-600 hover:text-blue-700 font-medium">
                      {insight.action} →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
