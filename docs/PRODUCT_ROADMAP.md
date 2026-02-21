# EchoNotes 产品规划与 Gap Analysis

## 一、产品定位

### 核心理念

**EchoNotes** 是一款帮助用户将碎片想法转化为系统知识，并推动实际落地的 AI 笔记工具。

```
碎片想法 → 系统知识 → 落地执行 → 持续扩展
    ↓           ↓           ↓           ↓
  记录灵感    构建体系    知行合一    扩展边界
```

**核心理念：知行合一**

| 阶段 | 目标 | AI 角色 |
|------|------|---------|
| **记录** | 捕捉碎片想法 | 灵感记录助手 |
| **整理** | 构建系统知识 | 知识架构师 |
| **执行** | 推动想法落地 | 行动教练 |
| **扩展** | 持续探索边界 | 成长伙伴 |

**差异化价值**：

```
传统笔记：记录 → 存储 → 遗忘
EchoNotes：记录 → 整理 → 执行 → 成长

不只是"知道"，更要"做到"
```

### 与竞品差异

| 维度 | NotebookLM | EchoNotes |
|------|-----------|-----------|
| **输入** | 完整文档/资料 | 碎片化想法 + 外部信息 |
| **场景** | 学习、研究 | 思考、成长、执行 |
| **AI 角色** | 文档解读专家 | 思维成长伙伴 + 行动教练 |
| **核心价值** | 理解已有内容 | 知行合一，推动落地 |
| **用户行为** | 被动消费资料 | 主动记录、执行、成长 |
| **最终目标** | 知识理解 | 知识 → 行动 → 改变 |

---

## 二、功能规划

### 模块一：碎片想法 → 系统知识

| # | 功能 | 描述 | 优先级 |
|---|------|------|--------|
| 1.1 | 想法聚类与主题发现 | 自动分析碎片笔记，发现隐藏主题和模式 | P0 |
| 1.2 | 知识脉络梳理 | 将零散想法串联成逻辑链，可视化演进过程 | P0 |
| 1.3 | 想法成熟度追踪 | 标记想法成熟度，提醒深化或输出 | P1 |

### 模块二：外部信息 → 知识扩展

| # | 功能 | 描述 | 优先级 |
|---|------|------|--------|
| 2.1 | 知识盲区探测 | 分析用户关注领域，发现知识体系空白点 | P0 |
| 2.2 | 信息关联推荐 | 保存链接后自动推荐相关内容，发现观点碰撞 | P1 |
| 2.3 | 趋势感知 | 监测关注领域新动态，推送个性化简报 | P2 |

### 模块三：知识体系可视化

| # | 功能 | 描述 | 优先级 |
|---|------|------|--------|
| 3.1 | 个人知识图谱 | 可视化展示整个知识体系，发现孤岛节点 | P1 |
| 3.2 | 思维时间线 | 按时间展示想法演化，看到主题如何深入 | P1 |

### 模块四：主动推动成长

| # | 功能 | 描述 | 优先级 |
|---|------|------|--------|
| 4.1 | 每日思考提示 | 基于笔记生成思考问题，帮助深化理解 | P0 |
| 4.2 | 定期知识回顾 | 每周/月生成知识总结，展示探索进展 | P1 |
| 4.3 | 输出建议 | 识别成熟想法，建议输出形式（文章/分享） | P2 |

### 模块五：想法落地执行 ⭐ 核心

| # | 功能 | 描述 | 优先级 |
|---|------|------|--------|
| 5.1 | 待办事项管理 | 从想法自动提取待办，跟踪执行状态 | ✅ 已有 |
| 5.2 | 执行提醒 | 定期提醒未完成的待办，推动落地 | P0 |
| 5.3 | 外部搜索 | 搜索外部信息，辅助决策和执行 | P0 |
| 5.4 | 工具集成 | 日历、Notion、飞书等工具连接 | P1 |
| 5.5 | Agent 执行 | 多步骤任务自动执行（OpenClaw/自建） | P2 |
| 5.6 | 执行复盘 | 记录执行结果，形成闭环 | P1 |

**执行闭环**：

```
想法 → 待办 → 执行 → 复盘 → 新想法
  ↑                              │
  └──────────────────────────────┘
```

---

## 三、Gap Analysis

### 已实现功能

