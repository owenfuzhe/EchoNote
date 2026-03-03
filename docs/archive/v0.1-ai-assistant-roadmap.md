# EchoNotes AI 助手功能规划

## 功能列表

### 核心功能（用户提出）

| # | 功能 | 描述 |
|---|------|------|
| 1 | 全局搜索 | 搜索某个想法/主题/信息，跨笔记检索 |
| 2 | 笔记关联 | 依据某个主题寻找不同笔记之间的关联 |
| 3 | 待办提醒 | 提醒最新的待办事项 |
| 4 | Todo执行状态 | 跟进todo的执行状态（后期集成OpenClaw） |
| 5 | 快速想法转笔记 | 快速输入某个想法，交给AI形成详细笔记 |

### 补充功能

| # | 功能 | 描述 |
|---|------|------|
| 6 | 每日回顾 | AI 总结今天记录的内容 |
| 7 | 知识问答 | 基于你的笔记回答问题（RAG） |
| 8 | 智能标签 | 自动给笔记打标签分类 |
| 9 | 灵感推荐 | 基于历史推荐相关阅读/行动 |
| 10 | 语音交互 | 语音提问、语音快速记录 |
| 11 | 周期报告 | 周/月度知识总结报告 |
| 12 | 每日播客 | 将未读文章/未推进想法整理成15分钟播客 |

---

## 优先级排序

### Phase 1 - MVP（预计 1 周）

| 优先级 | 功能 | 价值 | 复杂度 | 理由 |
|--------|------|------|--------|------|
| P0 | 快速想法转笔记 | ⭐⭐⭐⭐⭐ | 中 | 高频场景，用户粘性强 |
| P0 | 全局搜索 | ⭐⭐⭐⭐⭐ | 中 | 核心功能，解决信息找回痛点 |
| P1 | 待办提醒 | ⭐⭐⭐⭐ | 低 | 实用性强，实现简单 |

### Phase 2 - 核心增强（预计 1-2 周）

| 优先级 | 功能 | 价值 | 复杂度 | 理由 |
|--------|------|------|--------|------|
| P1 | 笔记关联 | ⭐⭐⭐⭐⭐ | 高 | 差异化亮点，知识图谱雏形 |
| P1 | 知识问答 | ⭐⭐⭐⭐⭐ | 高 | RAG能力，让笔记"活"起来 |
| P1 | 每日回顾 | ⭐⭐⭐⭐ | 低 | 培养用户习惯，增加粘性 |
| P2 | 智能标签 | ⭐⭐⭐⭐ | 中 | 自动化分类，提升效率 |

### Phase 3 - 高级功能（预计 2 周）

| 优先级 | 功能 | 价值 | 复杂度 | 理由 |
|--------|------|------|--------|------|
| P2 | 每日播客 | ⭐⭐⭐⭐⭐ | 高 | 差异化杀手功能，信息消化新方式 |
| P2 | 语音交互 | ⭐⭐⭐⭐ | 中 | 提升输入效率，移动端友好 |
| P2 | 灵感推荐 | ⭐⭐⭐ | 中 | 主动式AI，增加惊喜感 |
| P3 | 周期报告 | ⭐⭐⭐ | 低 | 长期价值，定期回顾 |

### Phase 4 - 生态集成（待定）

| 优先级 | 功能 | 价值 | 复杂度 | 理由 |
|--------|------|------|--------|------|
| P3 | Todo执行状态 | ⭐⭐⭐⭐ | 高 | 需要外部集成（OpenClaw），依赖第三方 |
| P3 | 外部工具集成 | ⭐⭐⭐ | 高 | 日历、Notion、飞书等 |

---

## 开发进展

### Phase 1 实现状态

| 功能 | 状态 | 完成日期 |
|------|------|----------|
| AI 助手入口 UI | ✅ 已完成 | 2026-02-20 |
| 快速想法转笔记 | ✅ 已完成 | 2026-02-20 |
| 全局搜索（关键词） | ✅ 已完成 | 2026-02-20 |
| 待办提醒 | ✅ 已完成 | 2026-02-20 |

### Phase 2 实现状态

| 功能 | 状态 | 完成日期 |
|------|------|----------|
| 语义搜索（pgvector） | ✅ 已完成 | 2026-02-20 |
| 笔记关联 | ✅ 已完成 | 2026-02-20 |
| 知识问答（RAG） | ✅ 已完成 | 2026-02-20 |
| 每日回顾 | ✅ 已完成 | 2026-02-20 |

