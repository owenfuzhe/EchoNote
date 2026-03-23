import AsyncStorage from '@react-native-async-storage/async-storage';
import { Note } from '../types';
import { getAiOwnerId } from './ai-identity';
import { getBackendUrl } from './backend-config';
import { richTextToPlainText } from '../utils/richText';

const DEFAULT_TIMEOUT = 45000;
const JOB_POLL_INTERVAL = 1600;
const JOB_TIMEOUT = 90000;
const CACHE_PREFIX = 'echonote_mobile_ai_v3';

export interface QuickReadResult {
  headline: string;
  summary: string;
  bullets: string[];
  readMinutes: number;
  sourceCount: number;
  provider?: string;
}

export interface ExploreQuestionsResult {
  topic: string;
  hook: string;
  questions: string[];
  nextStep: string;
  provider?: string;
}

export interface BriefingSection {
  id: string;
  title: string;
  summary: string;
  keyPoint: string;
}

export interface BriefingData {
  title: string;
  summary: string;
  oneLiner: string;
  bullets: string[];
  sections: BriefingSection[];
  sourceCount: number;
  readMinutes: number;
  generatedAt?: string;
}

export interface BriefingArtifact {
  id: string;
  type: string;
  title: string;
  provider: string;
  jobId?: string | null;
  createdAt?: string;
  updatedAt?: string;
  data: BriefingData;
  meta?: Record<string, unknown>;
}

interface AiJobStatus {
  id?: string;
  jobId?: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  artifactId?: string;
  error?: {
    code?: string;
    message?: string;
  };
}

interface GenerateBriefingOptions {
  onStatus?: (status: AiJobStatus['status']) => void;
  timeoutMs?: number;
}

function notePlainText(note: Note) {
  return richTextToPlainText(note.content || '').replace(/\s+/g, ' ').trim();
}

function trimTitle(title: string, max = 80) {
  const input = String(title || '').trim();
  if (!input) return '未命名内容';
  return input.length > max ? `${input.slice(0, max - 1).trim()}…` : input;
}

function noteToItem(note: Note) {
  return {
    id: note.id,
    title: trimTitle(note.title || '未命名内容'),
    content: notePlainText(note).slice(0, 1800),
    url: note.sourceUrl || '',
  };
}

function notesSignature(notes: Note[]) {
  return notes
    .slice(0, 6)
    .map((note) => `${note.id}:${note.updatedAt}`)
    .join('|');
}

function noteSignature(note: Note) {
  return `${note.id}:${note.updatedAt}`;
}

function cacheKey(parts: string[]) {
  return `${CACHE_PREFIX}:${parts.join(':')}`;
}

async function readCache<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function writeCache<T>(key: string, value: T) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

async function requestJSON<T>(path: string, init: RequestInit = {}, timeout = DEFAULT_TIMEOUT): Promise<T> {
  const backendUrl = await getBackendUrl();
  if (!backendUrl) {
    throw new Error('缺少后端地址');
  }
  const ownerId = await getAiOwnerId();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${backendUrl}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        'X-EchoNote-Owner-Id': ownerId,
        ...(init.headers || {}),
      },
      signal: controller.signal,
      ...init,
    });

    const raw = await response.text();
    let data: any = {};
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      data = { message: raw };
    }

    if (!response.ok) {
      throw new Error(data?.message || `HTTP ${response.status}`);
    }

    return data as T;
  } finally {
    clearTimeout(timeoutId);
  }
}

function buildSingleNotePayload(note: Note) {
  return {
    id: note.id,
    title: note.title || '未命名内容',
    content: notePlainText(note),
    sourceUrl: note.sourceUrl || '',
    items: [noteToItem(note)],
  };
}

function buildBriefingTitle(notes: Note[]) {
  if (!notes.length) return '今日深读简报';
  if (notes.length === 1) return trimTitle(notes[0].title || '单篇简报', 36);
  return `今日深读简报 · ${notes.length} 篇资料`;
}

