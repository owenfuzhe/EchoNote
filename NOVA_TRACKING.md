# EchoNote 重构追踪

**项目**: EchoNote AI-Native 笔记应用重构
**开始日期**: 2026-03-06
**当前阶段**: Phase 4 功能开发中
**状态**: 🟡 WORKING (关联发现开发中)

---

## 📋 当前状态总览

| 模块 | 状态 | 备注 |
|------|------|------|
| **Phase 1: 基础架构** | ✅ 已完成 | 3 Tabs + 捕获枢纽 |
| **Phase 2: 内容接入** | ✅ 已完成 | 微信文章抓取 |
| **Phase 3: AI 功能** | ✅ 已完成 | 对话/待办/标签/联网搜索/播客生成 |
| **Phase 3.5: UI 优化** | ✅ 已完成 | focus/active/hover/骨架屏/ARIA |
| **Phase 4: 核心功能** | 🔄 进行中 | 见下方详细任务 |
| **Phase 5: Context Graph** | ⏳ 待开始 | 决策痕迹系统 |
| **Phase 6: 测试验证** | ⏳ 待开始 | User Story 自动化测试 |

---

## 🎯 Phase 4: 核心功能开发 (当前)

### P0 - 必须完成

| # | 功能 | 状态 | 说明 |
|---|------|------|------|
| 1 | **晨间洞察** | ✅ 已完成 | 基础版本：根据待办数显示不同问候 |
| 2 | **最近记忆横向滚动** | ✅ 已完成 | 卡片优化：预览/标签/时间/滑动体验 |
| 3 | **动态流实时提取** | ✅ 已完成 | 灵感/待办/关联自动提取 |
| 4 | **主题聚类真实 AI** | ✅ 已完成 | Library 已集成 AI 聚类（qwen-max） |
| 5 | **语音捕获能量球** | ✅ 已完成 | 多模态菜单+VoiceCapture 组件 |
| 6 | **多模态捕获** | ✅ 已完成 | CaptureMenu + AIChat 界面重构（参考设计图） |

### P1 - 高优先级

| # | 功能 | 状态 | 说明 |
|---|------|------|------|
| 7 | **关联发现** | ✅ 已完成 | AI 发现笔记间语义重合（Explore 页面） |
| 8 | **归档沉淀** | ✅ 已完成 | 按时间/标签自动归档（Library 页面） |
| 9 | **执行代码技能** | ⏳ 待开发 | 沙箱运行 Python/JS |
| 10 | **推荐模板** | ✅ 已完成 | 根据笔记内容智能推荐 |

### P2 - 中优先级

| # | 功能 | 状态 | 说明 |
|---|------|------|------|
| 11 | **知识图谱可视化** | ⏳ 待开发 | D3.js 语义连接图 |

---

## 🧠 Phase 5: Context Graph 系统（新增）

基于 Foundation Capital 文章理念，构建决策痕迹系统。

### P1 - 高优先级

| # | 功能 | 状态 | 说明 |
|---|------|------|------|
| 1 | **笔记溯源面板** | ✅ 已完成 | 记录 AI 生成内容的完整上下文（DocumentView 集成） |
| 2 | **跨系统意图捕获** | ⏳ 待开发 | 10分钟时间窗自动聚合多模态输入 |

### P2 - 中优先级

| # | 功能 | 状态 | 说明 |
|---|------|------|------|
| 3 | **动态先例引擎** | ⏳ 待开发 | AI 学习用户偏好，越用越顺手 |
| 4 | **决策回放** | ⏳ 待开发 | 知识图谱时间轴滑块，回放想法演化 |

### Context Graph 数据模型

```typescript
// 决策痕迹
interface ContextTrace {
  id: string;
  noteId: string;
  trigger: 'manual' | 'scheduled' | 'ai_suggested';
  inputs: string[];
  prompt?: string;
  generatedAt: string;
  model: string;
}

// 用户先例偏好
interface UserPrecedent {
  id: string;
  category: 'format' | 'tone' | 'structure' | 'voice';
  pattern: string;
  frequency: number;
  lastUsed: string;
}

// 跨系统关联
interface CrossSourceLink {
  id: string;
  sourceIds: string[];
  type: 'time_window' | 'semantic' | 'manual';
  confidence: number;
  createdAt: string;
}
```

---

## 🧪 Phase 6: 系统性测试验证 (待开始)

### 测试覆盖

| 类型 | 状态 | 工具 |
|------|------|------|
| User Story 测试 | ✅ 已完成 | Playwright E2E 测试 |
| UI 回归测试 | ✅ 已完成 | 截图对比（测试失败时自动截图） |
| 可访问性测试 | ⏳ 待执行 | axe-core |
| 性能测试 | ⏳ 待执行 | Lighthouse |

---

## 📝 技术债务

1. **主题聚类**: Library 页面需要真实 AI 聚类（CC 开发中）
2. **知识图谱**: Explore 页面可视化实现
3. **代码执行技能**: 标记为 coming
4. **文件/图片/链接捕获**: App.tsx 中有 TODO
5. **Context Graph 存储**: 需要设计 Traces 表结构

---

## 🔄 当前进行中的任务

| 任务 | 负责人 | 状态 | 开始时间 | 预计完成 |
|------|--------|------|----------|----------|
| 多模态捕获 UI 重构 | @Bernard | ✅ DONE | 2026-03-07 | 已完成 |

---

## 📅 下一步行动（更新后）

### 当前任务
1. 🔄 等待 **主题聚类真实 AI** 完成（CC 开发中）

### Phase 4 剩余任务
2. ⏳ 实现 **语音捕获能量球** 动效
3. ⏳ 实现 **多模态捕获**（文件/图片/链接）
4. ⏳ 开发 **关联发现** 功能
5. ⏳ 实现 **归档沉淀** UI

### Phase 5 Context Graph（新）
6. ⏳ 开发 **笔记溯源面板**
7. ⏳ 实现 **跨系统意图捕获**
8. ⏳ 设计 **动态先例引擎**
9. ⏳ 实现 **决策回放** 时间轴

---

*最后更新: 2026-03-08 00:15*
