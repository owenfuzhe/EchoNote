# EchoNote - Isolated Agent 团队架构

**版本：** v1.0  
**日期：** 2026-03-01  
**架构：** Isolated Agent + 工作流引擎  

---

## 🏗️ 架构设计

### 核心原则
1. **完全隔离**：每个 Agent 独立 workspace，不共享文件
2. **消息驱动**：通过 session_send 显式通信
3. **工作流引擎**：状态机驱动的任务流转
4. **契约协作**：严格的输入/输出契约

### 与 Sub-Agent 的区别

| 特性 | Sub-Agent | Isolated Agent |
|------|-----------|----------------|
| Workspace | 共享 | 完全隔离 |
| 通信方式 | 文件系统 | 消息传递 (session_send) |
| 生命周期 | 单次任务 | 长期存在 |
| 协调方式 | 直接 spawn | 工作流引擎调度 |
| 适合场景 | 短期任务 (<30min) | 复杂模块开发 |
| 状态管理 | 隐式 | 显式状态机 |

---

## 👥 Agent 角色定义

### 1. 产品经理 (Product Manager) - Nova
**职责：**
- 需求分析和拆解
- 工作流编排
- Agent 间协调
- 最终验收

**配置：**
- Model: `kimi-coding/k2p5`
- Mode: `session` (持久化)
- Workspace: 主 workspace

---

### 2. UI/UX 设计师 (Designer)
**职责：**
- 交互设计
- 视觉规范
- 原型输出

**配置：**
- Model: `kimi-coding/k2p5` (支持图片理解)
- Mode: `session`
- Workspace: 隔离
- 输入契约：PRD 文档内容
- 输出契约：设计规范 Markdown

**启动命令：**
```javascript
sessions_spawn({
  runtime: "acp",
  agentId: "designer",
  mode: "session",
  label: "echonote-designer",
  task: "你是一个UI/UX设计师，负责EchoNote语音笔记应用的设计工作。\n\n## 工作流程\n1. 等待我发送需求文档\n2. 完成设计后，通过 message 发送设计稿给我\n3. 根据反馈迭代\n\n## 输出格式\n- 设计规范：Markdown格式\n- 包含：颜色、字体、组件、页面流程"
})
```

---

### 3. 前端开发工程师 (Frontend Dev)
**职责：**
- 前端界面实现
- 组件开发
- 响应式适配

**配置：**
- Model: `qwen3-coder-next` (代码特化)
- Mode: `session`
- Workspace: 隔离
- 输入契约：设计规范 + API 文档
- 输出契约：代码 + 部署说明

**启动命令：**
```javascript
sessions_spawn({
  runtime: "acp",
  agentId: "frontend",
  mode: "session",
  label: "echonote-frontend",
  task: "你是一个前端开发工程师，负责EchoNote的前端实现。\n\n## 技术栈\n- Next.js 14 + App Router\n- TypeScript\n- Tailwind CSS\n- shadcn/ui\n\n## 工作流程\n1. 等待我发送设计规范和API文档\n2. 实现前端代码\n3. 通过 message 发送代码给我\n4. 根据反馈修复\n\n## 输出格式\n- 完整项目代码\n- README.md (运行说明)"
})
```

---

### 4. 后端开发工程师 (Backend Dev)
**职责：**
- API 开发
- 数据库设计
- 业务逻辑实现

**配置：**
- Model: `zai/glm-5` (编程SOTA)
- Mode: `session`
- Workspace: 隔离
- 输入契约：PRD 需求
- 输出契约：API 文档 + 代码

**启动命令：**
```javascript
sessions_spawn({
  runtime: "acp",
  agentId: "backend",
  mode: "session",
  label: "echonote-backend",
  task: "你是一个后端开发工程师，负责EchoNote的后端实现。\n\n## 技术栈\n- Python FastAPI\n- PostgreSQL\n- Redis\n- Docker\n\n## 工作流程\n1. 等待我发送PRD需求\n2. 设计API和数据库\n3. 实现后端代码\n4. 通过 message 发送代码和API文档\n\n## 输出格式\n- 完整项目代码\n- API文档 (OpenAPI/Swagger格式)\n- 数据库Schema"
})
```

---

### 5. 测试工程师 (QA Engineer)
**职责：**
- 测试用例设计
- 功能测试
- Bug 报告