function buildTopicPayload(topic: string, notes: Note[]) {
  const items = notes.slice(0, 5).map(noteToItem);
  const joined = items.map((item) => `${item.title}\n${item.content}`).join('\n\n');
  return {
    topic: topic.trim(),
    title: topic.trim(),
    content: joined,
    items,
  };
}

export function getCachedQuickRead(note: Note) {
  return readCache<QuickReadResult>(cacheKey(['quick-read', noteSignature(note)]));
}

export async function quickReadNote(note: Note) {
  const result = await requestJSON<QuickReadResult>('/api/ai/quick-read', {
    method: 'POST',
    body: JSON.stringify(buildSingleNotePayload(note)),
  });
  await writeCache(cacheKey(['quick-read', noteSignature(note)]), result);
  return result;
}

export function getCachedNoteExplore(note: Note) {
  return readCache<ExploreQuestionsResult>(cacheKey(['explore-note', noteSignature(note)]));
}

export async function exploreNote(note: Note) {
  const result = await requestJSON<ExploreQuestionsResult>('/api/ai/explore-questions', {
    method: 'POST',
    body: JSON.stringify(buildSingleNotePayload(note)),
  });
  await writeCache(cacheKey(['explore-note', noteSignature(note)]), result);
  return result;
}

export function getCachedTopicExplore(topic: string, notes: Note[]) {
  return readCache<ExploreQuestionsResult>(cacheKey(['explore-topic', topic.trim(), notesSignature(notes)]));
}

export async function exploreTopic(topic: string, notes: Note[]) {
  const result = await requestJSON<ExploreQuestionsResult>('/api/ai/explore-questions', {
    method: 'POST',
    body: JSON.stringify(buildTopicPayload(topic, notes)),
  });
  await writeCache(cacheKey(['explore-topic', topic.trim(), notesSignature(notes)]), result);
  return result;
}

export function getCachedBriefing(notes: Note[]) {
  return readCache<BriefingArtifact>(cacheKey(['briefing', notesSignature(notes)]));
}

async function getJob(jobId: string) {
  return requestJSON<AiJobStatus>(`/api/ai/jobs/${jobId}`, { method: 'GET' }, DEFAULT_TIMEOUT);
}

async function getArtifact(artifactId: string) {
  return requestJSON<BriefingArtifact>(`/api/ai/artifacts/${artifactId}`, { method: 'GET' }, DEFAULT_TIMEOUT);
}

async function waitForArtifact(jobId: string, options: GenerateBriefingOptions = {}) {
  const timeoutMs = options.timeoutMs || JOB_TIMEOUT;
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const job = await getJob(jobId);
    options.onStatus?.(job.status);

    if (job.status === 'succeeded' && job.artifactId) {
      return getArtifact(job.artifactId);
    }

    if (job.status === 'failed') {
      throw new Error(job.error?.message || 'AI 生成失败');
    }

    await new Promise((resolve) => setTimeout(resolve, JOB_POLL_INTERVAL));
  }

  throw new Error('AI 生成超时，请稍后重试');
}

export async function generateBriefing(notes: Note[], options: GenerateBriefingOptions = {}) {
  const payload = {
    title: buildBriefingTitle(notes),
    items: notes.slice(0, 5).map(noteToItem),
  };
  const job = await requestJSON<{ jobId: string; status: AiJobStatus['status'] }>('/api/ai/jobs/briefing', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  options.onStatus?.(job.status);
  const artifact = await waitForArtifact(job.jobId, options);
  await writeCache(cacheKey(['briefing', notesSignature(notes)]), artifact);
  return artifact;
}

export async function voiceCleanTranscript(title: string, transcript: string) {
  return requestJSON<{
    title: string;
    cleanedText: string;
    summary: string;
    todos: string[];
    tags: string[];
    provider?: string;
  }>('/api/ai/voice-clean', {
    method: 'POST',
    body: JSON.stringify({ title, transcript }),
  });
}
