/**
 * EchoNote Backend Server
 * 提供内容抓取 API 服务
 */

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const { isDbConfigured, query, withTransaction } = require('./db');
const { createAiService } = require('./src/ai/service');
const { createAiRouter } = require('./src/ai/router');
const { createParserClient } = require('./src/parser/client');

const app = express();
app.set('trust proxy', true);
const PORT = process.env.PORT || 8000;
const WEB_PARSER_HOSTPORT = process.env.WEB_PARSER_HOSTPORT || '';
const WEB_PARSER_URL = process.env.WEB_PARSER_URL || (WEB_PARSER_HOSTPORT ? `http://${WEB_PARSER_HOSTPORT}` : '');
const parserClient = createParserClient({
  hostport: WEB_PARSER_HOSTPORT,
  url: WEB_PARSER_URL,
});
const DEFAULT_OWNER_ID = process.env.DEFAULT_OWNER_ID || 'local-dev-user';
const DEFAULT_OWNER_NAME = process.env.DEFAULT_OWNER_NAME || 'EchoNote Local User';
const BAILIAN_API_KEY = process.env.BAILIAN_API_KEY || process.env.DASHSCOPE_API_KEY || '';
const BAILIAN_BASE_URL = process.env.BAILIAN_BASE_URL || 'https://dashscope.aliyuncs.com/api/v1';
const BAILIAN_MODEL = process.env.BAILIAN_MODEL || 'qwen-max';
const COZE_API_TOKEN = process.env.COZE_API_TOKEN || '';
const COZE_API_BASE = process.env.COZE_API_BASE || '';
const COZE_BOT_ID_CHAT = process.env.COZE_BOT_ID_CHAT || '';
const COZE_WORKFLOW_QUICK_READ = process.env.COZE_WORKFLOW_QUICK_READ || '';
const COZE_WORKFLOW_EXPLORE = process.env.COZE_WORKFLOW_EXPLORE || '';
const COZE_WORKFLOW_ARTICLE_TO_NOTE = process.env.COZE_WORKFLOW_ARTICLE_TO_NOTE || '';
const COZE_WORKFLOW_VOICE_CLEAN = process.env.COZE_WORKFLOW_VOICE_CLEAN || '';
const COZE_WORKFLOW_BRIEFING = process.env.COZE_WORKFLOW_BRIEFING || '';
const COZE_WORKFLOW_PODCAST = process.env.COZE_WORKFLOW_PODCAST || '';
const AI_PROVIDER = process.env.AI_PROVIDER || '';
const TTS_PROVIDER = process.env.TTS_PROVIDER || 'demo';
const NOTE_TYPES = new Set(['voice', 'text', 'ai', 'link', 'file', 'image']);

const aiService = createAiService({
  provider: AI_PROVIDER,
  ttsProvider: TTS_PROVIDER,
  coze: {
    token: COZE_API_TOKEN,
    baseUrl: COZE_API_BASE,
    chatBotId: COZE_BOT_ID_CHAT,
    workflows: {
      quickRead: COZE_WORKFLOW_QUICK_READ,
      explore: COZE_WORKFLOW_EXPLORE,
      articleToNote: COZE_WORKFLOW_ARTICLE_TO_NOTE,
      voiceClean: COZE_WORKFLOW_VOICE_CLEAN,
      briefing: COZE_WORKFLOW_BRIEFING,
      podcast: COZE_WORKFLOW_PODCAST,
    },
  },
  dashscope: {
    apiKey: BAILIAN_API_KEY,
    baseUrl: BAILIAN_BASE_URL,
    model: BAILIAN_MODEL,
  },
});

const NOTE_SELECT = `
  select
    n.id,
    n.title,
    n.content,
    n.type,
    n.source_url,
    n.snapshot_html,
    n.created_at,
    n.updated_at,
    n.emoji,
    n.todos_json as todos,
    coalesce(array_agg(t.name order by t.name) filter (where t.name is not null), '{}') as tags
  from notes n
  left join note_tags nt on nt.note_id = n.id
  left join tags t on t.id = nt.tag_id
`;

