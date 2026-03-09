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

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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
    // 验证微信 URL
    if (!url.match(/^https?:\/\/mp\.weixin\.qq\.com/i)) {
      return res.status(400).json({
        code: 'INVALID_URL',
        message: 'Invalid WeChat article URL'
      });
    }

    // 抓取页面
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 30000
    });

    const $ = cheerio.load(response.data);

    // 提取信息
    const title = $('#activity_name').text().trim() ||
                  $('h1').first().text().trim() ||
                  $('meta[property="og:title"]').attr('content') ||
                  'Untitled';

    const author = $('#js_name').text().trim() ||
                   $('meta[property="og:article:author"]').attr('content') ||
                   'Unknown';

    let content = $('#js_content').html() || '';

    // 如果请求纯文本
    if (plain_text) {
      content = $('#js_content').text().trim();
    }

    const coverImage = $('meta[property="og:image"]').attr('content');

    res.json({
      title,
      author,
      content,
      published_at: new Date().toISOString(),
      url,
      cover_image: coverImage
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
    // 验证小红书 URL
    const xhsPattern = /^https?:\/\/(www\.)?xiaohongshu\.com\/explore\/[a-zA-Z0-9]+/i;
    const xhsShortPattern = /^https?:\/\/xhslink\.com\/[a-zA-Z0-9]+/i;

    if (!xhsPattern.test(url) && !xhsShortPattern.test(url)) {
      return res.status(400).json({
        code: 'INVALID_URL',
        message: 'Invalid Xiaohongshu URL'
      });
    }

    // 抓取页面
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.0',
        'Referer': 'https://www.xiaohongshu.com/',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      timeout: 30000,
      maxRedirects: 5
    });

    const $ = cheerio.load(response.data);

    // 提取标题
    const title = $('meta[property="og:title"]').attr('content') ||
                  $('title').text().trim() ||
                  $('h1').first().text().trim() ||
                  'Untitled';

    // 提取正文内容
    let content = '';
    const desc = $('meta[property="og:description"]').attr('content');
    if (desc && desc.length > 10) {
      content = desc;
    } else {
      // 尝试从页面内容提取
      content = $('body').text().trim().replace(/\s+/g, ' ').substring(0, 5000);
    }

    // 提取封面图片
    const coverImage = $('meta[property="og:image"]').attr('content');

    // 提取作者
    const author = $('meta[name="author"]').attr('content') ||
                   $('.username').text().trim() ||
                   $('.author-name').text().trim() ||
                   'Unknown';

    // 提取点赞数、收藏数等（从脚本或特定元素中）
    let likeCount = 0;
    let viewCount = 0;

    // 尝试从页面脚本中提取
    const scripts = $('script').map((i, el) => $(el).html()).get();
    for (const script of scripts) {
      if (script && script.includes('likeCount')) {
        const likeMatch = script.match(/["']likeCount["']\s*:\s*(\d+)/);
        if (likeMatch) likeCount = parseInt(likeMatch[1]);
      }
      if (script && script.includes('viewCount')) {
        const viewMatch = script.match(/["']viewCount["']\s*:\s*(\d+)/);
        if (viewMatch) viewCount = parseInt(viewMatch[1]);
      }
    }

    res.json({
      title,
      author,
      content,
      published_at: new Date().toISOString(),
      url,
      cover_image: coverImage,
      like_count: likeCount,
      view_count: viewCount,
      platform: 'xiaohongshu'
    });

  } catch (error) {
    console.error('Xiaohongshu fetch error:', error.message);

    // 如果是小红书反爬导致的失败，返回基础信息
    if (error.response && error.response.status === 403) {
      return res.status(200).json({
        title: '小红书笔记',
        author: 'Unknown',
        content: '该笔记内容受保护，无法自动抓取。请手动复制内容。',
        published_at: new Date().toISOString(),
        url,
        platform: 'xiaohongshu',
        restricted: true
      });
    }

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
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      timeout: 30000
    });

    const $ = cheerio.load(response.data);

    // 移除脚本和样式
    $('script, style, nav, footer, header, aside').remove();

    const title = $('title').text().trim() ||
                  $('h1').first().text().trim() ||
                  'Untitled';

    const content = $('body').text().trim().replace(/\s+/g, ' ').substring(0, 10000);

    res.json({
      title,
      content,
      url
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
  console.log(`   - POST /api/fetch/web`);
  console.log(`   - GET  /health`);
});
