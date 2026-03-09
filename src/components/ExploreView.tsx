import React, { useState, useEffect, useRef, KeyboardEvent, ChangeEvent } from "react";
import { Bell, Search, Code, Headphones, Globe, FileText, BarChart3, Sparkles, Loader2, Play, Pause, ChevronLeft, Volume2, Clock, Wand2, Plus, Lightbulb, Compass, Link2 } from "lucide-react";
import { searchWeb, SearchResult } from "../services/search";
import { useNoteStore, Note } from "../store/note-store";
import { generatePodcastMock, PodcastPlayer, VOICE_OPTIONS, PodcastMetadata } from "../services/podcast";
import { analyzeNoteRelations, NoteRelation, getLocalNoteRelations } from "../services/note-relations";

interface ExploreViewProps {
  onNavigate: (view: string, noteId?: string) => void;
}

// 技能中心数据
const skills = [
  {
    id: "web-search",
    name: "联网搜索",
    icon: Globe,
    description: "基于笔记内容触发网络搜索",
    color: "from-blue-500 to-cyan-500",
    status: "ready" as const,
  },
  {
    id: "podcast",
    name: "播客生成",
    icon: Headphones,
    description: "将笔记转为音频播客",
    color: "from-purple-500 to-pink-500",
    status: "ready" as const,
  },
  {
    id: "code-exec",
    name: "执行代码",
    icon: Code,
    description: "运行笔记中的代码片段",
    color: "from-green-500 to-emerald-500",
    status: "coming" as const,
  },
];

// 模板推荐
import {
  recommendTemplates,
  getTemplateContent,
  recordTemplateUsage,
  TemplateRecommendation,
} from "../services/template-recommender";

