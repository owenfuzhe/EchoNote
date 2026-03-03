# EchoNote - 部署文档

**版本：** v1.0  
**日期：** 2026-03-03  
**状态：** 准备中  
**负责人：** Nova (PM) / Bernard (Dev)  

---

## 1. 部署架构

### 1.1 生产环境架构

```
┌─────────────────────────────────────────────────────────────┐
│                         用户层                               │
│                    Web Browser / Mobile                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ HTTPS
┌─────────────────────────────────────────────────────────────┐
│                      CDN 层（可选）                          │
│                   Cloudflare / Vercel Edge                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      前端托管层                              │
│                     Vercel / Netlify                        │
│                  echonote.vercel.app                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ API 请求
┌─────────────────────────────────────────────────────────────┐
│                      后端服务层                              │
│              Railway / Fly.io / Render                      │
│               api.echonote.app                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      数据存储层                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  Supabase   │  │   Redis     │  │ File Store  │         │
│  │ PostgreSQL  │  │   Cloud     │  │  (S3/存储)   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 环境配置

### 2.1 开发环境

```bash
# 1. 克隆项目
git clone https://github.com/owenfuzhe/EchoNote.git
cd EchoNote

# 2. 启动后端
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# 3. 启动前端（新终端）
cd frontend
npm install
npm run dev
# 服务运行在 http://localhost:3002/
```

### 2.2 生产环境变量

#### 前端 (.env.production)
```bash
NEXT_PUBLIC_API_URL=https://api.echonote.app
NEXT_PUBLIC_APP_NAME=EchoNote
NEXT_PUBLIC_APP_VERSION=1.0.0
```

#### 后端 (.env)
```bash
# 数据库
DATABASE_URL=postgresql://user:password@db.supabase.co:5432/postgres

# Redis
REDIS_URL=redis://default:password@redis-provider.com:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key-min-32-characters
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=15
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

# AI 服务（Phase 2）
KIMI_API_KEY=sk-your-kimi-api-key
GLM_API_KEY=your-glm-api-key

# 文件存储
STORAGE_PROVIDER=supabase  # 或 s3
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key

# 邮件服务（可选）
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

---

## 3. 部署步骤

### 3.1 前端部署（Vercel）

```bash
# 1. 安装 Vercel CLI
npm i -g vercel

# 2. 登录
vercel login

# 3. 部署
cd frontend
vercel --prod

# 4. 配置环境变量（在 Vercel Dashboard 中设置）
# NEXT_PUBLIC_API_URL=https://api.echonote.app
```

### 3.2 后端部署（Railway）

```bash
# 1. 安装 Railway CLI
npm i -g @railway/cli

# 2. 登录
railway login

# 3. 初始化项目
cd backend
railway init

# 4. 配置环境变量
railway variables set DATABASE_URL="postgresql://..."
railway variables set JWT_SECRET="your-secret"
# ... 其他变量

# 5. 部署
railway up

# 6. 获取域名
railway domain
```

### 3.3 数据库部署（Supabase）

```bash
# 1. 创建项目
# 访问 https://app.supabase.com 创建新项目

# 2. 获取连接字符串
# Project Settings > Database > Connection string

# 3. 运行迁移
psql $DATABASE_URL -f backend/migrations/001_initial.sql

# 4. 配置 Storage（用于录音文件）
# Storage > New Bucket > "recordings"
# 设置 Bucket 权限为 private
```

---

## 4. CI/CD 配置

### 4.1 GitHub Actions（前端）

```yaml
# .github/workflows/frontend.yml
name: Frontend CI/CD

on:
  push:
    branches: [main]
    paths:
      - 'frontend/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: cd frontend && npm ci
      
      - name: Run tests
        run: cd frontend && npm test
      
      - name: Deploy to Vercel
        uses: vercel/action-deploy@v1
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

### 4.2 GitHub Actions（后端）

```yaml
# .github/workflows/backend.yml
name: Backend CI/CD

on:
  push:
    branches: [main]
    paths:
      - 'backend/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt
      
      - name: Run tests
        run: |
          cd backend
          pytest
      
      - name: Deploy to Railway
        uses: railway/action-deploy@v1
        with:
          railway-token: ${{ secrets.RAILWAY_TOKEN }}
