# EchoNote 后端服务详细计划

## 文档目的

这份文档是给明天继续开发时直接接力用的。

目标不是讨论“理想架构”，而是明确：

1. EchoNote 当前后端到底承担什么角色
2. 为什么抓取服务要拆成两个服务
3. Render 上应该怎么部署
4. AI 为什么要做成 `action / job / artifact / provider / tool` 这套结构
5. 接下来几个 Sprint 具体做什么

如果只想先看 AI 助手整体口径，先看：

- [docs/ai-assistant-architecture.md](/Users/bytedance/Echonote/docs/ai-assistant-architecture.md)

## 当前阶段的核心判断

EchoNote 现在要优先做的是一个 `可稳定演示的 MVP / Demo`，而不是继续深挖 UI 细节。

当前最关键的产品闭环是：

`导入内容 -> AI 整理 -> 保存到云端 -> 继续阅读 / 继续编辑`

这意味着：

- `Supabase` 负责核心用户数据
- `backend/` 负责能力服务
- `packages/web-parser/` 负责重抓取能力

也就是说，EchoNote 不是“一个 Node 后端 + 一个 App”，而是：

1. `mobile`
2. `Supabase`
3. `backend`
4. `web-parser`

## 为什么 parser 要单独拆成一个服务

当前不建议把 parser 直接并进 `backend/`。

原因不是“不能并”，而是现在拆开更稳：

1. `web-parser` 使用 Puppeteer，运行更重
2. 抓取任务比普通 API 更容易超时
3. 抓取失败不应该拖累普通 AI 接口
4. Render 上拆成 `private service + public api` 更适合当前形态

### 当前推荐方式

- `echonote-parser`
  - 私有服务
  - 专门负责网页解析、微信文章解析等重任务

- `echonote-api`
  - 公网服务
  - 对 mobile 暴露统一能力接口
  - 内部通过 Render 私网访问 parser

### 什么时候可以考虑合并

如果后面出现下面这些情况，可以评估把 parser 并到 API：

1. 只想极简部署一个服务
2. 抓取量很低
3. 成本压力大于隔离收益
4. 我们愿意接受 Puppeteer 给主服务带来的启动和稳定性压力

在当前阶段，不建议优先这样做。

## 当前目录职责

### 1. `mobile/`

负责：

- UI 与交互
- Supabase 直接读写核心数据
- 调用后端能力接口
- 语音输入的端上采集与转写起步

### 2. `backend/`

负责：

- AI 能力代理
- 内容抓取编排
- 异步 job 与 artifact 状态管理
- 后续日志、限流、错误监控
- provider 路由

### 3. `packages/web-parser/`

负责：

- URL 解析
- 网页正文提取
- 特定站点抓取适配

### 4. `Supabase`

负责：

- 匿名登录 / 用户身份
- notes 主数据
- 云同步

## 当前已经落地的代码

### `backend/server.js`

已具备：

- 基础 health check
- fetch 能力
- notes 实验接口
- `POST /api/ai/chat`
- `WEB_PARSER_HOSTPORT` 支持

### `mobile/src/services/bailian-chat.ts`

已改成：

1. 优先走 `EXPO_PUBLIC_BACKEND_URL/api/ai/chat`
2. 后端不可用时，如果本地配置了 `EXPO_PUBLIC_BAILIAN_API_KEY`，则 fallback 到直连

这是一条过渡期方案，适合 MVP。

### `render.yaml`

当前 MVP 部署路径改为单服务蓝图：

1. `echonote-api`

## Render 部署方案

### 当前 MVP 部署拓扑

```text
Expo App
   ->
echonote-api (public)
   -> embedded parser
   -> 目标网页

Expo App
   ->
Supabase
```

### Render 上的服务

#### `echonote-api`

- 类型：Web Service
- 根目录：`backend`
- 职责：暴露 `/health`、`/api/fetch/*`、`/api/ai/*`
- 默认直接调用仓库内的 embedded parser

### 为什么当前先走单服务

因为当前目标是先验证 MVP 核心链路是否可跑通，并压低 Render 成本。

当前接受的取舍是：

- 先把 `Private Service` 的固定成本去掉
- 先验证抓取、AI、job、artifact 主链路
- 后续如果抓取稳定性或资源隔离成为瓶颈，再切回双服务

### 为什么先不把 mobile web 端也一起部署

因为当前主产品是 Expo mobile，最重要的是先把能力服务跑起来，而不是做一个完整 web 控制台。

## 环境变量设计

### `echonote-api`

当前需要重点关注：

- `PORT`
- `WEB_PARSER_URL`（可选；默认不填，直接走 embedded parser）
- `BAILIAN_API_KEY`
- `BAILIAN_BASE_URL`
- `BAILIAN_MODEL`
- `DATABASE_URL`（当前可选）

后续建议新增：

