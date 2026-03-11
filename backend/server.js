/**
 * EchoNote Backend Server
 * 提供内容抓取 API 服务
 */

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const PORT = process.env.PORT || 8000;
const WEB_PARSER_URL = process.env.WEB_PARSER_URL || 'http://localhost:3456';

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

async function fetchFromParser(endpoint, payload) {
  const response = await axios.post(`${WEB_PARSER_URL}${endpoint}`, payload, {
    timeout: 45000,
    headers: {
      'Content-Type': 'application/json'
    }
  });

  if (!response.data || response.data.success === false) {
    const message = response.data?.error || response.data?.message || 'Parser service error';
    throw new Error(String(message || 'Parser service error'));
  }

  return response.data;
}

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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

    if (!plain_text && content) {
      const $ = cheerio.load(`<div id="__wechat_content__">${content}</div>`);
      $('#__wechat_content__ img').each((_, el) => {
        const $img = $(el);
        const src = $img.attr('src') || $img.attr('data-src');
        if (!src) return;
        const proxyUrl = `${req.protocol}://${req.get('host')}/api/proxy/wechat-image?url=${encodeURIComponent(src)}`;
        $img.attr('src', proxyUrl);
        $img.removeAttr('data-src');
      });
      content = $('#__wechat_content__').html() || content;
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
      snapshot_html: parserData.raw_html || parserData.cleaned_html || ''
    });
  } catch (error) {
    console.error('WeChat fetch error:', error.message);
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
    console.error('Bilibili fetch error:', error.message);
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
    console.error('Xiaohongshu fetch error:', error.message);
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
    console.error('Web fetch error:', error.message);
    res.status(500).json({
      code: 'FETCH_ERROR',
      message: error.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 EchoNote backend running on http://localhost:${PORT}`);
  console.log(`📚 API endpoints:`);
  console.log(`   - POST /api/fetch/wechat`);
  console.log(`   - POST /api/fetch/bilibili`);
  console.log(`   - POST /api/fetch/xiaohongshu`);
  console.log(`   - POST /api/fetch/web`);
  console.log(`   - GET  /health`);
});
