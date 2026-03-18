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
const SAMPLE_ARTICLE_ID = 'sample-article-echonote';

function buildSampleArticle(): Note {
  const createdAt = '2026-03-18T09:20:00.000Z';
  const updatedAt = '2026-03-19T08:40:00.000Z';
  return {
    id: SAMPLE_ARTICLE_ID,
    title: 'F1上海站热度飙升，京东将国内电商经验复制到欧洲',
    type: 'link',
    sourceUrl: 'https://example.com/echonote/sample-article',
    snapshotHtml: `
      <article style="font-family:-apple-system,BlinkMacSystemFont,'PingFang SC','Helvetica Neue',sans-serif;padding:24px;line-height:1.8;color:#1f2937;background:#fffdf8;">
        <h1 style="font-size:30px;line-height:1.2;margin:0 0 12px;color:#111827;">F1上海站热度飙升，京东将国内电商经验复制到欧洲</h1>
        <p style="color:#6b7280;margin:0 0 20px;">示例文章 · 用于测试 EchoNote 的文章阅读、摘录与 AI 提问体验</p>
        <p>今年 F1 上海站重新成为社交媒体上的高频话题，不只是因为赛事本身，更因为它带动了一轮围绕“线下事件如何放大消费热度”的讨论。</p>
        <p>与此同时，京东在欧洲市场尝试复制国内电商的供应链、履约与品类打法，也让“成熟经验如何跨市场迁移”再次成为商业观察的重点。</p>
        <p>如果把这两条线索放在一起看，会发现一个共同点：真正能形成持续影响力的，不是单个热点，而是能否把热点沉淀成长期运营能力。</p>
      </article>
    `.trim(),
    content: `
      今年的 F1 上海站重新回到公众视野，不只是因为赛事本身的竞技看点，更因为它再次验证了一件事：高密度线下事件，依然是放大消费情绪与品牌声量的绝佳入口。

      从社交平台的讨论可以看到，用户关注的焦点已经不再只是“谁赢了比赛”，而是围绕票务、周边、旅行、酒店和品牌联名形成了一整条消费链路。赛事成为了引发城市消费、内容传播和品牌合作的超级触点。

      与此同时，京东在欧洲市场推进本地零售与物流能力建设，也透露出另一个值得追踪的信号：当中国互联网平台开始把国内已经验证过的供应链和履约经验向海外迁移时，竞争重点就不再只是补贴，而是效率、信任与本地化运营的综合能力。

      把这两条信息放在一起看，一个更有价值的问题会出现：今天真正决定增长上限的，究竟是抓住一次热点，还是能否把热点沉淀成可重复的系统能力？

      对 EchoNote 来说，这类文章很适合用来测试“阅读、摘录、提问、转笔记”这条链路，因为它既有明确事实，也天然会引出进一步思考。
    `.trim(),
    tags: ['示例文章', '商业观察', '测试数据'],
    createdAt,
    updatedAt,
  };
}

function ensureSampleArticle(notes: Note[]) {
  const hasArticle = notes.some((note) => note.type === 'link' || note.type === 'file' || note.type === 'image');
  if (hasArticle) return notes;
  const sample = buildSampleArticle();
  const deduped = notes.filter((note) => note.id !== SAMPLE_ARTICLE_ID);
  return sortNotes([sample, ...deduped]);
}

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
        const remoteNotes = ensureSampleArticle(sortNotes(await listNotesRemote()));
        await writeLocalNotes(remoteNotes);
        set({ notes: remoteNotes, isLoading: false, error: null });
        return;
      } catch (remoteError: any) {
        const localNotes = await readLocalNotes();
        if (localNotes.length > 0) {
          const normalized = ensureSampleArticle(sortNotes(localNotes));
          await writeLocalNotes(normalized);
          set({
            notes: normalized,
            isLoading: false,
            error: `云端笔记暂不可用，已切换到本地缓存：${remoteError?.message || 'unknown error'}`,
          });
          return;
        }
      }

      const demoNotes = ensureSampleArticle(sortNotes(MOCK_NOTES_200));
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