```

---

## 5. 监控与日志

### 5.1 应用监控

#### Sentry（错误追踪）
```bash
# 前端
npm install @sentry/nextjs

# 配置 sentry.client.config.js
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: 'https://your-dsn@sentry.io/project-id',
  tracesSampleRate: 1.0,
});

# 后端
pip install sentry-sdk[fastapi]

# 配置 main.py
import sentry_sdk

sentry_sdk.init(
    dsn="https://your-dsn@sentry.io/project-id",
    traces_sample_rate=1.0,
)
```

#### Uptime 监控
```bash
# 使用 UptimeRobot 或 BetterUptime
# 监控端点：
# - https://echonote.vercel.app (前端)
# - https://api.echonote.app/health (后端)
```

### 5.2 日志收集

```bash
# 使用 Logtail / Datadog / Grafana Cloud
# 后端日志配置
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('/var/log/echonote/app.log')
    ]
)
```

---

## 6. 备份策略

### 6.1 数据库备份

```bash
# 使用 Supabase 自动备份（每日）
# 或手动备份脚本

#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump $DATABASE_URL > "backup_$DATE.sql"
# 上传到 S3 或其他存储
aws s3 cp "backup_$DATE.sql" s3://echonote-backups/
```

### 6.2 文件备份

```bash
# 录音文件备份
# Supabase Storage 已包含冗余备份
# 如需额外备份：
aws s3 sync s3://echonote-recordings s3://echonote-backups/recordings
```

---

## 7. 安全清单

### 7.1 部署前检查

- [ ] 所有环境变量已正确配置
- [ ] JWT Secret 长度 >= 32 字符
- [ ] 数据库密码强度足够
- [ ] API CORS 配置正确（只允许特定域名）
- [ ] HTTPS 已启用
- [ ] 敏感接口有速率限制
- [ ] 日志不包含敏感信息
- [ ] 错误信息不暴露内部细节

### 7.2 安全头配置

```python
# FastAPI 安全中间件
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["api.echonote.app", "*.vercel.app"]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://echonote.vercel.app"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)
```

---

## 8. 故障排查

### 8.1 常见问题

#### 前端无法连接后端
```bash
# 检查 CORS 配置
# 检查环境变量 NEXT_PUBLIC_API_URL
# 检查后端服务状态
curl https://api.echonote.app/health
```

#### 数据库连接失败
```bash
# 检查连接字符串
# 检查 IP 白名单（Supabase）
# 检查 SSL 配置
```

#### 录音文件上传失败
```bash
# 检查 Storage 权限
# 检查文件大小限制
# 检查 Content-Type
```

### 8.2 回滚策略

```bash
# Vercel 回滚
vercel --version <previous-version>

# Railway 回滚
railway up --environment production --ref <commit-sha>

# 数据库回滚
psql $DATABASE_URL < backup_YYYYMMDD.sql
```

---

## 9. 成本估算

### 9.1 生产环境（月度）

| 服务 | 提供商 | 预估费用 |
|------|--------|----------|
| 前端托管 | Vercel Pro | $20 |
| 后端托管 | Railway / Fly.io | $10-20 |
| 数据库 | Supabase Pro | $25 |
| 文件存储 | Supabase / S3 | $5-10 |
| 监控 | Sentry + UptimeRobot | $0-20 |
| **总计** | | **$60-95/月** |

### 9.2 开发环境（免费层）

| 服务 | 免费额度 |
|------|----------|
| Vercel | 无限静态托管 |
| Railway | $5 信用额度 |
| Supabase | 500MB 数据库 |
| Sentry | 5k 错误/月 |

---

## 10. 附录

### 10.1 常用命令速查

```bash
# 查看日志
vercel logs --production
railway logs

# 重启服务
vercel --force
railway up --restart

# 数据库迁移
alembic upgrade head

# 清理缓存
vercel --force
```

### 10.2 相关文档
- [架构设计](./03-ARCHITECTURE.md)
- [API 文档](./04-API.md)
- [测试计划](./05-TEST-PLAN.md)
