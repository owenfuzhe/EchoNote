# EchoNote AI 助手架构设计

## 文档目的

这份文档用来统一 EchoNote 后续的 AI 能力设计口径。

它回答 5 个问题：

1. EchoNote 的 AI 助手到底是什么
2. 现在要先做哪些能力
3. 哪些能力是同步动作，哪些应该走异步任务
4. provider、tool、artifact 应该怎么分层
5. 现在要不要为 MCP / 外部 tools / 更多模型供应商提前做准备

## 核心判断

EchoNote 的 AI 助手不应该是“一个万能聊天框”，而应该是一组围绕知识输入、整理、阅读和产出的固定能力。

换句话说：

- 前端感知的是“动作”和“任务”
- 后端负责 provider 路由、tool 调用、产物生成和状态管理
- 模型供应商、workflow 平台、TTS 引擎都不应该直接泄露到产品交互层

## 设计原则

### 1. 先做固定能力，不先做重型 Agent 平台

当前阶段先把最有价值的 6 到 8 个能力做稳，比先做无限扩展的 Agent 系统更重要。

### 2. 前端只认能力，不认供应商

前端不要直接感知：

- Coze
- 百炼 / DashScope
- OpenAI
- DeepSeek
- 未来的 MCP server

前端只应该感知：

- `chat`
- `voice-clean`
- `article-to-note`
- `quick-read`
- `explore-questions`
- `briefing.generate`
- `podcast.generate`

### 3. 从现在开始区分同步动作和异步任务

这一步必须现在就做。

否则后面 `briefing`、`podcast`、批量归档、复杂搜索增强都会继续混成“一个个特殊接口”，很快失控。

### 4. 产物必须有统一 schema

EchoNote 后续会越来越多地产生 AI 结果：

- 结构化笔记
- 快速消化简报
- 深度探索问题
- 播客脚本 / 音频

这些不能只是“某个页面的临时返回值”，而应该被看作正式资产。

### 5. 要预留扩展缝，但不要提前把插件系统做出来

当前应该预留：

- provider adapter
- tool adapter
- job / artifact schema

当前不应该提前做：

- 完整插件市场
- 通用低代码 workflow 系统
- 很重的多 agent 编排平台

## EchoNote AI 能力地图

### A. 实时整理层

这类能力需要即时返回，通常直接服务于当前编辑或阅读上下文。

能力：

- `chat`
- `voice-clean`
- `article-to-note`

特点：

- 用户在当前页面立即触发
- 一般几秒内返回
- 返回的是结构化结果，不是长篇自由生成

### B. 阅读增强层

这类能力服务于“更快理解”和“继续探索”。

能力：

- `quick-read`
- `explore-questions`

特点：

- 输入通常是当前文档、当前 Topic 或一组精选内容
- 结果会直接进入首页、详情页、探索页
- 仍然适合同步返回

### C. 异步产物层

这类能力更重，应该看作后台任务，而不是一次 prompt 即时生成。

能力：

- `briefing.generate`
- `podcast.generate`

特点：

- 可能涉及多篇内容聚合
- 可能需要多阶段生成
- 可能需要 TTS、存储、状态追踪
- 最终结果应该沉淀为正式资产

### D. 外部行动层

这类能力不是直接给用户看的结果，而是给 AI 编排层调用的外部能力。

能力：

- `web_fetch`
- `search`
- 后续的 `mcp:*`

特点：

- 对产品来说是“工具”，不是“页面能力”
- 不应该直接散落在 UI 层
- 后续可以通过统一 tool adapter 挂更多能力

## 统一抽象

### 1. Action

`Action` 表示同步能力调用。

适合：

- `chat`
- `voice-clean`
- `article-to-note`
- `quick-read`
- `explore-questions`

特征：

- 请求后通常直接得到结果
- 页面会等待结果返回
- schema 相对稳定

### 2. Job

`Job` 表示异步生成任务。

适合：

- `briefing.generate`
- `podcast.generate`
- 后续批量标签整理
- 后续批量主题归档

建议状态：

- `queued`
- `running`
- `succeeded`
- `failed`
- `canceled`

### 3. Artifact

`Artifact` 表示 AI 生成后沉淀下来的正式产物。

当前建议重点支持：

- `structured_note`
- `briefing`
- `podcast`

长期还可以支持：

- `topic_stack`
- `reading_list`
- `highlight_pack`

### 4. Provider

`Provider` 表示底层模型或 workflow 供应商。

当前建议视为可插拔：

- `dashscope`
- `coze`
- `openai`
- `deepseek`

注意：

- provider 是实现细节，不是产品概念
- provider 可以按能力不同而不同
- 同一个 action/job 允许根据环境和成本走不同 provider