**配置：**
- Model: `kimi-coding/k2p5`
- Mode: `session` (按需启动)
- Workspace: 隔离

---

## 🔄 工作流引擎设计

### 状态机定义

```
[INIT] 
  → spawn_designer
  → [DESIGN_WAITING]

[DESIGN_WAITING]
  → designer_completes
  → [DESIGN_REVIEW]

[DESIGN_REVIEW]
  → approved
  → spawn_frontend + spawn_backend
  → [DEV_PARALLEL]
  → rejected
  → [DESIGN_WAITING]

[DEV_PARALLEL]
  → frontend_completes && backend_completes
  → [INTEGRATION]

[INTEGRATION]
  → integrated
  → spawn_qa
  → [QA_WAITING]

[QA_WAITING]
  → qa_passes
  → [DONE]
  → qa_fails
  → [DEV_PARALLEL]

[DONE]
  → deploy
```

### 任务流转协议

**消息格式：**
```json
{
  "type": "task_assignment|deliverable|feedback|status_update",
  "from": "agent_name",
  "to": "agent_name|broadcast",
  "taskId": "T1",
  "payload": {
    "content": "...",
    "artifacts": ["file_content_or_url"],
    "status": "in_progress|completed|blocked"
  },
  "timestamp": "2026-03-01T20:00:00Z"
}
```

---

## 📋 工作流程示例

### Phase 1: 设计阶段

**Step 1:** 我 (PM) 发送 PRD 给 Designer
```javascript
sessions_send({
  sessionKey: "agent:main:echonote-designer",
  message: "【任务分配】设计 EchoNote UI/UX\n\n需求：\n- 语音笔记应用\n- 3个核心页面：录音页、笔记详情页、笔记列表页\n- 极简风格，3秒启动录音\n\n参考PRD：\n{{prd_content}}\n\n交付物：\n1. 设计规范文档 (Markdown)\n2. 组件清单\n3. 页面流程说明"
})
```

**Step 2:** Designer 完成后发送给我
```javascript
// Designer 发送给我
message: "【设计完成】EchoNote UI/UX 设计规范\n\n{{design_content}}\n\n请 review，如有修改请反馈。"
```

**Step 3:** 我 review 后反馈或批准

---

### Phase 2: 开发阶段（并行）

**Step 4:** 批准后，我同时发送给 Frontend 和 Backend

**给 Frontend:**
```javascript
sessions_send({
  sessionKey: "agent:main:echonote-frontend",
  message: "【任务分配】前端开发\n\n设计规范：\n{{design_content}}\n\nAPI文档：\n{{api_content}}\n\n交付物：\n1. Next.js 项目代码\n2. README.md (运行说明)"
})
```

**给 Backend:**
```javascript
sessions_send({
  sessionKey: "agent:main:echonote-backend", 
  message: "【任务分配】后端开发\n\n需求：\n{{prd_content}}\n\n交付物：\n1. FastAPI 项目代码\n2. API文档 (OpenAPI格式)\n3. 数据库Schema"
})
```

---

## 🛠️ 实施步骤

### Step 1: 创建 Agent 配置模板
为每个角色创建 `~/.openclaw/agents/{role}/` 配置

### Step 2: 启动 Agent 团队
按顺序 spawn 所有 agents

### Step 3: 初始化工作流
发送初始任务给 Designer

### Step 4: 监控和协调
定期检查各 agent 状态，推进工作流

---

## ⚠️ 风险与应对

| 风险 | 影响 | 应对策略 |
|------|------|---------|
| Agent 无响应 | 阻塞流程 | 设置超时，自动重启 |
| 输出质量差 | 返工 | 明确验收标准，增加 review 环节 |
| 沟通开销大 | 效率低 | 批量消息，异步协作 |
| Context 爆炸 | 性能问题 | 定期总结，清理历史 |

---

## 🚀 下一步行动

1. **确认 Agent 清单** - 5个角色是否需要调整？
2. **创建 Agent 配置** - 为每个角色创建配置文件
3. **启动团队** - Spawn 所有 Isolated Agents
4. **开始 EchoNote 工作流** - 从设计阶段开始

**你确认这个架构吗？还是需要调整角色定义？** ⚡