function normalizeXiaohongshuUrl(rawUrl = '') {
  const input = String(rawUrl).trim();

  try {
    const parsed = new URL(input);
    const host = parsed.hostname.toLowerCase();

    if (host === 'xiaohongshu.com' || host === 'm.xiaohongshu.com') {
      parsed.hostname = 'www.xiaohongshu.com';
    }

    const discoveryMatch = parsed.pathname.match(/^\/discovery\/item\/([a-zA-Z0-9]+)/i);
    if (discoveryMatch && discoveryMatch[1]) {
      parsed.pathname = `/explore/${discoveryMatch[1]}`;
    }

    return parsed.toString();
  } catch {
    return input;
  }
}

function proxyWechatImageHtml(html = '', req) {
  const input = String(html || '').trim();
  if (!input) return '';

  const $ = cheerio.load(input, {}, false);
  $('img').each((_, el) => {
    const $img = $(el);
    const dataSrc = $img.attr('data-src') || $img.attr('data-original') || '';
    const rawSrc = $img.attr('src') || '';
    const normalizedSrc = String(rawSrc).trim();
    const normalizedDataSrc = String(dataSrc).trim();
    const src =
      normalizedDataSrc ||
      (normalizedSrc && !normalizedSrc.startsWith('data:image/') ? normalizedSrc : '');
    if (!src) return;

    const forwardedProto = String(req.get('x-forwarded-proto') || '').split(',')[0].trim();
    const protocol = forwardedProto || req.protocol || 'https';
    const proxyUrl = `${protocol}://${req.get('host')}/api/proxy/wechat-image?url=${encodeURIComponent(src)}`;
    $img.attr('src', proxyUrl);
    $img.attr('data-src', proxyUrl);
    $img.removeAttr('data-original');
  });

  return $.html() || input;
}

async function fetchFromParser(endpoint, payload) {
  return parserClient.request(endpoint, payload);
}

