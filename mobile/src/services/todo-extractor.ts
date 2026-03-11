import { chat } from './bailian-chat';

export type TodoPriority = 'high' | 'medium' | 'low';

export interface ExtractedTodo {
  text: string;
  priority: TodoPriority;
}

const TODO_EXTRACTION_PROMPT = `你是一个智能待办提取助手。请从笔记内容中提取所有行动项。
输出严格 JSON：{"todos":[{"text":"...","priority":"high|medium|low"}]}
笔记内容：\n`;

export async function extractTodos(content: string): Promise<ExtractedTodo[]> {
  if (!content.trim()) return [];
  const response = await chat([{ role: 'user', content: TODO_EXTRACTION_PROMPT + content }], {
    model: 'qwen-max',
    temperature: 0.3,
    maxTokens: 1024,
  });
  return parseTodoResponse(response.content);
}

function parseTodoResponse(content: string): ExtractedTodo[] {
  const candidates = [content, content.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1], content.match(/\{[\s\S]*\}/)?.[0]].filter(Boolean) as string[];
  for (const c of candidates) {
    try {
      const data = JSON.parse(c);
      if (Array.isArray(data.todos)) {
        return data.todos
          .filter((t: any) => t?.text)
          .map((t: any) => ({ text: String(t.text).trim(), priority: ['high', 'medium', 'low'].includes(t.priority) ? t.priority : 'medium' }));
      }
    } catch {}
  }
  return [];
}

export function createTodoItem(text: string, priority: TodoPriority = 'medium') {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    text: text.trim(),
    priority,
    completed: false,
    createdAt: new Date().toISOString(),
  };
}
