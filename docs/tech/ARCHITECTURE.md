# EchoNote - 技术架构文档

**版本：** v1.0  
**日期：** 2026-03-03  
**状态：** 初稿  
**负责人：** Nova (PM) / Bernard (Dev)  

---

## 1. 技术栈

### 1.1 前端
| 技术 | 用途 | 版本 |
|------|------|------|
| Next.js | React 框架 | 14.1.0 |
| React | UI 库 | 18.x |
| TypeScript | 类型安全 | 5.x |
| Tailwind CSS | 样式框架 | 3.x |
| shadcn/ui | 组件库 | 最新 |
| Zod | 表单验证 | 3.x |
| Lucide Icons | 图标库 | 最新 |

### 1.2 后端
| 技术 | 用途 | 版本 |
|------|------|------|
| Python | 开发语言 | 3.11+ |
| FastAPI | Web 框架 | 0.100+ |
| PostgreSQL | 主数据库 | 15+ |
| Redis | 缓存/会话 | 7+ |
| JWT | 认证 | PyJWT |
| Bcrypt | 密码加密 | 最新 |

### 1.3 AI/ML
| 技术 | 用途 |
|------|------|
| Whisper | 语音转写（本地/API） |
| Kimi/GLM | 文本摘要、标签分类 |
| 阿里云百炼 | 备用 AI 服务 |

### 1.4 部署
| 技术 | 用途 |
|------|------|
| Vercel | 前端托管 |
| Railway/Fly.io | 后端托管 |
| Supabase | 数据库托管 |

---

## 2. 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                        客户端层                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Web App   │  │  Mobile Web │  │  PWA        │         │
│  │  (Next.js)  │  │  (响应式)   │  │  (未来)     │         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
└─────────┼────────────────┼────────────────┼────────────────┘
          │                │                │
          └────────────────┴────────────────┘
                           │
                    HTTPS/REST
                           │
