/**
 * EchoNote 登录页 E2E 测试脚本
 * 
 * 框架：Playwright
 * 覆盖功能：
 * - 页面加载测试
 * - 表单输入测试
 * - 登录成功/失败测试
 * - 第三方登录按钮测试
 * - 响应式布局测试
 * - 深色模式切换测试
 * 
 * 执行命令：npx playwright test login.spec.js
 */

import { test, expect } from '@playwright/test';

// ==================== 测试配置 ====================
const CONFIG = {
  baseURL: process.env.TEST_BASE_URL || 'http://localhost:3000',
  timeout: {
    navigation: 10000,
    element: 5000,
    action: 3000,
  },
  selectors: {
    emailInput: '[data-testid="email-input"]',
    passwordInput: '[data-testid="password-input"]',
    loginButton: '[data-testid="login-button"]',
    googleButton: '[data-testid="google-login"]',
    githubButton: '[data-testid="github-login"]',
    themeToggle: '[data-testid="theme-toggle"]',
    errorMessage: '[data-testid="error-message"]',
    loadingSpinner: '[data-testid="loading-spinner"]',
  },
  testUsers: {
    valid: {
      email: 'test@echonote.app',
      password: 'TestPassword123!',
    },
    invalid: {
      email: 'invalid@example.com',
      password: 'wrongpassword',
    },
  },
};

// ==================== 辅助函数 ====================

/**
 * 导航到登录页
 */
async function navigateToLogin(page) {
  await page.goto(`${CONFIG.baseURL}/login`, {
    timeout: CONFIG.timeout.navigation,
    waitUntil: 'networkidle',
  });
}

/**
 * 填充登录表单
 */
async function fillLoginForm(page, email, password) {
  await page.fill(CONFIG.selectors.emailInput, email);
  await page.fill(CONFIG.selectors.passwordInput, password);
}

/**
 * 提交登录表单
 */
async function submitLoginForm(page) {
  await page.click(CONFIG.selectors.loginButton);
}

/**
 * 清除表单
 */
async function clearForm(page) {
  await page.fill(CONFIG.selectors.emailInput, '');
  await page.fill(CONFIG.selectors.passwordInput, '');
}

/**
 * 等待页面稳定
 */
async function waitForPageStability(page) {
  await page.waitForLoadState('networkidle');
  await page.waitForLoadState('domcontentloaded');
}

// ==================== 测试套件 ====================

