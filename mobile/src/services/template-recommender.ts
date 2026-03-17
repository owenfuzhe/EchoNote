import AsyncStorage from '@react-native-async-storage/async-storage';
import { Note } from '../types';
import { richTextToPlainText } from '../utils/richText';

export interface Template {
  id: string;
  name: string;
  icon: string;
  description: string;
  keywords: string[];
  content: string;
}

export interface TemplateRecommendation {
  template: Template;
  score: number;
  reason: string;
}

const USAGE_KEY = 'echonote_template_usage_mobile';

export const TEMPLATE_LIBRARY: Template[] = [
  {
    id: 'research-weekly',
    name: '深度调研周报',
    icon: '📝',
    description: '整理一周研究成果和关键发现',
    keywords: ['调研', '研究', '周报', '总结', '分析'],
    content: `# 深度调研周报 - {{date}}\n\n## 本周核心发现\n\n### 关键洞察\n- 发现点：\n- 来源：\n- 影响：\n\n## 下周计划\n- [ ] \n- [ ] \n\n#周报 #调研`,
  },
  {
    id: 'competitor-analysis',
    name: '竞品对比矩阵',
    icon: '📊',
    description: '系统化对比竞品优劣势',
    keywords: ['竞品', '对比', '分析', '竞争', '产品'],
    content: `# 竞品对比矩阵 - {{date}}\n\n## 对比维度\n| 维度 | 我方产品 | 竞品 A |\n|------|---------|--------|\n| 核心功能 | | |\n| 用户体验 | | |\n\n## 行动建议\n- [ ] \n\n#竞品分析 #产品`,
  },
  {
    id: 'meeting-notes',
    name: '会议记录',
    icon: '👥',
    description: '结构化记录会议内容和行动项',
    keywords: ['会议', '记录', '决策', '讨论', '行动项'],
    content: `# 会议记录 - {{date}}\n\n## 会议信息\n- 主题：\n- 参与人：\n\n## 关键讨论\n\n## 行动项\n- [ ] \n\n#会议 #记录`,
  },
  {
    id: 'daily-capture',
    name: '每日灵感捕获',
    icon: '✍️',
    description: '快速记录每日灵感和想法',
    keywords: ['灵感', '日记', '每日', '想法', '记录'],
    content: `# 每日灵感捕获 - {{date}}\n\n## 今日灵感\n\n## 今日反思\n\n## 明日期待\n\n#灵感 #日记`,
  },
];

export function recommendTemplates(notes: Note[], maxResults = 3): TemplateRecommendation[] {
  if (!notes.length) {
    return TEMPLATE_LIBRARY.slice(0, maxResults).map((template) => ({ template, score: 50, reason: '热门模板' }));
  }

  const recentNotes = [...notes]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 6);

  const scored = TEMPLATE_LIBRARY.map((template) => {
    let score = 0;
    const hits: string[] = [];

    recentNotes.forEach((note) => {
      const text = `${note.title} ${richTextToPlainText(note.content)}`.toLowerCase();
      const tags = note.tags || [];
      template.keywords.forEach((keyword) => {
        const lower = keyword.toLowerCase();
        if (text.includes(lower)) {
          score += 10;
          if (!hits.includes(keyword)) hits.push(keyword);
        }
        if (tags.some((tag) => tag.toLowerCase().includes(lower))) {
          score += 18;
          if (!hits.includes(keyword)) hits.push(keyword);
        }
      });
    });

    score = Math.min(100, score + recentNotes.length * 4);
    return {
      template,
      score,
      reason: hits.length ? `匹配关键词: ${hits.slice(0, 2).join('、')}` : '根据最近笔记推荐',
    };
  });

  return scored.sort((a, b) => b.score - a.score).slice(0, maxResults);
}

export function getTemplateContent(template: Template): string {
  const date = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  return template.content.replace(/\{\{date\}\}/g, date);
}

export async function recordTemplateUsage(templateId: string): Promise<void> {
  const raw = await AsyncStorage.getItem(USAGE_KEY);
  const usage = raw ? JSON.parse(raw) : {};
  usage[templateId] = (usage[templateId] || 0) + 1;
  await AsyncStorage.setItem(USAGE_KEY, JSON.stringify(usage));
}