┌──────────────────────────┼──────────────────────────────────┐
│                        API 网关层                           │
│                    (FastAPI)                                │
│  ┌───────────────────────┼───────────────────────────────┐  │
│  │                  路由层                                │  │
│  │  /api/auth/*          │  /api/notes/*                  │  │
│  │  /api/recordings/*    │  /api/ai/*                     │  │
│  └───────────────────────┼───────────────────────────────┘  │
└──────────────────────────┼──────────────────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────────────┐
│                      服务层                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Auth      │  │   Notes     │  │  Recordings │         │
│  │   Service   │  │   Service   │  │   Service   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│  ┌─────────────┐  ┌─────────────┐                          │
│  │    AI       │  │   Export    │                          │
│  │  Service    │  │   Service   │                          │
│  └─────────────┘  └─────────────┘                          │
└─────────────────────────────────────────────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────────────┐
│                      数据层                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ PostgreSQL  │  │    Redis    │  │ File Store  │         │
│  │  (主数据库)  │  │   (缓存)    │  │  (录音文件)  │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. 数据库设计

### 3.1 实体关系图

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│    users     │       │    notes     │       │    tags      │
├──────────────┤       ├──────────────┤       ├──────────────┤
│ id (PK)      │──┐    │ id (PK)      │──┐    │ id (PK)      │
│ email        │  │    │ user_id (FK) │  │    │ name         │
│ password_hash│  │    │ title        │  │    │ color        │
│ created_at   │  │    │ content      │  │    └──────────────┘
└──────────────┘  │    │ summary      │  │         │
                  │    │ source_type  │  │         │
┌──────────────┐  │    │ created_at   │  │    ┌──────────────┐
│  recordings  │  │    │ updated_at   │  └───│  note_tags   │
├──────────────┤  │    └──────────────┘       ├──────────────┤
│ id (PK)      │  │                           │ note_id (FK) │
│ note_id (FK) │──┘                           │ tag_id (FK)  │
│ file_path    │                              └──────────────┘
│ duration     │
└──────────────┘
```

### 3.2 核心表结构

#### users 表
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    google_id VARCHAR(255) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### notes 表
```sql
CREATE TABLE notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    content TEXT,
    summary TEXT,              -- AI 生成的摘要
    source_type VARCHAR(50),   -- voice | text | pdf | link
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### recordings 表
```sql
CREATE TABLE recordings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id UUID REFERENCES notes(id) ON DELETE CASCADE,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER,         -- bytes
    duration INTEGER,          -- seconds
    transcription TEXT,        -- 转录文本
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### tags 表
```sql
CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) DEFAULT '#4F46E5',  -- 默认靛蓝
    is_ai_generated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, name)
);
```

---

## 4. API 设计

### 4.1 认证 API
```
POST /api/auth/login           # 邮箱登录
POST /api/auth/register        # 注册
POST /api/auth/google          # Google OAuth
GET  /api/auth/me              # 获取当前用户
POST /api/auth/refresh         # 刷新 Token
```

### 4.2 笔记 API
```
GET    /api/notes              # 列表（支持分页、筛选、搜索）
POST   /api/notes              # 创建
GET    /api/notes/{id}         # 详情
PUT    /api/notes/{id}         # 更新
DELETE /api/notes/{id}         # 删除
POST   /api/notes/{id}/export  # 导出（json/markdown）
```

### 4.3 录音 API
```
POST   /api/recordings/upload  # 上传音频
GET    /api/recordings/{id}    # 获取录音信息
GET    /api/recordings/{id}/play  # 播放音频
DELETE /api/recordings/{id}    # 删除
```

### 4.4 AI API（Phase 2）
```
POST /api/ai/transcribe        # 语音转写
POST /api/ai/summarize         # 生成摘要
POST /api/ai/tags              # 智能标签
POST /api/ai/todos             # 提取待办
POST /api/ai/chat              # AI 助手对话
```

---

## 5. 目录结构

```
EchoNote/
├── frontend/                  # Next.js 前端
│   ├── app/                   # App Router
│   │   ├── login/             # 登录页
│   │   ├── page.tsx           # 首页
│   │   ├── record/            # 录音页
│   │   ├── note/[id]/         # 笔记详情页
│   │   ├── library/           # 资料库页
│   │   └── settings/          # 设置页
│   ├── components/            # 组件
│   │   ├── ui/                # 基础 UI 组件
│   │   └── note/              # 笔记相关组件
│   ├── lib/                   # 工具函数
│   └── public/                # 静态资源
│
├── backend/                   # FastAPI 后端
│   ├── main.py                # 应用入口
│   ├── auth.py                # 认证模块
│   ├── notes.py               # 笔记 API
│   ├── recordings.py          # 录音 API
│   ├── ai.py                  # AI 处理（Phase 2）
│   └── models.py              # 数据模型
│
├── docs/                      # 文档（SOT）
├── design/                    # 设计规范
├── reports/                   # 测试报告
└── uploads/                   # 上传文件存储
    └── recordings/            # 录音文件
```

---

## 6. 安全设计

### 6.1 认证流程
```
1. 用户登录 → 后端验证 → 返回 JWT Token
2. 前端存储 Token（localStorage）
3. 每次请求携带 Authorization: Bearer <token>
4. 后端验证 Token 有效性
5. Token 过期后使用 Refresh Token 续期
```

### 6.2 安全措施
- 密码使用 Bcrypt 加密存储
- JWT Token 设置合理过期时间（access: 15min, refresh: 7d）
- API 启用 CORS 限制（只允许特定域名）
- 文件上传限制类型和大小（音频最大 50MB）
- SQL 注入防护（使用 ORM/参数化查询）

---

## 7. 部署架构

### 7.1 开发环境
```
前端: http://localhost:3002/
后端: http://localhost:8000/
数据库: localhost:5432
```

### 7.2 生产环境（建议）
```
前端: Vercel (echonote.vercel.app)
后端: Railway/Fly.io (api.echonote.app)
数据库: Supabase PostgreSQL
文件存储: Supabase Storage / AWS S3
```

---

## 8. 性能优化策略

### 8.1 前端
- 图片懒加载
- 组件代码分割
- API 响应缓存（SWR/React Query）
- 骨架屏加载状态

### 8.2 后端
- 数据库查询优化（索引、分页）
- Redis 缓存热点数据
- 音频文件 CDN 分发
- 异步处理 AI 任务（Celery/RQ）

---

## 9. 监控与日志

### 9.1 监控指标
- API 响应时间
- 错误率
- 活跃用户
- AI API 调用量和成本

### 9.2 日志规范
- 请求日志（时间、路径、耗时）
- 错误日志（堆栈、上下文）
- 业务日志（关键操作记录）

---

## 10. 附录

### 10.1 环境变量
```bash
# 前端
NEXT_PUBLIC_API_URL=http://localhost:8000

# 后端
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=your-secret-key
JWT_ALGORITHM=HS256

# AI 服务（Phase 2）
KIMI_API_KEY=sk-...
GLM_API_KEY=...
```

### 10.2 相关文档
- [API 详细文档](./04-API.md)
- [数据库迁移记录](../backend/migrations/)
