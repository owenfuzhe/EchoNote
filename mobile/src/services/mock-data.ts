import { Note } from '../types';

const TITLE_TEMPLATES = ['{topic}学习笔记', '{topic}实践总结', '{topic}入门指南', '深入理解{topic}', '{topic}最佳实践'];
const TOPICS = ['React', 'Vue', 'Node.js', 'Python', 'Go', 'TypeScript', '微服务', '数据库', '产品思维', '用户体验', '机器学习', '投资理财', '旅行攻略', '时间管理'];
const CONTENT_TEMPLATES = [
  '今天学习了{topic}，主要内容包括：基础概念、核心特性、应用场景与常见问题。下一步继续研究{relatedTopic}。',
  '{topic}项目实践总结：技术选型、实现过程、踩坑记录与经验复盘。',
  '{topic}读书笔记：核心观点、关键概念、个人思考与行动计划。',
  '{topic}面试题整理：定义、优缺点、使用场景、性能优化。',
];
const TAGS_POOL = ['前端', '后端', '全栈', 'AI', '产品', '设计', '学习', '效率', '理财', '生活'];

const randomDate = () => {
  const now = Date.now();
  const past = now - 365 * 24 * 60 * 60 * 1000;
  return new Date(past + Math.random() * (now - past)).toISOString();
};

const generateNote = (index: number): Note => {
  const topic = TOPICS[Math.floor(Math.random() * TOPICS.length)];
  const relatedTopic = TOPICS[Math.floor(Math.random() * TOPICS.length)];
  const title = TITLE_TEMPLATES[Math.floor(Math.random() * TITLE_TEMPLATES.length)].replace(/{topic}/g, topic);
  const content = CONTENT_TEMPLATES[Math.floor(Math.random() * CONTENT_TEMPLATES.length)].replace(/{topic}/g, topic).replace(/{relatedTopic}/g, relatedTopic);
  const createdAt = randomDate();
  const updatedAt = new Date(new Date(createdAt).getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString();
  const tags = Array.from(new Set(Array.from({ length: 3 }, () => TAGS_POOL[Math.floor(Math.random() * TAGS_POOL.length)])));
  return {
    id: `mock-${index}`,
    title,
    content,
    type: Math.random() > 0.25 ? 'text' : 'link',
    tags,
    createdAt,
    updatedAt,
  };
};

export const generateMockNotes = (): Note[] => Array.from({ length: 200 }, (_, i) => generateNote(i)).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
export const MOCK_NOTES_200 = generateMockNotes();