### Phase 3 实现状态

| 功能 | 状态 | 完成日期 |
|------|------|----------|
| 智能标签 | ✅ 已完成 | 2026-02-20 |
| 每日播客 | ✅ 已完成 | 2026-02-20 |
| 灵感推荐 | ✅ 已完成 | 2026-02-20 |
| 周期报告 | ⏳ 待实现 | - |

---

## 实现细节

### 1. AI 助手入口 UI

**文件**: `src/components/AIAssistantModal.tsx`

**入口方式**:
1. 顶部搜索栏（点击触发）
2. 右上角 🤖 按钮
3. 底部悬浮按钮

**UI 结构**:
```
┌─────────────────────────────────────┐
│  AI 助手                       ✕   │
├─────────────────────────────────────┤
│  🏠首页 🔍搜索 🧠问答 📋待办 💡速记 📅回顾 │  ← Tab 导航
├─────────────────────────────────────┤
│                                     │
│  [当前 Tab 内容]                    │
│                                     │
└─────────────────────────────────────┘
```

**技术实现**:
- React Native Modal 组件
- Animated API 实现滑入动画
- KeyboardAvoidingView 处理键盘遮挡
- 六个 Tab: home / search / rag / todos / quick / daily

---

### 2. 快速想法转笔记

**文件**: `src/hooks/use-ai-assistant.ts`

**函数**: `quickNote(idea: string)`

**流程**:
```
用户输入想法
    ↓
LLM API 扩展内容
    ↓
解析 JSON 结果
    ↓
创建 Notebook
    ↓
添加 Text Cell（笔记内容）
    ↓
添加 Todo Cell（待办事项）
    ↓
生成 Embedding 并存储
    ↓
返回结果 + notebookId
```

**Prompt 设计**:
```
你是 EchoNotes AI 助手。用户会给你一个简短的想法或灵感，
请将其扩展成一份结构化的笔记。

## 输出格式 (JSON)
{
  "title": "笔记标题（简洁有力）",
  "content": "扩展后的笔记内容（2-4段）",
  "tags": ["标签1", "标签2"],
  "action_items": [
    { "text": "待办事项", "priority": "high|medium|low" }
  ],
  "related_topics": ["可能相关的主题"]
}
```

**数据库操作**:
```typescript
// 1. 创建笔记本
const notebookId = await createNotebook(result.title, '#6366F1')

// 2. 添加文本内容
const cell = await addCell(notebookId, 'text')
updateCell(cell.id, { content: result.content })
await persistCell({ ...cell, content: result.content })

// 3. 添加待办事项（如果有）
if (result.action_items.length > 0) {
  const todoCell = await addCell(notebookId, 'todo')
  updateCell(todoCell.id, { 
    title: '待办事项',
    items: result.action_items.map(...)
  })
  await persistCell({ ...todoCell, items: [...] })
}

// 4. 生成 Embedding
const contentForEmbedding = `${result.title}\n${result.content}`
await generateAndStoreEmbedding(cell.id, contentForEmbedding)
```

---

### 3. 全局搜索（语义搜索）

**文件**: `src/hooks/use-ai-assistant.ts`

**函数**: `globalSearch(query: string)`

**实现（语义搜索 + 关键词回退）**:
```typescript
// 1. 生成查询向量
const queryEmbedding = await provider.embed(query)

// 2. 向量搜索
const { data: vectorResults, error } = await supabase.rpc('match_cells', {
  query_embedding: queryEmbedding,
  match_threshold: 0.5,
  match_count: 10
})

// 3. 如果向量搜索失败，回退到关键词搜索
if (error) {
  const { data: cells } = await supabase
    .from('cells')
    .select('id, notebook_id, type, content, notebooks(id, title)')
    .or(`content.ilike.%${query}%`)
    .limit(20)
}

// 4. LLM 总结结果
const raw = await provider.chat(messages, { 
  systemPrompt: SEARCH_SYSTEM, 
  temperature: 0.3 
})
```

