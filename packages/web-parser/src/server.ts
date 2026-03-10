import express from 'express';
import cors from 'cors';
import { parseWechatArticle } from './wechat-parser';

const app = express();
const PORT = process.env.PORT || 3456;

// 中间件
app.use(cors());
app.use(express.json());

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 解析微信公众号文章
app.post('/api/parser/wechat', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({
      success: false,
      error: 'URL is required',
    });
  }

  try {
    const result = await parseWechatArticle(url);
    res.json(result);
  } catch (error) {
    console.error('Parse error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 Web Parser Server running on port ${PORT}`);
  console.log(`📖 API Endpoint: POST http://localhost:${PORT}/api/parser/wechat`);
  console.log(`💚 Health Check: GET http://localhost:${PORT}/health`);
});

export default app;
