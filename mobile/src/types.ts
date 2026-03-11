export type NoteType = 'voice' | 'text' | 'ai' | 'link' | 'file' | 'image';

export interface TodoItem {
  id: string;
  text: string;
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
  createdAt: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  type: NoteType;
  sourceUrl?: string;
  snapshotHtml?: string;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  todos?: TodoItem[];
  emoji?: string;
}

export type AppView = 'home' | 'library' | 'document' | 'search' | 'tasks' | 'explore' | 'aiChat';

export type DocumentTab = 'article' | 'source' | 'snapshot';

export interface CapturedContent {
  title: string;
  content: string;
  sourceWebpage?: string;
  snapshotHtml?: string;
  author?: string;
  restricted?: boolean;
  bvid?: string;
  uploader?: string;
  description?: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}