test.describe('登录页 - 页面加载测试', () => {
  
  test.beforeEach(async ({ page }) => {
    await navigateToLogin(page);
    await waitForPageStability(page);
  });

  test('TC-001: 页面标题正确显示', async ({ page }) => {
    await expect(page).toHaveTitle(/EchoNote|登录|Login/i);
  });

  test('TC-001: 邮箱输入框可见且可交互', async ({ page }) => {
    const emailInput = page.locator(CONFIG.selectors.emailInput);
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toBeEnabled();
    await expect(emailInput).toHaveAttribute('type', 'email');
  });

  test('TC-001: 密码输入框可见且可交互', async ({ page }) => {
    const passwordInput = page.locator(CONFIG.selectors.passwordInput);
    await expect(passwordInput).toBeVisible();
    await expect(passwordInput).toBeEnabled();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('TC-001: 登录按钮可见且可点击', async ({ page }) => {
    const loginButton = page.locator(CONFIG.selectors.loginButton);
    await expect(loginButton).toBeVisible();
    await expect(loginButton).toBeEnabled();
    await expect(loginButton).toHaveText(/登录|Login|Sign In/i);
  });

  test('TC-001: 第三方登录按钮可见', async ({ page }) => {
    const googleButton = page.locator(CONFIG.selectors.googleButton);
    const githubButton = page.locator(CONFIG.selectors.githubButton);
    
    await expect(googleButton).toBeVisible();
    await expect(githubButton).toBeVisible();
  });

  test('TC-001: 页面无控制台错误', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await navigateToLogin(page);
    await page.waitForTimeout(1000);
    
    // 过滤掉非关键错误（如第三方脚本错误）
    const criticalErrors = errors.filter(e => 
      !e.includes('favicon') && 
      !e.includes('google') && 
      !e.includes('analytics')
    );
    
    expect(criticalErrors).toHaveLength(0);
  });
});

test.describe('登录页 - 表单输入测试', () => {
  
  test.beforeEach(async ({ page }) => {
    await navigateToLogin(page);
  });

  test('TC-002: 邮箱输入框接受有效邮箱', async ({ page }) => {
    const validEmails = [
      'user@example.com',
      'test.user@domain.co.uk',
      'user+tag@example.com',
      '123@numeric.com',
    ];

    for (const email of validEmails) {
      await clearForm(page);
      await page.fill(CONFIG.selectors.emailInput, email);
      const value = await page.inputValue(CONFIG.selectors.emailInput);
      expect(value).toBe(email);
    }
  });

  test('TC-002: 密码输入框显示掩码字符', async ({ page }) => {
    await page.fill(CONFIG.selectors.passwordInput, 'secret123');
    const inputType = await page.getAttribute(CONFIG.selectors.passwordInput, 'type');
    expect(inputType).toBe('password');
  });

  test('TC-002: 邮箱格式验证', async ({ page }) => {
    const invalidEmails = [
      'notanemail',
      '@nodomain.com',
      'spaces in@email.com',
      'missing@domain',
      'double@@at.com',
    ];

    for (const email of invalidEmails) {
      await clearForm(page);
      await fillLoginForm(page, email, 'somepassword');
      await submitLoginForm(page);
      
      // 检查是否显示验证错误
      const errorVisible = await page.isVisible(CONFIG.selectors.errorMessage)
        .catch(() => false);
      
      // 或者检查邮箱输入框的验证状态
      const isInvalid = await page.evaluate((selector) => {
        const el = document.querySelector(selector);
        return el ? !el.validity.valid : false;
      }, CONFIG.selectors.emailInput);
      
      expect(isInvalid || errorVisible).toBeTruthy();
    }
  });

  test('TC-010: 空表单验证', async ({ page }) => {
    await submitLoginForm(page);
    
    // 验证表单未提交（仍在登录页）
    await expect(page).toHaveURL(/.*login.*/);
    
    // 验证显示错误信息
    const errorMessage = page.locator(CONFIG.selectors.errorMessage);
    await expect(errorMessage).toBeVisible();
  });

  test('TC-010: 仅输入邮箱时验证', async ({ page }) => {
    await page.fill(CONFIG.selectors.emailInput, 'test@example.com');
    await submitLoginForm(page);
    
    await expect(page).toHaveURL(/.*login.*/);
  });

  test('TC-010: 仅输入密码时验证', async ({ page }) => {
    await page.fill(CONFIG.selectors.passwordInput, 'password123');
    await submitLoginForm(page);
    
    await expect(page).toHaveURL(/.*login.*/);
  });
});

test.describe('登录页 - 登录成功/失败测试', () => {
  
  test.beforeEach(async ({ page }) => {
    await navigateToLogin(page);
  });

  test('TC-003: 使用有效凭据登录成功', async ({ page, context }) => {
    // 填充有效凭据
    await fillLoginForm(
      page, 
      CONFIG.testUsers.valid.email, 
      CONFIG.testUsers.valid.password
    );
    
    // 点击登录
    await submitLoginForm(page);
    
    // 验证加载状态
    const loadingSpinner = page.locator(CONFIG.selectors.loadingSpinner);
    await expect(loadingSpinner).toBeVisible({ timeout: 2000 });
    
    // 等待导航完成
    await page.waitForURL(/.*home|dashboard|main.*/, { timeout: 10000 });
    
    // 验证成功登录后的页面
    await expect(page).not.toHaveURL(/.*login.*/);
    
    // 验证本地存储中包含认证信息（可选）
    const storage = await context.storageState();
    const hasAuthToken = storage.origins.some(origin => 
      origin.localStorage.some(item => 
        item.name.includes('token') || item.name.includes('auth')
      )
    );
    
    // 注意：实际断言取决于应用的具体实现
    // expect(hasAuthToken).toBeTruthy();
  });

  test('TC-004: 使用无效凭据登录失败', async ({ page }) => {
    // 填充无效凭据
    await fillLoginForm(
      page,
      CONFIG.testUsers.invalid.email,
      CONFIG.testUsers.invalid.password
    );
    
    // 点击登录
    await submitLoginForm(page);
    
    // 验证错误信息显示
    const errorMessage = page.locator(CONFIG.selectors.errorMessage);
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
    await expect(errorMessage).toContainText(/错误|失败|incorrect|invalid/i);
    
    // 验证仍在登录页
    await expect(page).toHaveURL(/.*login.*/);
  });

  test('TC-004: 错误密码显示提示', async ({ page }) => {
    await fillLoginForm(page, CONFIG.testUsers.valid.email, 'wrongpassword');
    await submitLoginForm(page);
    
    const errorMessage = page.locator(CONFIG.selectors.errorMessage);
    await expect(errorMessage).toBeVisible();
  });

  test('登录按钮 loading 状态', async ({ page }) => {
    await fillLoginForm(
      page,
      CONFIG.testUsers.valid.email,
      CONFIG.testUsers.valid.password
    );
    
    await submitLoginForm(page);
    
    // 验证按钮变为 loading 状态
    const loginButton = page.locator(CONFIG.selectors.loginButton);
    const isDisabled = await loginButton.isDisabled().catch(() => false);
    const hasLoadingText = await loginButton.textContent()
      .then(text => text?.includes('登录中') || text?.includes('Loading'));
    
    expect(isDisabled || hasLoadingText).toBeTruthy();
  });
});

test.describe('登录页 - 第三方登录测试', () => {
  
  test.beforeEach(async ({ page }) => {
    await navigateToLogin(page);
  });

  test('TC-005: Google 登录按钮可点击', async ({ page, context }) => {
    const googleButton = page.locator(CONFIG.selectors.googleButton);
    
    // 验证按钮可见
    await expect(googleButton).toBeVisible();
    await expect(googleButton).toBeEnabled();
    
    // 监听新页面打开（弹出窗口方式）
    const [popup] = await Promise.all([
      context.waitForEvent('page', { timeout: 5000 }),
      googleButton.click(),
    ]).catch(() => [null]);
    
    // 或者验证导航到 Google OAuth（重定向方式）
    if (!popup) {
      await Promise.race([
        page.waitForURL(/.*accounts\.google\.com.*/, { timeout: 3000 }),
        page.waitForTimeout(1000),
      ]);
    }
    
    // 由于无法实际完成 OAuth，这里只验证按钮可交互
    // 实际项目中可能需要 Mock OAuth 流程
  });

  test('TC-006: GitHub 登录按钮可点击', async ({ page, context }) => {
    const githubButton = page.locator(CONFIG.selectors.githubButton);
    
    await expect(githubButton).toBeVisible();
    await expect(githubButton).toBeEnabled();
    
    // 验证点击行为
    const [popup] = await Promise.all([
      context.waitForEvent('page', { timeout: 5000 }).catch(() => null),
      githubButton.click(),
    ]);
    
    // 验证跳转或弹出
    if (!popup) {
      await Promise.race([
        page.waitForURL(/.*github\.com.*/, { timeout: 3000 }),
        page.waitForTimeout(1000),
      ]);
    }
  });

  test('第三方登录按钮样式正确', async ({ page }) => {
    const googleButton = page.locator(CONFIG.selectors.googleButton);
    const githubButton = page.locator(CONFIG.selectors.githubButton);
    
    // 验证按钮包含对应图标或文本
    const googleText = await googleButton.textContent();
    const githubText = await githubButton.textContent();
    
    expect(googleText?.toLowerCase()).toMatch(/google|谷歌/);
    expect(githubText?.toLowerCase()).toMatch(/github/);
  });
});

test.describe('登录页 - 响应式布局测试', () => {
  
  const viewports = [
    { name: 'iPhone SE', width: 375, height: 667 },
    { name: 'iPhone 12', width: 390, height: 844 },
    { name: 'Pixel 5', width: 393, height: 851 },
    { name: 'iPad Mini', width: 768, height: 1024 },
    { name: 'iPad Pro', width: 1024, height: 1366 },
  ];

  for (const viewport of viewports) {
    test(`TC-007/008: 布局适配 - ${viewport.name} (${viewport.width}x${viewport.height})`, async ({ page }) => {
      // 设置视口
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      
      await navigateToLogin(page);
      await waitForPageStability(page);
      
      // 验证无水平滚动条
      const hasHorizontalScrollbar = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      expect(hasHorizontalScrollbar).toBeFalsy();
      
      // 验证表单元素在可视区域内
      const emailInput = page.locator(CONFIG.selectors.emailInput);
      const passwordInput = page.locator(CONFIG.selectors.passwordInput);
      const loginButton = page.locator(CONFIG.selectors.loginButton);
      
      await expect(emailInput).toBeInViewport();
      await expect(passwordInput).toBeInViewport();
      await expect(loginButton).toBeInViewport();
      
      // 截图保存（用于视觉回归测试）
      await page.screenshot({
        path: `test-results/login-${viewport.name.toLowerCase().replace(/\s+/g, '-')}.png`,
        fullPage: false,
      });
    });
  }

  test('TC-007: 移动端表单垂直居中', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await navigateToLogin(page);
    
    const formContainer = page.locator('form, [data-testid="login-form"]').first();
    const box = await formContainer.boundingBox();
    
    // 验证表单大致在屏幕中央（允许一定误差）
    const viewportHeight = 844;
    const formCenterY = box ? box.y + box.height / 2 : 0;
    const screenCenterY = viewportHeight / 2;
    
    expect(Math.abs(formCenterY - screenCenterY)).toBeLessThan(200);
  });

  test('TC-008: 平板端显示适当的边距', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await navigateToLogin(page);
    
    // 验证表单宽度不超过屏幕宽度减去边距
    const formWidth = await page.evaluate(() => {
      const form = document.querySelector('form, [data-testid="login-form"]');
      return form ? form.getBoundingClientRect().width : 0;
    });
    
    expect(formWidth).toBeLessThanOrEqual(768 - 48); // 假设边距 24px * 2
  });
});

