import express from 'express';
import cors from 'cors';
import { ReadLaterService, parseResultToLegacyShape } from './read-later-service';
import { detectPlatform } from './platform-detector';
import type { Platform } from './models';

const app = express();
const PORT = Number(process.env.PORT || 3456);

app.use(cors());
app.use(express.json({ limit: '1mb' }));

const service = new ReadLaterService();

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'read-later-parser', timestamp: new Date().toISOString() });
});

app.post('/api/parser/extract', async (req, res) => {
  const { url, forcePlatform, includeRawHTML } = req.body as {
    url?: string;
    forcePlatform?: Platform;
    includeRawHTML?: boolean;
  };

  if (!url) {
    return res.status(400).json({ success: false, error: 'URL is required' });
  }

  const result = await service.parseUrl(url, {
    forcePlatform,
    includeRawHTML: includeRawHTML === true,
  });

  if (!result.success) {
    return res.status(500).json(result);
  }

  return res.json(result);
});

app.post('/api/parser/wechat', async (req, res) => {
  const { url } = req.body as { url?: string };
  if (!url) {
    return res.status(400).json({ success: false, error: 'URL is required' });
  }

  const result = await service.parseWechat(url);
  if (!result.success || !result.data) {
    return res.status(500).json({ success: false, error: result.error ?? 'Parse failed' });
  }

  return res.json({ success: true, ...parseResultToLegacyShape('wechat', result.data) });
});

app.post('/api/parser/xiaohongshu', async (req, res) => {
  const { url } = req.body as { url?: string };
  if (!url) {
    return res.status(400).json({ success: false, error: 'URL is required' });
  }

  const result = await service.parseXiaohongshu(url);
  if (!result.success || !result.data) {
    return res.status(500).json({ success: false, error: result.error ?? 'Parse failed' });
  }

  return res.json({ success: true, ...parseResultToLegacyShape('xiaohongshu', result.data) });
});

app.post('/api/parser/legacy-fetch', async (req, res) => {
  const { url } = req.body as { url?: string };
  if (!url) {
    return res.status(400).json({ success: false, error: 'URL is required' });
  }

  const platform = detectPlatform(url);
  const result = await service.parseUrl(url, { forcePlatform: platform });
  if (!result.success || !result.data) {
    return res.status(500).json({ success: false, error: result.error ?? 'Parse failed' });
  }

  return res.json({ success: true, data: parseResultToLegacyShape(platform, result.data), platform });
});

app.listen(PORT, () => {
  console.log(`🚀 ReadLater parser server running on http://localhost:${PORT}`);
  console.log('📚 Endpoints:');
  console.log('   - POST /api/parser/extract');
  console.log('   - POST /api/parser/wechat');
  console.log('   - POST /api/parser/xiaohongshu');
  console.log('   - POST /api/parser/legacy-fetch');
  console.log('   - GET  /health');
});

export default app;
