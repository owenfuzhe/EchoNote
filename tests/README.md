# EchoNote E2E 测试

本项目使用 **Playwright** 进行端到端浏览器自动化测试。

## 快速开始

### 1. 安装依赖

```bash
# 进入测试目录
cd projects/EchoNote/tests

# 初始化项目
npm init -y

# 安装 Playwright
npm install @playwright/test

# 安装浏览器
npx playwright install
```

### 2. 运行测试

```bash
# 运行所有测试
npx playwright test

# 运行特定测试文件
npx playwright test login.spec.js

# 运行特定测试（按标题）
npx playwright test -g "登录成功"

# 运行特定浏览器
npx playwright test --project=chromium

#  headed 模式（显示浏览器窗口）
npx playwright test --headed

# 调试模式
npx playwright test --debug

# 生成并查看报告
npx playwright test
npx playwright show-report
```

### 3. 环境变量

```bash
# 设置测试目标 URL
export TEST_BASE_URL=http://localhost:3000

# CI 模式
export CI=true
```

## 测试结构

```
tests/
├── e2e/                    # E2E 测试脚本
│   ├── login.spec.js       # 登录页测试
│   ├── recording.spec.js   # 录音功能测试（待开发）
│   └── notes.spec.js       # 笔记管理测试（待开发）
├── fixtures/               # 测试数据
│   └── users.json          # 测试用户数据
├── utils/                  # 测试工具（待添加）
├── playwright.config.js    # Playwright 配置
└── README.md              # 本文档
```

## 测试覆盖

### 登录页测试 (login.spec.js)

| 测试类别 | 测试数量 | 说明 |
|---------|---------|------|
| 页面加载测试 | 6 | 标题、元素可见性、控制台错误 |
| 表单输入测试 | 6 | 邮箱格式、密码掩码、表单验证 |
| 登录成功/失败 | 5 | 有效/无效凭据、loading 状态 |
| 第三方登录 | 3 | Google、GitHub 按钮测试 |
| 响应式布局 | 7 | 多设备视口适配 |
| 深色模式 | 5 | 系统主题、手动切换、持久化 |
| 性能测试 | 2 | 加载时间、FCP |
| 安全测试 | 3 | 密码 autocomplete、错误信息 |

**总计: 37+ 测试用例**

## 浏览器支持

- ✅ Chromium (Chrome, Edge)
- ✅ Firefox
- ✅ WebKit (Safari)
- ✅ Mobile Chrome (Pixel 5)
- ✅ Mobile Safari (iPhone 12)
- ✅ Tablet (iPad)

## 最佳实践

1. **使用 data-testid**: 测试脚本依赖以下 data-testid:
   - `email-input` - 邮箱输入框
   - `password-input` - 密码输入框
   - `login-button` - 登录按钮
   - `google-login` - Google 登录按钮
   - `github-login` - GitHub 登录按钮
   - `theme-toggle` - 主题切换按钮
   - `error-message` - 错误信息提示
   - `loading-spinner` - 加载状态指示器

2. **测试隔离**: 每个测试独立运行，不依赖其他测试状态

3. **重试机制**: CI 环境下自动重试失败的测试

4. **报告**: 自动生成 HTML 报告和 JUnit XML

## 持续集成

GitHub Actions 配置示例:

```yaml
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

## 故障排除

### 浏览器安装失败

```bash
# 强制重新安装浏览器
npx playwright install --force

# 安装依赖（Linux）
npx playwright install-deps
```

### 测试超时

```bash
# 增加超时时间
npx playwright test --timeout=60000
```

### 调试测试

```bash
# 使用 Playwright Inspector
npx playwright test --debug

# 保留浏览器窗口
npx playwright test --headed --slowmo=1000
```

## 参考文档

- [Playwright 官方文档](https://playwright.dev/)
- [API 参考](https://playwright.dev/docs/api/class-playwright)
- [最佳实践](https://playwright.dev/docs/best-practices)

## 维护

如有问题，请联系 QA Agent 或查看测试计划文档。