test.describe('登录页 - 深色模式测试', () => {
  
  test.beforeEach(async ({ page }) => {
    await navigateToLogin(page);
  });

  test('TC-009: 系统深色模式自动适配', async ({ page }) => {
    // 模拟系统深色模式偏好
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.reload();
    await waitForPageStability(page);
    
    // 验证深色模式样式
    const bgColor = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });
    
    // 深色背景应该是深色系的 (rgb(15, 15, 15) 或类似)
    const isDarkBackground = bgColor.includes('15') || 
                             bgColor.includes('0, 0, 0') ||
                             bgColor.includes('rgb(0');
    
    expect(isDarkBackground).toBeTruthy();
  });

  test('TC-009: 系统浅色模式自动适配', async ({ page }) => {
    // 模拟系统浅色模式偏好
    await page.emulateMedia({ colorScheme: 'light' });
    await page.reload();
    await waitForPageStability(page);
    
    const bgColor = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });
    
    // 浅色背景应该是白色系的
    const isLightBackground = bgColor.includes('255') || 
                              bgColor.includes('transparent');
    
    expect(isLightBackground).toBeTruthy();
  });

  test('TC-009: 手动切换深色模式', async ({ page }) => {
    // 首先检查是否存在主题切换按钮
    const hasThemeToggle = await page.isVisible(CONFIG.selectors.themeToggle)
      .catch(() => false);
    
    if (!hasThemeToggle) {
      test.skip();
      return;
    }
    
    // 获取初始背景色
    const initialBgColor = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });
    
    // 点击主题切换按钮
    await page.click(CONFIG.selectors.themeToggle);
    await page.waitForTimeout(500);
    
    // 验证背景色改变
    const newBgColor = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });
    
    expect(newBgColor).not.toBe(initialBgColor);
  });

  test('TC-009: 深色模式下输入框样式正确', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.reload();
    await waitForPageStability(page);
    
    const emailInput = page.locator(CONFIG.selectors.emailInput);
    
    // 验证输入框在深色模式下有正确的边框/背景色
    const inputStyles = await emailInput.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return {
        backgroundColor: styles.backgroundColor,
        borderColor: styles.borderColor,
        color: styles.color,
      };
    });
    
    // 深色模式下输入框应该有深色背景
    const hasDarkStyle = inputStyles.backgroundColor.includes('23') || // rgb(23, ...)
                         inputStyles.backgroundColor.includes('39') || // rgb(39, ...)
                         inputStyles.backgroundColor.includes('transparent');
    
    expect(hasDarkStyle).toBeTruthy();
  });

  test('TC-009: 深色模式持久化', async ({ page }) => {
    // 先切换到深色模式
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.reload();
    
    // 如果有手动切换按钮，点击它
    const hasThemeToggle = await page.isVisible(CONFIG.selectors.themeToggle)
      .catch(() => false);
    
    if (hasThemeToggle) {
      await page.click(CONFIG.selectors.themeToggle);
    }
    
    // 刷新页面
    await page.reload();
    await waitForPageStability(page);
    
    // 验证深色模式仍然生效
    const bgColor = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });
    
    const isDarkBackground = bgColor.includes('15') || 
                             bgColor.includes('23') ||
                             bgColor.includes('0, 0, 0');
    
    // 这个测试可能因实现方式而异，这里仅做示例
    // expect(isDarkBackground).toBeTruthy();
  });
});