- `AI_PROVIDER`
- `COZE_API_TOKEN`
- `COZE_API_BASE`
- `COZE_WORKFLOW_QUICK_READ`
- `COZE_WORKFLOW_EXPLORE`
- `COZE_WORKFLOW_ARTICLE_TO_NOTE`
- `COZE_WORKFLOW_VOICE_CLEAN`
- `COZE_WORKFLOW_BRIEFING`
- `COZE_WORKFLOW_PODCAST`
- `OPENAI_API_KEY`
- `DEEPSEEK_API_KEY`
- `TTS_PROVIDER`
- `TTS_API_KEY`

### `mobile`

当前需要重点关注：

- `EXPO_PUBLIC_BACKEND_URL`
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `EXPO_PUBLIC_BAILIAN_API_KEY`（仅开发 fallback）

## AI 能力设计原则

这里是后续最重要的一条原则：

`前端不要直接感知 Coze / 百炼 / OpenAI / DeepSeek。`

前端只应该感知“能力动作”和“异步任务”，而不是“底层供应商”。

### 推荐能力层

后端当前建议明确分成 4 层：

1. 同步 `actions`
   - `quick-read`
   - `explore-questions`
   - `article-to-note`
   - `voice-clean`
   - `chat`
2. 异步 `jobs`
   - `briefing.generate`
   - `podcast.generate`
3. 正式 `artifacts`
   - `structured_note`
   - `briefing`
   - `podcast`
4. 可插拔 `tools`
   - `web_fetch`
   - `search`
   - 后续 `mcp:*`

短期内不需要把所有目录一次性拆完，但新的能力要按这套边界设计。

### 推荐后端目录目标

后续建议把 `backend/` AI 代码逐步整理成：

```text
backend/
  src/
    ai/
      actions/
        quick-read
        explore-questions
        article-to-note
        voice-clean
        chat
      jobs/
        briefing.generate
        podcast.generate
      artifacts/
        briefing
        podcast
        structured-note
      providers/
        demo
        coze
        dashscope
        openai
        deepseek
      tools/
        web-fetch
        search
        note-lookup
        mcp
      schemas/
      prompts/
      router/
```

现在不需要一步到位重构成这样，但后面写代码时要按这个方向留口子。

## 为什么 AI provider 一开始就要可切换

这是为了避免 EchoNote 被某个供应商锁死。

### 当前可能存在的几条路

#### 路线 A：Coze

优点：

- 容易快速做 Demo
- workflow 便于组织能力
- 如果用户已有 Coze 积分，可能能更快起量

风险：

- 成本与模型控制不够透明
- workflow 产物可能和产品 schema 不完全一致
- 长期更换供应商时需要抽离

#### 路线 B：百炼 / Qwen

优点：

- 当前代码已部分接好
- 中国区接入更顺
- 比较适合长期做主 provider

风险：

- 需要自己维护 prompt / schema / routing

#### 路线 C：OpenAI / DeepSeek

优点：

- 模型能力强
- 工具链成熟

风险：

- 成本和网络环境要另外评估

### 结论

当前建议是：

1. 架构上支持 `provider abstraction`
2. Demo 阶段允许先接 Coze
3. 但前端和接口设计绝不直接绑定 Coze
4. `podcast` 和 `briefing` 这类重能力不要继续当成同步 prompt 返回值
5. 所有外部能力都通过 tool 层接入，而不是直接散落在业务代码里

## 推荐 API 设计

当前已有：

- `POST /api/ai/chat`

下一步建议补成下面两类接口：

### A. 同步 action

- `POST /api/ai/quick-read`
- `POST /api/ai/explore-questions`
- `POST /api/ai/article-to-note`
- `POST /api/ai/voice-clean`
- `POST /api/ai/chat`

### B. 异步 job

- `POST /api/ai/jobs/briefing`
- `POST /api/ai/jobs/podcast`
- `GET /api/ai/jobs/:jobId`
- `GET /api/ai/artifacts/:artifactId`

### 推荐返回 schema 示例

#### `/api/ai/quick-read`

```json
{
  "headline": "F1上海站热度飙升，京东将国内电商经验复制到欧洲",
  "summary": "本期快读聚焦两条值得追踪的商业信号。",
  "bullets": [
    "F1 上海站带动品牌热度回流。",
    "京东开始验证欧洲复制路径。"
  ],
  "readMinutes": 4,
  "sourceCount": 3
}
```

#### `/api/ai/explore-questions`

```json
{
  "topic": "理财",
  "hook": "3 条新线索待推进",
  "questions": [
    "当前最值得持续追踪的理财主题是什么？",
    "现有材料中有哪些相互矛盾的观点？",
    "下一步补充什么来源最有效？"
  ],
  "nextStep": "优先补一篇行业深度材料"
}
```

#### `/api/ai/article-to-note`

