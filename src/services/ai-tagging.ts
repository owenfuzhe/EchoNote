/**
 * AI 自动标签服务
 * 使用 Kimi API 进行内容分析和标签生成
 */

import { Note } from "../store/note-store";

const KIMI_API_KEY = "sk-sp-4fb688edd8f0492ba6488f9ff38298bb";
const KIMI_BASE_URL = "https://api.kimi.com/coding";

// 预定义的标签池
const TAG_POOL = [
  "前端", "后端", "全栈", "DevOps", "AI", "机器学习", "深度学习",
  "产品", "设计", "UX", "UI", "运营", "增长", "数据分析",
  "React", "Vue", "Angular", "Node.js", "Python", "Go", "Rust",
  "Docker", "Kubernetes", "云原生", "微服务", "架构",
  "数据库", "Redis", "MongoDB", "PostgreSQL", "MySQL",
  "算法", "数据结构", "面试", "leetcode", "刷题",
  "读书笔记", "学习", "自我提升", "效率", "时间管理",
  "健身", "健康", "饮食", "睡眠", "心理健康",
  "理财", "投资", "基金", "股票", "资产配置",
  "旅行", "美食", "摄影", "视频", "音乐", "电影",
  "待办", "灵感", "复盘", "总结", "计划",
];

// 简化的 AI 标签生成（本地模拟）
export async function generateTags(note: Note): Promise<string[]> {
  // 实际项目中应该调用 Kimi API
  // 这里使用简单的关键词匹配作为演示
  const content = (note.title + " " + note.content).toLowerCase();
  const tags: string[] = [];
  
  // 基于内容关键词匹配标签
  const keywordMap: Record<string, string[]> = {
    "react": ["React", "前端"],
    "vue": ["Vue", "前端"],
    "angular": ["Angular", "前端"],
    "node": ["Node.js", "后端"],
    "python": ["Python", "后端"],
    "go": ["Go", "后端"],
    "docker": ["Docker", "DevOps"],
    "kubernetes": ["Kubernetes", "DevOps"],
    "k8s": ["Kubernetes", "DevOps"],
    "ai": ["AI", "机器学习"],
    "ml": ["机器学习", "AI"],
    "design": ["设计", "UX"],
    "ui": ["UI", "设计"],
    "ux": ["UX", "设计"],
    "product": ["产品"],
    "data": ["数据分析"],
    "algorithm": ["算法"],
    "interview": ["面试"],
    "book": ["读书笔记"],
    "learn": ["学习", "自我提升"],
    "health": ["健康", "健身"],
    "money": ["理财", "投资"],
    "travel": ["旅行"],
    "food": ["美食"],
    "todo": ["待办"],
    "idea": ["灵感"],
  };
  
  for (const [keyword, matchedTags] of Object.entries(keywordMap)) {
    if (content.includes(keyword.toLowerCase())) {
      for (const tag of matchedTags) {
        if (!tags.includes(tag)) {
          tags.push(tag);
        }
      }
    }
  }
  
  // 如果没有匹配到标签，随机选择 2-3 个通用标签
  if (tags.length === 0) {
    const generalTags = ["学习", "笔记", "灵感", "待办"];
    const numTags = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < numTags; i++) {
      const randomTag = generalTags[Math.floor(Math.random() * generalTags.length)];
      if (!tags.includes(randomTag)) {
        tags.push(randomTag);
      }
    }
  }
  
  // 限制最多 5 个标签
  return tags.slice(0, 5);
}

// 批量为所有笔记生成标签
export async function batchGenerateTags(notes: Note[]): Promise<Record<string, string[]>> {
  const result: Record<string, string[]> = {};
  
  for (const note of notes) {
    if (!note.tags || note.tags.length === 0) {
      result[note.id] = await generateTags(note);
    } else {
      result[note.id] = note.tags;
    }
  }
  
  return result;
}

// 主题聚类（简化版）
export interface TopicCluster {
  id: string;
  name: string;
  keywords: string[];
  noteIds: string[];
}

export function clusterNotes(notes: Note[]): TopicCluster[] {
  // 基于标签进行简单聚类
  const tagGroups: Record<string, string[]> = {};
  
  for (const note of notes) {
    for (const tag of (note.tags || [])) {
      if (!tagGroups[tag]) {
        tagGroups[tag] = [];
      }
      tagGroups[tag].push(note.id);
    }
  }
  
  // 转换为话题聚类
  const clusters: TopicCluster[] = [];
  for (const [tag, noteIds] of Object.entries(tagGroups)) {
    if (noteIds.length >= 3) { // 至少3篇笔记才形成话题
      clusters.push({
        id: `topic-${tag}`,
        name: `${tag}专题`,
        keywords: [tag],
        noteIds,
      });
    }
  }
  
  // 按笔记数量排序
  return clusters.sort((a, b) => b.noteIds.length - a.noteIds.length).slice(0, 10);
}
