import { Note } from '../types';

export interface BriefingSection {
  id: string;
  title: string;
  source: string;
  insight: string;
  action: string;
}

export interface BriefingPayload {
  title: string;
  capsuleText: string;
  oneLiner: string;
  notes: Note[];
  sections: BriefingSection[];
  topicLabel: string;
  coverageLabel: string;
  dateLabel: string;
}

const DEFAULT_COUNT = 3;
const GENERIC_TAGS = new Set(['已读', '链接收藏', '剪贴内容', 'AI润色', '语音输入', '图片', '文件']);

function toPlain(text: string) {
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/#{1,6}\s/g, '')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function trimText(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max - 1).trim()}…` : text;
}

function getSiteLabel(note: Note) {
  try {
    if (!note.sourceUrl) return '本地笔记';
    return new URL(note.sourceUrl).hostname.replace(/^www\./, '');
  } catch {
    return '本地笔记';
  }
}

function getSentences(text: string) {
  return toPlain(text)
    .split(/[。！？.!?；;\n]/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 10);
}

function collectTopics(notes: Note[]) {
  const counts = new Map<string, number>();

  notes.forEach((note) => {
    (note.tags || [])
      .filter((tag) => tag && !GENERIC_TAGS.has(tag))
      .forEach((tag) => counts.set(tag, (counts.get(tag) || 0) + 1));
  });

  if (counts.size > 0) {
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([tag]) => tag)
      .slice(0, 3);
  }

  return notes
    .map((note) => note.title.replace(/[《》]/g, '').trim())
    .filter(Boolean)
    .slice(0, 3)
    .map((title) => trimText(title, 12));
}

function fallbackSentence(note: Note) {
  const plain = toPlain(note.content);
  if (!plain) return '这篇内容已导入，适合回到原文继续阅读全文。';
  return trimText(plain, 56);
}

function buildInsight(note: Note) {
  const [firstSentence] = getSentences(note.content);
  return trimText(firstSentence || fallbackSentence(note), 64);
}

function buildAction(note: Note) {
  const [, secondSentence] = getSentences(note.content);
  if (secondSentence) return `行动建议：${trimText(secondSentence, 48)}`;

  if (note.tags?.length) {
    const tags = note.tags.filter((tag) => !GENERIC_TAGS.has(tag)).slice(0, 2);
    if (tags.length) return `延伸方向：继续追踪 ${tags.join('、')}`;
  }

  return `行动建议：回到 ${getSiteLabel(note)} 原文补齐上下文。`;
}

function formatDateLabel() {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${month}月${day}日`;
}

export function getDefaultBriefingNoteIds(notes: Note[], count = DEFAULT_COUNT) {
  return notes.slice(0, count).map((note) => note.id);
}

export function getBriefingNotes(notes: Note[], selectedIds: string[], count = DEFAULT_COUNT) {
  const byId = new Map(notes.map((note) => [note.id, note]));
  const selected = selectedIds.map((id) => byId.get(id)).filter(Boolean) as Note[];
  return selected.length ? selected : notes.slice(0, count);
}

export function buildBriefing(notes: Note[]): BriefingPayload {
  const pickedNotes = notes.slice(0, 5);
  const topics = collectTopics(pickedNotes);
  const topicLabel = topics.slice(0, 2).join(' / ') || '最近资料';
  const leadTitle = trimText(pickedNotes[0]?.title || '最近内容', 18);
  const noteCount = pickedNotes.length;
  const sections = pickedNotes.map((note) => ({
    id: note.id,
    title: trimText(note.title || '未命名内容', 24),
    source: getSiteLabel(note),
    insight: buildInsight(note),
    action: buildAction(note),
  }));

  const capsuleText =
    noteCount > 1
      ? `刚刚为你打包了《${leadTitle}》等 ${noteCount} 篇近期高价值内容，整理成一页式的深读简报。`
      : `刚刚为你整理了《${leadTitle}》的核心结论与行动建议。`;

  const oneLiner =
    sections.length > 1
      ? `当前这组内容主要围绕 ${topicLabel} 展开，核心趋势是从“信息收集”转向“结构化理解与持续追踪”。`
      : `这篇内容的核心价值在于把零散信息压缩成可执行的判断与下一步动作。`;

  return {
    title: `今日深读简报：${topicLabel}`,
    capsuleText,
    oneLiner,
    notes: pickedNotes,
    sections,
    topicLabel,
    coverageLabel: `包含 ${noteCount} 篇内容`,
    dateLabel: formatDateLabel(),
  };
}