function genNoteId() {
  return `note_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
}

function normalizeTags(input) {
  if (!Array.isArray(input)) return [];
  const seen = new Set();
  return input
    .map((tag) => String(tag || '').trim())
    .filter(Boolean)
    .filter((tag) => {
      if (seen.has(tag)) return false;
      seen.add(tag);
      return true;
    });
}

function normalizeTodos(input) {
  if (!Array.isArray(input)) return [];
  return input
    .filter((todo) => todo && typeof todo === 'object')
    .map((todo, index) => ({
      id: String(todo.id || `todo_${Date.now()}_${index}`),
      text: String(todo.text || '').trim(),
      priority: ['high', 'medium', 'low'].includes(todo.priority) ? todo.priority : 'medium',
      completed: Boolean(todo.completed),
      createdAt: todo.createdAt || new Date().toISOString(),
    }))
    .filter((todo) => todo.text);
}

function mapNoteRow(row) {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    type: row.type,
    sourceUrl: row.source_url || undefined,
    snapshotHtml: row.snapshot_html || undefined,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
    tags: Array.isArray(row.tags) ? row.tags : [],
    todos: Array.isArray(row.todos) ? row.todos : [],
    emoji: row.emoji || undefined,
  };
}

function dbUnavailable(res) {
  return res.status(503).json({
    code: 'DATABASE_NOT_CONFIGURED',
    message: 'Database is not configured. Set DATABASE_URL before using notes APIs.',
  });
}

function validateNotePayload(input, { partial = false } = {}) {
  const payload = input && typeof input === 'object' ? input : {};
  const updates = {};

  if (!partial || payload.title !== undefined) {
    const title = String(payload.title || '').trim();
    if (!title) return { error: 'title is required' };
    updates.title = title;
  }

  if (!partial || payload.content !== undefined) {
    updates.content = String(payload.content || '');
  }

  if (!partial || payload.type !== undefined) {
    const type = String(payload.type || '').trim();
    if (!NOTE_TYPES.has(type)) return { error: 'type is invalid' };
    updates.type = type;
  }

  if (payload.sourceUrl !== undefined) updates.sourceUrl = payload.sourceUrl ? String(payload.sourceUrl) : null;
  if (payload.snapshotHtml !== undefined) updates.snapshotHtml = payload.snapshotHtml ? String(payload.snapshotHtml) : null;
  if (payload.emoji !== undefined) updates.emoji = payload.emoji ? String(payload.emoji) : null;
  if (payload.tags !== undefined) updates.tags = normalizeTags(payload.tags);
  if (payload.todos !== undefined) updates.todos = normalizeTodos(payload.todos);
  if (payload.createdAt !== undefined) updates.createdAt = payload.createdAt;
  if (payload.updatedAt !== undefined) updates.updatedAt = payload.updatedAt;
  if (payload.id !== undefined) updates.id = String(payload.id || '').trim();

  return { updates };
}

async function ensureDefaultOwner(client) {
  await client.query(
    `
      insert into users (id, display_name)
      values ($1, $2)
      on conflict (id) do update set display_name = excluded.display_name
    `,
    [DEFAULT_OWNER_ID, DEFAULT_OWNER_NAME]
  );
}

async function syncNoteTags(client, noteId, tags) {
  await client.query('delete from note_tags where note_id = $1', [noteId]);

  for (const tag of tags) {
    const tagResult = await client.query(
      `
        insert into tags (owner_id, name)
        values ($1, $2)
        on conflict (owner_id, name) do update set name = excluded.name
        returning id
      `,
      [DEFAULT_OWNER_ID, tag]
    );

    const tagId = tagResult.rows[0]?.id;
    if (!tagId) continue;

    await client.query(
      `
        insert into note_tags (note_id, tag_id)
        values ($1, $2)
        on conflict do nothing
      `,
      [noteId, tagId]
    );
  }
}

async function fetchNoteRow(executor, noteId) {
  const result = await executor.query(
    `
      ${NOTE_SELECT}
      where n.owner_id = $1 and n.id = $2
      group by n.id
    `,
    [DEFAULT_OWNER_ID, noteId]
  );
  return result.rows[0] || null;
}

// Middleware
app.use(cors());
app.use(express.json());
app.use('/api/ai', createAiRouter(aiService));

// Health check
app.get('/health', (req, res) => {
  const aiHealth = aiService.getHealth();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: isDbConfigured() ? 'configured' : 'unconfigured',
    ai: aiHealth.configured ? 'configured' : 'demo',
    aiProvider: aiHealth.provider,
    availableAiProviders: aiHealth.availableProviders,
    ttsProvider: aiHealth.ttsProvider,
    tools: aiHealth.tools,
    parser: parserClient.describe(),
  });
});

app.get('/api/notes', async (req, res) => {
  if (!isDbConfigured()) return dbUnavailable(res);

  try {
    const result = await query(
      `
        ${NOTE_SELECT}
        where n.owner_id = $1
        group by n.id
        order by n.updated_at desc
      `,
      [DEFAULT_OWNER_ID]
    );

    res.json({ notes: result.rows.map(mapNoteRow) });
  } catch (error) {
    console.error('List notes error:', error.message);
    res.status(500).json({ code: 'LIST_NOTES_ERROR', message: error.message });
  }
});

app.get('/api/notes/:id', async (req, res) => {
  if (!isDbConfigured()) return dbUnavailable(res);

  try {
    const row = await fetchNoteRow({ query }, req.params.id);
    if (!row) {
      return res.status(404).json({ code: 'NOTE_NOT_FOUND', message: 'Note not found' });
    }
    res.json({ note: mapNoteRow(row) });
  } catch (error) {
    console.error('Get note error:', error.message);
    res.status(500).json({ code: 'GET_NOTE_ERROR', message: error.message });
  }
});

app.post('/api/notes', async (req, res) => {
  if (!isDbConfigured()) return dbUnavailable(res);

  const { error, updates } = validateNotePayload(req.body, { partial: false });
  if (error) {
    return res.status(400).json({ code: 'INVALID_NOTE', message: error });
  }

  const noteId = updates.id || genNoteId();
  const createdAt = updates.createdAt || new Date().toISOString();
  const updatedAt = updates.updatedAt || createdAt;
  const tags = updates.tags || [];
  const todos = updates.todos || [];

  try {
    const row = await withTransaction(async (client) => {
      await ensureDefaultOwner(client);
      await client.query(
        `
          insert into notes (
            id, owner_id, title, content, type, source_url, snapshot_html, emoji, todos_json, created_at, updated_at
          ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::timestamptz, $11::timestamptz)
        `,
        [
          noteId,
          DEFAULT_OWNER_ID,
          updates.title,
          updates.content,
          updates.type,
          updates.sourceUrl,
          updates.snapshotHtml,
          updates.emoji || null,
          JSON.stringify(todos),
          createdAt,
          updatedAt,
        ]
      );
      await syncNoteTags(client, noteId, tags);
      return fetchNoteRow(client, noteId);
    });

    res.status(201).json({ note: mapNoteRow(row) });
  } catch (error) {
    console.error('Create note error:', error.message);
    res.status(500).json({ code: 'CREATE_NOTE_ERROR', message: error.message });
  }
});

app.patch('/api/notes/:id', async (req, res) => {
  if (!isDbConfigured()) return dbUnavailable(res);

  const { error, updates } = validateNotePayload(req.body, { partial: true });
  if (error) {
    return res.status(400).json({ code: 'INVALID_NOTE', message: error });
  }

  try {
    const row = await withTransaction(async (client) => {
      await ensureDefaultOwner(client);
      const existing = await fetchNoteRow(client, req.params.id);
      if (!existing) return null;

      const nextTitle = updates.title !== undefined ? updates.title : existing.title;
      const nextContent = updates.content !== undefined ? updates.content : existing.content;
      const nextType = updates.type !== undefined ? updates.type : existing.type;
      const nextSourceUrl = updates.sourceUrl !== undefined ? updates.sourceUrl : existing.source_url;
      const nextSnapshotHtml = updates.snapshotHtml !== undefined ? updates.snapshotHtml : existing.snapshot_html;
      const nextEmoji = updates.emoji !== undefined ? updates.emoji : existing.emoji;
      const nextTodos = updates.todos !== undefined ? updates.todos : existing.todos;
      const nextUpdatedAt = updates.updatedAt || new Date().toISOString();

      await client.query(
        `
          update notes
          set title = $3,
              content = $4,
              type = $5,
              source_url = $6,
              snapshot_html = $7,
              emoji = $8,
              todos_json = $9::jsonb,
              updated_at = $10::timestamptz
          where owner_id = $1 and id = $2
        `,
        [
          DEFAULT_OWNER_ID,
          req.params.id,
          nextTitle,
          nextContent,
          nextType,
          nextSourceUrl,
          nextSnapshotHtml,
          nextEmoji,
          JSON.stringify(nextTodos),
          nextUpdatedAt,
        ]
      );

      if (updates.tags !== undefined) {
        await syncNoteTags(client, req.params.id, updates.tags);
      }

      return fetchNoteRow(client, req.params.id);
    });

    if (!row) {
      return res.status(404).json({ code: 'NOTE_NOT_FOUND', message: 'Note not found' });
    }

    res.json({ note: mapNoteRow(row) });
  } catch (error) {
    console.error('Update note error:', error.message);
    res.status(500).json({ code: 'UPDATE_NOTE_ERROR', message: error.message });
  }
});

app.delete('/api/notes/:id', async (req, res) => {
  if (!isDbConfigured()) return dbUnavailable(res);

  try {
    const result = await query('delete from notes where owner_id = $1 and id = $2', [DEFAULT_OWNER_ID, req.params.id]);
    if (!result.rowCount) {
      return res.status(404).json({ code: 'NOTE_NOT_FOUND', message: 'Note not found' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Delete note error:', error.message);
    res.status(500).json({ code: 'DELETE_NOTE_ERROR', message: error.message });
  }
});

/**
 * 微信图片代理（避免外链防盗链提示图）
 * GET /api/proxy/wechat-image?url=...
 */
app.get('/api/proxy/wechat-image', async (req, res) => {
  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ code: 'MISSING_URL', message: 'Image URL is required' });
  }

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return res.status(400).json({ code: 'INVALID_URL', message: 'Invalid image URL' });
  }

  const hostname = parsed.hostname.toLowerCase();
  if (!hostname.endsWith('qpic.cn') && !hostname.endsWith('weixin.qq.com')) {
    return res.status(400).json({ code: 'INVALID_HOST', message: 'Only WeChat image domains are allowed' });
  }

  try {
    const response = await axios.get(parsed.toString(), {
      responseType: 'arraybuffer',
      timeout: 20000,
      headers: {
        Referer: 'https://mp.weixin.qq.com/',
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.38'
      }
    });

    const contentType = response.headers['content-type'] || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(response.data);
  } catch (error) {
    console.error('Wechat image proxy error:', error.message);
    return res.status(502).json({ code: 'IMAGE_PROXY_ERROR', message: 'Failed to fetch image' });
  }
});

/**
 * 抓取微信公众号文章
 * POST /api/fetch/wechat
 */
app.post('/api/fetch/wechat', async (req, res) => {
  const { url, plain_text = false } = req.body;

  if (!url) {
    return res.status(400).json({
      code: 'MISSING_URL',
      message: 'URL is required'
    });
  }

  try {
    if (!url.match(/^https?:\/\/mp\.weixin\.qq\.com/i)) {
      return res.status(400).json({
        code: 'INVALID_URL',
        message: 'Invalid WeChat article URL'
      });
    }

    const parserData = await fetchFromParser('/api/parser/wechat', { url });

    let content = parserData.content || '';
    const snapshotHtml = proxyWechatImageHtml(parserData.cleaned_html || parserData.raw_html || '', req);

    if (!plain_text && content) {
      content = proxyWechatImageHtml(content, req);
    }

    if (plain_text) {
      content = cheerio.load(content).text().trim();
    }

    res.json({
      title: parserData.title || 'Untitled',
      author: parserData.author || 'Unknown',
      content,
      published_at: parserData.published_at || new Date().toISOString(),
      url: parserData.url || url,
      cover_image: parserData.cover_image,
      source_webpage: parserData.url || url,
      snapshot_html: snapshotHtml
    });
  } catch (error) {
    console.error('WeChat fetch error:', error);
    res.status(500).json({
      code: 'FETCH_ERROR',
      message: error.message
    });
  }
});

/**
 * 抓取B站视频信息
 * POST /api/fetch/bilibili
 */
app.post('/api/fetch/bilibili', async (req, res) => {
  const { bvid } = req.body;

  if (!bvid) {
    return res.status(400).json({
      code: 'MISSING_BVID',
      message: 'BVid is required'
    });
  }

  try {
    // B站 API
    const response = await axios.get(`https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      timeout: 10000
    });

    const data = response.data.data;

    if (!data) {
      return res.status(404).json({
        code: 'VIDEO_NOT_FOUND',
        message: 'Video not found'
      });
    }

    res.json({
      title: data.title,
      uploader: data.owner.name,
      description: data.desc,
      cover_image: data.pic,
      bvid: data.bvid,
      duration: data.duration,
      view_count: data.stat.view,
      like_count: data.stat.like,
      published_at: new Date(data.pubdate * 1000).toISOString(),
      url: `https://www.bilibili.com/video/${data.bvid}`
    });

  } catch (error) {
    console.error('Bilibili fetch error:', error);
    res.status(500).json({
      code: 'FETCH_ERROR',
      message: error.message
    });
  }
});

