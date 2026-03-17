import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { MOCK_NOTES_200 } from '../services/mock-data';
import { Note } from '../types';

interface NoteState {
  notes: Note[];
  isLoading: boolean;
  error: string | null;
  fetchNotes: () => Promise<void>;
  createNote: (data: Partial<Note>) => Promise<string>;
  updateNote: (id: string, updates: Partial<Note>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  getNoteById: (id: string) => Note | undefined;
  getAllTags: () => string[];
  searchNotes: (query: string) => Note[];
}

const STORAGE_KEY = 'crispynote_notes_mobile';
const genId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const NOTE_TYPES = new Set<Note['type']>(['voice', 'text', 'ai', 'link', 'file', 'image']);

function ensureString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function ensureStringArray(value: unknown) {
  if (!Array.isArray(value)) return [] as string[];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function normalizeStoredNote(rawNote: any): Note {
  const now = new Date().toISOString();
  const title = ensureString(rawNote?.title, '').trim() || '未命名笔记';
  const content = ensureString(rawNote?.content, '');
  const type = NOTE_TYPES.has(rawNote?.type) ? rawNote.type : 'text';
  const createdAt = ensureString(rawNote?.createdAt, now);
  const updatedAt = ensureString(rawNote?.updatedAt, createdAt || now);

  return {
    id: ensureString(rawNote?.id, genId()),
    title,
    content,
    type,
    sourceUrl: ensureString(rawNote?.sourceUrl, '') || undefined,
    snapshotHtml: ensureString(rawNote?.snapshotHtml, '') || undefined,
    tags: ensureStringArray(rawNote?.tags),
    todos: Array.isArray(rawNote?.todos) ? rawNote.todos : [],
    emoji: ensureString(rawNote?.emoji, '') || undefined,
    createdAt,
    updatedAt,
  };
}

export const useNoteStore = create<NoteState>((set, get) => ({
  notes: [],
  isLoading: false,
  error: null,

  fetchNotes: async () => {
    set({ isLoading: true, error: null });
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      let notes: Note[] = Array.isArray(parsed) ? parsed.map(normalizeStoredNote) : [];
      if (notes.length === 0) {
        notes = MOCK_NOTES_200;
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
      } else {
        // Persist normalized notes so later screens can rely on a stable shape.
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
      }
      notes.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      set({ notes, isLoading: false });
    } catch (e: any) {
      set({ isLoading: false, error: e?.message || 'load failed' });
    }
  },

  createNote: async (data) => {
    const now = new Date().toISOString();
    const note: Note = {
      id: genId(),
      title: data.title || '未命名笔记',
      content: data.content || '',
      type: data.type || 'text',
      sourceUrl: data.sourceUrl,
      snapshotHtml: data.snapshotHtml,
      tags: data.tags || [],
      todos: data.todos || [],
      emoji: data.emoji,
      createdAt: now,
      updatedAt: now,
    };
    const updated = [note, ...get().notes];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    set({ notes: updated });
    return note.id;
  },

  updateNote: async (id, updates) => {
    const updated = get().notes.map((n) => (n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n));
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    set({ notes: updated });
  },

  deleteNote: async (id) => {
    const updated = get().notes.filter((n) => n.id !== id);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    set({ notes: updated });
  },

  getNoteById: (id) => get().notes.find((n) => n.id === id),

  getAllTags: () => {
    const setTags = new Set<string>();
    get().notes.forEach((n) => n.tags?.forEach((t) => setTags.add(t)));
    return Array.from(setTags).sort();
  },

  searchNotes: (query) => {
    const q = query.toLowerCase();
    return get().notes.filter(
      (n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q) || n.tags?.some((t) => t.toLowerCase().includes(q))
    );
  },
}));
