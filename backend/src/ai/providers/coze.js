const {
  CozeAPI,
  COZE_CN_BASE_URL,
  RoleType,
  ChatStatus,
} = require('@coze/api');
const {
  buildSourceItems,
  clampText,
  collapseWhitespace,
  deriveTopic,
  stripMarkdown,
} = require('../utils/text');

function safeParseJson(text = '') {
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

function unwrapWorkflowPayload(parsed) {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return parsed;
  if (parsed.output && typeof parsed.output === 'object' && !Array.isArray(parsed.output)) return parsed.output;
  if (parsed.result && typeof parsed.result === 'object' && !Array.isArray(parsed.result)) return parsed.result;
  if (parsed.data && typeof parsed.data === 'object' && !Array.isArray(parsed.data)) return parsed.data;
  return parsed;
}

function toWorkflowItems(payload = {}) {
  return buildSourceItems(payload).map((item) => ({
    id: item.id,
    title: item.title,
    content: item.content.slice(0, 1600),
    url: item.url || '',
  }));
}

function createProviderError(message, code = 'AI_PROVIDER_ERROR', cause) {
  const error = new Error(message);
  error.code = code;
  if (cause) error.cause = cause;
  return error;
}

function createCozeProvider(config = {}) {
  const token = config.token || '';
  const baseUrl = config.baseUrl || COZE_CN_BASE_URL;
  const chatBotId = config.chatBotId || '';
  const workflows = config.workflows || {};
  let client = null;

  function isConfigured() {
    return Boolean(token && chatBotId && Object.values(workflows).filter(Boolean).length >= 6);
  }

  function getClient() {
    if (!token) {
      throw createProviderError('Coze provider is not configured', 'AI_NOT_CONFIGURED');
    }
    if (!client) {
      client = new CozeAPI({
        token,
        baseURL: baseUrl,
      });
    }
    return client;
  }

  function ensureWorkflowId(key) {
    const workflowId = workflows[key];
    if (!workflowId) {
      throw createProviderError(`Coze workflow "${key}" is not configured`, 'AI_NOT_CONFIGURED');
    }
    return workflowId;
  }

  function toCozeMessages(messages = [], options = {}) {
    const filtered = Array.isArray(messages) ? messages.filter((message) => message?.content) : [];
    const lastUser = filtered.length ? filtered[filtered.length - 1] : { role: 'user', content: '' };
    const history = filtered
      .slice(0, -1)
      .map((message) => `${message.role === 'assistant' ? '助手' : '用户'}：${String(message.content || '').trim()}`)
      .join('\n');
    const parts = [];

    if (options.systemPrompt) {
      parts.push(`系统要求：\n${String(options.systemPrompt).trim()}`);
    }
    if (options.context) {
      parts.push(`参考上下文：\n${String(options.context).trim()}`);
    }
    if (history) {
      parts.push(`历史对话：\n${history}`);
    }
    parts.push(`当前用户问题：\n${String(lastUser.content || '').trim()}`);

    return [
      {
        role: RoleType.User,
        content: parts.filter(Boolean).join('\n\n'),
        content_type: 'text',
      },
    ];
  }

  async function runWorkflow(key, parameters = {}) {
    const workflowId = ensureWorkflowId(key);
    const sdk = getClient();
    const result = await sdk.workflows.runs.create({
      workflow_id: workflowId,
      parameters,
    });

    const parsed = unwrapWorkflowPayload(safeParseJson(result?.data));
    if (parsed && typeof parsed === 'object') {
      return {
        parsed,
        raw: result?.data || '',
        debugUrl: result?.debug_url,
        executeId: result?.execute_id,
        token: result?.token,
      };
    }

    throw createProviderError(`Coze workflow "${key}" returned non-JSON output`, 'AI_PROVIDER_ERROR');
  }

  return {
    name: 'coze',
    isConfigured,
    async chat(payload = {}) {
      if (!chatBotId) {
        throw createProviderError('Coze chat bot is not configured', 'AI_NOT_CONFIGURED');
      }

      const sdk = getClient();
      const messages = Array.isArray(payload.messages) ? payload.messages : [];
      const options = payload.options && typeof payload.options === 'object' ? payload.options : {};
      const userId = payload.userId || payload.user_id || 'echonote-user';
      const response = await sdk.chat.createAndPoll({
        bot_id: chatBotId,
        user_id: String(userId),
        auto_save_history: false,
        additional_messages: toCozeMessages(messages, options),
      });

      if (response?.chat?.status !== ChatStatus.COMPLETED) {
        const message = response?.chat?.last_error?.msg || 'Coze chat did not complete successfully';
        throw createProviderError(message, 'AI_PROVIDER_ERROR');
      }

      const assistantMessages = Array.isArray(response?.messages)
        ? response.messages.filter((message) => message.role === RoleType.Assistant && message.type === 'answer')
        : [];
      const content = assistantMessages.map((message) => String(message.content || '').trim()).filter(Boolean).join('\n\n').trim();

      if (!content) {
        throw createProviderError('Coze chat returned empty content', 'AI_PROVIDER_ERROR');
      }

      return {
        content,
        model: 'coze-bot-chat',
        totalTokens: response?.chat?.usage?.token_count,
        timestamp: Date.now(),
      };
    },
    async quickRead(payload = {}) {
      const fallbackHeadline = clampText(payload.title || buildSourceItems(payload)[0]?.title || '本期快读', 36);
      const { parsed } = await runWorkflow('quickRead', {
        title: payload.title || '',
        content: stripMarkdown(payload.content || payload.text || ''),
        topic: payload.topic || '',
        items: toWorkflowItems(payload),
      });

      return {
        headline: clampText(parsed.headline || fallbackHeadline, 48),
        summary: clampText(parsed.summary || `这组内容围绕 ${fallbackHeadline}，值得先快速理解核心判断。`, 120),
        bullets: Array.isArray(parsed.bullets) ? parsed.bullets.slice(0, 4).map((item) => clampText(item, 80)) : [],
        readMinutes: Number(parsed.readMinutes) || 3,
        sourceCount: Number(parsed.sourceCount) || buildSourceItems(payload).length || 1,
        provider: 'coze',
      };
    },
    async exploreQuestions(payload = {}) {
      const topic = deriveTopic(payload);
      const { parsed } = await runWorkflow('explore', {
        title: payload.title || '',
        topic,
        content: stripMarkdown(payload.content || payload.text || ''),
        items: toWorkflowItems(payload),
      });

      return {
        topic: clampText(parsed.topic || topic, 36),
        hook: clampText(parsed.hook || `围绕 ${topic} 还有几条线索待推进`, 80),
        questions: Array.isArray(parsed.questions) ? parsed.questions.slice(0, 4).map((item) => clampText(item, 120)) : [],
        nextStep: clampText(parsed.nextStep || '先补一条更具对立性的来源。', 120),
        provider: 'coze',
      };
    },
    async articleToNote(payload = {}) {
      const defaultTitle = clampText(payload.title || '文章结构化笔记', 36);
      const { parsed } = await runWorkflow('articleToNote', {
        title: payload.title || '',
        content: stripMarkdown(payload.content || ''),
        sourceUrl: payload.url || payload.sourceUrl || '',
        items: toWorkflowItems(payload),
      });

      return {
        title: clampText(parsed.title || defaultTitle, 48),
        summary: clampText(parsed.summary || `这篇内容主要围绕 ${defaultTitle} 展开。`, 120),
        outline: Array.isArray(parsed.outline) ? parsed.outline.slice(0, 5).map((item) => clampText(item, 40)) : [],
        highlights: Array.isArray(parsed.highlights) ? parsed.highlights.slice(0, 5).map((item) => clampText(item, 120)) : [],
        todos: Array.isArray(parsed.todos) ? parsed.todos.slice(0, 5).map((item) => clampText(item, 120)) : [],
        tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 5).map((item) => clampText(item, 24)) : [],
        provider: 'coze',
      };
    },
    async voiceClean(payload = {}) {
      const transcript = collapseWhitespace(payload.transcript || payload.content || '');
      const { parsed } = await runWorkflow('voiceClean', {
        title: payload.title || '',
        transcript,
      });

      return {
        title: clampText(parsed.title || payload.title || '一段语音整理结果', 48),
        cleanedText: stripMarkdown(parsed.cleanedText || transcript),
        summary: clampText(parsed.summary || transcript.slice(0, 50), 120),
        todos: Array.isArray(parsed.todos) ? parsed.todos.slice(0, 5).map((item) => clampText(item, 120)) : [],
        tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 5).map((item) => clampText(item, 24)) : [],
        provider: 'coze',
      };
    },
    async generateBriefing(payload = {}) {
      const title = clampText(payload.title || buildSourceItems(payload)[0]?.title || '今日简报', 36);
      const { parsed } = await runWorkflow('briefing', {
        title: payload.title || '',
        items: toWorkflowItems(payload),
      });

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
      const { parsed } = await runWorkflow('podcast', {
        title: payload.title || '',
        voicePreset: payload.voicePreset || 'default',
        items: toWorkflowItems(payload),
      });

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
  createCozeProvider,
};
