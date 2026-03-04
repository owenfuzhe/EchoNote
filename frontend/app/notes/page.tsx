'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search,
  Plus,
  Mic,
  FileText,
  Clock,
  Home,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface Note {
  id: string;
  title: string;
  summary: string;
  tags: string[];
  duration: number;
  date: string;
  hasAudio: boolean;
}

const MOCK_NOTES: Note[] = [
  {
    id: '1',
    title: '产品需求评审会议',
    summary: '讨论了 Q1 产品规划和功能优先级，确定了 3 个核心功能方向...',
    tags: ['工作', '会议'],
    duration: 932,
    date: '今天 10:30',
    hasAudio: true,
  },
  {
    id: '2',
    title: '用户访谈 - 小明',
    summary: '访谈了 5 位目标用户，收集了关于语音功能的反馈和建议...',
    tags: ['用户研究'],
    duration: 1845,
    date: '昨天 14:00',
    hasAudio: true,
  },
  {
    id: '3',
    title: '周末购物清单',
    summary: '牛奶、鸡蛋、面包、水果、蔬菜、零食...',
    tags: ['生活', '待办'],
    duration: 45,
    date: '昨天 09:15',
    hasAudio: true,
  },
];

const FILTERS = ['全部', '工作', '生活', '会议', '笔记'];

function formatDuration(seconds: number): string {
  if (seconds === 0) return '';
  const mins = Math.floor(seconds / 60);
  return `${mins} 分钟`;
}

export default function NotesListPage() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState('全部');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredNotes = MOCK_NOTES.filter(note => {
    const matchesFilter = activeFilter === '全部' || note.tags.includes(activeFilter);
    const matchesSearch = searchQuery === '' || 
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.summary.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Top Tab Bar - Same as Home */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4">
        <div className="flex items-center justify-around h-12">
          <button 
            className="flex-1 text-center text-gray-500 dark:text-gray-400 pb-3 pt-3"
            onClick={() => router.push('/')}
          >
            主页
          </button>
          <button className="flex-1 text-center text-indigo-600 font-medium border-b-2 border-indigo-600 pb-3 pt-3">
            资料库
          </button>
          <button className="flex-1 text-center text-gray-500 dark:text-gray-400 pb-3 pt-3">
            待办
          </button>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className="space-y-3">
          {filteredNotes.map(note => (
            <div
              key={note.id}
              onClick={() => router.push(`/notes/${note.id}`)}
              className="p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-medium text-gray-900 dark:text-white line-clamp-1">
                  {note.title}
                </h3>
                {note.hasAudio && (
                  <Mic className="w-4 h-4 text-indigo-600 flex-shrink-0 ml-2" />
                )}
              </div>

              <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">
                {note.summary}
              </p>

              <div className="flex items-center justify-between text-xs text-gray-400">
                <div className="flex items-center gap-3">
                  <span>{note.date}</span>
                  {note.duration > 0 && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDuration(note.duration)}
                    </span>
                  )}
                </div>
                
                <div className="flex gap-1">
                  {note.tags.slice(0, 2).map(tag => (
                    <span 
                      key={tag}
                      className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredNotes.length === 0 && (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">暂无笔记</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => router.push('/record')}
            >
              <Mic className="w-4 h-4 mr-2" />
              开始录音
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