| 功能 | 状态 | 实现位置 | 说明 |
|------|------|----------|------|
| ✅ 快速想法转笔记 | 完成 | `use-ai-assistant.ts` → `quickNote()` | 输入想法 → AI 扩展成结构化笔记 |
| ✅ 全局搜索（语义） | 完成 | `use-ai-assistant.ts` → `globalSearch()` | pgvector 向量搜索 + 关键词回退 |
| ✅ 笔记关联 | 完成 | `use-ai-assistant.ts` → `findRelatedNotebooks()` | 基于向量相似度找相关笔记 |
| ✅ 知识问答（RAG） | 完成 | `use-ai-assistant.ts` → `ragQuery()` | 基于笔记回答问题 |
| ✅ 待办提醒 | 完成 | `use-ai-assistant.ts` → `getTodos()` | 获取待办事项 |
| ✅ 每日回顾 | 完成 | `use-ai-assistant.ts` → `getDailyReview()` | 总结当天记录内容 |
| ✅ 智能标签 | 完成 | `use-ai-assistant.ts` → `smartTag()` | 自动/智能生成标签 |
| ✅ 每日播客 | 完成 | `use-ai-assistant.ts` → `generatePodcast()` | 生成播客脚本 |
| ✅ 灵感推荐 | 完成 | `use-ai-assistant.ts` → `getInspirations()` | 基于历史推荐 |
| ✅ 链接解析 | 完成 | `use-link-parser.ts` | Jina AI Reader 解析网页 |
| ✅ 链接嵌入浏览 | 完成 | `LinkCell.tsx`, `LinkBrowser.tsx` | 内置 WebView 展示 |
| ✅ AI 分析 | 完成 | `NotebookEditor.tsx` → `handleAIProcess()` | 分析笔记内容 |
| ✅ 语音录入 | 完成 | `use-voice.ts` | Web Speech API + GLM ASR |
| ✅ 外部搜索 | 完成 | `tavily.ts`, `use-ai-assistant.ts` | Tavily API 搜索互联网 |
| ✅ 关联卡片 | 完成 | `notebook/[id].tsx` | 笔记详情页展示相关笔记 |
| ✅ 主题地图 | 完成 | `topic-map.tsx` | 轻量级知识图谱 |
| ✅ 每日思考提示 | 完成 | `use-ai-assistant.ts` → `getThinkingPrompt()` | 生成思考问题 |
| ✅ 想法聚类与主题发现 | 完成 | `use-ai-assistant.ts` → `clusterNotes()` | 基于向量相似度聚类 |
| ✅ 知识盲区探测 | 完成 | `use-ai-assistant.ts` → `detectKnowledgeGaps()` | 分析知识覆盖度 |
| ✅ 思维时间线 | 完成 | `use-ai-assistant.ts` → `getTimeline()` | 追踪想法演化 |
| ✅ 定期知识回顾 | 完成 | `use-ai-assistant.ts` → `getPeriodicReview()` | 每日/周/月回顾 |

### 待实现功能

| 功能 | 状态 | 优先级 | 复杂度 | Gap 分析 |
|------|------|--------|--------|----------|
| 🟡 想法成熟度追踪 | 未开始 | P1 | 中 | 需要成熟度评估算法 + 状态管理 |
| 🟡 信息关联推荐 | 未开始 | P1 | 中 | 需要链接内容分析 + 观点对比 |
|  趋势感知 | 未开始 | P2 | 高 | 需要外部数据源 + 爬虫 |
| 🟢 输出建议 | 未开始 | P2 | 中 | 需要成熟度评估 + 输出模板 |
| 🔵 执行提醒 | 未开始 | P1 | 中 | 定期提醒未完成待办 |
| 🔵 工具集成 | 未开始 | P1 | 高 | 日历、Notion、飞书等 |
| 🔵 Agent 执行 | 未开始 | P2 | 高 | OpenClaw/自建 Agent |

---

## 四、详细 Gap 分析

### 1. 想法聚类与主题发现

**当前状态**: ✅ 已实现

**实现位置**: `use-ai-assistant.ts` → `clusterNotes()`

**功能**:
- 基于向量相似度对笔记进行聚类
- 发现隐藏的主题和模式
- 识别孤立笔记
- AI 生成聚类主题描述和合并建议

