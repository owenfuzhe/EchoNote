'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  CheckCircle2, 
  Circle, 
  Clock,
  ChevronLeft,
  Plus,
  Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Todo {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string;
  priority: 'high' | 'medium' | 'low';
}

const MOCK_TODOS: Todo[] = [
  { id: '1', title: '完成 EchoNote 测试', completed: false, dueDate: '今天', priority: 'high' },
  { id: '2', title: '整理会议记录', completed: false, dueDate: '明天', priority: 'medium' },
  { id: '3', title: '更新项目文档', completed: true, priority: 'low' },
  { id: '4', title: '回复客户邮件', completed: false, dueDate: '后天', priority: 'high' },
];

export default function TodosPage() {
  const router = useRouter();
  const [todos, setTodos] = useState<Todo[]>(MOCK_TODOS);

  const toggleTodo = (id: string) => {
    setTodos(todos.map(todo => 
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-500';
      case 'medium': return 'text-amber-500';
      case 'low': return 'text-green-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <button 
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>返回</span>
          </button>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">待办事项</h1>
          <Button size="icon" variant="ghost">
            <Plus className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Stats */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl text-center">
            <div className="text-2xl font-bold text-indigo-600">{todos.length}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">全部</div>
          </div>
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl text-center">
            <div className="text-2xl font-bold text-amber-600">
              {todos.filter(t => !t.completed).length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">待完成</div>
          </div>
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl text-center">
            <div className="text-2xl font-bold text-green-600">
              {todos.filter(t => t.completed).length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">已完成</div>
          </div>
        </div>

        {/* Todo List */}
        <div className="space-y-3">
          {todos.map((todo) => (
            <div
              key={todo.id}
              onClick={() => toggleTodo(todo.id)}
              className={cn(
                "p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl flex items-center gap-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors",
                todo.completed && "opacity-60"
              )}
            >
              {todo.completed ? (
                <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0" />
              ) : (
                <Circle className="w-6 h-6 text-gray-400 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "font-medium text-gray-900 dark:text-white",
                  todo.completed && "line-through text-gray-500"
                )}>
                  {todo.title}
                </p>
                {todo.dueDate && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                    <Calendar className="w-3 h-3" />
                    {todo.dueDate}
                  </p>
                )}
              </div>
              <div className={cn("w-2 h-2 rounded-full", getPriorityColor(todo.priority))} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
