# EchoNote 部署指南

## 本地开发

```bash
# 启动后端
cd backend && source venv/bin/activate && uvicorn main:app --port 8000

# 启动前端
cd frontend && npm run dev
```

## Docker 部署

```bash
# 构建镜像
docker-compose build

# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

## 环境变量

在 `.env` 文件中配置：

```
KIMI_API_KEY=your_api_key
KIMI_BASE_URL=https://api.bailian.com/v1
OPENAI_API_KEY=your_openai_key
```

## 访问地址

- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- API Docs: http://localhost:8000/docs

## 健康检查

```bash
curl http://localhost:8000/health
```