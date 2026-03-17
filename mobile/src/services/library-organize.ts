import { Note } from '../types';

export type LibraryViewMode = 'organized' | 'raw';
export type LibraryFormatFilter = 'all' | 'link' | 'text' | 'image' | 'voice' | 'ai';

export interface LibraryAssetStack {
  id: string;
  label: string;
  summary: string;
  noteIds: string[];
  leadNoteId: string;
  rawCount: number;
  aiCount: number;
  unreadCount: number;
  sampleTitles: Array<{ id: string; title: string }>;
}

const GENERIC_TAGS = new Set([
  '已读',
  '链接收藏',
  '剪贴内容',
  'AI润色',
  '语音输入',
  '图片',
  '文件',
  '模板',
  '搜索',
  '联网',
]);

function normalize(text: string) {
  return text.trim().toLowerCase();
}

function toPlain(text: string) {
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/#{1,6}\s/g, '')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function isMeaningfulTag(tag: string) {
  return !!tag && !GENERIC_TAGS.has(tag);
}

function getTitleTokens(note: Note) {
  return (note.title || '').match(/[A-Za-z][A-Za-z0-9.+-]{2,}|[\u4e00-\u9fa5]{2,8}/g) || [];
}

function getPrimaryLabel(note: Note) {
  const tag = (note.tags || []).find(isMeaningfulTag);
  if (tag) return tag;

  const [firstToken] = getTitleTokens(note).filter((token) => token.length >= 2);
  if (firstToken) return firstToken;

  return note.type === 'link' ? '网页收藏' : '最近沉淀';
}

export function isAINote(note: Note) {
  return note.type === 'ai' || (note.tags || []).some((tag) => ['模板', 'AI润色', '搜索', '联网'].includes(tag));
}

export function isUnreadNote(note: Note) {
  return !(note.tags || []).includes('已读');
}

export function matchesLibraryFormat(note: Note, format: LibraryFormatFilter) {
  if (format === 'all') return true;
  if (format === 'ai') return isAINote(note);
  return note.type === format;
}

export function getLibraryTags(notes: Note[]) {
  const tags = new Set<string>();
  notes.forEach((note) => {
    (note.tags || []).filter(isMeaningfulTag).forEach((tag) => tags.add(tag));
  });
  return Array.from(tags).sort();
}

function buildStackSummary(label: string, notes: Note[], aiCount: number) {
  if (aiCount > 0) return `围绕“${label}”的材料已经开始沉淀出 AI 产物。`;
  if (notes.length >= 4) return `这组内容已经从零散导入，慢慢收成一个清晰主题。`;
  if (notes.length >= 2) return `这一组材料已经开始聚拢，适合继续补充和整理。`;
  return `先把这条内容放进主题栈，后续它会继续长出来。`;
}

export function buildLibraryAssetStacks(notes: Note[]) {
  if (!notes.length) return [] as LibraryAssetStack[];

  const grouped = new Map<string, { key: string; label: string; items: Note[] }>();
  notes.forEach((note) => {
    const label = getPrimaryLabel(note).trim() || '最近沉淀';
    const key = normalize(label) || note.id;
    const current = grouped.get(key);
    if (current) {
      current.items.push(note);
      return;
    }
    grouped.set(key, { key, label, items: [note] });
  });

  const strongStacks = Array.from(grouped.values())
    .filter(({ items }) => items.length >= 2)
    .map((group) => ({
      ...group,
      items: group.items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    }));

  const looseNotes = Array.from(grouped.values())
    .filter(({ items }) => items.length < 2)
    .flatMap(({ items }) => items)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const stacks: LibraryAssetStack[] = strongStacks.map(({ key, label, items }) => {
    const aiCount = items.filter(isAINote).length;
    const rawCount = items.length - aiCount;
    const unreadCount = items.filter(isUnreadNote).length;
    return {
      id: `stack-${key}`,
      label,
      summary: buildStackSummary(label, items, aiCount),
      noteIds: items.map((note) => note.id),
      leadNoteId: items[0].id,
      rawCount,
      aiCount,
      unreadCount,
      sampleTitles: items.slice(0, 2).map((note) => ({ id: note.id, title: note.title || '未命名内容' })),
    };
  });

  if (looseNotes.length) {
    const aiCount = looseNotes.filter(isAINote).length;
    stacks.push({
      id: 'stack-recent',
      label: '最近沉淀',
      summary: '这些内容还比较分散，但已经值得先收进同一个整理视图里。',
      noteIds: looseNotes.map((note) => note.id),
      leadNoteId: looseNotes[0].id,
      rawCount: looseNotes.length - aiCount,
      aiCount,
      unreadCount: looseNotes.filter(isUnreadNote).length,
      sampleTitles: looseNotes.slice(0, 2).map((note) => ({ id: note.id, title: note.title || '未命名内容' })),
    });
  }

  return stacks.sort((a, b) => {
    const scoreA = a.noteIds.length * 10 + a.aiCount * 3 + a.unreadCount;
    const scoreB = b.noteIds.length * 10 + b.aiCount * 3 + b.unreadCount;
    return scoreB - scoreA;
  });
}
