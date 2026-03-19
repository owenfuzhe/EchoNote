const axios = require('axios');
const {
  buildSourceItems,
  clampText,
  collapseWhitespace,
  deriveTopic,
  stripMarkdown,
} = require('../utils/text');

function extractTextContent(choice = {}) {
  const content = choice?.message?.content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part;
        if (part?.type === 'text') return part.text || '';
        return '';
      })
      .join('');
  }
  return content || choice?.text || '';
}

function extractJson(text = '') {
  const input = String(text || '').trim();
  if (!input) return null;

  try {
    return JSON.parse(input);
  } catch {}

  const fenced = input.match(/```json\s*([\s\S]+?)```/i);
  if (fenced?.[1]) {
    try {
      return JSON.parse(fenced[1].trim());
    } catch {}
  }

  const objectMatch = input.match(/\{[\s\S]*\}/);
  if (objectMatch?.[0]) {
    try {
      return JSON.parse(objectMatch[0]);
    } catch {}
  }

  return null;
}

function normalizeJsonResult(text, fallback = {}) {
  const parsed = extractJson(text);
  if (parsed && typeof parsed === 'object') return parsed;
  return fallback;
}

function createXaiProvider(config = {}) {
  const apiKey = config.apiKey || '';
  const baseUrl = config.baseUrl || 'https://api.x.ai/v1';
  const defaultModel = config.model || 'grok-4-1-fast';

  async function invokeMessages(messages, options = {}) {
    if (!apiKey) {
      const error = new Error('xAI provider is not configured');
      error.code = 'AI_NOT_CONFIGURED';
      throw error;
    }

    const response = await axios.post(
      `${baseUrl}/chat/completions`,
      {
        model: options.model || defaultModel,
        messages,
        stream: false,
        temperature: options.temperature ?? 0.4,
        max_tokens: options.maxTokens ?? 1024,
      },
      {
        timeout: options.timeout ?? 45000,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data || {};
  }

  async function invokeJson(taskName, payload, schemaPrompt, fallback) {
    const sourceItems = buildSourceItems(payload);
    const body = JSON.stringify(
      {
        title: payload.title || '',
        topic: payload.topic || '',
        transcript: payload.transcript || '',
        voicePreset: payload.voicePreset || '',
        items: sourceItems.map((item) => ({
          title: item.title,
          content: item.content.slice(0, 1600),
          url: item.url || '',
        })),
      },
      null,
      2
    );

    const data = await invokeMessages(
      [
        {
          role: 'system',
          content: `You are the EchoNote AI backend. Complete ${taskName} and return JSON only with no extra commentary.\n${schemaPrompt}`,
        },
        {
          role: 'user',
          content: body,
        },
      ],
      { temperature: 0.3, maxTokens: 1400 }
    );

    const choice = data?.choices?.[0] || {};
    const content = extractTextContent(choice);
    return {
      parsed: normalizeJsonResult(content, fallback),
      model: data?.model || defaultModel,
      totalTokens: data?.usage?.total_tokens,
    };
  }

  return {
    name: 'xai',
    isConfigured() {
      return Boolean(apiKey);
    },
    async chat(payload = {}) {
      const messages = Array.isArray(payload.messages) ? payload.messages : [];
      const options = payload.options && typeof payload.options === 'object' ? payload.options : {};
      const requestMessages =
        options.systemPrompt && !messages.some((message) => message?.role === 'system')
          ? [{ role: 'system', content: String(options.systemPrompt) }, ...messages]
          : messages;

      const data = await invokeMessages(requestMessages, options);
      const choice = data?.choices?.[0] || {};
      const content = extractTextContent(choice);

      return {
        content: String(content).trim(),
        model: data?.model || options.model || defaultModel,
        totalTokens: data?.usage?.total_tokens,
        timestamp: Date.now(),
      };
    },
    async quickRead(payload = {}) {
      const fallbackHeadline = clampText(payload.title || buildSourceItems(payload)[0]?.title || '本期快读', 36);
      const { parsed } = await invokeJson(
        'quick-read',
        payload,
        'Return this shape: {"headline":"...","summary":"...","bullets":["..."],"readMinutes":4,"sourceCount":3}',
        {
          headline: fallbackHeadline,
          summary: `这组内容围绕 ${fallbackHeadline}，值得先快速理解核心判断。`,
          bullets: ['梳理核心结论', '标记相反观点', '决定下一步跟进'],
          readMinutes: 3,
          sourceCount: buildSourceItems(payload).length || 1,
        }
      );

      return {
        headline: clampText(parsed.headline || fallbackHeadline, 48),
        summary: clampText(parsed.summary || `这组内容围绕 ${fallbackHeadline}，值得先快速理解核心判断。`, 120),
        bullets: Array.isArray(parsed.bullets) ? parsed.bullets.slice(0, 4).map((item) => clampText(item, 80)) : [],
        readMinutes: Number(parsed.readMinutes) || 3,
        sourceCount: Number(parsed.sourceCount) || buildSourceItems(payload).length || 1,
        provider: 'xai',
      };
    },
    async exploreQuestions(payload = {}) {
      const topic = deriveTopic(payload);
      const { parsed } = await invokeJson(
        'explore-questions',
        payload,
        'Return this shape: {"topic":"...","hook":"...","questions":["..."],"nextStep":"..."}',
        {
          topic,
          hook: `围绕 ${topic} 还有几条线索待推进`,
          questions: [
            `当前关于 ${topic} 最值得持续追踪的变化是什么？`,
            `现有材料中有哪些冲突判断？`,
            '下一步补什么来源最有效？',
          ],
          nextStep: '先补一条更具对立性的来源。',
        }
      );

      return {
        topic: clampText(parsed.topic || topic, 36),
        hook: clampText(parsed.hook || `围绕 ${topic} 还有几条线索待推进`, 80),
        questions: Array.isArray(parsed.questions) ? parsed.questions.slice(0, 4).map((item) => clampText(item, 120)) : [],
        nextStep: clampText(parsed.nextStep || '先补一条更具对立性的来源。', 120),
        provider: 'xai',
      };
    },
    async articleToNote(payload = {}) {
      const defaultTitle = clampText(payload.title || '文章结构化笔记', 36);
      const { parsed } = await invokeJson(
        'article-to-note',
        payload,
        'Return this shape: {"title":"...","summary":"...","outline":["..."],"highlights":["..."],"todos":["..."],"tags":["..."]}',
        {
          title: defaultTitle,
          summary: `这篇内容主要围绕 ${defaultTitle} 展开。`,
          outline: ['背景', '关键变化', '结论'],
          highlights: ['值得继续追踪的线索。'],
          todos: ['继续整理成正式笔记。'],
          tags: ['AI'],
        }
      );

      return {
        title: clampText(parsed.title || defaultTitle, 48),
        summary: clampText(parsed.summary || `这篇内容主要围绕 ${defaultTitle} 展开。`, 120),
        outline: Array.isArray(parsed.outline) ? parsed.outline.slice(0, 5).map((item) => clampText(item, 40)) : [],
        highlights: Array.isArray(parsed.highlights) ? parsed.highlights.slice(0, 5).map((item) => clampText(item, 120)) : [],
        todos: Array.isArray(parsed.todos) ? parsed.todos.slice(0, 5).map((item) => clampText(item, 120)) : [],
        tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 5).map((item) => clampText(item, 24)) : [],
        provider: 'xai',
      };
    },
    async voiceClean(payload = {}) {
      const transcript = collapseWhitespace(payload.transcript || payload.content || '');
      const { parsed } = await invokeJson(
        'voice-clean',
        { transcript, title: payload.title || '' },
        'Return this shape: {"title":"...","cleanedText":"...","summary":"...","todos":["..."],"tags":["..."]}',
        {
          title: payload.title || '一段语音整理结果',
          cleanedText: transcript,
          summary: transcript.slice(0, 50),
          todos: ['补充成正式笔记'],
          tags: ['语音输入'],
        }
      );

      return {
        title: clampText(parsed.title || payload.title || '一段语音整理结果', 48),
        cleanedText: stripMarkdown(parsed.cleanedText || transcript),
        summary: clampText(parsed.summary || transcript.slice(0, 50), 120),
        todos: Array.isArray(parsed.todos) ? parsed.todos.slice(0, 5).map((item) => clampText(item, 120)) : [],
        tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 5).map((item) => clampText(item, 24)) : [],
        provider: 'xai',
      };
    },
    async generateBriefing(payload = {}) {
      const title = clampText(payload.title || buildSourceItems(payload)[0]?.title || '今日简报', 36);
      const { parsed } = await invokeJson(
        'briefing.generate',
        payload,
        'Return this shape: {"title":"...","summary":"...","oneLiner":"...","bullets":["..."],"sections":[{"title":"...","summary":"...","keyPoint":"..."}],"sourceCount":3,"readMinutes":4}',
        {
          title,
          summary: `围绕 ${title} 的一份简报。`,
          oneLiner: `本期围绕 ${title}，把内容收束成一条可继续推进的判断。`,
          bullets: ['核心判断一', '核心判断二', '下一步'],
          sections: [],
          sourceCount: buildSourceItems(payload).length || 1,
          readMinutes: 4,
        }
      );

      return {
        title: clampText(parsed.title || title, 48),
        summary: clampText(parsed.summary || `围绕 ${title} 的一份简报。`, 120),
        oneLiner: clampText(parsed.oneLiner || `本期围绕 ${title}，把内容收束成一条可继续推进的判断。`, 120),
        bullets: Array.isArray(parsed.bullets) ? parsed.bullets.slice(0, 4).map((item) => clampText(item, 120)) : [],
        sections: Array.isArray(parsed.sections)
          ? parsed.sections.slice(0, 4).map((section, index) => ({
              id: section.id || `section_${index + 1}`,
              title: clampText(section.title || `要点 ${index + 1}`, 48),
              summary: clampText(section.summary || '', 120),
              keyPoint: clampText(section.keyPoint || '', 120),
            }))
          : [],
        sourceCount: Number(parsed.sourceCount) || buildSourceItems(payload).length || 1,
        readMinutes: Number(parsed.readMinutes) || 4,
        generatedAt: new Date().toISOString(),
      };
    },
    async generatePodcast(payload = {}) {
      const title = clampText(payload.title || buildSourceItems(payload)[0]?.title || '今日播客', 36);
      const { parsed } = await invokeJson(
        'podcast.generate',
        payload,
        'Return this shape: {"title":"...","summary":"...","voicePreset":"default","script":"...","segments":[{"heading":"...","text":"..."}],"durationSeconds":60,"sourceCount":2}',
        {
          title: `播客：${title}`,
          summary: `围绕 ${title} 的一段短播客脚本。`,
          voicePreset: payload.voicePreset || 'default',
          script: `开场：围绕 ${title} 的一段短播客。`,
          segments: [],
          durationSeconds: 60,
          sourceCount: buildSourceItems(payload).length || 1,
        }
      );

      return {
        title: clampText(parsed.title || `播客：${title}`, 48),
        summary: clampText(parsed.summary || `围绕 ${title} 的一段短播客脚本。`, 120),
        voicePreset: clampText(parsed.voicePreset || payload.voicePreset || 'default', 24),
        script: collapseWhitespace(parsed.script || ''),
        segments: Array.isArray(parsed.segments)
          ? parsed.segments.slice(0, 8).map((segment, index) => ({
              heading: clampText(segment.heading || `段落 ${index + 1}`, 32),
              text: clampText(segment.text || '', 180),
            }))
          : [],
        durationSeconds: Number(parsed.durationSeconds) || 60,
        sourceCount: Number(parsed.sourceCount) || buildSourceItems(payload).length || 1,
        generatedAt: new Date().toISOString(),
      };
    },
  };
}

module.exports = {
  createXaiProvider,
};
