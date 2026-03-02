# EchoNote 测试计划文档

**版本：** v1.0  
**日期：** 2026-03-02  
**状态：** 准备中  
**负责人：** QA Agent  

---

## 1. 测试概述

### 1.1 测试目标
为 EchoNote 应用建立完整的浏览器自动化测试体系，确保核心功能稳定可靠。

### 1.2 测试范围
- ✅ 登录/认证流程
- ⏸️ 语音录制功能（等待开发完成）
- ⏸️ 笔记管理功能（等待开发完成）
- ⏸️ AI 处理功能（等待开发完成）

### 1.3 测试框架选择
**选用 Playwright**（而非 Puppeteer）

| 特性 | Playwright | Puppeteer |
|------|-----------|-----------|
| 浏览器支持 | Chromium, Firefox, WebKit | 仅 Chromium |
| 自动等待 | ✅ 内置智能等待 | ❌ 需手动处理 |
| 移动端模拟 | ✅ 完善 | ⚠️ 有限 |
| 并行测试 | ✅ 原生支持 | ❌ 需额外配置 |
| 稳定性 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| 社区活跃度 | 高 | 中等 |

**结论：** Playwright 功能更强大、稳定性更高，适合长期维护。

---

## 2. 测试环境配置

### 2.1 环境要求
```bash
# 安装 Playwright
npm init -y
npm install @playwright/test
npx playwright install

# 安装浏览器
npx playwright install chromium firefox webkit
```

### 2.2 目录结构
```
projects/EchoNote/tests/
├── e2e/                    # E2E 测试脚本
│   ├── login.spec.js       # 登录页测试
│   ├── recording.spec.js   # 录音功能测试（待开发）
│   └── notes.spec.js       # 笔记管理测试（待开发）
├── fixtures/               # 测试数据
│   └── users.json          # 测试用户数据
├── utils/                  # 测试工具
│   └── test-helpers.js     # 辅助函数
└── playwright.config.js    # Playwright 配置
```

### 2.3 配置文件
```javascript
// playwright.config.js
module.exports = {
  testDir: './e2e',
  timeout: 30000,
  expect: {
    timeout: 5000
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: '../reports/playwright-report' }],
    ['list']
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    // 桌面端
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    // 移动端
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
};
```

---

## 3. 测试用例详情

### 3.1 登录页测试 (login.spec.js)

#### TC-001: 页面加载测试
- **优先级：** P0
- **前置条件：** 应用已启动
- **测试步骤：**
  1. 访问登录页 `/login`
  2. 等待页面加载完成
- **预期结果：**
  - 页面标题正确显示
  - 邮箱输入框可见
  - 密码输入框可见
  - 登录按钮可见且可点击
  - 第三方登录按钮可见

#### TC-002: 表单输入测试
- **优先级：** P0
- **前置条件：** 在登录页
- **测试步骤：**
  1. 输入有效邮箱格式
  2. 输入密码
  3. 验证输入值
- **预期结果：**
  - 邮箱输入框正确接受输入
  - 密码输入框显示掩码字符
  - 邮箱格式验证正常工作

#### TC-003: 登录成功测试
- **优先级：** P0
- **前置条件：** 使用有效测试账号
- **测试步骤：**
  1. 输入有效邮箱
  2. 输入正确密码
  3. 点击登录按钮
- **预期结果：**
  - 显示加载状态
  - 登录成功
  - 重定向到主页 `/home`
  - 本地存储包含认证令牌

#### TC-004: 登录失败测试
- **优先级：** P0
- **前置条件：** 在登录页
- **测试步骤：**
  1. 输入有效邮箱
  2. 输入错误密码
  3. 点击登录按钮
- **预期结果：**
  - 显示错误提示信息
  - 密码输入框清空或保留（根据设计）
  - 页面不跳转

#### TC-005: 第三方登录测试 (Google)
- **优先级：** P1
- **前置条件：** 在登录页
- **测试步骤：**
  1. 点击 Google 登录按钮
  2. 验证跳转行为
- **预期结果：**
  - 按钮可见且可点击
  - 点击后跳转至 Google OAuth 页面（或弹出窗口）

#### TC-006: 第三方登录测试 (GitHub)
- **优先级：** P1
- **前置条件：** 在登录页
- **测试步骤：**
  1. 点击 GitHub 登录按钮
  2. 验证跳转行为