export default function ExploreView({ onNavigate }: ExploreViewProps) {
  const [activeSkill, setActiveSkill] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const { createNote, notes } = useNoteStore();

  // 播客生成状态
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<string>('female');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generatedPodcast, setGeneratedPodcast] = useState<PodcastMetadata | null>(null);
  const [podcastPlayer, setPodcastPlayer] = useState<PodcastPlayer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [podcastStep, setPodcastStep] = useState<'select' | 'voice' | 'generating' | 'player'>('select');
  const [podcastAudioBlob, setPodcastAudioBlob] = useState<Blob | null>(null);

  // 关联发现状态
  const [noteRelations, setNoteRelations] = useState<NoteRelation[]>([]);
  const [isAnalyzingRelations, setIsAnalyzingRelations] = useState(false);
  const [relationError, setRelationError] = useState<string | null>(null);

  // 模板推荐状态
  const [recommendedTemplates, setRecommendedTemplates] = useState<TemplateRecommendation[]>([]);

  // 分析笔记关联
  useEffect(() => {
    if (notes.length >= 2 && !isAnalyzingRelations) {
      analyzeRelations();
    }
  }, [notes.length]);

  // 更新模板推荐
  useEffect(() => {
    const templates = recommendTemplates(notes, 3);
    setRecommendedTemplates(templates);
  }, [notes]);

  const analyzeRelations = async () => {
    if (notes.length < 2) return;
    
    setIsAnalyzingRelations(true);
    setRelationError(null);

    try {
      // 先使用本地分析快速展示
      const localRelations = getLocalNoteRelations(notes, notes[0].id, 5);
      if (localRelations.length > 0) {
        setNoteRelations(localRelations);
      }

      // 然后调用 AI 进行深度分析
      const result = await analyzeNoteRelations(notes, {
        minSimilarity: 60,
        maxRelations: 6,
      });
      setNoteRelations(result.relations);
    } catch (error) {
      console.error("关联分析失败:", error);
      setRelationError("关联分析失败，使用本地模式");
      // 降级到本地分析
      const allRelations: NoteRelation[] = [];
      for (const note of notes.slice(0, 3)) {
        const relations = getLocalNoteRelations(notes, note.id, 2);
        allRelations.push(...relations);
      }
      setNoteRelations(allRelations.slice(0, 6));
    } finally {
      setIsAnalyzingRelations(false);
    }
  };

  // 处理搜索
  const handleSearch = async () => {
    if (!searchQuery.trim() || isSearching) return;

    setIsSearching(true);
    setSearchError(null);

    try {
      const results = await searchWeb(searchQuery.trim());

      if (results.length === 0) {
        setSearchError("未找到相关搜索结果，请尝试其他关键词");
        setIsSearching(false);
        return;
      }

      // 格式化搜索结果为笔记内容
      const noteContent = formatSearchResultsToNote(searchQuery, results);

      // 创建新笔记
      const noteId = await createNote({
        title: `搜索: ${searchQuery}`,
        content: noteContent,
        type: "ai",
        tags: ["搜索", "联网"],
      });

      // 关闭弹窗并跳转
      setActiveSkill(null);
      setSearchQuery("");
      onNavigate("library");

      // 显示成功提示
      setTimeout(() => {
        alert(`✅ 搜索完成！已创建笔记「搜索: ${searchQuery}」`);
      }, 100);
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : "搜索失败，请稍后重试");
    } finally {
      setIsSearching(false);
    }
  };

  // 将搜索结果格式化为笔记内容
  const formatSearchResultsToNote = (query: string, results: SearchResult[]): string => {
    const timestamp = new Date().toLocaleString("zh-CN");
    let content = `# 联网搜索：${query}\n\n`;
    content += `> 搜索时间：${timestamp}\n\n`;
    content += `---\n\n`;

    results.forEach((result, index) => {
      content += `## ${index + 1}. ${result.title}\n\n`;
      content += `${result.content}\n\n`;
      content += `📎 [查看原文](${result.url})\n\n`;
      content += `*来源：${result.source}*\n\n`;
      content += `---\n\n`;
    });

    content += `\n#搜索 #联网`;
    return content;
  };

  // 处理取消
  const handleCancel = () => {
    setActiveSkill(null);
    setSearchQuery("");
    setSearchError(null);
    setIsSearching(false);
    // 重置播客状态
    setSelectedNote(null);
    setSelectedVoice('female');
    setIsGenerating(false);
    setGenerationProgress(0);
    setGeneratedPodcast(null);
    setPodcastAudioBlob(null);
    setPodcastStep('select');
    if (podcastPlayer) {
      podcastPlayer.cleanup();
    }
    setPodcastPlayer(null);
    setIsPlaying(false);
    setPlaybackRate(1);
    setCurrentTime(0);
    setDuration(0);
  };

  // 处理键盘事件
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !isSearching) {
      handleSearch();
    }
  };

  // 播客：选择笔记并进入音色选择
  const handleSelectNoteForPodcast = (note: Note) => {
    setSelectedNote(note);
    setPodcastStep('voice');
  };

  // 播客：返回笔记选择
  const handleBackToNoteSelection = () => {
    setSelectedNote(null);
    setPodcastStep('select');
    setGeneratedPodcast(null);
    setPodcastAudioBlob(null);
    if (podcastPlayer) {
      podcastPlayer.cleanup();
    }
    setPodcastPlayer(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  };

  // 播客：返回音色选择
  const handleBackToVoiceSelection = () => {
    setPodcastStep('voice');
    setGeneratedPodcast(null);
    setPodcastAudioBlob(null);
    if (podcastPlayer) {
      podcastPlayer.cleanup();
    }
    setPodcastPlayer(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  };

  // 播客：开始生成
  const handleGeneratePodcast = async () => {
    if (!selectedNote) return;

    setIsGenerating(true);
    setGenerationProgress(0);
    setPodcastStep('generating');

    try {
      const audioBlob = await generatePodcastMock(
        selectedNote.id,
        selectedNote.content,
        selectedVoice,
        (progress, status) => {
          setGenerationProgress(progress);
        }
      );

      setPodcastAudioBlob(audioBlob);

      // 创建播放器
      const player = new PodcastPlayer(audioBlob);
      player.setCallbacks({
        onTimeUpdate: (time, dur) => {
          setCurrentTime(time);
          setDuration(dur);
        },
        onStateChange: (state) => {
          setIsPlaying(state === 'playing');
        },
        onEnded: () => {
          setIsPlaying(false);
        },
      });

      setPodcastPlayer(player);
      setDuration(player.getDuration());

      // 延迟显示播放器，让用户看到100%进度
      setTimeout(() => {
        setIsGenerating(false);
        setPodcastStep('player');
      }, 500);
    } catch (error) {
      setIsGenerating(false);
      setPodcastStep('voice');
      alert('播客生成失败，请稍后重试');
    }
  };

  // 播客播放控制
  const handlePlayPause = () => {
    if (!podcastPlayer) return;

    if (isPlaying) {
      podcastPlayer.pause();
    } else {
      podcastPlayer.play();
    }
  };

  // 播客跳转
  const handleSeek = (e: ChangeEvent<HTMLInputElement>) => {
    if (!podcastPlayer) return;
    const time = parseFloat(e.target.value);
    podcastPlayer.seek(time);
    setCurrentTime(time);
  };

  // 播客速度控制
  const handleSpeedChange = () => {
    const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
    const currentIndex = speeds.indexOf(playbackRate);
    const nextSpeed = speeds[(currentIndex + 1) % speeds.length];
    setPlaybackRate(nextSpeed);
    if (podcastPlayer) {
      podcastPlayer.setPlaybackRate(nextSpeed);
    }
  };

  // 格式化时间
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#f8f8f9]" style={{ paddingBottom: '120px' }}>
      {/* Header */}
      <header className="flex items-center justify-between px-6 pt-14 pb-4 sticky top-0 bg-[#f8f8f9]/80 backdrop-blur-md z-10">
        <h1 className="text-[20px] font-bold text-gray-900">探索</h1>
        <button className="text-gray-600 hover:text-gray-900 transition-colors">
          <Bell size={22} strokeWidth={2} />
        </button>
      </header>

      <div className="px-6">
        {/* Skills Hub */}
        <section className="mb-8">
          <h2 className="text-[16px] font-semibold text-gray-900 mb-4">
            技能中心
          </h2>

          <div className="grid grid-cols-3 gap-3">
            {skills.map((skill) => {
              const Icon = skill.icon;
              const isComing = skill.status === "coming";

              return (
                <button
                  key={skill.id}
                  onClick={() => !isComing && setActiveSkill(skill.id)}
                  disabled={isComing}
                  className={`relative flex flex-col items-center p-4 rounded-2xl transition-all h-[140px] ${
                    isComing
                      ? "bg-gray-100 opacity-50 grayscale cursor-not-allowed"
                      : "bg-white shadow-sm border border-gray-200/60 hover:shadow-md active:scale-95"
                  }`}
                >
                  <div
                    className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${skill.color} flex items-center justify-center mb-3 ${
                      isComing ? "opacity-50" : ""
                    }`}
                  >
                    <Icon size={24} className="text-white" />
                  </div>
                  <span className={`font-medium text-sm mb-1 ${isComing ? "text-gray-400" : "text-gray-900"}`}>
                    {skill.name}
                  </span>
                  <span className={`text-[10px] text-center leading-tight ${isComing ? "text-gray-400" : "text-gray-500"}`}>
                    {skill.description}
                  </span>

                  {isComing && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100/60 rounded-2xl">
                      <span className="text-[10px] px-2 py-1 bg-gray-200 text-gray-500 rounded-full font-medium">
                        即将上线
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* Templates */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[16px] font-semibold text-gray-900">
              推荐模板
            </h2>
            <span className="text-xs text-gray-400">
              基于您的笔记智能推荐
            </span>
          </div>

          <div className="space-y-2">
            {recommendedTemplates.map((rec) => (
              <button
                key={rec.template.id}
                onClick={() => {
                  recordTemplateUsage(rec.template.id);
                  // 创建新笔记并填充模板内容
                  const content = getTemplateContent(rec.template);
                  createNote({
                    title: rec.template.name,
                    content,
                    type: "text",
                    tags: ["模板"],
                  }).then((noteId) => {
                    onNavigate("document", noteId);
                  });
                }}
                className="w-full flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-200/60 hover:bg-gray-50 hover:border-blue-200 transition-all text-left group"
              >
                <span className="text-2xl">{rec.template.icon}</span>
                <div className="flex-1">
                  <span className="font-medium text-gray-900 block">{rec.template.name}</span>
                  <span className="text-xs text-gray-400">{rec.reason}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-400 to-purple-500 rounded-full"
                      style={{ width: `${rec.score}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-400">{rec.score}%</span>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* 关联发现 */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[16px] font-semibold text-gray-900">
              关联发现
            </h2>
            <div className="flex items-center gap-2">
              {isAnalyzingRelations && (
                <Loader2 size={14} className="animate-spin text-blue-500" />
              )}
              <span className="text-xs text-gray-400">
                {noteRelations.length} 个关联
              </span>
            </div>
          </div>

          {noteRelations.length === 0 ? (
            <div className="bg-gray-50 rounded-2xl p-6 text-center">
              <Link2 size={24} className="text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">笔记数量不足，无法发现关联</p>
              <p className="text-xs text-gray-400 mt-1">创建更多笔记后自动分析</p>
            </div>
          ) : (
            <div className="space-y-3">
              {noteRelations.map((relation, index) => (
                <div
                  key={`${relation.sourceNoteId}-${relation.targetNoteId}`}
                  className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {/* 相似度条 */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-400 to-purple-500 rounded-full transition-all duration-500"
                        style={{ width: `${relation.similarity}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-500">
                      {relation.similarity}%
                    </span>
                  </div>

                  {/* 笔记标题 */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-gray-900 truncate flex-1">
                      {relation.sourceTitle}
                    </span>
                    <Link2 size={14} className="text-gray-400 flex-shrink-0" />
                    <span className="text-sm font-medium text-gray-900 truncate flex-1">
                      {relation.targetTitle}
                    </span>
                  </div>

                  {/* 关联原因 */}
                  <p className="text-xs text-gray-500 mb-2">{relation.reason}</p>

                  {/* 标签 */}
                  {relation.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {relation.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* 操作按钮 */}
                  <div className="flex gap-2 mt-3 pt-3 border-t border-gray-50">
                    <button
                      onClick={() => onNavigate("document", relation.targetNoteId)}
                      className="flex-1 py-2 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      查看笔记
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Skill Action Modal */}
      {activeSkill && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 backdrop-blur-sm"
          onClick={handleCancel}
        >
          <div
            className="w-full max-w-md bg-white rounded-t-3xl p-6 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-6" />

            {activeSkill === "web-search" && (
              <>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  联网搜索
                </h3>
                <p className="text-gray-500 mb-4">
                  输入关键词进行网络搜索，AI 将自动整理结果并保存为笔记。
                </p>
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="输入搜索关键词..."
                    disabled={isSearching}
                    className="flex-1 px-4 py-3 bg-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  />
                </div>

                {searchError && (
                  <div className="mb-4 p-8 bg-gradient-to-br from-gray-50 to-slate-50 rounded-2xl text-center border border-gray-100">
                    <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center mx-auto mb-4 shadow-sm border border-gray-100">
                      <Compass size={28} className="text-gray-400" />
                    </div>
                    <p className="text-gray-700 font-semibold mb-2">{searchError}</p>
                    <p className="text-sm text-gray-400 mb-5">尝试使用其他关键词或创建新笔记</p>
                    <button
                      onClick={() => onNavigate("document")}
                      className="flex items-center gap-2 px-5 py-2.5 bg-blue-500 text-white rounded-xl text-sm font-semibold hover:bg-blue-600 transition-all shadow-md hover:shadow-lg mx-auto active:scale-95"
                    >
                      <Plus size={18} strokeWidth={2.5} />
                      创建笔记
                    </button>
                  </div>
                )}

                <button
                  onClick={handleSearch}
                  disabled={isSearching || !searchQuery.trim()}
                  className="w-full py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSearching ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      搜索中...
                    </>
                  ) : (
                    <>
                      <Search size={18} />
                      开始搜索
                    </>
                  )}
                </button>
              </>
            )}

            {activeSkill === "podcast" && (
              <>
                {/* 步骤1：选择笔记 */}
                {podcastStep === 'select' && (
                  <>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      选择笔记
                    </h3>
                    <p className="text-gray-500 mb-4">
                      选择要转换为播客的笔记
                    </p>
                    <div className="max-h-80 overflow-y-auto space-y-2 mb-4">
                      {notes.length === 0 ? (
                        <div className="text-center py-10 bg-gradient-to-br from-gray-50 to-slate-50 rounded-2xl border border-gray-100">
                          <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center mx-auto mb-4 shadow-sm border border-gray-100">
                            <FileText size={28} className="text-gray-400" />
                          </div>
                          <p className="text-gray-700 font-semibold mb-2">暂无笔记</p>
                          <p className="text-sm text-gray-400 mb-5">请先创建笔记，再生成播客</p>
                          <button
                            onClick={() => onNavigate("document")}
                            className="flex items-center gap-2 px-5 py-2.5 bg-purple-500 text-white rounded-xl text-sm font-semibold hover:bg-purple-600 transition-all shadow-md hover:shadow-lg mx-auto active:scale-95"
                          >
                            <Plus size={18} strokeWidth={2.5} />
                            创建笔记
                          </button>
                        </div>
                      ) : (
                        notes.map((note) => (
                          <button
                            key={note.id}
                            onClick={() => handleSelectNoteForPodcast(note)}
                            className="w-full flex items-start gap-3 p-4 bg-gray-50 rounded-xl hover:bg-purple-50 transition-colors text-left group"
                          >
                            <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-xl flex-shrink-0 group-hover:bg-purple-100 transition-colors">
                              {'📝'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-gray-900 truncate">
                                {note.title || '无标题'}
                              </h4>
                              <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                {note.content.replace(/#{1,6}\s/g, '').slice(0, 100)}...
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-[10px] px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full">
                                  {note.type === 'ai' ? 'AI笔记' : '笔记'}
                                </span>
                                <span className="text-[10px] text-gray-400">
                                  {new Date(note.updatedAt).toLocaleDateString('zh-CN')}
                                </span>
                              </div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </>
                )}

                {/* 步骤2：选择音色 */}
                {podcastStep === 'voice' && selectedNote && (
                  <>
                    <div className="flex items-center gap-3 mb-4">
                      <button
                        onClick={handleBackToNoteSelection}
                        className="p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <ChevronLeft size={20} className="text-gray-600" />
                      </button>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">选择音色</h3>
                        <p className="text-sm text-gray-500">{selectedNote.title || '无标题'}</p>
                      </div>
                    </div>
                    <p className="text-gray-500 mb-4">
                      选择适合您内容的播客音色
                    </p>
                    <div className="space-y-2 mb-4">
                      {VOICE_OPTIONS.map((voice) => (
                        <label
                          key={voice.id}
                          className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-colors ${
                            selectedVoice === voice.id
                              ? 'bg-purple-100 border-2 border-purple-500'
                              : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                          }`}
                        >
                          <input
                            type="radio"
                            name="voice"
                            value={voice.id}
                            checked={selectedVoice === voice.id}
                            onChange={(e) => setSelectedVoice(e.target.value)}
                            className="w-4 h-4 text-purple-600"
                          />
                          <div className="flex-1">
                            <span className="font-medium text-gray-900">{voice.name}</span>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {voice.id === 'default' && '系统默认语音'}
                              {voice.id === 'female' && '柔和亲切的女声，适合故事讲述'}
                              {voice.id === 'male' && '沉稳专业的男声，适合知识分享'}
                              {voice.id === 'fast' && '较快的语速，适合快速获取信息'}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                    <button
                      onClick={handleGeneratePodcast}
                      disabled={isGenerating}
                      className="w-full py-3 bg-purple-500 text-white rounded-xl font-medium hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <Wand2 size={18} />
                      生成播客
                    </button>
                  </>
                )}

                {/* 步骤3：生成中 */}
                {podcastStep === 'generating' && (
                  <>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      正在生成播客
                    </h3>
                    <p className="text-gray-500 mb-6">
                      AI 正在将您的笔记转换为音频，请稍候...
                    </p>
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">生成进度</span>
                        <span className="text-sm text-purple-600 font-medium">
                          {Math.round(generationProgress)}%
                        </span>
                      </div>
                      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(generationProgress, 100)}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-center py-4">
                      <Loader2 size={48} className="text-purple-500 animate-spin" />
                    </div>
                    <p className="text-center text-sm text-gray-400 mt-4">
                      正在处理：{selectedNote?.title || '笔记内容'}
                    </p>
                  </>
                )}

                {/* 步骤4：播放器 */}
                {podcastStep === 'player' && podcastPlayer && (
                  <>
                    <div className="flex items-center gap-3 mb-4">
                      <button
                        onClick={handleBackToVoiceSelection}
                        className="p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <ChevronLeft size={20} className="text-gray-600" />
                      </button>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">播客播放器</h3>
                        <p className="text-sm text-gray-500 truncate max-w-[200px]">
                          {selectedNote?.title || '无标题'}
                        </p>
                      </div>
                    </div>

                    {/* 音频可视化/封面区域 */}
                    <div className="flex items-center justify-center py-6 mb-4">
                      <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                        <Headphones size={48} className="text-white" />
                      </div>
                    </div>

                    {/* 进度条 */}
                    <div className="mb-4">
                      <input
                        type="range"
                        min={0}
                        max={duration || 100}
                        value={currentTime}
                        onChange={handleSeek}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-500"
                      />
                      <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                      </div>
                    </div>

                    {/* 控制按钮 */}
                    <div className="flex items-center justify-center gap-4 mb-4">
                      <button
                        onClick={handlePlayPause}
                        className="w-16 h-16 rounded-full bg-purple-500 text-white flex items-center justify-center hover:bg-purple-600 transition-colors shadow-lg"
                      >
                        {isPlaying ? (
                          <Pause size={28} fill="currentColor" />
                        ) : (
                          <Play size={28} fill="currentColor" className="ml-1" />
                        )}
                      </button>
                    </div>

                    {/* 速度控制 */}
                    <div className="flex items-center justify-center gap-4">
                      <button
                        onClick={handleSpeedChange}
                        className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
                      >
                        <Clock size={14} />
                        {playbackRate}x
                      </button>
                    </div>
                  </>
                )}
              </>
            )}

            <button
              onClick={handleCancel}
              disabled={isSearching}
              className="w-full py-3 mt-3 text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
