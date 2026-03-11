import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ContextTrace {
  id: string;
  noteId: string;
  trigger: 'manual' | 'scheduled' | 'ai_suggested';
  inputs: string[];
  prompt?: string;
  generatedAt: string;
  model: string;
  type: 'ai_chat' | 'web_search' | 'podcast' | 'todo_extract' | 'tag_recommend';
}

const TRACES_KEY = 'echonote_context_traces_mobile';
const PRECEDENTS_KEY = 'echonote_user_precedents_mobile';
const LINKS_KEY = 'echonote_cross_links_mobile';
const genId = () => `trace_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

export async function getContextTraces(): Promise<ContextTrace[]> {
  const raw = await AsyncStorage.getItem(TRACES_KEY);
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

export async function saveContextTrace(trace: Omit<ContextTrace, 'id'>): Promise<ContextTrace> {
  const traces = await getContextTraces();
  const next = { ...trace, id: genId() };
  traces.push(next);
  await AsyncStorage.setItem(TRACES_KEY, JSON.stringify(traces.slice(-100)));
  return next;
}

export async function getNoteProvenance(noteId: string) {
  const traces = (await getContextTraces()).filter((t) => t.noteId === noteId);
  const models = [...new Set(traces.map((t) => t.model).filter(Boolean))];
  return {
    traces,
    generatedByAI: traces.length > 0,
    generationCount: traces.length,
    models,
    firstGeneratedAt: traces[0]?.generatedAt,
    lastGeneratedAt: traces[traces.length - 1]?.generatedAt,
  };
}

export async function getContextGraphStats() {
  const traces = await getContextTraces();
  const precedents = JSON.parse((await AsyncStorage.getItem(PRECEDENTS_KEY)) || '[]');
  const links = JSON.parse((await AsyncStorage.getItem(LINKS_KEY)) || '[]');
  return {
    totalTraces: traces.length,
    totalPrecedents: precedents.length,
    totalLinks: links.length,
  };
}

export async function clearContextGraph() {
  await AsyncStorage.multiRemove([TRACES_KEY, PRECEDENTS_KEY, LINKS_KEY]);
}