// 实现步骤:
// 1. 获取所有笔记的 embedding
// 2. 使用 K-means 或 DBSCAN 聚类
// 3. LLM 为每个聚类生成主题描述
// 4. 生成合并建议
```

**技术依赖**:
- 现有 embedding 可复用
- 需要前端聚类算法库（如 ml-kmeans）
- 或后端 Supabase 函数实现

---

### 2. 思维时间线

**当前状态**: ✅ 已实现

**实现位置**: `use-ai-assistant.ts` → `getTimeline()`

**功能**:
- 按时间展示想法演化
- 主题趋势分析（上升/稳定/下降）
- 时间线事件展示
- AI 洞察生成

---

### 3. 知识盲区探测

**当前状态**: ✅ 已实现

**实现位置**: `use-ai-assistant.ts` → `detectKnowledgeGaps()`

**功能**:
- 分析用户知识体系覆盖度
- 发现知识盲区和空白点
- 提供优先级排序的改进建议
- 给出具体的行动建议

---

### 4. 定期知识回顾

**当前状态**: ✅ 已实现

**实现位置**: `use-ai-assistant.ts` → `getPeriodicReview()`

**功能**:
- 支持每日/每周/每月回顾
- 统计新笔记、已完成待办、待处理待办、新链接
- 关键主题分析
- 亮点和建议生成
- 下一步关注方向

---

### 5. 每日思考提示

**当前状态**: ✅ 已实现

**实现位置**: `use-ai-assistant.ts` → `getThinkingPrompt()`

**功能**:
- 基于笔记生成思考问题
- 提供思考背景和提示
- 帮助深化理解

---

### 6. 想法成熟度追踪

**当前状态**: ❌ 未实现

**Gap**:
- 没有成熟度评估
- 没有状态追踪
- 没有遗忘提醒

**实现方案**:
```typescript
// 新增字段: notebooks.maturity_score
// 新增函数: assessMaturity()
interface MaturityAssessment {
  notebook_id: string
  maturity_score: number   // 0-100
  stage: 'seed' | 'exploring' | 'developing' | 'mature' | 'ready_to_output'
  factors: {
    content_depth: number
    connections: number
    updates: number
    time_span: number
  }
  suggestions: string[]
}

// 成熟度计算:
// - 内容深度: 笔记字数、结构化程度
// - 关联度: 被引用次数、相关笔记数
// - 更新频率: 最近更新时间
// - 时间跨度: 首次创建到最后更新的天数
```

---

### 6. 个人知识图谱

**当前状态**: ❌ 未实现

**Gap**:
- 没有图谱可视化
- 没有节点关系展示

**实现方案**:
```typescript
// 新增组件: KnowledgeGraph.tsx
interface GraphNode {
  id: string
  label: string
  type: 'notebook' | 'topic' | 'tag'
  size: number  // 基于笔记数量/关联度
  color: string
}

interface GraphEdge {
  source: string
  target: string
  weight: number  // 关联强度
  type: 'similar' | 'reference' | 'tag'
}

// 技术选型:
// - React Native: react-native-graph / d3-force
// - Web: D3.js / Cytoscape.js
// - 数据: 基于现有 embedding 相似度 + 标签关联
```

---

### 7. 思维时间线

**当前状态**: ❌ 未实现

**Gap**:
- 没有时间轴视图
- 没有演进分析

**实现方案**:
```typescript
// 新增组件: ThinkingTimeline.tsx
interface TimelineEvent {
  date: string
  notebook_id: string
  title: string
  content_preview: string
  importance: number
  connections: string[]  // 连接到其他事件
}

// 可复用:
// - 现有笔记创建时间
// - 现有 embedding 相似度
// - 新增: 重要性评分（LLM）
```

---

### 8. 定期知识回顾

**当前状态**: ⚠️ 部分实现

**已有**: `getDailyReview()` - 每日回顾

**Gap**:
- 没有周度/月度回顾
- 没有趋势分析

**实现方案**:
```typescript
// 新增函数: getPeriodReview()
interface PeriodReview {
  period: 'week' | 'month'
  summary: string
  new_topics: string[]       // 新探索的主题
  deepened_topics: string[]  // 深化的主题
  abandoned_topics: string[] // 被遗忘的主题
  knowledge_growth: {
    new_notes: number
    new_connections: number
    topics_explored: number
  }
  highlights: Array<{
    notebook_id: string
    title: string
    reason: string
  }>
  next_period_suggestions: string[]
}
```

---

### 9. 信息关联推荐

**当前状态**: ⚠️ 部分实现

**已有**: `getInspirations()` - 灵感推荐

**Gap**:
- 没有链接内容与笔记的交叉分析
- 没有观点碰撞检测

**实现方案**:
```typescript
// 增强函数: analyzeLinkRelation()
interface LinkAnalysis {
  link_url: string
  link_title: string
  related_notes: Array<{
    notebook_id: string
    relation: 'support' | 'contradict' | 'extend' | 'question'
    explanation: string
  }>
  new_perspectives: string[]
  suggested_actions: string[]
}
```

---

### 10. 输出建议

**当前状态**: ❌ 未实现

**Gap**:
- 没有成熟度评估触发
- 没有输出模板

**实现方案**:
```typescript
// 新增函数: suggestOutput()
interface OutputSuggestion {
  notebook_id: string
  maturity_score: number
  suggested_format: 'article' | 'share' | 'presentation' | 'product'
  reasoning: string
  outline?: string  // AI 生成的输出大纲
  similar_outputs?: string[]  // 类似内容的参考
}
```

---

## 五、实现路线图

### Phase 1: 核心差异化（2 周）

```
Week 1:
├── 想法聚类与主题发现
│   ├── 实现 clusterNotes() 函数
│   ├── 添加聚类结果 UI
│   └── 添加合并建议交互
│
└── 每日思考提示
    ├── 实现 generateThinkingPrompt() 函数
    ├── 添加首页提示卡片
    └── 添加推送机制

