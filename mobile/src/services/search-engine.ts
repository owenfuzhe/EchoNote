import Fuse from 'fuse.js';
import { Note } from '../types';

export interface SearchResult {
  item: Note;
  score: number;
  matches: Array<{ key: string; value: string; indices: Array<[number, number]> }>;
}

export interface HighlightSegment {
  text: string;
  isHighlight: boolean;
}

const fuseOptions: any = {
  keys: [
    { name: 'title', weight: 0.6 },
    { name: 'content', weight: 0.3 },
    { name: 'tags', weight: 0.1 },
  ],
  threshold: 0.4,
  distance: 100,
  includeMatches: true,
  ignoreLocation: true,
  minMatchCharLength: 2,
  includeScore: true,
  shouldSort: true,
};

class SearchEngine {
  private fuse: Fuse<Note> | null = null;
  private notes: Note[] = [];

  init(notes: Note[]) {
    this.notes = notes;
    this.fuse = new Fuse(notes, fuseOptions);
  }

  search(query: string): SearchResult[] {
    if (!this.fuse || !query.trim()) return [];
    return this.fuse.search(query).map((r) => ({
      item: r.item,
      score: r.score ?? 1,
      matches: r.matches?.map((m) => ({ key: m.key ?? '', value: Array.isArray(m.value) ? m.value[0] : m.value ?? '', indices: Array.from(m.indices || []).map(([s, e]) => [s, e] as [number, number]) })) ?? [],
    }));
  }

  getSuggestions(query: string, limit = 5): string[] {
    if (!query.trim() || query.length < 2) return [];
    const suggestions = new Set<string>();
    const q = query.toLowerCase();
    for (const note of this.notes) {
      if (note.title.toLowerCase().includes(q)) suggestions.add(note.title);
      note.tags?.forEach((t) => t.toLowerCase().includes(q) && suggestions.add(`#${t}`));
      if (suggestions.size >= limit) break;
    }
    return Array.from(suggestions).slice(0, limit);
  }

  private mergeIntervals(intervals: Array<[number, number]>) {
    if (!intervals.length) return [];
    const merged: Array<[number, number]> = [intervals[0]];
    for (let i = 1; i < intervals.length; i++) {
      const [s, e] = intervals[i];
      const last = merged[merged.length - 1];
      if (s <= last[1] + 1) merged[merged.length - 1] = [last[0], Math.max(last[1], e)];
      else merged.push([s, e]);
    }
    return merged;
  }

  highlight(text: string, matches: Array<{ indices: Array<[number, number]> }>): HighlightSegment[] {
    if (!matches?.length) return [{ text, isHighlight: false }];
    const all = matches.flatMap((m) => m.indices).sort((a, b) => a[0] - b[0]);
    const merged = this.mergeIntervals(all);
    const seg: HighlightSegment[] = [];
    let cursor = 0;
    for (const [s, e] of merged) {
      if (s > cursor) seg.push({ text: text.slice(cursor, s), isHighlight: false });
      seg.push({ text: text.slice(s, e + 1), isHighlight: true });
      cursor = e + 1;
    }
    if (cursor < text.length) seg.push({ text: text.slice(cursor), isHighlight: false });
    return seg;
  }

  highlightWithTruncation(text: string, matches: Array<{ indices: Array<[number, number]> }>, maxLength = 100): HighlightSegment[] {
    if (!matches?.length) {
      const t = text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
      return [{ text: t, isHighlight: false }];
    }
    const first = matches[0]?.indices[0];
    if (!first) return [{ text: text.length > maxLength ? `${text.slice(0, maxLength)}...` : text, isHighlight: false }];
    const [start] = first;
    let s = Math.max(0, start - maxLength / 2);
    let e = Math.min(text.length, s + maxLength);
    if (e - s < maxLength) s = Math.max(0, e - maxLength);
    const trunc = `${s > 0 ? '...' : ''}${text.slice(s, e)}${e < text.length ? '...' : ''}`;
    const offset = s > 0 ? s - 3 : s;
    const adjusted = matches.map((m) => ({ indices: m.indices.map(([x, y]) => [x - offset, y - offset] as [number, number]).filter(([x, y]) => x >= 0 && y < trunc.length) }));
    return this.highlight(trunc, adjusted);
  }
}

export const searchEngine = new SearchEngine();