### 5. Tool

`Tool` 表示 AI 或 workflow 可以调用的外部能力。

当前建议先支持内置 tool：

- `web_fetch`
- `search`
- `note_lookup`

后续再考虑通过同一层挂：

- `mcp:*`
- 第三方知识库
- 浏览器自动化工具

## 推荐的后端分层

```text
backend/
  src/
    ai/
      actions/
        chat
        voice-clean
        article-to-note
        quick-read
        explore-questions
      jobs/
        briefing.generate
        podcast.generate
      artifacts/
        briefing
        podcast
        structured-note
      providers/
        dashscope
        coze
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

这里不要求现在一次性重构到位，但后面新加能力时要按这个方向留口子。

## 播客生成应该怎么归类

`播客生成` 不应该继续只是端上的一个本地 TTS 按钮。

它更合理的产品定义是：

1. 用户选定一篇或多篇内容
2. 系统生成播客脚本 / 节目结构
3. 可选地进行风格调整
4. 调用 TTS 或音频引擎
5. 生成 `podcast` artifact
6. 在资料库或详情页中可再次访问

所以在架构上：

- `podcast.generate` 是 `Job`
- 生成出来的内容是 `Artifact`
- TTS 引擎属于 `Provider` 的一部分或独立 `audio provider`

## 短期阶段的 provider 策略

当前最务实的建议是：

### 1. 模型调用先走 API，不先自托管模型

原因：

- 当前还在产品验证阶段
- 请求量还不稳定
- 自托管 GPU 会显著增加运维复杂度
- 现在更重要的是把能力骨架做对

### 2. 后端和 parser 由我们自己部署

当前仍建议：

- `backend` 自己部署
- `web-parser` 自己部署
- 核心数据走 `Supabase`

### 3. provider 选择建议

- 默认主 provider：`DashScope / Qwen`
  - 原因：当前代码已接入、国内环境更顺、适合作为默认基线
- 可选 demo provider：`Coze`
  - 原因：适合快速验证 workflow，但不应绑定前端和 schema
- 可选质量增强 provider：`OpenAI`
- 可选低成本批处理 provider：`DeepSeek`

这不是要求一开始全部接完，而是要求接口边界允许后续接入。

## 现在要不要为 MCP / 外部 tools 提前做准备

要，但只做到“预留边界”。

### 现在应该做的

- 在后端保留 `tool adapter` 位置
- 所有外部能力都通过 tool 层接入
- 不让业务页面直接依赖某个特定 tool

### 现在不应该做的

- 不先做完整 MCP 平台
- 不为了假设中的未来场景把当前代码复杂化
- 不把所有能力都强行改造成可编排 workflow

## 当前阶段的落地优先级

### P0

- `chat`
- `voice-clean`
- `article-to-note`
- provider abstraction 骨架

### P1

- `quick-read`
- `explore-questions`

### P2

- `briefing.generate`
- `podcast.generate`
- artifact 持久化

### P3

- tool adapter 最小闭环
- 内置 `web_fetch / search / note_lookup`
- 评估 MCP 接入方式

## 推荐 API 方向

为了减少当前改动，MVP 阶段可以继续保留扁平路由风格。

### 同步 action

- `POST /api/ai/chat`
- `POST /api/ai/voice-clean`
- `POST /api/ai/article-to-note`
- `POST /api/ai/quick-read`
- `POST /api/ai/explore-questions`

### 异步 job

- `POST /api/ai/jobs/briefing`
- `POST /api/ai/jobs/podcast`
- `GET /api/ai/jobs/:jobId`

### artifact

- `GET /api/ai/artifacts/:artifactId`
- `GET /api/briefings/latest`
- `GET /api/podcasts/:podcastId`

后续如果接口越来越多，再统一收敛到 `/api/ai/actions/*` 和 `/api/ai/jobs/*`。

## 数据与追踪建议

后续建议统一记录每次 AI 产出：

- 使用了哪个 provider
- 用了哪些输入内容
- 调用了哪些 tools
- 生成了哪个 artifact
- 是同步动作还是异步任务

这会直接影响：

- 可解释性
- 调试
- 成本分析
- 资料库中的 AI 资产归档

## 一句话结论

EchoNote 当前最重要的不是先做“更大的 AI”，而是先把 AI 能力变成一套可扩展、可追踪、可沉淀的系统：

- 同步能力走 `Action`
- 重型生成走 `Job`
- 正式结果沉淀为 `Artifact`
- 底层模型走 `Provider`
- 外部能力通过 `Tool` 接入

只要现在把这五层边界定清楚，后续加播客、加简报、加 MCP、甚至换模型供应商，都应该是演进式升级，而不是推倒重来。