Week 2:
├── 知识脉络梳理
│   ├── 实现 getIdeaEvolution() 函数
│   ├── 创建时间轴组件
│   └── 添加演进可视化
│
└── 知识盲区探测
    ├── 实现 detectKnowledgeGaps() 函数
    ├── 添加盲区展示 UI
    └── 添加补充建议交互
```

### Phase 2: 增强体验（2 周）

```
Week 3:
├── 想法成熟度追踪
│   ├── 添加成熟度字段
│   ├── 实现评估算法
│   └── 添加状态展示
│
└── 定期知识回顾
    ├── 实现 getPeriodReview() 函数
    ├── 添加周报/月报 UI
    └── 添加趋势图表

Week 4:
├── 个人知识图谱
│   ├── 集成图谱可视化库
│   ├── 构建图谱数据
│   └── 添加交互功能
│
└── 思维时间线
    ├── 创建时间线组件
    ├── 添加演进分析
    └── 添加重要性评分
```

### Phase 3: 扩展边界（2 周）

```
Week 5:
├── 信息关联推荐增强
│   ├── 实现链接内容分析
│   ├── 添加观点碰撞检测
│   └── 添加关联推荐 UI
│
└── 输出建议
    ├── 实现成熟度触发
    ├── 添加输出模板
    └── 添加大纲生成

Week 6:
└── 趋势感知
    ├── 集成外部数据源
    ├── 实现内容匹配
    └── 添加简报推送
```

---

## 六、技术依赖

### 新增依赖

| 功能 | 依赖库 | 用途 |
|------|--------|------|
| 知识图谱 | `react-native-graph` / `d3.js` | 图可视化 |
| 聚类算法 | `ml-kmeans` / 后端函数 | 笔记聚类 |
| 时间轴 | 自定义组件 | 时间线展示 |
| 推送通知 | `expo-notifications` | 思考提示推送 |

### 数据库变更

```sql
-- 想法成熟度
ALTER TABLE notebooks ADD COLUMN IF NOT EXISTS maturity_score float DEFAULT 0;
ALTER TABLE notebooks ADD COLUMN IF NOT EXISTS maturity_stage text DEFAULT 'seed';

-- 主题聚类结果缓存
CREATE TABLE IF NOT EXISTS topic_clusters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  theme text NOT NULL,
  description text,
  notebook_ids uuid[] NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 思考提示历史
