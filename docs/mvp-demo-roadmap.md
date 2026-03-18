# EchoNote MVP / Demo Roadmap

## 当前判断

EchoNote 现在已经不再是“零散原型”，但还没有进入“可稳定演示的 MVP”。

当前最该优先的不是继续打磨局部 UI，而是让下面这条链路第一次完整成立：

`输入内容 -> AI 整理 -> 沉淀到云端 -> 可继续阅读/编辑`

## 我们已经完成的部分

### 1. 产品骨架

- 首页的入口结构已经明显收敛
- 资料页已经改成更轻的“资产整理空间”
- 详情页已经开始区分“文章”和“笔记”两种形态

相关代码：

- [HomeView.tsx](/Users/owenfff/EchoNote/mobile/src/components/HomeView.tsx)
- [LibraryView.tsx](/Users/owenfff/EchoNote/mobile/src/components/LibraryView.tsx)
- [DocumentView.tsx](/Users/owenfff/EchoNote/mobile/src/components/DocumentView.tsx)

### 2. 数据底座方向

- 核心数据方向已经对齐 Supabase
- mobile 端已经具备匿名登录和基础云同步能力

相关代码：

- [supabase.ts](/Users/owenfff/EchoNote/mobile/src/services/supabase.ts)
- [supabase-notes.ts](/Users/owenfff/EchoNote/mobile/src/services/supabase-notes.ts)
- [noteStore.ts](/Users/owenfff/EchoNote/mobile/src/store/noteStore.ts)

### 3. 内容抓取基础能力

- `backend/` 提供内容抓取和 notes API
- `packages/web-parser/` 提供网页/微信/小红书解析能力

相关代码：

- [backend/server.js](/Users/owenfff/EchoNote/backend/server.js)
- [packages/web-parser/src/server.ts](/Users/owenfff/EchoNote/packages/web-parser/src/server.ts)

## 当前最关键的 gap

### 1. AI 助手还没有真正服务端化

当前大多数 AI 调用仍然来自移动端直接请求百炼。

这会带来几个问题：

- 密钥暴露在客户端
- 调用链不稳定
- 不方便做限流、审计、计费控制
- 不适合作为上架级方案

### 2. 语音输入还是“能力试验”，还不是稳定 MVP

当前语音输入主要依赖端上识别，再调用 AI 做轻润色。

这条路对于 MVP 是可行的，但需要先把 AI 代理稳定下来，再把错误处理和 fallback 产品化。

### 3. 内容抓取部署实际上是双服务

当前抓取不是一个服务，而是：

1. `backend/`
2. `packages/web-parser/`

所以部署时不能只上一个 Node 服务。

## 新的 MVP 优先级

### P0. 服务端部署

目标：让内容抓取和 AI 代理拥有一个稳定的线上地址。

当前最短路线：

- 先部署 `packages/web-parser`
- 再部署 `backend/`
- mobile 通过 `EXPO_PUBLIC_BACKEND_URL` 访问它

说明：

- 笔记核心数据继续优先走 Supabase
- `backend/` 不作为基础 CRUD 主路径，而是承担能力服务

### P1. AI 助手 MVP

第一阶段只做 3 个动作：

1. 总结当前内容
2. 提炼关键问题
3. 把文章转成结构化笔记

这些动作已经足够支撑演示。

### P2. 语音输入 MVP

第一阶段标准：

1. 用户能说话
2. 端上得到转写
3. 服务端 AI 做轻润色
4. 可以生成笔记 / 继续和 AI 对话

先不追求复杂会议纪要、说话人分离和重编排。

### P3. Demo 打磨

在能力闭环成立之后，再补：

- loading / error 状态
- 更顺手的引导
- 更清晰的 fallback
- 关键链路的演示脚本

## 这轮已经落地的改动

### 1. 后端新增 AI 代理接口

新增：

- `POST /api/ai/chat`

位置：

- [backend/server.js](/Users/owenfff/EchoNote/backend/server.js)

用途：

- 让 mobile 优先通过后端请求百炼
- 后续可在这里继续加限流、日志、观测

### 2. mobile AI 调用改成“优先走后端”

位置：

- [bailian-chat.ts](/Users/owenfff/EchoNote/mobile/src/services/bailian-chat.ts)

当前逻辑：

1. 如果有 `EXPO_PUBLIC_BACKEND_URL`，优先请求 `/api/ai/chat`
2. 如果后端不可用，并且本地配置了 `EXPO_PUBLIC_BAILIAN_API_KEY`，则 fallback 到直连

这是一条过渡期方案，适合当前 MVP 开发。

### 3. Render 蓝图已经补上

位置：

- [render.yaml](/Users/owenfff/EchoNote/render.yaml)

当前蓝图包含：

1. `echonote-parser` 私有服务
2. `echonote-api` 公网服务

## 推荐的下一步执行顺序

### Sprint 1：先把服务端跑到云上

1. 用 Render 部署 `render.yaml`
2. 设置 `BAILIAN_API_KEY`
3. 验证：
   - `/health`
   - `/api/fetch/web`
   - `/api/ai/chat`

### Sprint 2：让移动端切到线上服务

1. 配置 `EXPO_PUBLIC_BACKEND_URL`
2. 验证：
   - 链接导入
   - AI 助手
   - 语音转写后的 AI 微调

### Sprint 3：补齐 Demo 级体验

1. AI 助手预设动作更明确
2. 语音输入错误状态更稳
3. 首页和资料页给出更清晰的“试用入口”

## 当前阶段的成功标准

如果下面这条链路可稳定演示，MVP 就算真正立住：

1. 粘贴一个链接
2. 成功导入到 EchoNote
3. 点击 AI 助手得到有价值的整理结果
4. 用语音继续输入一段想法
5. 最终沉淀成笔记并同步到云端

## 注意事项

- 当前 `backend/` 的 notes CRUD 不是长期主路径
- 长期仍建议：
  - `Supabase` 管核心数据
  - `backend/` 管 AI / 抓取 / 转写等能力
- 当前的前端直连百炼仅作为开发 fallback，不能作为最终上架方案