**数据库函数** (`supabase/migrations/20260220_add_embedding.sql`):
```sql
-- 启用 pgvector 扩展
CREATE EXTENSION IF NOT EXISTS vector;

-- 添加 embedding 列
ALTER TABLE cells ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- 创建向量索引
CREATE INDEX IF NOT EXISTS cells_embedding_idx ON cells 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- 语义搜索函数
CREATE OR REPLACE FUNCTION match_cells(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  notebook_id uuid,
  type text,
  content jsonb,
  similarity float
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id, c.notebook_id, c.type, c.content,
    1 - (c.embedding <=> query_embedding) as similarity
  FROM cells c
  WHERE 1 - (c.embedding <=> query_embedding) > match_threshold
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

---

### 4. 笔记关联

**文件**: `src/hooks/use-ai-assistant.ts`

**函数**: `findRelatedNotebooks(notebookId: string, query?: string)`

**实现**:
```typescript
// 1. 获取当前笔记的 embedding 或生成查询 embedding
let queryEmbedding: number[]
if (query) {
  queryEmbedding = await provider.embed(query)
} else {
  const { data: cells } = await supabase
    .from('cells')
    .select('embedding')
    .eq('notebook_id', notebookId)
    .not('embedding', 'is', null)
    .limit(1)
  queryEmbedding = JSON.parse(cells[0].embedding)
}

// 2. 调用数据库函数查找相似笔记
const { data: results } = await supabase.rpc('find_related_notebooks', {
  query_embedding: queryEmbedding,
  exclude_notebook_id: notebookId,
  match_threshold: 0.6,
  match_count: 5
})

