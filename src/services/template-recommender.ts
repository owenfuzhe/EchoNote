/**
 * 模板推荐服务
 * 根据笔记内容、标签、使用习惯智能推荐模板
 */

import { Note } from "../store/note-store";

export interface Template {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: "research" | "daily" | "analysis" | "creative";
  keywords: string[];
  content: string;
}

export interface TemplateRecommendation {
  template: Template;
  score: number; // 0-100
  reason: string;
}

// 模板库
export const TEMPLATE_LIBRARY: Template[] = [
  {
    id: "research-weekly",
    name: "深度调研周报",
    icon: "📝",
    description: "整理一周的研究成果和关键发现",
    category: "research",
    keywords: ["调研", "研究", "周报", "总结", "分析"],
    content: `# 深度调研周报 - {{date}}

## 本周核心发现

### 关键洞察 1
- 发现点：
- 来源：
- 影响：

### 关键洞察 2
- 发现点：
- 来源：
- 影响：

## 数据与趋势

| 指标 | 本周 | 变化 |
|------|------|------|
|      |      |      |

## 待验证假设

1. 
2. 

## 下周计划

- [ ] 
- [ ] 

## 参考链接

- 

#周报 #调研`,
  },
  {
    id: "competitor-analysis",
    name: "竞品对比矩阵",
    icon: "📊",
    description: "系统化对比分析竞品优劣势",
    category: "analysis",
    keywords: ["竞品", "对比", "分析", "竞争", "产品"],
    content: `# 竞品对比矩阵 - {{date}}

## 对比维度

| 维度 | 我方产品 | 竞品 A | 竞品 B |
|------|---------|--------|--------|
| 核心功能 | | | |
| 用户体验 | | | |
| 定价策略 | | | |
| 技术架构 | | | |
| 市场定位 | | | |

## 关键差异点

### 我方优势
1. 
2. 

### 我方劣势
1. 
2. 

## 机会与威胁

**机会：**
- 

**威胁：**
- 

## 行动建议

- [ ] 

#竞品分析 #产品`,
  },
  {
    id: "daily-capture",
    name: "每日灵感捕获",
    icon: "✍️",
    description: "快速记录每日灵感和想法",
    category: "daily",
    keywords: ["灵感", "日记", "每日", "想法", "记录"],
    content: `# 每日灵感捕获 - {{date}}

## 今日灵感 💡

### 灵感 1
**来源：**
**内容：**
**价值：**

### 灵感 2
**来源：**
**内容：**
**价值：**

## 今日反思

**做得好的：**
- 

**可以改进的：**
- 

## 明日期待

- 

#灵感 #日记`,
  },
  {
    id: "project-plan",
    name: "项目规划",
    icon: "🎯",
    description: "项目目标、里程碑和执行计划",
    category: "research",
    keywords: ["项目", "规划", "目标", "里程碑", "计划"],
    content: `# 项目规划 - {{date}}

## 项目目标

**核心目标：**
**成功标准：**
**时间范围：**

## 关键里程碑

- [ ] 里程碑 1 - 日期：
- [ ] 里程碑 2 - 日期：
- [ ] 里程碑 3 - 日期：

## 资源需求

**人力：**
**预算：**
**工具：**

## 风险与应对

| 风险 | 可能性 | 影响 | 应对措施 |
|------|--------|------|----------|
|      |        |      |          |

## 下一步行动

- [ ] 

#项目 #规划`,
  },
  {
    id: "meeting-notes",
    name: "会议记录",
    icon: "👥",
    description: "结构化记录会议内容和决策",
    category: "daily",
    keywords: ["会议", "记录", "决策", "讨论", "行动项"],
    content: `# 会议记录 - {{date}}

## 会议信息

**主题：**
**时间：**
**参与人：**

## 议程

1. 
2. 
3. 

## 关键讨论

### 议题 1
**讨论内容：**
**决策：**
**负责人：**

### 议题 2
**讨论内容：**
**决策：**
**负责人：**

## 行动项

| 任务 | 负责人 | 截止日期 | 状态 |
|------|--------|----------|------|
|      |        |          |      |

## 下次会议

**时间：**
**主题：**

#会议 #记录`,
  },
  {
    id: "reading-notes",
    name: "读书笔记",
    icon: "📚",
    description: "记录阅读心得和关键概念",
    category: "creative",
    keywords: ["阅读", "笔记", "书籍", "学习", "知识"],
    content: `# 读书笔记 - {{date}}

## 书籍信息

**书名：**
**作者：**
**阅读日期：**

## 核心观点

### 观点 1
**内容：**
**我的理解：**

### 观点 2
**内容：**
**我的理解：**

## 金句摘录

> 

## 关联思考

**与已有知识的联系：**
- 

**实际应用场景：**
- 

## 行动计划

- [ ] 

#阅读 #笔记`,
  },
];

/**
 * 根据笔记内容推荐模板
 */
export function recommendTemplates(
  notes: Note[],
  maxResults: number = 3
): TemplateRecommendation[] {
  if (notes.length === 0) {
    // 新用户推荐通用模板
    return TEMPLATE_LIBRARY.slice(0, maxResults).map((t) => ({
      template: t,
      score: 50,
      reason: "热门模板",
    }));
  }

  // 分析用户最近的笔记
  const recentNotes = notes
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  // 计算每个模板的匹配分数
  const scoredTemplates = TEMPLATE_LIBRARY.map((template) => {
    let score = 0;
    let matchedKeywords: string[] = [];

    for (const note of recentNotes) {
      const content = (note.title + " " + note.content).toLowerCase();
      const tags = note.tags || [];

      for (const keyword of template.keywords) {
        // 内容匹配
        if (content.includes(keyword.toLowerCase())) {
          score += 10;
          if (!matchedKeywords.includes(keyword)) {
            matchedKeywords.push(keyword);
          }
        }

        // 标签匹配（权重更高）
        if (tags.some((tag) => tag.toLowerCase().includes(keyword.toLowerCase()))) {
          score += 20;
          if (!matchedKeywords.includes(keyword)) {
            matchedKeywords.push(keyword);
          }
        }
      }
    }

    // 根据笔记数量调整分数
    score = Math.min(100, score + recentNotes.length * 5);

    return {
      template,
      score,
      reason:
        matchedKeywords.length > 0
          ? `匹配关键词: ${matchedKeywords.slice(0, 2).join(", ")}`
          : "根据您的使用习惯推荐",
    };
  });

  // 排序并返回前 N 个
  return scoredTemplates
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
}

/**
 * 获取模板内容（替换变量）
 */
export function getTemplateContent(template: Template): string {
  const date = new Date().toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return template.content.replace(/\{\{date\}\}/g, date);
}

/**
 * 记录模板使用（用于后续优化推荐）
 */
export function recordTemplateUsage(templateId: string): void {
  const key = "echonote_template_usage";
  const usage = JSON.parse(localStorage.getItem(key) || "{}");
  usage[templateId] = (usage[templateId] || 0) + 1;
  localStorage.setItem(key, JSON.stringify(usage));
}

/**
 * 获取热门模板
 */
export function getPopularTemplates(maxResults: number = 3): Template[] {
  const usage = JSON.parse(
    localStorage.getItem("echonote_template_usage") || "{}"
  );

  return TEMPLATE_LIBRARY.sort(
    (a, b) => (usage[b.id] || 0) - (usage[a.id] || 0)
  ).slice(0, maxResults);
}
