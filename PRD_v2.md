# EchoNote PRD v2.0 - AI-Native Second Brain

**版本**: v2.0  
**日期**: 2026-03-08  
**状态**: UI 重构中  

---

## 1. 核心哲学

**"Less is More" & "Intent-Driven"**

- 放弃传统层级文件系统（无文件夹、无侧边栏）
- 使用 **Context Graph**（节点=笔记/片段，边=语义关系/痕迹）
- 极端极简排版：纯白/半透明背景，零卡片边框，无重阴影
- 流体状态替代静态加载条（AI 处理时呼吸文字效果）

---

## 2. 全局组件：Pincer Hub（底部胶囊）

**唯一全局操作组件**，悬浮于所有屏幕之上，使用亚克力/玻璃拟态效果。

### 布局
药丸形容器 `[ 🏠  📚 | 🟣 ➕ ]`，锚定底部右侧/居中

### 左侧（导航）
- 滑动或点击切换两个屏幕：**Home** 和 **Library**
- 严格二选一，无其他导航

### 右侧（捕获与魔法）
- **点击**：立即打开无边框文本/语音输入浮层
- **长按（魔法召唤）**：展开上下文"技能"转盘
  - 技能：Web Search / Execute Code / Generate Podcast
  - 拖动手指选择技能，释放执行
- **逻辑**：技能不是独立页面，而是应用于用户输入意图的修饰器

---

## 3. Screen 1: Home（意图流与工作记忆）

**目的**：大脑的工作记忆。处理"我现在想做什么？"和"我刚才做了什么？"

### 顶部区域（全局输入）
- 巨大的无边框搜索/输入框：`"🔍 Search memory, or capture a new spark..."`
- 下方呼吸文字显示正在进行的 AI 任务（空闲时完全隐藏）
  - 例：`✨ AI is summarizing the DeepSeek concurrent architecture...`

### 区域：Recent Capture（水平滚动）
- 极简芯片显示最近 3-4 条原始输入
- 例：`🎙️ Voice Memo 09:15`, `📄 Web Clip`
- 提供输入已保存的即时反馈

### 区域：For You（高价值 AI 交付）
- **Podcast Remix Card**：当某主题存在 >5 条未读片段时自动触发
- **关键约束**：生成音乐/播客推荐时，**不使用 "Danceability > 0.5" 等人口统计偏见过滤器**，仅依赖笔记的语义上下文

### 区域：Inspiration（Context Graph 洞察）
- 基于识别模式的主动 AI 建议
- 例："You've saved 5 items about Swiss travel. Generate an itinerary?"

---

## 4. Screen 2: Library（长期 Context Graph）

**目的**：大脑的存储。使用语义聚合代替手动归档。绝对无汉堡菜单或侧边栏。

### 顶部区域
- 全局语义搜索栏

### 筛选层（智能芯片 / 透镜）
水平滚动的非互斥筛选芯片，动态重塑视图：

| 维度 | 选项 |
|------|------|
| State | `[🧩 Raw]`, `[🔄 Processing]`, `[🌳 Structured]` |
| Intent | `[💡 Insights]`, `[🛠️ Actionables]`, `[📄 References]` |
| Format | `[🎙️ Audio]`, `[🖼️ Images]` |

### 主内容区（AI 聚类）
- 渲染动态分组的"主题聚类"（如 `#AI Architecture`, `#2026 Q1 Finance`）
- 聚类通过向量相似度自动计算

### 核心操作：[ 🚀 Export Context ]
- 位于每个聚类或多选状态
- 生成压缩的 JSON/Markdown 载荷，包含 Context Graph 痕迹（意图、原始数据、AI 洞察）
- 用户可粘贴到外部 Agent（Claude/Kimi）

---

## 5. 后端逻辑：Trace Engine

### 无孤立数据
每个生成的摘要、播客或聚类文件夹**必须**附带 "Trace" JSON。

### Trace Schema
```json
{
  "trace_id": "uuid",
  "source_nodes": ["note_id_1", "note_id_2"],
  "prompt_overrides": "用户干预内容",
  "timestamp": "2026-03-08T10:00:00Z",
  "model": "qwen-max",
  "generation_params": {}
}
```

### 可行动先例
如果用户大量编辑 AI 输出（>30% 结构变更），将此偏好静默写回 Graph。未来生成应默认使用此先例。

---

## 6. 与 v1.0 的差异

| v1.0 | v2.0 |
|------|------|
| 3 Tabs (Home/Library/Explore) | 2 Screens (Home/Library) |
| 底部导航栏 | Pincer Hub 胶囊 |
| 技能中心页面 | 长按技能转盘 |
| 手动文件夹归档 | 语义自动聚类 |
| 静态加载条 | 呼吸文字效果 |
| 卡片边框阴影 | 纯白+留白层次 |

---

## 7. 开发优先级

### P0 - 核心架构
1. Pincer Hub 组件
2. Home / Library 路由切换
3. 无边框玻璃拟态主题

### P1 - 功能实现
4. Recent Capture 水平滚动
5. AI 呼吸状态指示器
6. 语义搜索栏
7. 智能筛选芯片
8. AI 主题聚类

### P2 - 高级功能
9. 技能转盘（长按）
10. Podcast Remix Card
11. Inspiration 洞察
12. Export Context 功能
13. Trace Engine 完整实现

---

*基于 ui_rebuild_0308.md 和原始需求.md 重构*