return results || []
```

**数据库函数**:
```sql
CREATE OR REPLACE FUNCTION find_related_notebooks(
  query_embedding vector(1536),
  exclude_notebook_id uuid DEFAULT NULL,
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  notebook_id uuid,
  notebook_title text,
  similarity float,
  matched_content jsonb
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.notebook_id,
    n.title as notebook_title,
    MAX(1 - (c.embedding <=> query_embedding)) as similarity,
    jsonb_agg(c.content) as matched_content
  FROM cells c
  JOIN notebooks n ON n.id = c.notebook_id
  WHERE 
    c.embedding IS NOT NULL
    AND 1 - (c.embedding <=> query_embedding) > match_threshold
    AND (exclude_notebook_id IS NULL OR c.notebook_id != exclude_notebook_id)
  GROUP BY c.notebook_id, n.title
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;
```

---

### 5. 知识问答（RAG）

**文件**: `src/hooks/use-ai-assistant.ts`

**函数**: `ragQuery(question: string)`

**流程**:
```
用户提问
    ↓
生成问题 Embedding
    ↓
向量搜索相关笔记
    ↓
构建上下文（笔记内容）
    ↓
LLM 基于上下文回答
    ↓
返回答案 + 来源引用
```

**实现**:
```typescript
// 1. 生成问题 embedding
const queryEmbedding = await provider.embed(question)

// 2. 向量搜索相关笔记
const { data: vectorResults } = await supabase.rpc('match_cells', {
  query_embedding: queryEmbedding,
  match_threshold: 0.5,
  match_count: 5
})

// 3. 构建上下文
const contextText = vectorResults.map((r, i) => 
  `[${r.notebook_title}]\n${r.content}`
).join('\n\n---\n\n')

// 4. LLM 回答
const messages = [{
  role: 'user' as const,
  content: `用户问题: ${question}\n\n笔记内容:\n${contextText}`
}]

const answer = await provider.chat(messages, { 
  systemPrompt: RAG_SYSTEM, 
  temperature: 0.3 
})

return {
  answer,
  sources: context.map(c => ({
    notebook_id: c.notebook_id,
    notebook_title: c.notebook_title
  }))
}
```

**Prompt 设计**:
```
你是 EchoNotes AI 知识助手。基于用户笔记内容回答问题。

## 规则
1. 只使用提供的笔记内容回答
2. 如果笔记中没有相关信息，诚实告知
3. 引用来源时标注 [笔记名]
4. 回答要简洁但有深度
```

---

### 6. 每日回顾

**文件**: `src/hooks/use-ai-assistant.ts`

**函数**: `getDailyReview()`

**实现**:
```typescript
// 1. 获取今天的笔记
const today = new Date()
today.setHours(0, 0, 0, 0)

const { data: cells } = await supabase
  .from('cells')
  .select('id, notebook_id, type, content, created_at, notebooks(id, title)')
  .gte('created_at', today.toISOString())
  .order('created_at', { ascending: false })

// 2. 构建上下文
const context = cells.map((c) => ({
  notebook_title: c.notebooks?.title,
  type: c.type,
  content: JSON.stringify(c.content)
}))

// 3. LLM 总结
const messages = [{
  role: 'user' as const,
  content: `今天记录的内容:\n${context.map((c) => 
    `【${c.notebook_title}】(${c.type})\n${c.content}`
  ).join('\n\n')}`
}]

const raw = await provider.chat(messages, { 
  systemPrompt: DAILY_REVIEW_SYSTEM, 
  temperature: 0.5 
})
```

**Prompt 设计**:
```
你是 EchoNotes AI 助手。总结用户今天记录的内容。

## 输出格式 (JSON)
{
  "summary": "今日总结（2-3句话）",
  "key_topics": ["主题1", "主题2"],
  "highlights": [
    { "content": "重要内容", "notebook_title": "来源笔记" }
  ],
  "suggestions": ["明天可以继续的方向"],
  "pending_todos": ["待办提醒"]
}

## 要求
1. 突出最重要的内容
2. 发现内容之间的联系
3. 给出行动建议
```

---

### 7. 批量索引

**文件**: `src/hooks/use-ai-assistant.ts`

**函数**: `indexAllCells()`

**用途**: 为现有笔记生成 embedding

**实现**:
```typescript
// 1. 获取没有 embedding 的 cells
const { data: cells } = await supabase
  .from('cells')
  .select('id, content')
  .is('embedding', null)
  .limit(100)

// 2. 逐个生成 embedding
for (const cell of cells) {
  const text = JSON.stringify(cell.content)
  if (text.length < 10) continue
  
  const embedding = await provider.embed(text)
  
  await supabase
    .from('cells')
    .update({ embedding: JSON.stringify(embedding) })
    .eq('id', cell.id)
}
```

---

## 文件结构

```
src/
├── components/
│   └── AIAssistantModal.tsx    # AI 助手 UI 组件（6个Tab）
├── hooks/
│   ├── use-ai-assistant.ts     # AI 助手核心逻辑
│   └── use-llm.ts              # LLM API 封装
├── providers/
│   └── llm/                    # LLM 提供者实现
│       ├── types.ts            # 类型定义
│       ├── openai-compatible.ts # OpenAI 兼容实现（含 embed）
│       └── index.ts            # 工厂函数
└── store/
    └── notebook-store.ts       # 笔记状态管理

supabase/
└── migrations/
    └── 20260220_add_embedding.sql  # pgvector 迁移

app/
└── (app)/
    └── index.tsx               # 首页（集成 AI 助手入口）
```

---

## 待办事项 (TODO)

### 高优先级

- [x] **语义搜索实现** ✅ 2026-02-20
  - 启用 Supabase pgvector 扩展
  - 添加 embedding 列到 cells 表
  - 实现文本向量化函数
  - 替换 ILIKE 查询为向量搜索

- [x] **笔记关联功能** ✅ 2026-02-20
  - 实现相似笔记检索
  - 构建笔记关系图谱
  - UI 展示关联关系

- [x] **知识问答（RAG）** ✅ 2026-02-20
  - 实现检索增强生成
  - 上下文注入 LLM
  - 引用来源展示

### 中优先级

- [x] **每日回顾** ✅ 2026-02-20
  - 自动总结当天内容
  - 推送通知提醒

- [x] **智能标签** ✅ 2026-02-20
  - 自动提取关键词
  - 笔记分类
  - 标签云展示
  - 按标签搜索

- [x] **每日播客** ✅ 2026-02-20
  - 生成播客脚本
  - 章节划分
  - 关键要点提取
  - 行动提醒

- [x] **灵感推荐** ✅ 2026-02-20
  - 基于历史推荐
  - 发现笔记关联
  - 热门主题识别

### 低优先级

- [ ] **周期报告**
  - 周度/月度总结
  - 知识趋势分析

- [ ] **自建解析服务器**
  - 替代 Jina AI Reader
  - 避免速率限制

- [ ] **TTS 集成**
  - 播客语音播放
  - 多语言支持

---

## 部署说明

### 1. 数据库迁移

在 Supabase Dashboard 的 SQL Editor 中执行：

```sql
-- 启用 pgvector 扩展
CREATE EXTENSION IF NOT EXISTS vector;

-- 添加 embedding 列
ALTER TABLE cells ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- 创建向量索引
CREATE INDEX IF NOT EXISTS cells_embedding_idx ON cells 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- 创建搜索函数
-- 见 supabase/migrations/20260220_add_embedding.sql
```

### 2. 环境变量

确保 `.env` 文件包含：

```
GLM_API_KEY=your_glm_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. 初始化索引

首次部署后，运行批量索引：

```typescript
// 在应用中调用
const { indexAllCells } = useAIAssistant()
await indexAllCells()
```

---

## 更新日志

- 2026-02-20: 初始规划文档创建
- 2026-02-20: Phase 1 完成（AI 助手入口、快速想法转笔记、全局搜索、待办提醒）
- 2026-02-20: Phase 2 完成（语义搜索、笔记关联、知识问答、每日回顾）
- 2026-02-20: Phase 3 完成（智能标签、每日播客、灵感推荐）

---

## Phase 3 实现细节

### 8. 智能标签

**文件**: 
- `src/hooks/use-ai-assistant.ts` - 函数: `smartTag`, `autoTagNotebook`, `getAllTags`, `searchByTag`
- `supabase/migrations/20260220_add_tags.sql` - 数据库迁移

**数据库结构**:
```sql
-- 添加标签列
ALTER TABLE notebooks ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- 创建标签索引
CREATE INDEX IF NOT EXISTS notebooks_tags_idx ON notebooks USING GIN (tags);
```

**功能**:
1. **自动标签**: 基于关键词匹配自动生成标签
2. **智能标签**: 使用 LLM 分析内容生成更精准的标签
3. **标签云**: 展示所有标签及使用次数
4. **标签搜索**: 点击标签快速筛选笔记

**Prompt 设计**:
```
你是 EchoNotes 智能标签助手。分析笔记内容，提取最相关的标签。

## 输出格式 (JSON)
{
  "tags": ["标签1", "标签2", "标签3"],
  "category": "分类名称",
  "confidence": 0.85
}

## 标签规则
1. 选择 2-5 个最相关的标签
2. 标签应该简洁（1-4个字）
3. 优先使用已有标签
4. 只返回有效 JSON
```

---

### 9. 每日播客

**文件**: `src/hooks/use-ai-assistant.ts`

**函数**: `generatePodcast()`

**流程**:
```
获取最近3天的笔记
    ↓
获取未完成的待办
    ↓
构建内容上下文
    ↓
LLM 生成播客脚本
    ↓
返回结构化结果
```

**输出结构**:
```typescript
interface PodcastResult {
  title: string              // 播客标题
  duration_minutes: number   // 总时长
  sections: PodcastSection[] // 章节列表
  key_points: string[]       // 关键要点
  action_reminders: string[] // 行动提醒
}

interface PodcastSection {
  type: 'intro' | 'content' | 'summary'
  title: string
  content: string           // 口语化内容
  duration_seconds: number
}
```

**Prompt 设计**:
```
你是 EchoNotes 每日播客主持人。将用户未读的文章和未推进的想法整理成一份15分钟的播客脚本。

## 要求
1. 内容要口语化，像在和朋友聊天
2. 每个章节控制在 1-3 分钟
3. 突出重要信息和行动建议
4. 总时长约 15 分钟
```

---

### 10. 灵感推荐

**文件**: `src/hooks/use-ai-assistant.ts`

**函数**: `getInspirations()`

**功能**:
1. **个性化推荐**: 基于历史笔记推荐相关阅读/行动
2. **热门主题**: 识别用户关注的核心主题
3. **关联发现**: 发现笔记之间的隐藏联系

**输出结构**:
```typescript
interface InspirationResult {
  recommendations: Recommendation[]
  trending_topics: string[]
  connections: string[]
}

interface Recommendation {
  type: 'read' | 'action' | 'explore'
  title: string
  description: string
  related_notebook_id?: string
  priority: 'high' | 'medium' | 'low'
}
```

**Prompt 设计**:
```
你是 EchoNotes 灵感推荐助手。基于用户的历史笔记，推荐相关的阅读和行动建议。

## 要求
1. 推荐要基于用户已有的内容
2. 发现笔记之间的隐藏关联
3. 给出具体的行动建议
```

---

## UI Tab 结构

AI 助手目前包含 9 个 Tab：

| Tab | 图标 | 功能 |
|-----|------|------|
| 首页 | 🏠 | 功能概览 |
| 搜索 | 🔍 | 全局搜索 |
| 问答 | 🧠 | 知识问答（RAG） |
| 标签 | 🏷️ | 智能标签云 |
| 待办 | 📋 | 待办提醒 |
| 速记 | 💡 | 快速想法转笔记 |
| 回顾 | 📅 | 每日回顾 |
| 播客 | 🎙️ | 每日播客 |
| 灵感 | ✨ | 灵感推荐 |