/**
 * 抓取小红书笔记
 * POST /api/fetch/xiaohongshu
 */
app.post('/api/fetch/xiaohongshu', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({
      code: 'MISSING_URL',
      message: 'URL is required'
    });
  }

  try {
    const normalizedUrl = normalizeXiaohongshuUrl(url);
    const xhsPattern = /^https?:\/\/((www|m)\.)?xiaohongshu\.com\/(explore|discovery\/item)\/[a-zA-Z0-9]+/i;
    const xhsShortPattern = /^https?:\/\/((www|m)\.)?xhslink\.com\/[a-zA-Z0-9]+/i;

    if (!xhsPattern.test(normalizedUrl) && !xhsShortPattern.test(normalizedUrl)) {
      return res.status(400).json({
        code: 'INVALID_URL',
        message: 'Invalid Xiaohongshu URL'
      });
    }

    const parserData = await fetchFromParser('/api/parser/xiaohongshu', { url: normalizedUrl });

    res.json({
      title: parserData.title || 'Untitled',
      author: parserData.author || 'Unknown',
      content: parserData.content || '',
      published_at: parserData.published_at || new Date().toISOString(),
      url: parserData.url || normalizedUrl,
      cover_image: parserData.cover_image,
      like_count: parserData.like_count,
      view_count: parserData.view_count,
      platform: 'xiaohongshu',
      restricted: parserData.restricted === true,
      source_webpage: parserData.url || normalizedUrl,
      snapshot_html: parserData.raw_html || parserData.cleaned_html || ''
    });
  } catch (error) {
    console.error('Xiaohongshu fetch error:', error);
    res.status(500).json({
      code: 'FETCH_ERROR',
      message: error.message
    });
  }
});

