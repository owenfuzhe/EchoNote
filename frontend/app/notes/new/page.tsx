'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ChevronLeft,
  Save,
  Mic,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export default function NewNotePage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const saveNote = async () => {
    if (!title.trim()) return;
    
    setIsSaving(true);
    try {
      // Call backend API to create note
      const response = await fetch('http://localhost:8000/api/notes', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token' // TODO: Use real token
        },
        body: JSON.stringify({ 
          title: title.trim(),
          content: content.trim(),
          tags: [],
          duration: 0
        }),
      });
      
      if (!response.ok) throw new Error('Failed to create note');
      
      const newNote = await response.json();
      router.push(`/notes/${newNote.id}`);
    } catch (error) {
      console.error('Save note failed:', error);
      // Fallback: redirect to notes list
      router.push('/notes');
    } finally {
      setIsSaving(false);
    }
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
        
        <span className="font-medium text-gray-900 dark:text-white">新建笔记</span>
        
        <Button 
          variant="ghost" 
          size="icon" 
          className="rounded-full"
          onClick={saveNote}
          disabled={isSaving || !title.trim()}
        >
          <Save className="w-5 h-5 text-indigo-600" />
        </Button>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Title Input */}
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="笔记标题"
          className="text-xl font-semibold border-0 border-b border-gray-200 dark:border-gray-700 rounded-none px-0 focus-visible:ring-0"
        />

        {/* Content Textarea */}
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="开始输入笔记内容..."
          className="min-h-[300px] border-0 resize-none focus-visible:ring-0"
        />

        {/* Quick Actions */}
        <div className="flex gap-2 pt-4">
          <Button variant="outline" className="flex-1" onClick={() => {}}>
            <Mic className="w-4 h-4 mr-2" />
            添加录音
          </Button>
          <Button variant="outline" className="flex-1" onClick={() => {}}>
            <Sparkles className="w-4 h-4 mr-2" />
            AI 生成摘要
          </Button>
        </div>
      </main>
    </div>
  );
}
