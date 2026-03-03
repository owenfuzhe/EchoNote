'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ChevronLeft, 
  MoreVertical,
  Edit3,
  Sparkles,
  Calendar,
  MapPin,
  User,
  Tag,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  CheckSquare,
  Mic,
  Clock,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { SmartTagInput } from '@/components/SmartTagInput';
import { TodoExtraction } from '@/components/TodoExtraction';

interface Note {
  id: string;
  title: string;
  content: string;
  transcript: string;
  summary: string;
  tags: string[];
  audioUrl: string;
  duration: number;
  date: string;
  location: string;
  people: string[];
  todos: Todo[];
}

interface Todo {
  id: string;
  text: string;
  assignee?: string;
  dueDate?: string;
  completed: boolean;
}

// Mock data - in real app, fetch from API
const MOCK_NOTE: Note = {
  id: '1',
  title: '产品需求评审会议',
  content: '今天我们主要讨论了 Q1 的产品规划和功能优先级...',
  transcript: `[0:05] 张三：我们今天主要讨论 Q1 的产品规划和功能优先级...

[1:23] 李四：我建议优先做用户调研...

[3:45] Owen：好的，那 PRD 初稿我来出...`,
  summary: '• 讨论了 Q1 产品规划和功能优先级\n• 确定了 3 个核心功能方向\n• 下周开始用户调研\n• 待办：输出 PRD 初稿（@Owen）',
  tags: ['工作', '会议'],
  audioUrl: '/uploads/recording-1.mp3',
  duration: 932, // 15:32
  date: '2026-03-02 10:30',
  location: '会议室',
  people: ['张三', '李四', 'Owen'],
  todos: [
    { id: '1', text: '输出 PRD 初稿', assignee: 'Owen', dueDate: '3月5日', completed: false },
    { id: '2', text: '安排用户调研', assignee: 'Nova', dueDate: '3月10日', completed: false },
  ]
};

