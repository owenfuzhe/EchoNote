import { useRef } from "react";
import { FileText, Image as ImageIcon } from "lucide-react";
import type { Note } from "../store/note-store";

interface RecentNotesProps {
  notes: Note[];
  onNavigate: (view: string, noteId?: string) => void;
  maxCount?: number;
}

export default function RecentNotes({ notes, onNavigate, maxCount = 5 }: RecentNotesProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // 按 updatedAt 倒序排序并取前 maxCount 条
  const recentNotes = notes
    .slice()
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, maxCount);

  if (recentNotes.length === 0) {
    return null;
  }

  // 从笔记内容中提取图片 URL
  const extractThumbnail = (note: Note): string | null => {
    // 如果笔记有 emoji，使用 emoji 作为缩略图
    if (note.emoji) {
      return `emoji:${note.emoji}`;
    }
    // 从内容中提取图片链接
    const imageRegex = /!\[.*?\]\((.+?)\)/;
    const match = note.content?.match(imageRegex);
    if (match) {
      return match[1];
    }
    return null;
  };

  // 获取缩略图背景色（根据笔记 id 生成一致的颜色）
  const getThumbnailBg = (noteId: string): string => {
    const colors = [
      "from-blue-100 to-blue-50",
      "from-purple-100 to-purple-50",
      "from-green-100 to-green-50",
      "from-amber-100 to-amber-50",
      "from-pink-100 to-pink-50",
      "from-cyan-100 to-cyan-50",
    ];
    let hash = 0;
    for (let i = 0; i < noteId.length; i++) {
      hash = noteId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="mb-6">
      <h2 className="text-[14px] font-medium text-gray-500 mb-3">最近记忆</h2>
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar -mx-6 px-6 touch-pan-x"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {recentNotes.map((note) => {
          const thumbnail = extractThumbnail(note);
          const bgGradient = getThumbnailBg(note.id);

          return (
            <div
              key={note.id}
              onClick={() => onNavigate("document", note.id)}
              className="w-[150px] shrink-0 bg-white rounded-xl shadow-sm border border-gray-200/60 overflow-hidden flex flex-col cursor-pointer hover:shadow-md hover:border-gray-300 transition-all active:scale-95"
            >
              {/* 缩略图区域 */}
              <div
                className={`h-[90px] bg-gradient-to-br ${bgGradient} relative flex items-center justify-center`}
              >
                {thumbnail ? (
                  thumbnail.startsWith("emoji:") ? (
                    <span className="text-4xl">{thumbnail.slice(6)}</span>
                  ) : (
                    <img
                      src={thumbnail}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  )
                ) : (
                  <FileText size={32} className="text-gray-400" strokeWidth={1.5} />
                )}
              </div>

              {/* 标题区域 */}
              <div className="p-3">
                <h3 className="text-[13px] font-medium text-gray-900 leading-[1.4] line-clamp-2">
                  {note.title || "无标题"}
                </h3>
                <p className="text-[11px] text-gray-400 mt-1">
                  {new Date(note.updatedAt).toLocaleDateString("zh-CN", {
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
