import { Note } from '../types';
import { richTextToPlainText } from '../utils/richText';

export interface NoteRelation {
  sourceNoteId: string;
  targetNoteId: string;
  sourceTitle: string;
  targetTitle: string;
  similarity: number;
  reason: string;
  tags: string[];
}

function extractKeywords(content: string): string[] {
  const words = content.match(/[\u4e00-\u9fa5]{2,10}/g) || [];
  const freq: Record<string, number> = {};
  words.forEach((word) => {
    freq[word] = (freq[word] || 0) + 1;
  });
  return Object.entries(freq)
    .filter(([, count]) => count > 1)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([word]) => word);
}

export function getLocalNoteRelations(notes: Note[], sourceNoteId: string, maxResults = 5): NoteRelation[] {
  const source = notes.find((n) => n.id === sourceNoteId);
  if (!source) return [];

  const relations: NoteRelation[] = [];
  for (const target of notes) {
    if (target.id === source.id) continue;

    const sourceTags = new Set(source.tags || []);
    const targetTags = new Set(target.tags || []);
    const commonTags = [...sourceTags].filter((tag) => targetTags.has(tag));

    const sourceKeywords = extractKeywords(richTextToPlainText(source.content));
    const targetKeywords = extractKeywords(richTextToPlainText(target.content));
    const commonKeywords = sourceKeywords.filter((kw) => targetKeywords.includes(kw));

    const similarity = Math.min(100, commonTags.length * 20 + commonKeywords.length * 5);
    if (similarity < 30) continue;

    relations.push({
      sourceNoteId: source.id,
      targetNoteId: target.id,
      sourceTitle: source.title || '无标题',
      targetTitle: target.title || '无标题',
      similarity,
      reason: commonTags.length ? `共同标签：${commonTags.join('、')}` : `关键词重合：${commonKeywords.slice(0, 3).join('、')}`,
      tags: commonTags,
    });
  }

  return relations.sort((a, b) => b.similarity - a.similarity).slice(0, maxResults);
}
