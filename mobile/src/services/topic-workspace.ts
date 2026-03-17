import { NoteRelation, getLocalNoteRelations } from './note-relations';
import { Note } from '../types';
import { richTextToPlainText } from '../utils/richText';

export interface ExploreTopicOption {
  label: string;
  noteCount: number;
  source: 'suggested' | 'custom';
}

export interface TopicProgressItem {
  id: string;
  title: string;
  detail: string;
  noteId?: string;
}

export interface TopicRelationCard {
  title: string;
  detail: string;
  actionLabel: string;
  noteId?: string;
}

export interface TopicChallengeCard {
  eyebrow: string;
  prompt: string;
  ctaLabel: string;
}

export interface TopicWorkspace {
  topicLabel: string;
  topicSource: 'suggested' | 'custom';
  summary: string;
  noteCount: number;
  freshCount: number;
  relationCount: number;
  matchedNotes: Note[];
  progressItems: TopicProgressItem[];
  relationCard: TopicRelationCard;
  challengeCard: TopicChallengeCard;
  challengePrompt: string;
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
const GENERIC_TERMS = new Set(['学习笔记', '实践总结', '入门指南', '最佳实践', '深入理解', '最近资料']);

function normalize(text: string) {
  return text.trim().toLowerCase();
}

function trimText(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max - 1).trim()}…` : text;
}

function toPlain(text: string) {
  return richTextToPlainText(text).replace(/\s+/g, ' ').trim();
}

function getSiteLabel(note: Note) {
  try {
    if (!note.sourceUrl) return '最近笔记';
    return new URL(note.sourceUrl).hostname.replace(/^www\./, '');
  } catch {
    return '最近笔记';
  }
}

function getHoursAgo(date: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 3600000));
}

function formatRelative(date: string) {
  const hours = getHoursAgo(date);
  if (hours < 1) return '刚刚更新';
  if (hours < 24) return `${hours} 小时前更新`;
  return `${Math.floor(hours / 24)} 天前更新`;
}

function noteMatchesTopic(note: Note, topic: string) {
  if (!topic.trim()) return false;
  const target = normalize(topic);
  const title = normalize(note.title || '');
  const content = normalize(toPlain(note.content || '').slice(0, 1200));
  const tags = (note.tags || []).map(normalize);
  return title.includes(target) || content.includes(target) || tags.some((tag) => tag.includes(target));
}

function collectTitlePhrases(notes: Note[]) {
  const counts = new Map<string, number>();

  notes.forEach((note) => {
    const phrases = (note.title || '').match(/[A-Za-z][A-Za-z0-9.+-]{2,}|[\u4e00-\u9fa5]{2,8}/g) || [];
    phrases.forEach((phrase) => {
      const clean = phrase.trim();
      if (!clean || GENERIC_TERMS.has(clean)) return;
      counts.set(clean, (counts.get(clean) || 0) + 1);
    });
  });

  return Array.from(counts.entries())
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([label]) => label);
}

function collectSuggestedTopics(notes: Note[]) {
  const counts = new Map<string, number>();

  notes.forEach((note) => {
    const noteTags = Array.from(new Set((note.tags || []).filter((tag) => tag && !GENERIC_TAGS.has(tag))));
    noteTags.forEach((tag) => counts.set(tag, (counts.get(tag) || 0) + 1));
  });

  const fromTags = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([label]) => label);

  const fromTitles = collectTitlePhrases(notes);
  return Array.from(new Set([...fromTags, ...fromTitles]));
}

function getMatchedNotes(notes: Note[], topic: string) {
  if (!topic.trim()) return [];
  return notes.filter((note) => noteMatchesTopic(note, topic));
}

function buildProgressItems(topic: string, matchedNotes: Note[]): TopicProgressItem[] {
  if (!matchedNotes.length) {
    return [
      {
        id: 'empty-progress',
        title: `还没有与“${topic}”直接匹配的材料`,
        detail: '先导入 1-2 篇内容，系统就能开始持续追踪这个 Topic。',
      },
    ];
  }

  const progress: TopicProgressItem[] = matchedNotes.slice(0, 2).map((note) => ({
    id: note.id,
    title: trimText(note.title || '未命名内容', 28),
    detail: `${getSiteLabel(note)} · ${formatRelative(note.updatedAt)}`,
    noteId: note.id,
  }));

  if (matchedNotes.length >= 3) {
    progress.push({
      id: 'topic-pool',
      title: `已累计 ${matchedNotes.length} 篇材料进入追踪池`,
      detail: '后续会优先从这组内容里生成新的关联视角与挑战问题。',
    });
  }

  return progress;
}

function pickRelation(notes: Note[], matchedNotes: Note[]): NoteRelation | null {
  const sourcePool = matchedNotes.length ? matchedNotes.slice(0, 3) : notes.slice(0, 3);
  const relationList = sourcePool.flatMap((note) => getLocalNoteRelations(notes, note.id, 3));
  const unique = new Map<string, NoteRelation>();

  relationList.forEach((relation) => {
    const key = [relation.sourceNoteId, relation.targetNoteId].sort().join('::');
    if (!unique.has(key)) unique.set(key, relation);
  });

  return Array.from(unique.values()).sort((a, b) => b.similarity - a.similarity)[0] || null;
}

function buildRelationCard(topic: string, relation: NoteRelation | null): TopicRelationCard {
  if (!relation) {
    return {
      title: `“${topic}”还没形成稳定关联`,
      detail: '再积累几篇同主题内容后，这里会自动出现更有意思的连接。',
      actionLabel: '继续积累材料',
    };
  }

  const reason = relation.reason.replace(/^共同标签：|关键词重合：/g, '');
  return {
    title: `${trimText(relation.sourceTitle, 14)} × ${trimText(relation.targetTitle, 14)}`,
    detail: `它们在“${reason || '同一问题'}”上可以互相补强，适合放在一起读。`,
    actionLabel: '查看关联笔记',
    noteId: relation.targetNoteId,
  };
}

function buildChallenge(topic: string, matchedNotes: Note[], relation: NoteRelation | null): TopicChallengeCard {
  const anchor = matchedNotes[0]?.title || topic;
  const relationSeed = relation?.reason.replace(/^共同标签：|关键词重合：/g, '').split('、')[0];
  const prompt = relationSeed
    ? `如果“${relationSeed}”这个前提被证明不成立，你围绕“${topic}”做出的判断还剩下什么？请先反驳自己，再重建论证。`
    : `如果“${topic}”在未来 12 个月成为默认路径，你当前理解里最容易被证伪的部分是什么？请给出反方论据。`;

  return {
    eyebrow: `给“${trimText(anchor, 12)}”的反方提问`,
    prompt,
    ctaLabel: '开始 Spar 对练',
  };
}

export function getExploreTopicOptions(notes: Note[], customTopics: string[] = []): ExploreTopicOption[] {
  const suggestions = collectSuggestedTopics(notes).slice(0, 8);
  const suggestedOptions = suggestions.map((label) => ({
    label,
    noteCount: getMatchedNotes(notes, label).length,
    source: 'suggested' as const,
  }));
  const customOptions = customTopics
    .map((label) => label.trim())
    .filter(Boolean)
    .filter((label) => !suggestions.includes(label))
    .map((label) => ({
      label,
      noteCount: getMatchedNotes(notes, label).length,
      source: 'custom' as const,
    }));

  return [...suggestedOptions, ...customOptions];
}

export function getDefaultExploreTopic(notes: Note[], customTopics: string[] = []) {
  const options = getExploreTopicOptions(notes, customTopics);
  return options[0]?.label || customTopics[0] || 'AI';
}

export function buildTopicWorkspace(notes: Note[], topic: string, customTopics: string[] = []): TopicWorkspace {
  const trimmedTopic = topic.trim() || getDefaultExploreTopic(notes, customTopics);
  const topicOptions = getExploreTopicOptions(notes, customTopics);
  const topicSource = topicOptions.find((item) => item.label === trimmedTopic)?.source || 'custom';
  const matchedNotes = getMatchedNotes(notes, trimmedTopic).slice(0, 6);
  const freshCount = matchedNotes.filter((note) => getHoursAgo(note.updatedAt) <= 72).length;
  const relation = pickRelation(notes, matchedNotes);
  const relationCard = buildRelationCard(trimmedTopic, relation);
  const challengeCard = buildChallenge(trimmedTopic, matchedNotes, relation);
  const noteCount = matchedNotes.length;

  const summary = noteCount
    ? `围绕“${trimmedTopic}”已聚合 ${noteCount} 篇材料，今天有 ${Math.max(freshCount, 1)} 条新进展。`
    : `这是一个新 Topic。补充几篇相关内容后，这里会开始生成进展和关联。`;

  return {
    topicLabel: trimmedTopic,
    topicSource,
    summary,
    noteCount,
    freshCount,
    relationCount: relation ? 1 : 0,
    matchedNotes,
    progressItems: buildProgressItems(trimmedTopic, matchedNotes),
    relationCard,
    challengeCard,
    challengePrompt: challengeCard.prompt,
  };
}