CREATE TABLE IF NOT EXISTS thinking_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  question text NOT NULL,
  context text,
  related_notebook_id uuid REFERENCES notebooks(id),
  shown_at timestamptz DEFAULT now(),
  responded_at timestamptz
);
```

---

## 七、总结

### 核心差异点

EchoNotes 的独特价值在于：

1. **主动发现** - 不是等用户搜索，而是主动发现用户不知道自己知道的知识
2. **成长导向** - 关注想法的演进和成熟，而非静态存储
3. **边界扩展** - 帮助用户发现知识盲区，主动扩展认知边界

### 下一步行动

1. **立即开始**: 想法聚类 + 每日思考提示（最高优先级，差异化明显）
2. **短期规划**: 知识脉络 + 盲区探测（核心功能完善）
3. **中期目标**: 知识图谱 + 定期回顾（体验提升）

---

*文档更新: 2026-02-20*

---

## 八、商业化规划（后续阶段）

### 商业模式演进

```
阶段 1（当前-1万用户）：纯工具订阅
阶段 2（1万-10万用户）：订阅 + 模板市场
阶段 3（10万+用户）：知识生态 + 企业版
```

### 阶段 1：纯工具订阅

| 版本 | 定价 | 功能 |
|------|------|------|
| 免费版 | $0 | 基础功能，AI 分析 10次/天 |
| Plus | $9.9/月 | 无限 AI 分析，外部搜索，完整知识图谱 |
| Pro | $19.9/月 | Plus + API 访问 + 团队协作 |

### 阶段 2：订阅 + 模板市场

| 功能 | 描述 | 收入模式 |
|------|------|----------|
| 公开笔记分享 | 用户可选择分享笔记 | 增加曝光 |
| 模板市场 | 创作者出售笔记模板 | 平台抽成 20% |
| 原生推荐 | 推荐相关书籍、工具 | CPS 分成 |

### 阶段 3：知识生态

| 功能 | 描述 | 收入模式 |
|------|------|----------|
| 知识专栏 | 用户创建付费专栏 | 平台抽成 15% |
| 付费课程 | 系统化知识课程 | 平台抽成 20% |
| 企业版 | 团队协作 + 私有部署 | $49/用户/月 |

### 功能分层

| 功能 | 免费版 | Plus | Pro |
|------|--------|------|-----|
| 笔记存储 | ✅ 无限 | ✅ | ✅ |
| AI 分析 | ✅ 10次/天 | ✅ 无限 | ✅ |
| 外部搜索 | ❌ | ✅ 100次/天 | ✅ 无限 |
| 知识图谱 | ❌ 基础 | ✅ 完整 | ✅ |
| API 访问 | ❌ | ❌ | ✅ |
| 团队协作 | ❌ | ❌ | ✅ |

### 商业化时间线

```
Month 1-3: 产品打磨，免费版上线
Month 4-6: 收集用户反馈，优化核心功能
Month 7-8: 开发付费功能框架
Month 9-12: 正式商业化，上线订阅
Year 2: 模板市场 + 社区功能
Year 3: 知识生态 + 企业版
```

### 支付集成

- **移动端**：RevenueCat + Stripe
- **Web 端**：Stripe
- **中国用户**：微信支付/支付宝（后续）

### 关键取舍

| 取舍 | 决策 | 原因 |
|------|------|------|
| 私密 vs 公开 | 私密优先，公开可选 | 保护用户信任 |
| 工具 vs 社区 | 工具优先，社区辅助 | 核心价值在工具 |
| 订阅 vs 广告 | 订阅为主，广告谨慎 | 用户体验优先 |

---

## 九、执行能力规划（想法落地）

### 执行能力分层

| 层级 | 能力 | 实现方式 | 时间规划 |
|------|------|----------|----------|
| **L1** | 单步任务 | 直接 API 调用 | ✅ 已有 |
| **L2** | 工具集成 | MCP | Phase 1-2 |
| **L3** | 多步任务 | 轻量 Agent | Phase 3 |
| **L4** | 自主执行 | OpenClaw/自建 Agent | 后续 |

### MCP vs Agent 定位

```
MCP = 工具连接协议（提供"手"）
Agent = 自主执行能力（提供"脑"）

组合使用：
用户指令 → Agent 规划 → MCP 调用工具 → 执行 → 返回结果
```

### Phase 1-2：MCP 集成

| 工具 | 功能 | 状态 |
|------|------|------|
| Tavily Search | 外部搜索 | 🔲 待集成 |
| Fetch | 网页抓取 | 🔲 待集成 |
| 日历工具 | 日程管理 | 🔲 待开发 |
| 待办工具 | 任务创建 | ✅ 已有 |

### Phase 3：轻量 Agent

```
能力：
├── 任务分解
├── 步骤规划
├── 工具调用
└── 结果整合

场景示例：
用户："帮我查一下最新的 AI 新闻，总结要点，创建待办跟进"
Agent：
  1. 调用搜索工具获取新闻
  2. LLM 总结要点
  3. 创建待办事项
  4. 返回结果
```

### 后续：OpenClaw 集成

```
目标：支持复杂任务执行

实现：
├── 用户自行部署 OpenClaw
├── EchoNotes 提供 API 对接
├── 任务状态同步
└── 执行结果回传

配置界面：
┌─────────────────────────────────────┐
│  🔧 执行引擎配置                      │
├─────────────────────────────────────┤
│  OpenClaw 端点地址：                  │
│  [https://your-openclaw.example.com] │
│                                     │
│  API Key（可选）：                    │
│  [••••••••••••••••]                  │
│                                     │
│  [测试连接] [保存]                    │
└─────────────────────────────────────┘
```

### 自建 Agent（长期）

```
架构：
┌─────────────────────────────────────┐
│           Agent 引擎                 │
├─────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐   │
│  │ 任务规划器  │  │ 执行引擎    │   │
│  └─────────────┘  └─────────────┘   │
│  ┌─────────────┐  ┌─────────────┐   │
│  │ 工具库      │  │ 状态管理    │   │
│  └─────────────┘  └─────────────┘   │
└─────────────────────────────────────┘
           ↓
    MCP 工具 / 内置工具
```
