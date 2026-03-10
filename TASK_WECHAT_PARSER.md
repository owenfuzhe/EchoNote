# 微信公众号文章解析引擎开发任务

## 背景
微信公众号有反爬机制，直接 HTTP 请求返回 "Parameter error"，无法获取正文。需要建设一套解析引擎，让用户能够在 EchoNote 中丝滑地阅读相关内容。

## 调研结论

### 解决方案对比

| 方案 | 原理 | 成本 | 难度 | 效果 |
|------|------|------|------|------|
| **Jina AI** | 代理解析 | 免费额度+付费 | 低 | 可能仍被拦截 |
| **Firecrawl** | Headless 浏览器 | 免费500credits+付费 | 低 | 较好 |
| **自建 Headless** | Puppeteer/Playwright | 服务器成本 | 中 | **最好** |
| **企业微信 API** | 官方接口 | 高 | 高 | 稳定但贵 |

### 推荐方案
**自建 Headless 浏览器方案**（参考 GitHub 开源项目 Zlatanwic/Wechat-Read-MCP-in-Rust）

**技术栈**: Puppeteer + Node.js + Turndown

**核心逻辑**:
1. 使用 Headless Chrome 访问公众号文章链接
2. 等待页面 JS 渲染完成
3. 使用 CSS 选择器提取标题、作者、发布时间、正文
4. 使用 Turndown 将 HTML 转换为 Markdown
5. 返回结构化数据

## 开发任务

### 1. 创建新模块
路径: `packages/web-parser/`

已创建基础文件:
- `package.json` - 已安装 puppeteer, cheerio, turndown
- `tsconfig.json` - TypeScript 配置
- `src/wechat-parser.ts` - 核心解析逻辑（草稿）
- `src/index.ts` - 入口文件

### 2. 需要完善的功能

#### A. 核心解析器 (`src/wechat-parser.ts`)
已实现基础框架，需要:
- [ ] 优化 CSS 选择器，确保能正确提取微信文章元素
- [ ] 添加更多反爬绕过策略（User-Agent轮换、请求间隔）
- [ ] 完善 HTML 到 Markdown 的转换（处理微信特有的标签）
- [ ] 添加图片下载和本地缓存功能
- [ ] 添加重试机制

#### B. API 服务
创建 `src/server.ts`:
```typescript
POST /api/parser/wechat
Body: { url: string }
Response: { 
  success: boolean;
  title?: string;
  author?: string;
  publishTime?: string;
  content?: string; // markdown
  coverImage?: string;
  error?: string;
}
```

#### C. 集成到 EchoNote
修改 `app/(app)/create.tsx`:
- [ ] 替换现有的简单 fetch 逻辑
- [ ] 调用新的解析 API
- [ ] 添加加载状态
- [ ] 处理解析错误

### 3. 技术要求

- 使用 Puppeteer 的 headless 模式
- 支持微信文章 URL 格式: `https://mp.weixin.qq.com/s/...`
- 提取字段: 标题、作者、发布时间、正文(Markdown)、封面图
- 错误处理: 链接无效、文章已删除、需要登录、反爬拦截

### 4. 测试用例

测试链接:
- 有效文章: 任意公开公众号文章
- 无效链接: 格式错误的 URL
- 已删除: 被删除的文章链接

### 5. 完成标准

- [ ] `packages/web-parser/` 模块可独立运行
- [ ] API 可正确解析微信公众号文章
- [ ] 集成到 EchoNote 的链接创建流程
- [ ] 用户输入链接后能正确显示文章内容
- [ ] 更新 NOVA_TRACKING.md 中的 BUG-002 状态

## 参考资源

- GitHub: https://github.com/Zlatanwic/Wechat-Read-MCP-in-Rust
- Puppeteer Docs: https://pptr.dev/
- Turndown: https://github.com/domchristie/turndown

## 注意事项

1. 微信反爬机制会更新，需要预留维护空间
2. 请求频率控制，避免 IP 被封
3. 图片需要下载到本地或转存，避免外链失效
4. 考虑添加缓存机制，避免重复解析

---

**负责人**: @Bernard (CC)
**优先级**: P1
**状态**: 进行中