```json
{
  "title": "文章结构化笔记",
  "summary": "文章主要讨论了……",
  "outline": [
    "背景",
    "关键变化",
    "值得记录的结论"
  ],
  "highlights": [
    "……",
    "……"
  ],
  "todos": [
    "继续追踪这个主题"
  ],
  "tags": [
    "商业",
    "观察"
  ]
}
```

#### `/api/ai/voice-clean`

```json
{
  "title": "一段语音整理结果",
  "cleanedText": "这是整理后的文本。",
  "summary": "一句话摘要",
  "todos": [
    "待办一"
  ],
  "tags": [
    "语音输入"
  ]
}
```

#### `POST /api/ai/jobs/podcast`

```json
{
  "jobId": "job_123",
  "type": "podcast.generate",
  "status": "queued",
  "estimatedSeconds": 45
}
```

#### `GET /api/ai/jobs/:jobId`

```json
{
  "jobId": "job_123",
  "type": "podcast.generate",
  "status": "succeeded",
  "artifactId": "podcast_456"
}
```

## MVP 阶段 AI 功能优先级

### P0：一定要做

1. `voice-clean`
2. `article-to-note`
3. `chat`

这三项最直接影响演示感受。

### P1：强烈建议做

1. `quick-read`
2. `explore-questions`

这两项最能体现 EchoNote 的产品差异，也最适合先做成稳定的同步 action。

### P2：可以后做

1. `briefing.generate`
2. `podcast.generate`
3. artifact 持久化与回看入口

这两项不建议继续按“前端本地临时功能”推进，而应该直接按 `job + artifact` 来做。

### P3：可以后做

1. 标签推荐
2. 待办提取独立接口
3. 多文档对比
4. 主题资产自动归档
5. MCP / 外部 tools 扩展

## 语音输入的现实判断

当前语音输入已经有一条能跑通的 MVP 路径：

1. 端上录音/识别
2. 得到初步转写
3. 调用 AI 做轻润色
4. 用户保存为笔记或继续问 AI

这条路是对的。

当前不要先去追：

- 复杂会议纪要
- 说话人分离
- 重型音频编排

先把“顺手可用”做出来更重要。

## 接下来 5 个 Sprint 建议

### Sprint 1：服务端上线

目标：

- Render 上跑通 `echonote-parser`
- Render 上跑通 `echonote-api`
- `/health` 稳定可访问

验收：

- `GET /health`
- `POST /api/fetch/web`
- `POST /api/ai/chat`

### Sprint 2：AI provider 抽象

目标：

- 后端支持 `demo / coze / dashscope`
- 不改前端接口
- 保持 schema 稳定

验收：

- 相同请求体可以切 provider
- 前端完全无感

### Sprint 3：同步 action 完整化

目标：

- 补齐 `quick-read`
- 补齐 `explore-questions`
- 补齐 `article-to-note`
- 补齐 `voice-clean`

验收：

- 首页快读和探索能调用真实接口
- 语音输入能走独立接口
- 文章页可一键转笔记

### Sprint 4：异步 job / artifact 骨架

目标：

- 补齐 `briefing.generate`
- 补齐 `podcast.generate`
- 后端能记录 job 状态和 artifact 引用

验收：

- 首页简报可以走真实 job
- 播客生成不再只是端上 mock
- 资料库或详情页可以回看生成产物

### Sprint 5：Demo 稳定化

目标：

- loading / error 状态可接受
- fallback 明确
- 语音与 AI 链路在演示中稳定
- action / job 追踪信息可回看

验收：

- 连续演示 3 次不掉链子
- 网络失败时有体面提示

## 明天继续开发时的推荐顺序

如果明天在另一台设备上继续，建议按下面顺序推进：

1. `git pull origin feat/mobile-ia-v02`
2. 看这几份文档：
   - [docs/ai-assistant-architecture.md](/Users/bytedance/Echonote/docs/ai-assistant-architecture.md)
   - [docs/mvp-demo-roadmap.md](/Users/owenfff/EchoNote/docs/mvp-demo-roadmap.md)
   - [docs/backend-service-plan.md](/Users/owenfff/EchoNote/docs/backend-service-plan.md)
   - [docs/adr-001-data-and-backend-architecture.md](/Users/owenfff/EchoNote/docs/adr-001-data-and-backend-architecture.md)
3. 优先继续 `AI provider 抽象`
4. 再补 `sync action` 和 `async job` 的边界
5. 最后再决定先接 `Coze` 还是先上 `demo provider`

## 当前最务实的推荐

如果明天要快速推进，我推荐这样做：

1. 先把当前代码推上去
2. Render 按双服务部署
3. 后端先加 `demo provider`
4. 先补齐 `chat / voice-clean / article-to-note / quick-read / explore-questions`
5. 再把 `briefing / podcast` 改成 job + artifact
6. 最后再评估是否要先接 `coze provider`

一句话说：

`先把 EchoNote 的后端能力骨架做成可切换、可演示、可部署、可扩展，再去追求最优模型。`