/**
 * 通用网页内容抓取
 * POST /api/fetch/web
 */
app.post('/api/fetch/web', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({
      code: 'MISSING_URL',
      message: 'URL is required'
    });
  }

  try {
    const parserData = await fetchFromParser('/api/parser/legacy-fetch', { url });
    const legacyData = parserData.data || {};

    res.json({
      title: legacyData.title || 'Untitled',
      content: legacyData.content || '',
      url: legacyData.url || url,
      author: legacyData.author,
      published_at: legacyData.published_at,
      cover_image: legacyData.cover_image,
      platform: parserData.platform,
      source_webpage: legacyData.url || url,
      snapshot_html: legacyData.raw_html || legacyData.cleaned_html || ''
    });
  } catch (error) {
    console.error('Web fetch error:', error);
    res.status(500).json({
      code: 'FETCH_ERROR',
      message: error.message
    });
  }
});

app.get('/api/briefings/latest', (req, res) => {
  const artifact = aiService.getLatestBriefing();
  if (!artifact) {
    return res.status(404).json({ code: 'BRIEFING_NOT_FOUND', message: 'No briefing artifact available' });
  }
  return res.json(artifact);
});

app.get('/api/podcasts/:artifactId', (req, res) => {
  const artifact = aiService.getPodcast(req.params.artifactId);
  if (!artifact) {
    return res.status(404).json({ code: 'PODCAST_NOT_FOUND', message: 'Podcast artifact not found' });
  }
  return res.json(artifact);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 EchoNote backend running on http://localhost:${PORT}`);
  console.log(`📚 API endpoints:`);
  console.log(`   - POST /api/ai/chat`);
  console.log(`   - POST /api/ai/quick-read`);
  console.log(`   - POST /api/ai/explore-questions`);
  console.log(`   - POST /api/ai/article-to-note`);
  console.log(`   - POST /api/ai/voice-clean`);
  console.log(`   - POST /api/ai/jobs/briefing`);
  console.log(`   - POST /api/ai/jobs/podcast`);
  console.log(`   - GET  /api/ai/jobs/:jobId`);
  console.log(`   - GET  /api/ai/artifacts/:artifactId`);
  console.log(`   - POST /api/fetch/wechat`);
  console.log(`   - POST /api/fetch/bilibili`);
  console.log(`   - POST /api/fetch/xiaohongshu`);
  console.log(`   - POST /api/fetch/web`);
  console.log(`   - GET  /api/briefings/latest`);
  console.log(`   - GET  /api/podcasts/:artifactId`);
  console.log(`   - GET  /health`);
});