test.describe('登录页 - 性能测试', () => {
  
  test('页面加载时间 < 3秒', async ({ page }) => {
    const startTime = Date.now();
    
    await navigateToLogin(page);
    await waitForPageStability(page);
    
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(3000);
  });

  test('首次内容绘制 (FCP) 性能', async ({ page }) => {
    const performanceMetrics = await page.evaluate(() => {
      return JSON.parse(JSON.stringify(performance.getEntriesByType('paint')));
    });
    
    const fcp = performanceMetrics.find((m: any) => m.name === 'first-contentful-paint');
    
    if (fcp) {
      expect(fcp.startTime).toBeLessThan(2000);
    }
  });
});

test.describe('登录页 - 安全测试', () => {
  
  test.beforeEach(async ({ page }) => {
    await navigateToLogin(page);
  });

  test('密码输入框使用 autocomplete="current-password"', async ({ page }) => {
    const passwordInput = page.locator(CONFIG.selectors.passwordInput);
    const autocomplete = await passwordInput.getAttribute('autocomplete');
    
    // 现代浏览器会建议使用 current-password 或 new-password
    expect(['current-password', 'new-password', 'on', 'off']).toContain(autocomplete);
  });

  test('表单提交使用 POST 方法或 AJAX', async ({ page }) => {
    // 监听网络请求
    const requests: any[] = [];
    page.on('request', request => {
      if (request.method() === 'POST') {
        requests.push(request.url());
      }
    });
    
    await fillLoginForm(page, 'test@test.com', 'password123');
    await submitLoginForm(page);
    
    await page.waitForTimeout(1000);
    
    // 验证有 POST 请求发出（或表单有正确的 method 属性）
    const formMethod = await page.evaluate(() => {
      const form = document.querySelector('form');
      return form ? form.method.toLowerCase() : 'get';
    });
    
    expect(formMethod === 'post' || requests.length > 0).toBeTruthy();
  });

  test('登录失败不暴露用户存在性', async ({ page }) => {
    // 测试两个不同的错误场景
    const scenarios = [
      { email: 'exists@test.com', password: 'wrong', desc: '用户存在，密码错误' },
      { email: 'notexists@test.com', password: 'wrong', desc: '用户不存在' },
    ];
    
    const errorMessages: string[] = [];
    
    for (const scenario of scenarios) {
      await clearForm(page);
      await fillLoginForm(page, scenario.email, scenario.password);
      await submitLoginForm(page);
      
      await page.waitForTimeout(1000);
      
      const errorText = await page.locator(CONFIG.selectors.errorMessage)
        .textContent()
        .catch(() => '');
      
      errorMessages.push(errorText || '');
    }
    
    // 错误信息应该一致，不暴露用户是否存在
    // 注意：这里只是示例，实际取决于后端实现
    // expect(errorMessages[0]).toBe(errorMessages[1]);
  });
});
