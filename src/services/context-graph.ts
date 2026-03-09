/**
 * Context Graph 服务
 * 决策痕迹系统 - 记录 AI 生成内容的完整上下文
 */

import { Note } from "../store/note-store";

// 决策痕迹
export interface ContextTrace {
  id: string;
  noteId: string;
  trigger: "manual" | "scheduled" | "ai_suggested";
  inputs: string[];
  prompt?: string;
  generatedAt: string;
  model: string;
  type: "ai_chat" | "web_search" | "podcast" | "todo_extract" | "tag_recommend";
}

// 用户先例偏好
export interface UserPrecedent {
  id: string;
  category: "format" | "tone" | "structure" | "voice";
  pattern: string;
  frequency: number;
  lastUsed: string;
}

// 跨系统关联
export interface CrossSourceLink {
  id: string;
  sourceIds: string[];
  type: "time_window" | "semantic" | "manual";
  confidence: number;
  createdAt: string;
}

const TRACES_KEY = "echonote_context_traces";
const PRECEDENTS_KEY = "echonote_user_precedents";

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return `trace_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * 保存决策痕迹
 */
export function saveContextTrace(trace: Omit<ContextTrace, "id">): ContextTrace {
  const traces = getContextTraces();
  const newTrace: ContextTrace = {
    ...trace,
    id: generateId(),
  };
  traces.push(newTrace);
  localStorage.setItem(TRACES_KEY, JSON.stringify(traces.slice(-100))); // 只保留最近100条
  return newTrace;
}

/**
 * 获取所有决策痕迹
 */
export function getContextTraces(): ContextTrace[] {
  const data = localStorage.getItem(TRACES_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

/**
 * 获取笔记的决策痕迹
 */
export function getTracesByNoteId(noteId: string): ContextTrace[] {
  return getContextTraces().filter((t) => t.noteId === noteId);
}

/**
 * 获取笔记溯源信息
 */
export function getNoteProvenance(noteId: string): {
  traces: ContextTrace[];
  generatedByAI: boolean;
  generationCount: number;
  models: string[];
  firstGeneratedAt?: string;
  lastGeneratedAt?: string;
} {
  const traces = getTracesByNoteId(noteId);
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

/**
 * 记录用户先例偏好
 */
export function recordPrecedent(
  category: UserPrecedent["category"],
  pattern: string
): void {
  const precedents = getUserPrecedents();
  const existing = precedents.find(
    (p) => p.category === category && p.pattern === pattern
  );

  if (existing) {
    existing.frequency += 1;
    existing.lastUsed = new Date().toISOString();
  } else {
    precedents.push({
      id: generateId(),
      category,
      pattern,
      frequency: 1,
      lastUsed: new Date().toISOString(),
    });
  }

  localStorage.setItem(PRECEDENTS_KEY, JSON.stringify(precedents));
}

/**
 * 获取用户先例偏好
 */
export function getUserPrecedents(): UserPrecedent[] {
  const data = localStorage.getItem(PRECEDENTS_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

/**
 * 获取热门先例（用于 AI 学习）
 */
export function getTopPrecedents(
  category?: UserPrecedent["category"],
  limit: number = 5
): UserPrecedent[] {
  let precedents = getUserPrecedents();

  if (category) {
    precedents = precedents.filter((p) => p.category === category);
  }

  return precedents
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, limit);
}

/**
 * 创建跨系统关联（10分钟时间窗）
 */
export function createCrossSourceLink(
  sourceIds: string[],
  type: CrossSourceLink["type"] = "time_window",
  confidence: number = 0.8
): CrossSourceLink {
  const link: CrossSourceLink = {
    id: generateId(),
    sourceIds,
    type,
    confidence,
    createdAt: new Date().toISOString(),
  };

  // 保存到 localStorage
  const links = getCrossSourceLinks();
  links.push(link);
  localStorage.setItem("echonote_cross_links", JSON.stringify(links.slice(-50)));

  return link;
}

/**
 * 获取跨系统关联
 */
export function getCrossSourceLinks(): CrossSourceLink[] {
  const data = localStorage.getItem("echonote_cross_links");
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

/**
 * 查找时间窗内的关联（10分钟）
 */
export function findTimeWindowLinks(
  noteId: string,
  windowMinutes: number = 10
): CrossSourceLink[] {
  const links = getCrossSourceLinks();
  const noteTime = new Date().getTime(); // 简化处理，实际应该用笔记创建时间

  return links.filter((link) => {
    if (!link.sourceIds.includes(noteId)) return false;
    const linkTime = new Date(link.createdAt).getTime();
    const diffMinutes = Math.abs(noteTime - linkTime) / (1000 * 60);
    return diffMinutes <= windowMinutes;
  });
}

/**
 * 获取 Context Graph 统计
 */
export function getContextGraphStats(): {
  totalTraces: number;
  totalPrecedents: number;
  totalLinks: number;
  topModels: string[];
  mostUsedTrigger: string;
} {
  const traces = getContextTraces();
  const precedents = getUserPrecedents();
  const links = getCrossSourceLinks();

  const modelCounts: Record<string, number> = {};
  const triggerCounts: Record<string, number> = {};

  for (const trace of traces) {
    if (trace.model) {
      modelCounts[trace.model] = (modelCounts[trace.model] || 0) + 1;
    }
    triggerCounts[trace.trigger] = (triggerCounts[trace.trigger] || 0) + 1;
  }

  const topModels = Object.entries(modelCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([model]) => model);

  const mostUsedTrigger =
    Object.entries(triggerCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ||
    "manual";

  return {
    totalTraces: traces.length,
    totalPrecedents: precedents.length,
    totalLinks: links.length,
    topModels,
    mostUsedTrigger,
  };
}

/**
 * 清除所有 Context Graph 数据
 */
export function clearContextGraph(): void {
  localStorage.removeItem(TRACES_KEY);
  localStorage.removeItem(PRECEDENTS_KEY);
  localStorage.removeItem("echonote_cross_links");
}
