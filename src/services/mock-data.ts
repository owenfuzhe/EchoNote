/**
 * Mock 数据生成器
 * 生成 200 篇多样化的笔记数据
 */

import { Note } from "../store/note-store";

// 标题模板
const TITLE_TEMPLATES = [
  "{topic}学习笔记",
  "{topic}实践总结",
  "{topic}入门指南",
  "深入理解{topic}",
  "{topic}最佳实践",
  "{topic}案例分析",
  "{topic}常见问题",
  "{topic}进阶技巧",
  "{topic}架构设计",
  "{topic}性能优化",
];

// 主题池
const TOPICS = [
  "React", "Vue", "Angular", "Node.js", "Python", "Go", "Rust", "Java",
  "TypeScript", "JavaScript", "CSS", "HTML", "WebAssembly", "Docker",
  "Kubernetes", "AWS", "GCP", "Azure", "Linux", "Git", "CI/CD",
  "微服务", "分布式系统", "数据库", "Redis", "MongoDB", "PostgreSQL",
  "MySQL", "GraphQL", "REST API", "WebSocket", "gRPC", "消息队列",
  "Kafka", "RabbitMQ", "Nginx", "CDN", "缓存策略", "负载均衡",
  "监控告警", "日志系统", "安全认证", "OAuth", "JWT", "HTTPS",
  "前端工程化", "Webpack", "Vite", "Rollup", "Babel", "ESLint",
  "测试驱动开发", "单元测试", "E2E测试", "性能测试", "压力测试",
  "敏捷开发", "Scrum", "Kanban", "项目管理", "团队协作", "代码审查",
  "设计模式", "数据结构", "算法", "机器学习", "深度学习", "NLP",
  "计算机视觉", "推荐系统", "数据分析", "数据可视化", "大数据",
  "产品思维", "用户体验", "交互设计", "视觉设计", "品牌设计",
  "增长黑客", "用户运营", "内容运营", "社区运营", "数据分析",
  "商业模式", "竞品分析", "市场调研", "用户研究", "需求分析",
  "时间管理", "效率工具", "知识管理", "笔记方法", "阅读清单",
  "健身计划", "饮食习惯", "睡眠改善", "心理健康", "冥想练习",
  "投资理财", "基金定投", "股票分析", "资产配置", "风险管理",
  "旅行攻略", "美食探店", "摄影技巧", "视频剪辑", "音乐欣赏",
  "电影推荐", "书籍分享", "播客清单", "新闻资讯", "行业动态",
];

// 内容模板
const CONTENT_TEMPLATES = [
  `今天学习了{topic}，主要内容包括：\n\n1. 基础概念和原理\n2. 核心特性和优势\n3. 实际应用场景\n4. 常见问题和解决方案\n\n下一步计划深入研究{relatedTopic}。`,
  
  `{topic}项目实践总结：\n\n## 项目背景\n描述项目的起因和目标\n\n## 技术选型\n为什么选择{topic}\n\n## 实现过程\n关键步骤和代码片段\n\n## 遇到的问题\n1. 问题描述\n2. 解决方案\n\n## 经验总结\n- 要点1\n- 要点2\n- 要点3`,
  
  `{topic}读书笔记：\n\n### 核心观点\n作者提出的主要理论和观点\n\n### 关键概念\n- 概念A：定义和解释\n- 概念B：定义和解释\n\n### 个人思考\n结合实际工作的反思\n\n### 行动计划\n如何应用这些知识`,
  
  `{topic}面试题整理：\n\nQ1: 什么是{topic}？\nA: ...\n\nQ2: {topic}的优缺点是什么？\nA: ...\n\nQ3: 在实际项目中如何使用{topic}？\nA: ...\n\nQ4: {topic}的性能优化有哪些方法？\nA: ...`,
  
  `{topic}工具推荐：\n\n| 工具名称 | 用途 | 优缺点 |\n|---------|------|--------|\n| Tool A | 功能描述 | 优点/缺点 |\n| Tool B | 功能描述 | 优点/缺点 |\n| Tool C | 功能描述 | 优点/缺点 |\n\n个人最推荐 Tool A，因为...`,
];

// 标签池
const TAGS_POOL = [
  "前端", "后端", "全栈", "DevOps", "AI", "产品", "设计", "运营",
  "管理", "学习", "工作", "生活", "健康", "理财", "旅行", "娱乐",
  "React", "Vue", "Node", "Python", "Go", "Docker", "K8s", "Cloud",
  "数据库", "缓存", "消息队列", "微服务", "架构", "性能", "安全",
  "读书笔记", "面试", "工具", "资源", "待办", "灵感", "复盘",
];

// 生成随机日期（过去一年内）
const randomDate = () => {
  const now = new Date();
  const pastYear = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  const randomTime = pastYear.getTime() + Math.random() * (now.getTime() - pastYear.getTime());
  return new Date(randomTime).toISOString();
};

// 生成单篇笔记
const generateNote = (index: number): Note => {
  const topic = TOPICS[Math.floor(Math.random() * TOPICS.length)];
  const relatedTopic = TOPICS[Math.floor(Math.random() * TOPICS.length)];
  const titleTemplate = TITLE_TEMPLATES[Math.floor(Math.random() * TITLE_TEMPLATES.length)];
  const contentTemplate = CONTENT_TEMPLATES[Math.floor(Math.random() * CONTENT_TEMPLATES.length)];
  
  // 生成标题
  const title = titleTemplate.replace(/{topic}/g, topic);
  
  // 生成内容
  const content = contentTemplate
    .replace(/{topic}/g, topic)
    .replace(/{relatedTopic}/g, relatedTopic);
  
  // 生成标签（2-5个）
  const numTags = 2 + Math.floor(Math.random() * 4);
  const tags: string[] = [];
  for (let i = 0; i < numTags; i++) {
    const tag = TAGS_POOL[Math.floor(Math.random() * TAGS_POOL.length)];
    if (!tags.includes(tag)) {
      tags.push(tag);
    }
  }
  
  // 确定类型
  const types = ["text", "link", "image", "voice"] as const;
  const typeWeights = [0.6, 0.25, 0.1, 0.05]; // 文本最多，语音最少
  let typeIndex = 0;
  const random = Math.random();
  let cumulative = 0;
  for (let i = 0; i < typeWeights.length; i++) {
    cumulative += typeWeights[i];
    if (random <= cumulative) {
      typeIndex = i;
      break;
    }
  }
  
  const createdAt = randomDate();
  const updatedAt = new Date(new Date(createdAt).getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString();
  
  return {
    id: `mock-${index}`,
    title,
    content,
    type: types[typeIndex],
    tags,
    createdAt,
    updatedAt,
  };
};

// 生成 200 篇笔记
export const generateMockNotes = (): Note[] => {
  const notes: Note[] = [];
  for (let i = 0; i < 200; i++) {
    notes.push(generateNote(i));
  }
  // 按更新时间排序（最新的在前）
  return notes.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
};

// 导出 Mock 数据
export const MOCK_NOTES_200 = generateMockNotes();
