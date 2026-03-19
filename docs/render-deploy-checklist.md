# EchoNote Render 部署清单

这份清单的目标是让 EchoNote 先在 Render 上稳定跑起来，再逐步切到真实 AI provider。

当前建议分两阶段：

1. 先用 `demo provider` 部署，验证单服务 MVP 链路
2. 再补 `DashScope / 百炼` 或 `xAI / Grok` 的真实 key

## 部署对象

当前 Render 蓝图在：

- [render.yaml](/Users/bytedance/Echonote/render.yaml)

开始前先确认两件事：

1. `render.yaml` 已经提交并 push 到 Render 会读取的分支
2. 该分支上的仓库代码已经同步到 GitHub

如果 `render.yaml` 只存在于本地或某个尚未推送的 feature branch，Render Dashboard 读取仓库时是看不到这份蓝图的。

当前蓝图只创建一个服务：

1. `echonote-api`

## 阶段一：先用 demo provider 跑通

### 1. 在 Render 创建 Blueprint

把当前仓库连接到 Render，然后使用 `render.yaml` 创建服务。

预期会生成：

- 一个 `Web Service`：`echonote-api`

### 2. 检查 API 服务配置

`echonote-api` 关键点：

- `rootDir`: `backend`
- `buildCommand`: `npm ci && npm run build:parser`
- `startCommand`: `npm run start`
- `healthCheckPath`: `/health`
- `NODE_VERSION`: `20`
- 不配置 `WEB_PARSER_URL` / `WEB_PARSER_HOSTPORT` 时，后端会直接使用仓库里的 embedded parser

### 4. 阶段一建议环境变量

先保持下面这些值：

- `AI_PROVIDER=demo`
- `TTS_PROVIDER=demo`
- `BAILIAN_BASE_URL=https://dashscope.aliyuncs.com/api/v1`
- `BAILIAN_MODEL=qwen-max`

这时可以先不填：

- `BAILIAN_API_KEY`
- `XAI_API_KEY`
- `DATABASE_URL`
- `OPENAI_API_KEY`
- `DEEPSEEK_API_KEY`
- `COZE_*`

说明：

- 不填 `BAILIAN_API_KEY` 时，AI 接口会走内置 `demo provider`
- 不填 `XAI_API_KEY` 时，也不会启用 `xai provider`
- 不填 `DATABASE_URL` 时，`notes` 相关接口不可用，但抓取和 AI demo 仍可验证

### 5. 阶段一验收

先验证这几个接口：

- `GET /health`
- `POST /api/fetch/web`
- `POST /api/ai/chat`
- `POST /api/ai/quick-read`
- `POST /api/ai/jobs/briefing`

预期：

- `/health` 返回 `aiProvider: "demo"`
- `parser` 字段返回 `embedded`
- `POST /api/ai/jobs/briefing` 返回 `jobId`
- 再请求 `GET /api/ai/jobs/:jobId` 最终能看到 `status: "succeeded"`

## 阶段二：切到真实 provider

### 方案 A：DashScope / 百炼

当阶段一稳定后，再把 `echonote-api` 的环境变量改成：

- `AI_PROVIDER=dashscope`
- `BAILIAN_API_KEY=<你的 DashScope Key>`

可保留：

- `BAILIAN_BASE_URL=https://dashscope.aliyuncs.com/api/v1`
- `BAILIAN_MODEL=qwen-max`

切换后重新部署，再验证：

- `GET /health`
- `POST /api/ai/chat`
- `POST /api/ai/quick-read`
- `POST /api/ai/article-to-note`
- `POST /api/ai/voice-clean`

预期：

- `/health` 返回 `aiProvider: "dashscope"`
- AI 接口不再返回 demo 风格内容

### 方案 B：xAI / Grok

如果你更想先用 xAI，则把 `echonote-api` 的环境变量改成：

- `AI_PROVIDER=xai`
- `XAI_API_KEY=<你的 xAI Key>`

可保留或补充：

- `XAI_BASE_URL=https://api.x.ai/v1`
- `XAI_MODEL=grok-4-1-fast`

切换后重新部署，再验证：

- `GET /health`
- `POST /api/ai/chat`
- `POST /api/ai/quick-read`
- `POST /api/ai/article-to-note`
- `POST /api/ai/voice-clean`

预期：

- `/health` 返回 `aiProvider: "xai"`
- AI 接口不再返回 demo 风格内容

## 可选：接数据库

如果你要把 `notes` 实验接口也一起跑起来，再补：

- `DATABASE_URL`
- `DATABASE_SSL=true`

但这不是当前 Render MVP 的第一优先级。

因为当前主路径仍然是：

- 核心用户数据走 `Supabase`
- Render 上的 `backend` 主要承担 AI / 抓取 / job / artifact 能力

## 部署完成后的移动端配置

Render 上 `echonote-api` 发布成功后，把 mobile 环境变量更新为：

- `EXPO_PUBLIC_BACKEND_URL=https://你的-echonote-api.onrender.com`

对应文件参考：

- [mobile/.env.example](/Users/bytedance/Echonote/mobile/.env.example)

然后重新启动 Expo。

## 当前最小成功标准

如果下面这条链路成立，就算 Render 部署第一阶段成功：

1. `echonote-api` 健康检查通过
2. `POST /api/fetch/web` 能成功返回网页内容
3. `POST /api/ai/chat` 能返回 demo provider 内容
4. `POST /api/ai/jobs/podcast` 或 `POST /api/ai/jobs/briefing` 能成功产出 job

## 常见问题

### 1. 为什么先用 demo provider

因为这样可以先验证：

- Render 上单服务 MVP 是否可跑
- 路由设计
- job / artifact 基础流程

而不用在第一步就把问题混到模型 key、配额或供应商网络里。

### 2. 为什么数据库可以先不配

因为当前我们要优先确认的是：

- backend 服务是否稳定
- embedded parser 是否稳定
- AI action / job 是否能走通

数据库属于下一层能力，不是 Render 首次部署的必要条件。

### 3. 播客为什么能先验收

因为当前播客生成已经被定义成 `job + artifact`。

第一阶段即使还没有真实 TTS，也能先验证：

- job 创建
- 状态流转
- artifact 生成

这对后续接真实音频 provider 更稳。
