const {
  buildBullets,
  buildOutline,
  buildSourceItems,
  clampText,
  collapseWhitespace,
  deriveTags,
  deriveTopic,
  estimateReadMinutes,
  normalizePodcastSegments,
  pickSentences,
  stripMarkdown,
} = require('../utils/text');

function estimateTokens(text = '') {
  return Math.max(32, Math.ceil(String(text || '').length / 1.8));
}

function formatAssistantReply(prompt = '', context = '') {
  const cleanPrompt = clampText(prompt, 80) || '你的问题';
  const contextLines = pickSentences(context, 2);
  const intro = `我先基于当前上下文回应“${cleanPrompt}”。`;
  const contextPart = contextLines.length
    ? `当前更相关的线索是：${contextLines.join('；')}`
    : '当前上下文较少，建议补充更多笔记或文章后再继续追问。';
  return `${intro}\n\n${contextPart}\n\n如果你愿意，我建议下一步把它整理成结构化笔记，再补一条相反观点。`;
}

function buildBriefingData(payload = {}) {
  const items = buildSourceItems(payload);
  const joined = items.map((item) => `${item.title}\n${item.content}`).join('\n\n');
  const headline = clampText(payload.title || items[0]?.title || '今日简报', 36);
  const bullets = buildBullets(joined, 3);

  return {
    title: headline,
    summary: clampText(payload.summary || bullets[0] || '今天有几条值得继续追踪的内容。', 80),
    oneLiner: clampText(`本期围绕 ${headline}，把零散内容收束成一组可继续推进的结论。`, 80),
    bullets,
    sections: items.slice(0, 3).map((item, index) => ({
      id: item.id || `section_${index + 1}`,
      title: item.title,
      summary: clampText(item.content || bullets[index] || '这条内容值得后续继续跟进。', 80),
      keyPoint: clampText(
        `把这条内容放回整体脉络里看，它更像是在补充 ${headline} 的一个侧面。`,
        80
      ),
      sourceUrl: item.url || undefined,
    })),
    sourceCount: items.length,
    readMinutes: estimateReadMinutes(joined || headline),
    generatedAt: new Date().toISOString(),
  };
}

function buildPodcastData(payload = {}) {
  const items = buildSourceItems(payload);
  const joined = items.map((item) => `${item.title}\n${item.content}`).join('\n\n');
  const title = clampText(payload.title || items[0]?.title || '今日播客', 36);
  const bullets = buildBullets(joined, 3);
  const segments = [
    {
      heading: '开场',
      text: clampText(`今天我们不只是回顾信息，而是把 ${title} 这组内容讲成一条更连贯的线索。`, 120),
    },
    ...bullets.map((bullet, index) => ({
      heading: `要点 ${index + 1}`,
      text: clampText(bullet, 120),
    })),
    {
      heading: '收尾',
      text: clampText('如果要继续跟进，最值得补的是一条相反观点和一条新来源。', 120),
    },
  ];
  const normalizedSegments = normalizePodcastSegments(segments, { textMax: 120 });

  return {
    title: `播客：${title}`,
    summary: clampText(`围绕 ${title} 的一段短播客脚本，适合先做快速收听。`, 80),
    voicePreset: payload.voicePreset || 'default',
    script: normalizedSegments.map((segment) => `${segment.heading}：${segment.text}`).join('\n\n'),
    segments: normalizedSegments,
    durationSeconds: Math.max(45, Math.ceil(stripMarkdown(joined).length / 7)),
    sourceCount: items.length,
    generatedAt: new Date().toISOString(),
  };
}

function createDemoProvider() {
  return {
    name: 'demo',
    isConfigured() {
      return true;
    },
    async chat(payload = {}) {
      const messages = Array.isArray(payload.messages) ? payload.messages : [];
      const prompt = messages[messages.length - 1]?.content || '';
      const context = payload.options?.context || messages.map((message) => message.content).join('\n\n');

      return {
        content: formatAssistantReply(prompt, context),
        model: 'demo-chat',
        totalTokens: estimateTokens(prompt + context),
        timestamp: Date.now(),
      };
    },
    async quickRead(payload = {}) {
      const items = buildSourceItems(payload);
      const joined = items.map((item) => `${item.title}\n${item.content}`).join('\n\n');
      const headline = clampText(payload.title || items[0]?.title || '本期快读', 36);

      return {
        headline,
        summary: clampText(`这组内容可以先收束成一个清晰判断：${buildBullets(joined, 1)[0]}`, 80),
        bullets: buildBullets(joined, 3),
        readMinutes: estimateReadMinutes(joined || headline),
        sourceCount: items.length || 1,
        provider: 'demo',
      };
    },
    async exploreQuestions(payload = {}) {
      const topic = deriveTopic(payload);
      const items = buildSourceItems(payload);
      const joined = items.map((item) => `${item.title}\n${item.content}`).join('\n\n');

      return {
        topic,
        hook: clampText(`围绕 ${topic}，当前还有 ${Math.max(items.length, 3)} 条线索可以继续推进。`, 48),
        questions: [
          `当前关于“${topic}”最值得持续追踪的变化是什么？`,
          `现有材料里有哪些彼此冲突的判断，值得并排比较？`,
          `如果只补一个新来源，最能帮助你推进这个主题的会是什么？`,
        ],
        nextStep: clampText(`先把现有内容整理成一页主题简报，再补一条相反观点。${joined ? ` 当前最先看的内容是：${clampText(items[0]?.title || '', 24)}` : ''}`, 80),
        provider: 'demo',
      };
    },
    async articleToNote(payload = {}) {
      const text = stripMarkdown(payload.content || '');
      const title = clampText(payload.title || '文章结构化笔记', 36);

      return {
        title,
        summary: clampText(pickSentences(text, 1)[0] || '这篇内容可以被整理成一条更清晰的笔记。', 80),
        outline: buildOutline(text, 3),
        highlights: buildBullets(text, 3),
        todos: [
          `补充一条与“${title}”相反的观点`,
          '把这篇内容和现有笔记建立关联',
        ],
        tags: deriveTags(`${title}\n${text}`),
        provider: 'demo',
      };
    },
    async voiceClean(payload = {}) {
      const transcript = collapseWhitespace(payload.transcript || payload.content || '');
      const cleanedText = transcript
        .replace(/然后然后+/g, '然后')
        .replace(/就是就是+/g, '就是')
        .replace(/嗯+/g, '')
        .trim();
      const summary = pickSentences(cleanedText, 1)[0] || '这段语音主要在表达一个待整理的想法。';

      return {
        title: clampText(payload.title || summary || '一段语音整理结果', 36),
        cleanedText: cleanedText || '暂无可整理内容。',
        summary: clampText(summary, 80),
        todos: ['把这段语音补成一条完整笔记'],
        tags: deriveTags(cleanedText),
        provider: 'demo',
      };
    },
    async generateBriefing(payload = {}) {
      return buildBriefingData(payload);
    },
    async generatePodcast(payload = {}) {
      return buildPodcastData(payload);
    },
  };
}

module.exports = {
  createDemoProvider,
};