- **预期结果：**
  - 按钮可见且可点击
  - 点击后跳转至 GitHub OAuth 页面

#### TC-007: 响应式布局测试 (Mobile)
- **优先级：** P1
- **前置条件：** 使用移动设备视口
- **测试步骤：**
  1. 设置视口为 iPhone 12 尺寸 (390x844)
  2. 访问登录页
  3. 检查布局适配
- **预期结果：**
  - 表单垂直居中
  - 输入框宽度适配屏幕
  - 按钮宽度适配屏幕
  - 无水平滚动条

#### TC-008: 响应式布局测试 (Tablet)
- **优先级：** P2
- **前置条件：** 使用平板设备视口
- **测试步骤：**
  1. 设置视口为 iPad 尺寸 (768x1024)
  2. 检查布局适配
- **预期结果：**
  - 表单居中显示
  - 适当的边距和间距

#### TC-009: 深色模式切换测试
- **优先级：** P1
- **前置条件：** 在登录页
- **测试步骤：**
  1. 检查系统主题设置
  2. 验证页面主题适配
  3. 手动切换深色模式（如提供切换按钮）
- **预期结果：**
  - 系统自动检测主题偏好
  - 背景色变为深色 (#0F0F0F)
  - 文字颜色变为浅色 (#FAFAFA)
  - 输入框样式适配深色主题

#### TC-010: 表单验证测试
- **优先级：** P1
- **前置条件：** 在登录页
- **测试步骤：**
  1. 提交空表单
  2. 输入无效邮箱格式
  3. 输入过短密码
- **预期结果：**
  - 显示相应的验证错误信息
  - 表单不提交

---

### 3.2 后续测试计划（待开发完成后补充）

#### 录音功能测试
- 录音按钮触发测试
- 录音状态流转测试
- 录音保存测试
- 权限请求测试

#### 笔记管理测试
- 新建笔记测试
- 编辑笔记测试
- 删除笔记测试
- 搜索功能测试
- 标签筛选测试

#### AI 功能测试
- 自动摘要生成测试
- 标签自动分类测试
- 语义搜索测试

---

## 4. 测试数据

### 4.1 测试账号
```json
{
  "validUser": {
    "email": "test@echonote.app",
    "password": "TestPassword123!"
  },
  "invalidUser": {
    "email": "invalid@example.com",
    "password": "wrongpassword"
  },
  "malformedEmails": [
    "notanemail",
    "@nodomain.com",
    "spaces in@email.com",
    ""
  ]
}
```

---

## 5. CI/CD 集成

### 5.1 GitHub Actions 配置
```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: projects/EchoNote/reports/playwright-report/
```

---

## 6. 测试执行计划

### 6.1 执行时间表

| 阶段 | 时间 | 任务 | 状态 |
|------|------|------|------|
| Phase 1 | 2026-03-02 | 编写登录页测试脚本 | ✅ 已完成 |
| Phase 2 | 等待 Dev | 运行登录页测试 | ⏳ 等待开发完成 |
| Phase 3 | 等待 Dev | 编写录音功能测试 | ⏸️ 待开始 |
| Phase 4 | 等待 Dev | 编写笔记管理测试 | ⏸️ 待开始 |
| Phase 5 | CI 集成 | 集成到 CI/CD 流程 | ⏸️ 待开始 |

### 6.2 测试通过标准
- 所有 P0 测试用例必须通过
- P1 测试用例通过率 ≥ 90%
- 无阻塞性 Bug
- 性能指标：页面加载 < 3s

---

## 7. 风险评估

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| 开发延期 | 测试推迟 | 中 | 提前准备测试脚本 |
| 需求变更 | 测试重写 | 中 | 使用数据驱动测试 |
| 测试环境不稳定 | 假阳性 | 低 | 增加重试机制 |
| 第三方登录依赖 | 测试失败 | 中 | 使用 Mock |

---

## 8. 附录

### 8.1 参考文档
- [Playwright 官方文档](https://playwright.dev/)
- [EchoNote UI/UX 设计规范](../design/ui-spec.md)
- [EchoNote PRD](../requirements/prd.md)

### 8.2 测试脚本位置
- 登录页测试：`projects/EchoNote/tests/e2e/login.spec.js`

---

*本文档由 QA Agent 编写，等待 Dev 完成开发后开始执行测试。*
