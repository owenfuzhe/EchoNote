'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Mic, 
  Square, 
  Pause, 
  Play, 
  X, 
  Clock,
  Plus,
  Search,
  Bot,
  SquarePen,
  ChevronRight,
  Paperclip
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface Note {
  id: string;
  title: string;
  duration: string;
  createdAt: string;
  summary?: string;
  icon: string;
}

// Mock recent notes data - Craft style 2-column grid
const MOCK_RECENT_NOTES: Note[] = [
  { id: '1', title: '会议讨论', duration: '3:24', createdAt: '2分钟前', summary: 'Q2 产品规划...', icon: '📝' },
  { id: '2', title: '灵感想法', duration: '1:15', createdAt: '1小时前', summary: '新功能想法...', icon: '💡' },
  { id: '3', title: '购物清单', duration: '0:45', createdAt: '3小时前', icon: '🛒' },
  { id: '4', title: '读书笔记', duration: '5:32', createdAt: '昨天', summary: '《原子习惯》...', icon: '📚' },
  { id: '5', title: '待办事项', duration: '2:10', createdAt: '2天前', icon: '📋' },
  { id: '6', title: '歌词记录', duration: '4:20', createdAt: '3天前', icon: '🎵' },
];

export default function HomePage() {
  const router = useRouter();
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'paused'>('idle');
  const [duration, setDuration] = useState(0);
  const [waveformData, setWaveformData] = useState<number[]>(new Array(40).fill(0.3));
  const [showQuickStart, setShowQuickStart] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const waveformRef = useRef<NodeJS.Timeout | null>(null);

  // Format duration display
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Start recording
  const startRecording = () => {
    setRecordingState('recording');
    setShowQuickStart(false);
    setDuration(0);
    
    intervalRef.current = setInterval(() => {
      setDuration(prev => prev + 1);
    }, 1000);

    waveformRef.current = setInterval(() => {
      setWaveformData(prev => prev.map(() => Math.random() * 0.7 + 0.3));
    }, 100);
  };

  // Pause recording
  const pauseRecording = () => {
    setRecordingState('paused');
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (waveformRef.current) clearInterval(waveformRef.current);
  };

  // Resume recording
  const resumeRecording = () => {
    setRecordingState('recording');
    intervalRef.current = setInterval(() => {
      setDuration(prev => prev + 1);
    }, 1000);
    waveformRef.current = setInterval(() => {
      setWaveformData(prev => prev.map(() => Math.random() * 0.7 + 0.3));
    }, 100);
  };

  // Stop recording
  const stopRecording = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (waveformRef.current) clearInterval(waveformRef.current);
    setRecordingState('idle');
    setDuration(0);
    setWaveformData(new Array(40).fill(0.3));
    // TODO: Save recording and navigate to detail
  };

  // Cancel recording
  const cancelRecording = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (waveformRef.current) clearInterval(waveformRef.current);
    setRecordingState('idle');
    setDuration(0);
    setWaveformData(new Array(40).fill(0.3));
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (waveformRef.current) clearInterval(waveformRef.current);
    };
  }, []);

  // Filter notes by search
  const filteredNotes = MOCK_RECENT_NOTES.filter(note => 
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.summary?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 pb-20">
      {/* Recording Overlay */}
      {recordingState !== 'idle' && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900">
          {/* Header */}
          <header className="h-14 flex items-center justify-center px-4 border-b border-gray-100 dark:border-gray-800">
            <span className="text-base font-medium text-gray-900 dark:text-white">
              {recordingState === 'recording' ? '正在录音...' : '录音暂停'}
            </span>
          </header>

          {/* Main Content */}
          <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
            {/* Duration */}
            <div className="mb-8">
              <span className={cn(
                "text-6xl font-extralight tabular-nums text-gray-900 dark:text-white",
                recordingState === 'recording' && "animate-pulse"
              )}>
                {formatDuration(duration)}
              </span>
            </div>

            {/* Waveform */}
            <div className="flex items-center justify-center gap-[3px] h-20 mb-12">
              {waveformData.map((height, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-1.5 rounded-full transition-all duration-75",
                    recordingState === 'paused' 
                      ? "bg-gray-300 dark:bg-gray-600" 
                      : "bg-gradient-to-t from-indigo-500 to-purple-500"
                  )}
                  style={{ height: `${height * 100}%` }}
                />
              ))}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-6">
              <Button
                onClick={cancelRecording}
                variant="outline"
                className="w-14 h-14 rounded-full border-gray-200 dark:border-gray-700"
              >
                <X className="w-6 h-6 text-gray-500" />
              </Button>

              <Button
                onClick={recordingState === 'paused' ? resumeRecording : pauseRecording}
                variant="outline"
                className="w-14 h-14 rounded-full border-amber-200 dark:border-amber-800"
              >
                {recordingState === 'paused' ? (
                  <Play className="w-6 h-6 text-amber-500 fill-amber-500" />
                ) : (
                  <Pause className="w-6 h-6 text-amber-500 fill-amber-500" />
                )}
              </Button>

              <Button
                onClick={stopRecording}
                className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30"
              >
                <Square className="w-8 h-8 text-white fill-white" />
              </Button>
            </div>
          </main>
        </div>
      )}

      {/* Main Content */}
      <div className={cn(recordingState !== 'idle' && "hidden")}>
        {/* Top Tab Bar */}
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4">
          <div className="flex items-center justify-around h-12">
            <button className="flex-1 text-center text-indigo-600 font-medium border-b-2 border-indigo-600 pb-3 pt-3">
              主页
            </button>
            <button 
              type="button"
              className="flex-1 text-center text-gray-500 dark:text-gray-400 pb-3 pt-3 cursor-pointer hover:text-indigo-600 transition-colors"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('资料库按钮点击');
                router.push('/notes');
              }}
            >
              资料库
            </button>
            <button className="flex-1 text-center text-gray-500 dark:text-gray-400 pb-3 pt-3">
              待办
            </button>
          </div>
        </div>

        <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
          {/* Quick Start Card - Removed per feedback */}

          {/* Recent Notes - 2 Column Grid */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">最近笔记</h3>
            <div className="grid grid-cols-2 gap-3">
              {filteredNotes.map((note) => (
                <div
                  key={note.id}
                  onClick={() => router.push(`/notes/${note.id}`)}
                  className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                >
                  <div className="text-2xl mb-2">{note.icon}</div>
                  <h4 className="font-medium text-gray-900 dark:text-white text-sm line-clamp-1">{note.title}</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {note.createdAt}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </main>

        {/* Bottom Input Bar - Craft Style: Left 3 + Right 2 */}
        <div className="fixed bottom-4 left-0 right-0 z-50 px-4 flex justify-between items-end pointer-events-none">
          {/* Left Group - 3 buttons */}
          <div className="bg-white dark:bg-gray-800 rounded-full shadow-lg shadow-gray-200/50 dark:shadow-gray-900/50 px-2 py-2 flex items-center gap-1 pointer-events-auto">
            <button className="flex flex-col items-center gap-1 px-3 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
              <Plus className="w-5 h-5" />
              <span className="text-[10px]">更多</span>
            </button>
            
            <button 
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('文字按钮点击');
                router.push('/notes/new');
              }}
              className="flex flex-col items-center gap-1 px-3 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors cursor-pointer"
            >
              <SquarePen className="w-5 h-5 pointer-events-none" />
              <span className="text-[10px] pointer-events-none">文字</span>
            </button>
            
            <button 
              onClick={startRecording}
              className="flex flex-col items-center gap-1 px-3 py-2 text-red-500"
            >
              <Mic className="w-6 h-6" />
              <span className="text-[10px]">语音</span>
            </button>
          </div>
          
          {/* Right Group - 2 buttons */}
          <div className="bg-white dark:bg-gray-800 rounded-full shadow-lg shadow-gray-200/50 dark:shadow-gray-900/50 px-2 py-2 flex items-center gap-1 pointer-events-auto">
            <button 
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('搜索按钮点击');
                router.push('/search');
              }}
              className="flex flex-col items-center gap-1 px-3 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors cursor-pointer"
            >
              <Search className="w-5 h-5 pointer-events-none" />
              <span className="text-[10px] pointer-events-none">搜索</span>
            </button>
            
            <button 
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('AI按钮点击');
                router.push('/ai-assistant');
              }}
              className="flex flex-col items-center gap-1 px-3 py-2 text-indigo-600 cursor-pointer"
            >
              <Bot className="w-5 h-5 pointer-events-none" />
              <span className="text-[10px] pointer-events-none">AI</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
