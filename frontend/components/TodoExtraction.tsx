'use client';

import { useState } from 'react';
import { CheckSquare, Square, Sparkles, Loader2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Todo {
  id: string;
  text: string;
  assignee?: string;
  dueDate?: string;
  completed: boolean;
}

interface TodoExtractionProps {
  initialTodos?: Todo[];
  onTodosChange: (todos: Todo[]) => void;
  noteContent?: string;
}

export function TodoExtraction({ initialTodos = [], onTodosChange, noteContent }: TodoExtractionProps) {
  const [todos, setTodos] = useState<Todo[]>(initialTodos);
  const [isExtracting, setIsExtracting] = useState(false);
  const [newTodoText, setNewTodoText] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Toggle todo completion
  const toggleTodo = (id: string) => {
    const updated = todos.map(todo => 
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    );
    setTodos(updated);
    onTodosChange(updated);
  };

  // Delete todo
  const deleteTodo = (id: string) => {
    const updated = todos.filter(todo => todo.id !== id);
    setTodos(updated);
    onTodosChange(updated);
  };

  // Add new todo manually
  const addTodo = () => {
    if (!newTodoText.trim()) return;
    
    const newTodo: Todo = {
      id: `todo_${Date.now()}`,
      text: newTodoText.trim(),
      completed: false
    };
    
    const updated = [...todos, newTodo];
    setTodos(updated);
    onTodosChange(updated);
    setNewTodoText('');
    setIsAdding(false);
  };

  // Extract todos from note content using AI
  const extractTodos = async () => {
    if (!noteContent) return;
    
    setIsExtracting(true);
    try {
      const response = await fetch('http://localhost:8000/api/ai/extract-todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: noteContent }),
      });
      
      if (!response.ok) throw new Error('Failed to extract todos');
      
      const result = await response.json();
      const extractedTodos: Todo[] = result.todos.map((t: any, index: number) => ({
        id: `extracted_${Date.now()}_${index}`,
        text: t.text,
        assignee: t.assignee,
        dueDate: t.dueDate,
        completed: false
      }));
      
      // Merge with existing todos (avoid duplicates)
      const existingTexts = new Set(todos.map(t => t.text.toLowerCase()));
      const newTodos = extractedTodos.filter(t => !existingTexts.has(t.text.toLowerCase()));
      
      const updated = [...todos, ...newTodos];
      setTodos(updated);
      onTodosChange(updated);
    } catch (error) {
      console.error('Todo extraction failed:', error);
      // Fallback: simple pattern matching
      const lines = noteContent.split('\n');
      const patternTodos: Todo[] = [];
      
      lines.forEach((line, index) => {
        if (line.includes('TODO') || line.includes('待办') || line.includes('需要')) {
          const text = line.replace(/TODO:?\s*|待办:?\s*|需要\s*/gi, '').trim();
          if (text && text.length > 3) {
            patternTodos.push({
              id: `fallback_${Date.now()}_${index}`,
              text,
              completed: false
            });
          }
        }
      });
      
      const updated = [...todos, ...patternTodos];
      setTodos(updated);
      onTodosChange(updated);
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
          <CheckSquare className="w-4 h-4" />
          待办事项
        </h3>
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={extractTodos}
            disabled={isExtracting || !noteContent}
            className="text-xs"
          >
            {isExtracting ? (
              <>
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                提取中...
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3 mr-1" />
                AI 提取待办
              </>
            )}
          </Button>
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => setIsAdding(true)}
            className="text-xs"
          >
            <Plus className="w-3 h-3 mr-1" />
            添加
          </Button>
        </div>
      </div>

      {/* Add New Todo */}
      {isAdding && (
        <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <Input
            value={newTodoText}
            onChange={(e) => setNewTodoText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTodo()}
            placeholder="输入待办事项..."
            className="flex-1 h-8 text-sm"
            autoFocus
          />
          <Button size="sm" onClick={addTodo} className="h-8">确定</Button>
          <Button size="sm" variant="ghost" onClick={() => setIsAdding(false)} className="h-8">取消</Button>
        </div>
      )}

      {/* Todo List */}
      {todos.length > 0 ? (
        <div className="space-y-2">
          {todos.map(todo => (
            <div 
              key={todo.id}
              className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg group"
            >
              <button
                onClick={() => toggleTodo(todo.id)}
                className="mt-0.5 text-indigo-600 hover:text-indigo-700"
              >
                {todo.completed ? (
                  <CheckSquare className="w-5 h-5" />
                ) : (
                  <Square className="w-5 h-5 text-gray-400" />
                )}
              </button>
              
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${todo.completed ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-white'}`}>
                  {todo.text}
                </p>
                {(todo.assignee || todo.dueDate) && (
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                    {todo.assignee && <span>@{todo.assignee}</span>}
                    {todo.dueDate && <span>截止：{todo.dueDate}</span>}
                  </div>
                )}
              </div>
              
              <button
                onClick={() => deleteTodo(todo.id)}
                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
          暂无待办事项，点击"AI 提取待办"或"添加"创建
        </p>
      )}
    </div>
  );
}