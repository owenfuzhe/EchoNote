import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { MOCK_NOTES_200 } from '../services/mock-data';
import { createNoteRemote, deleteNoteRemote, listNotesRemote, updateNoteRemote } from '../services/supabase-notes';
import { Note } from '../types';
import { richTextToPlainText } from '../utils/richText';

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
const sortNotes = (notes: Note[]) => [...notes].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

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

async function readLocalNotes() {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  const parsed = raw ? JSON.parse(raw) : [];
  return Array.isArray(parsed) ? parsed.map(normalizeStoredNote) : [];
}

async function writeLocalNotes(notes: Note[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

export const useNoteStore = create<NoteState>((set, get) => ({
  notes: [],
  isLoading: false,
  error: null,

  fetchNotes: async () => {
    set({ isLoading: true, error: null });
    try {
      try {
        const remoteNotes = sortNotes(await listNotesRemote());
        await writeLocalNotes(remoteNotes);
        set({ notes: remoteNotes, isLoading: false, error: null });
        return;
      } catch (remoteError: any) {
        const localNotes = await readLocalNotes();
        if (localNotes.length > 0) {
          const normalized = sortNotes(localNotes);
          await writeLocalNotes(normalized);
          set({
            notes: normalized,
            isLoading: false,
            error: `云端笔记暂不可用，已切换到本地缓存：${remoteError?.message || 'unknown error'}`,
          });
          return;
        }
      }

      const demoNotes = sortNotes(MOCK_NOTES_200);
      await writeLocalNotes(demoNotes);
      set({
        notes: demoNotes,
        isLoading: false,
        error: '当前使用本地演示数据。Supabase 登录与云同步接通后，这里会自动切到真实云端数据。',
      });
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

    try {
      const remoteNote = await createNoteRemote(note);
      const updated = sortNotes([remoteNote, ...get().notes.filter((n) => n.id !== remoteNote.id)]);
      await writeLocalNotes(updated);
      set({ notes: updated, error: null });
      return remoteNote.id;
    } catch (e: any) {
      const updated = sortNotes([note, ...get().notes]);
      await writeLocalNotes(updated);
      set({ notes: updated, error: `笔记已保存在本地缓存，云端同步失败：${e?.message || 'unknown error'}` });
      return note.id;
    }
  },

  updateNote: async (id, updates) => {
    const localNext = sortNotes(get().notes.map((n) => (n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n)));

    try {
      const remoteNote = await updateNoteRemote(id, updates);
      const updated = sortNotes(localNext.map((n) => (n.id === id ? remoteNote : n)));
      await writeLocalNotes(updated);
      set({ notes: updated, error: null });
    } catch (e: any) {
      await writeLocalNotes(localNext);
      set({ notes: localNext, error: `更新已保存在本地缓存，云端同步失败：${e?.message || 'unknown error'}` });
    }
  },

  deleteNote: async (id) => {
    try {
      await deleteNoteRemote(id);
      const updated = get().notes.filter((n) => n.id !== id);
      await writeLocalNotes(updated);
      set({ notes: updated, error: null });
    } catch (e: any) {
      const updated = get().notes.filter((n) => n.id !== id);
      await writeLocalNotes(updated);
      set({ notes: updated, error: `删除已在本地生效，云端同步失败：${e?.message || 'unknown error'}` });
    }
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
      (n) =>
        n.title.toLowerCase().includes(q) ||
        richTextToPlainText(n.content).toLowerCase().includes(q) ||
        n.tags?.some((t) => t.toLowerCase().includes(q))
    );
  },
}));
