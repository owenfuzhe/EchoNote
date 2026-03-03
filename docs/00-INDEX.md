# EchoNote 文档总索引

**项目：** EchoNote - AI 驱动的语音笔记应用  
**维护者：** Nova (PM)  
**最后更新：** 2026-03-03  

---

## 📚 文档结构

```
docs/
├── 00-INDEX.md                 ← 本文档（入口）
├── product-specs/              ← 产品规范
│   └── PRD.md                  ← 产品需求文档
├── exec-plans/                 ← 执行计划
│   └── ROADMAP.md              ← 项目路线图
├── tech/                       ← 技术文档
│   ├── ARCHITECTURE.md         ← 系统架构
│   ├── API.md                  ← API 文档
│   ├── TEST-PLAN.md            ← 测试计划
│   └── DEPLOYMENT.md           ← 部署文档
├── references/                 ← 参考资料
│   └── DESIGN-GUIDE.md         ← 设计规范入口
├── design/                     ← UI/UX 设计规范
│   ├── ui-spec.md              ← 【设计规范 SOT】
│   ├── home-page.md
│   ├── login-page.md
│   ├── note-detail-page.md
│   ├── recording-page.md
│   ├── notes-list.md
│   ├── settings-page.md
│   └── references/             ← Dribbble 参考截图
└── archive/                    ← 归档文档
```

---

## 📖 核心文档

| 分类 | 文档 | 路径 | 用途 |
|------|------|------|------|
| **产品规范** | PRD | [product-specs/PRD.md](./product-specs/PRD.md) | 产品需求、功能定义、验收标准 |
| **执行计划** | ROADMAP | [exec-plans/ROADMAP.md](./exec-plans/ROADMAP.md) | 里程碑、阶段规划、时间表 |
| **技术文档** | ARCHITECTURE | [tech/ARCHITECTURE.md](./tech/ARCHITECTURE.md) | 系统架构、数据库设计 |
| **技术文档** | API | [tech/API.md](./tech/API.md) | API 端点、请求/响应 |
| **技术文档** | TEST-PLAN | [tech/TEST-PLAN.md](./tech/TEST-PLAN.md) | 测试策略、用例 |
| **技术文档** | DEPLOYMENT | [tech/DEPLOYMENT.md](./tech/DEPLOYMENT.md) | 环境配置、CI/CD |
| **参考资料** | DESIGN-GUIDE | [references/DESIGN-GUIDE.md](./references/DESIGN-GUIDE.md) | 设计规范入口 |

---

## 📁 相关目录

```
EchoNote/
├── docs/              ← 核心文档（本目录）
│   ├── product-specs/
│   ├── exec-plans/
│   ├── tech/
│   ├── references/
│   ├── design/        ← UI/UX 设计规范
│   │   ├── ui-spec.md     ← 【设计规范 SOT】
│   │   ├── home-page.md
│   │   ├── login-page.md
│   │   ├── note-detail-page.md
│   │   ├── recording-page.md
│   │   ├── notes-list.md
│   │   ├── settings-page.md
│   │   └── references/    ← 设计参考截图
│   └── archive/
├── reports/           ← 测试报告、Bug报告
└── memory/            ← 项目记忆、决策记录
```

---

## 🗂️ 归档文档

旧版本文档已移至 [archive/](./archive/) 目录：
- v0.1 AI Assistant Roadmap
- v0.1 Product Roadmap
- v0.1 Test Reports
- Isolated Agents 配置（已废弃）
- Config Changelog
- Setup 指南

---

## 🔄 文档维护规范

### 目录命名
- `product-specs/` - 产品规范类文档
- `exec-plans/` - 执行计划、路线图
- `tech/` - 技术文档（架构、API、测试、部署）
- `references/` - 参考资料、设计规范
- `archive/` - 归档的历史文档

### 文件命名
- 使用大驼峰命名（PRD.md, ROADMAP.md）
- 或 kebab-case（design-guide.md）

### 状态标记
- ✅ 已完成
- 🚧 更新中
- 📝 待创建
- 📦 已归档

### 更新流程
1. 更新本文档中的链接
2. 在文档头部添加更新日志
3. 重大变更需通知团队成员

---

## 📞 文档问题反馈

如发现文档不一致或缺失，请 @Nova 及时更新。