// Format seconds to MM:SS
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export default function NoteDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [note, setNote] = useState<Note | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedContent, setEditedContent] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [todos, setTodos] = useState<Todo[]>([]);

  // Fetch note from API
  useEffect(() => {
    const fetchNote = async () => {
      try {
        const response = await fetch(`http://localhost:8000/api/notes/${params.id}`, {
          headers: { 'Authorization': 'Bearer test-token' }
        });
        
        if (!response.ok) {
          // If note not found, redirect to notes list
          router.push('/notes');
          return;
        }
        
        const data = await response.json();
        setNote({
          id: data.id,
          title: data.title || '无标题',
          content: data.content || '',
          transcript: data.transcript || '',
          summary: data.summary || '',
          tags: data.tags || [],
          audioUrl: data.audio_url || '',
          duration: data.duration || 0,
          date: data.created_at ? new Date(data.created_at).toLocaleString('zh-CN') : '',
          location: '',
          people: [],
          todos: []
        });
        setEditedTitle(data.title || '');
        setEditedContent(data.content || '');
      } catch (error) {
        console.error('Failed to fetch note:', error);
        router.push('/notes');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchNote();
  }, [params.id, router]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  // Note not found
  if (!note) {
    return null;
  }

  // Toggle todo completion
  const toggleTodo = (todoId: string) => {
    setTodos(prev => prev.map(todo => 
      todo.id === todoId ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  // Generate AI summary
  const generateSummary = async () => {
    setIsGeneratingSummary(true);
    try {
      const response = await fetch('http://localhost:8000/api/ai/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: note.transcript || note.content,
          max_length: 200 
        }),
      });
      
      if (!response.ok) throw new Error('Failed to generate summary');
      
      const result = await response.json();
      setNote(prev => ({ 
        ...prev, 
        summary: result.summary,
        tags: [...prev.tags, ...result.key_points.slice(0, 2)]
      }));
    } catch (error) {
      console.error('Summary generation failed:', error);
      // Fallback to mock
      setNote(prev => ({ 
        ...prev, 
        summary: "• 讨论了 Q2 产品规划和功能优先级\n• 确定了 3 个核心功能方向\n• 下周开始用户调研"
      }));
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  // Save edits
  const saveEdits = () => {
    setNote(prev => ({ ...prev, title: editedTitle, content: editedContent }));
    setIsEditing(false);
  };

  // Cancel edits
  const cancelEdits = () => {
    setEditedTitle(note.title);
    setEditedContent(note.content);
    setIsEditing(false);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-10 h-12 flex items-center justify-between px-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800">
        <Button 
          variant="ghost" 
          size="icon" 
          className="rounded-full"
          onClick={() => router.back()}
        >
          <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </Button>
        
        <div className="flex items-center gap-2">
          {!isEditing && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full"
              onClick={() => setIsEditing(true)}
            >
              <Edit3 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="rounded-full">
            <MoreVertical className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </Button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Title & Meta */}
        <div>
          {isEditing ? (
            <div className="space-y-4">
              <Input
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                className="text-xl font-semibold border-gray-200 dark:border-gray-700"
                placeholder="笔记标题"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={saveEdits}>保存</Button>
                <Button size="sm" variant="outline" onClick={cancelEdits}>取消</Button>
              </div>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
                {note.title}
              </h1>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <span>{note.date}</span>
                <span className="w-1 h-1 rounded-full bg-gray-300" />
                {note.tags.map(tag => (
                  <span key={tag} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-full text-xs">
                    {tag}
                  </span>
                ))}
                <span className="w-1 h-1 rounded-full bg-gray-300" />
                <Clock className="w-3 h-3" />
                <span>{formatDuration(note.duration)}</span>
              </p>
            </>
          )}
        </div>

        {/* Audio Player */}
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="icon" 
              className="w-12 h-12 rounded-full border-gray-200 dark:border-gray-700"
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 text-indigo-600" />
              ) : (
                <Play className="w-5 h-5 text-indigo-600 ml-0.5" />
              )}
            </Button>
            
            <div className="flex-1">
              <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-600 rounded-full transition-all"
                  style={{ width: `${(currentTime / note.duration) * 100}%` }}
                />
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                <span>{formatDuration(currentTime)}</span>
                <span>{formatDuration(note.duration)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* AI Summary */}
        <div className="bg-indigo-50 dark:bg-indigo-900/20 border-l-4 border-indigo-500 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <span className="font-medium text-gray-900 dark:text-white">AI 摘要</span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-indigo-600"
              onClick={generateSummary}
              disabled={isGeneratingSummary}
            >
              {isGeneratingSummary ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  生成中...
                </>
              ) : (
                '重新生成'
              )}
            </Button>
          </div>
          <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">
            {note.summary || '点击"重新生成"创建 AI 摘要'}
          </div>
        </div>

        {/* Key Info Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
              <Calendar className="w-4 h-4" />
              <span className="text-xs">日期</span>
            </div>
            <p className="text-sm text-gray-900 dark:text-white">{note.date.split(' ')[0]}</p>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
              <MapPin className="w-4 h-4" />
              <span className="text-xs">地点</span>
            </div>
            <p className="text-sm text-gray-900 dark:text-white">{note.location}</p>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
              <User className="w-4 h-4" />
              <span className="text-xs">人物</span>
            </div>
            <p className="text-sm text-gray-900 dark:text-white">{note.people.join('、')}</p>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-2">
              <Tag className="w-4 h-4" />
              <span className="text-xs">标签</span>
            </div>
            <SmartTagInput 
              tags={note.tags} 
              onTagsChange={(newTags) => setNote(prev => ({ ...prev, tags: newTags }))}
              noteContent={note.transcript || note.content}
            />
          </div>
        </div>

        {/* Content / Transcript */}
        <div>
          <h3 className="font-medium text-gray-900 dark:text-white mb-3">完整转录</h3>
          {isEditing ? (
            <Textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="min-h-[200px] border-gray-200 dark:border-gray-700"
              placeholder="笔记内容..."
            />
          ) : (
            <div className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line leading-relaxed">
              {note.transcript}
            </div>
          )}
        </div>

        {/* Todos */}
        <TodoExtraction 
          initialTodos={todos}
          onTodosChange={setTodos}
          noteContent={note.transcript || note.content}
        />
      </main>
    </div>
  );
}
