/**
 * 笔记归档服务
 * 支持按时间、标签自动归档
 */

import { Note } from "../store/note-store";

export interface Archive {
  id: string;
  name: string;
  type: "time" | "tag" | "custom";
  count: number;
  noteIds: string[];
  createdAt: string;
  updatedAt: string;
  color?: string;
}

export interface ArchiveStats {
  totalNotes: number;
  archivedNotes: number;
  activeNotes: number;
  archiveCount: number;
}

const ARCHIVE_KEY = "echonote_archives";

/**
 * 获取所有归档
 */
export function getArchives(): Archive[] {
  const data = localStorage.getItem(ARCHIVE_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

/**
 * 保存归档
 */
function saveArchives(archives: Archive[]): void {
  localStorage.setItem(ARCHIVE_KEY, JSON.stringify(archives));
}

/**
 * 生成归档 ID
 */
function generateId(): string {
  return `archive_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * 按月份自动归档
 */
export function autoArchiveByMonth(notes: Note[]): Archive[] {
  const archives = getArchives();
  const monthlyGroups: Record<string, Note[]> = {};

  // 按月份分组
  for (const note of notes) {
    const date = new Date(note.updatedAt);
    const monthKey = `${date.getFullYear()}年${date.getMonth() + 1}月`;
    if (!monthlyGroups[monthKey]) {
      monthlyGroups[monthKey] = [];
    }
    monthlyGroups[monthKey].push(note);
  }

  // 创建或更新归档
  for (const [monthName, monthNotes] of Object.entries(monthlyGroups)) {
    const existingIndex = archives.findIndex(
      (a) => a.type === "time" && a.name === monthName
    );

    const archiveData = {
      name: monthName,
      type: "time" as const,
      count: monthNotes.length,
      noteIds: monthNotes.map((n) => n.id),
      updatedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      archives[existingIndex] = {
        ...archives[existingIndex],
        ...archiveData,
      };
    } else {
      archives.push({
        id: generateId(),
        ...archiveData,
        createdAt: new Date().toISOString(),
        color: getMonthColor(monthName),
      });
    }
  }

  saveArchives(archives);
  return archives.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

/**
 * 按标签自动归档
 */
export function autoArchiveByTag(notes: Note[]): Archive[] {
  const archives = getArchives();
  const tagGroups: Record<string, Note[]> = {};

  // 按标签分组
  for (const note of notes) {
    for (const tag of note.tags || []) {
      if (!tagGroups[tag]) {
        tagGroups[tag] = [];
      }
      tagGroups[tag].push(note);
    }
  }

  // 只处理笔记数 >= 3 的标签
  for (const [tagName, tagNotes] of Object.entries(tagGroups)) {
    if (tagNotes.length < 3) continue;

    const existingIndex = archives.findIndex(
      (a) => a.type === "tag" && a.name === tagName
    );

    const archiveData = {
      name: tagName,
      type: "tag" as const,
      count: tagNotes.length,
      noteIds: tagNotes.map((n) => n.id),
      updatedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      archives[existingIndex] = {
        ...archives[existingIndex],
        ...archiveData,
      };
    } else {
      archives.push({
        id: generateId(),
        ...archiveData,
        createdAt: new Date().toISOString(),
        color: getTagColor(tagName),
      });
    }
  }

  saveArchives(archives);
  return archives.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

/**
 * 创建自定义归档
 */
export function createCustomArchive(
  name: string,
  noteIds: string[]
): Archive {
  const archives = getArchives();
  const archive: Archive = {
    id: generateId(),
    name,
    type: "custom",
    count: noteIds.length,
    noteIds,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    color: "#6366f1",
  };
  archives.push(archive);
  saveArchives(archives);
  return archive;
}

/**
 * 删除归档
 */
export function deleteArchive(archiveId: string): void {
  const archives = getArchives();
  const filtered = archives.filter((a) => a.id !== archiveId);
  saveArchives(filtered);
}

/**
 * 获取归档统计
 */
export function getArchiveStats(notes: Note[]): ArchiveStats {
  const archives = getArchives();
  const archivedNoteIds = new Set(
    archives.flatMap((a) => a.noteIds)
  );

  return {
    totalNotes: notes.length,
    archivedNotes: archivedNoteIds.size,
    activeNotes: notes.length - archivedNoteIds.size,
    archiveCount: archives.length,
  };
}

/**
 * 获取月份颜色
 */
function getMonthColor(monthName: string): string {
  const colors = [
    "#3b82f6", // blue
    "#8b5cf6", // violet
    "#ec4899", // pink
    "#f59e0b", // amber
    "#10b981", // emerald
    "#06b6d4", // cyan
    "#6366f1", // indigo
    "#f97316", // orange
    "#84cc16", // lime
    "#14b8a6", // teal
    "#a855f7", // purple
    "#ef4444", // red
  ];
  const month = parseInt(monthName.match(/\d+月/)?.[0] || "1");
  return colors[(month - 1) % colors.length];
}

/**
 * 获取标签颜色
 */
function getTagColor(tagName: string): string {
  const colors = [
    "#3b82f6",
    "#8b5cf6",
    "#ec4899",
    "#f59e0b",
    "#10b981",
    "#06b6d4",
    "#6366f1",
    "#f97316",
  ];
  let hash = 0;
  for (let i = 0; i < tagName.length; i++) {
    hash = tagName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

/**
 * 自动归档（综合时间和标签）
 */
export function autoArchive(notes: Note[]): Archive[] {
  autoArchiveByMonth(notes);
  autoArchiveByTag(notes);
  return getArchives();
}
