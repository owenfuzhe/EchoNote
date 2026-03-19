function collapseWhitespace(text = '') {
  return String(text || '')
    .replace(/\r/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function stripMarkdown(text = '') {
  return collapseWhitespace(
    String(text || '')
      .replace(/#{1,6}\s+/g, '')
      .replace(/\*\*|__/g, '')
      .replace(/`{1,3}[^`]*`{1,3}/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/^\s*[-*+]\s+/gm, '')
  );
}

function clampText(text = '', max = 240) {
  const input = stripMarkdown(text);
  if (input.length <= max) return input;
  return `${input.slice(0, Math.max(0, max - 1)).trim()}…`;
}

function splitSentences(text = '') {
  return stripMarkdown(text)
    .split(/(?<=[。！？!?；;])|\n+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function pickSentences(text = '', count = 3) {
  const sentences = splitSentences(text);
  return sentences.slice(0, count);
}

function estimateReadMinutes(text = '') {
  const length = stripMarkdown(text).length;
  return Math.max(1, Math.ceil(length / 320));
}

function unique(items = []) {
  return [...new Set(items.filter(Boolean))];
}

function buildSourceItems(payload = {}) {
  if (Array.isArray(payload.items) && payload.items.length) {
    return payload.items.map((item, index) => ({
      id: item.id || `item_${index + 1}`,
      title: clampText(item.title || `内容 ${index + 1}`, 80),
      content: stripMarkdown(item.content || ''),
      url: item.url || item.sourceUrl || '',
    }));
  }

  const content = payload.content || payload.transcript || payload.text || '';
  if (!content) return [];

  return [
    {
      id: payload.id || 'item_1',
      title: clampText(payload.title || '未命名内容', 80),
      content: stripMarkdown(content),
      url: payload.url || payload.sourceUrl || '',
    },
  ];
}

const TAG_PATTERNS = [
  [/gpu|显卡|算力/i, 'GPU'],
  [/finops|成本|预算|降本/i, '成本'],
  [/ai|大模型|模型/i, 'AI'],
  [/交互|interface|ux|体验/i, '交互'],
  [/语音|speech|podcast|播客/i, '语音'],
  [/搜索|检索|search/i, '搜索'],
  [/产品|pmf|增长/i, '产品'],
  [/商业|市场|strategy|战略/i, '商业'],
  [/学习|课程|教育/i, '学习'],
  [/效率|工具|workflow|自动化/i, '效率'],
];

function deriveTags(text = '', limit = 4) {
  const input = stripMarkdown(text);
  const tags = [];

  for (const [pattern, label] of TAG_PATTERNS) {
    if (pattern.test(input)) tags.push(label);
    if (tags.length >= limit) break;
  }

  const englishTokens = unique(
    (input.match(/\b[A-Z][A-Za-z0-9.+-]{1,18}\b/g) || []).map((token) => token.slice(0, 18))
  );

  return unique([...tags, ...englishTokens]).slice(0, limit);
}

function buildOutline(text = '', limit = 3) {
  const sentences = pickSentences(text, Math.max(limit + 1, 4));
  const defaults = ['背景', '关键变化', '下一步'];
  const outline = sentences.slice(0, limit).map((sentence, index) => clampText(sentence, 24));
  while (outline.length < limit) {
    outline.push(defaults[outline.length] || `要点 ${outline.length + 1}`);
  }
  return outline;
}

function buildBullets(text = '', count = 3) {
  const sentences = pickSentences(text, count);
  if (sentences.length) return sentences.map((sentence) => clampText(sentence, 56));
  return ['值得进一步整理和追踪的内容。'];
}

function deriveTopic(payload = {}) {
  const topic = collapseWhitespace(payload.topic || payload.title || '');
  if (topic) return clampText(topic, 32);

  const items = buildSourceItems(payload);
  return clampText(items[0]?.title || '当前主题', 32);
}

module.exports = {
  buildBullets,
  buildOutline,
  buildSourceItems,
  clampText,
  collapseWhitespace,
  deriveTags,
  deriveTopic,
  estimateReadMinutes,
  pickSentences,
  splitSentences,
  stripMarkdown,
  unique,
};
