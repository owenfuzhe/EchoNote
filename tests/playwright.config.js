// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * EchoNote Playwright 配置文件
 * 
 * 文档: https://playwright.dev/docs/test-configuration
 */
module.exports = defineConfig({
  // 测试目录
  testDir: './e2e',

  // 全局超时设置
  timeout: 30 * 1000,

  // 断言超时
  expect: {
    timeout: 5000,
  },

  // 并行运行测试
  fullyParallel: true,

  // CI 环境下禁止 test.only
  forbidOnly: !!process.env.CI,

  // CI 环境下重试次数
  retries: process.env.CI ? 2 : 0,

  // 并行工作进程数
  workers: process.env.CI ? 1 : undefined,

  // 测试报告器
  reporter: [
    ['html', { outputFolder: '../reports/playwright-report' }],
    ['list'],
    ['junit', { outputFile: '../reports/junit-results.xml' }],
  ],

  // 共享配置
  use: {
    // 基础 URL
    baseURL: process.env.TEST_BASE_URL || 'http://localhost:3000',

    // 收集 trace，仅在第一次重试时
    trace: 'on-first-retry',

    // 失败时截图
    screenshot: 'only-on-failure',

    // 失败时保留视频
    video: 'retain-on-failure',

    // 视口大小
    viewport: { width: 1280, height: 720 },

    // 启用 JavaScript
    javaScriptEnabled: true,
  },

  // 项目配置（多浏览器/多设备测试）
  projects: [
    // 桌面端 Chrome
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // 桌面端 Firefox
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    // 桌面端 Safari (WebKit)
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    // 移动端 Chrome
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },

    // 移动端 Safari
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },

    // 平板 iPad
    {
      name: 'Tablet',
      use: { ...devices['iPad (gen 7)'] },
    },
  ],

  // 本地开发服务器配置（可选）
  // webServer: {
  //   command: 'npm run dev',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
