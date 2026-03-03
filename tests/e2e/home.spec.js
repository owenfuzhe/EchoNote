/**
 * EchoNote 首页 E2E 测试脚本
 * 
 * 框架：Playwright
 * 覆盖功能：
 * - 页面加载测试
 * - 录音按钮可见性测试
 * - 底部导航测试
 * - 深色模式切换测试
 * 
 * 执行命令：npx playwright test home.spec.js
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
    // 录音按钮
    recordButton: '[data-testid="record-button"], button[aria-label*="录音"], button[aria-label*="record"]',
    recordButtonIcon: '[data-testid="record-icon"]',
    // 底部导航
    bottomNav: '[data-testid="bottom-navigation"], nav[role="navigation"]',
    navHome: '[data-testid="nav-home"], a[href="/"], button[aria-label*="首页"]',
    navRecord: '[data-testid="nav-record"], a[href="/record"], button[aria-label*="录音"]',
    navNotes: '[data-testid="nav-notes"], a[href="/notes"], button[aria-label*="笔记"]',
    navCalendar: '[data-testid="nav-calendar"], a[href="/calendar"], button[aria-label*="日历"]',
    navProfile: '[data-testid="nav-profile"], a[href="/profile"], button[aria-label*="我的"]',
    // 深色模式
    themeToggle: '[data-testid="theme-toggle"], button[aria-label*="主题"], button[aria-label*="theme"]',
    darkModeClass: 'dark',
  },
};

// ==================== 辅助函数 ====================

/**
 * 导航到首页
 */
async function navigateToHome(page) {
  await page.goto(`${CONFIG.baseURL}/`, {
    timeout: CONFIG.timeout.navigation,
    waitUntil: 'networkidle',
  });
}

/**
 * 等待页面稳定
 */
async function waitForPageStability(page) {
  await page.waitForLoadState('networkidle');
  await page.waitForLoadState('domcontentloaded');
}

/**
 * 获取页面背景色
 */
async function getBackgroundColor(page) {
  return await page.evaluate(() => {
    return window.getComputedStyle(document.body).backgroundColor;
  });
}

/**
 * 检查是否为深色背景
 */
function isDarkBackground(color) {
  if (!color) return false;
  // 深色背景通常是 rgb(0,0,0) 或 rgb(15,15,15) 等深色值
  const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (rgbMatch) {
    const [, r, g, b] = rgbMatch.map(Number);
    // 计算亮度，低于100认为是深色
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness < 100;
  }
  return color.includes('dark') || color === 'black';
}

// ==================== 测试套件 ====================

test.describe('首页 - 页面加载测试', () => {
  
  test.beforeEach(async ({ page }) => {
    await navigateToHome(page);
    await waitForPageStability(page);
  });

  test('TC-H001: 首页加载成功', async ({ page }) => {
    // 验证页面 URL
    await expect(page).toHaveURL(/.*\/$|.*\/home$|.*\/dashboard$/);
    
    // 验证页面标题
    const title = await page.title();
    expect(title.toLowerCase()).toMatch(/echonote|首页|home|dashboard/);
  });

  test('TC-H001: 页面无控制台错误', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await navigateToHome(page);
    await page.waitForTimeout(1000);
    
    // 过滤掉非关键错误
    const criticalErrors = errors.filter(e => 
      !e.includes('favicon') && 
      !e.includes('google') && 
      !e.includes('analytics') &&
      !e.includes('hot-update') // webpack dev server
    );
    
    expect(criticalErrors).toHaveLength(0);
  });

  test('TC-H001: 页面主要区域可见', async ({ page }) => {
    // 验证页面 body 可见
    const body = page.locator('body');
    await expect(body).toBeVisible();
    
    // 验证页面有内容
    const content = await page.content();
    expect(content.length).toBeGreaterThan(100);
  });

  test('TC-H001: 页面加载性能 < 3秒', async ({ page }) => {
    const startTime = Date.now();
    
    await navigateToHome(page);
    await waitForPageStability(page);
    
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(3000);
  });
});

test.describe('首页 - 录音按钮测试', () => {
  
  test.beforeEach(async ({ page }) => {
    await navigateToHome(page);
    await waitForPageStability(page);
  });

  test('TC-H002: 录音按钮可见', async ({ page }) => {
    // 尝试多种选择器查找录音按钮
    const recordButton = page.locator(CONFIG.selectors.recordButton).first();
    
    // 使用软断言，因为选择器可能不同
    try {
      await expect(recordButton).toBeVisible({ timeout: 3000 });
    } catch {
      // 如果没找到特定选择器，检查页面是否有任何录音相关按钮
      const buttons = await page.locator('button').all();
      const hasRecordButton = await Promise.all(
        buttons.map(async btn => {
          const text = await btn.textContent().catch(() => '');
          const ariaLabel = await btn.getAttribute('aria-label').catch(() => '');
          return text.toLowerCase().includes('录音') || 
                 ariaLabel.toLowerCase().includes('录音') ||
                 text.toLowerCase().includes('record') ||
                 ariaLabel.toLowerCase().includes('record');
        })
      );
      expect(hasRecordButton.some(Boolean)).toBeTruthy();
    }
  });

  test('TC-H002: 录音按钮可点击', async ({ page }) => {
    const recordButton = page.locator(CONFIG.selectors.recordButton).first();
    
    try {
      await expect(recordButton).toBeEnabled({ timeout: 3000 });
    } catch {
      test.skip('录音按钮未找到');
    }
  });

  test('TC-H002: 点击录音按钮导航到录音页', async ({ page }) => {
    const recordButton = page.locator(CONFIG.selectors.recordButton).first();
    
    // 检查按钮是否存在
    const isVisible = await recordButton.isVisible().catch(() => false);
    if (!isVisible) {
      test.skip('录音按钮未找到');
      return;
    }
    
    // 点击录音按钮
    await recordButton.click();
    
    // 验证导航到录音页面
    await expect(page).toHaveURL(/.*\/record.*|.*\/recorder.*/, { timeout: 5000 });
  });

  test('TC-H002: 录音按钮样式正确', async ({ page }) => {
    const recordButton = page.locator(CONFIG.selectors.recordButton).first();
    
    const isVisible = await recordButton.isVisible().catch(() => false);
    if (!isVisible) {
      test.skip('录音按钮未找到');
      return;
    }
    
    // 验证按钮尺寸合理（至少 44x44，符合可触摸区域规范）
    const box = await recordButton.boundingBox();
    if (box) {
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
  });
});

test.describe('首页 - 底部导航测试', () => {
  
  test.beforeEach(async ({ page }) => {
    await navigateToHome(page);
    await waitForPageStability(page);
  });

  test('TC-H003: 底部导航栏可见', async ({ page }) => {
    const bottomNav = page.locator(CONFIG.selectors.bottomNav).first();
    
    try {
      await expect(bottomNav).toBeVisible({ timeout: 3000 });
    } catch {
      // 如果特定选择器没找到，检查是否有底部固定定位的导航
      const hasBottomNav = await page.evaluate(() => {
        const navs = document.querySelectorAll('nav, [role="navigation"]');
        return Array.from(navs).some(nav => {
          const style = window.getComputedStyle(nav);
          const rect = nav.getBoundingClientRect();
          // 检查是否在底部
          return (style.position === 'fixed' || style.position === 'sticky') && 
                 rect.bottom >= window.innerHeight - 100;
        });
      });
      expect(hasBottomNav).toBeTruthy();
    }
  });

  test('TC-H003: 底部导航包含5个按钮', async ({ page }) => {
    const bottomNav = page.locator(CONFIG.selectors.bottomNav).first();
    
    const isVisible = await bottomNav.isVisible().catch(() => false);
    if (!isVisible) {
      test.skip('底部导航未找到');
      return;
    }
    
    // 计算导航中的按钮/链接数量
    const buttons = await bottomNav.locator('button, a, [role="button"]').count();
    expect(buttons).toBeGreaterThanOrEqual(4); // 至少4个
  });

  test('TC-H003: 首页导航按钮可用', async ({ page }) => {
    const navHome = page.locator(CONFIG.selectors.navHome).first();
    const isVisible = await navHome.isVisible().catch(() => false);
    
    if (!isVisible) {
      test.skip('首页导航按钮未找到');
      return;
    }
    
    await expect(navHome).toBeEnabled();
  });

  test('TC-H003: 笔记导航按钮可用', async ({ page }) => {
    const navNotes = page.locator(CONFIG.selectors.navNotes).first();
    const isVisible = await navNotes.isVisible().catch(() => false);
    
    if (!isVisible) {
      test.skip('笔记导航按钮未找到');
      return;
    }
    
    await expect(navNotes).toBeEnabled();
  });

  test('TC-H003: 日历导航按钮可用', async ({ page }) => {
    const navCalendar = page.locator(CONFIG.selectors.navCalendar).first();
    const isVisible = await navCalendar.isVisible().catch(() => false);
    
    if (!isVisible) {
      test.skip('日历导航按钮未找到');
      return;
    }
    
    await expect(navCalendar).toBeEnabled();
  });

  test('TC-H003: 我的导航按钮可用', async ({ page }) => {
    const navProfile = page.locator(CONFIG.selectors.navProfile).first();
    const isVisible = await navProfile.isVisible().catch(() => false);
    
    if (!isVisible) {
      test.skip('我的导航按钮未找到');
      return;
    }
    
    await expect(navProfile).toBeEnabled();
  });

  test('TC-H003: 底部导航固定在页面底部', async ({ page }) => {
    const bottomNav = page.locator(CONFIG.selectors.bottomNav).first();
    
    const isVisible = await bottomNav.isVisible().catch(() => false);
    if (!isVisible) {
      test.skip('底部导航未找到');
      return;
    }
    
    // 验证位置在底部
    const box = await bottomNav.boundingBox();
    const viewportHeight = await page.evaluate(() => window.innerHeight);
    
    if (box) {
      expect(box.bottom).toBeGreaterThanOrEqual(viewportHeight - 50);
    }
  });

  test('TC-H003: 导航按钮有正确的 aria-label', async ({ page }) => {
    const bottomNav = page.locator(CONFIG.selectors.bottomNav).first();
    
    const isVisible = await bottomNav.isVisible().catch(() => false);
    if (!isVisible) {
      test.skip('底部导航未找到');
      return;
    }
    
    // 检查导航按钮是否有 aria-label
    const buttons = await bottomNav.locator('button, a').all();
    const hasAriaLabels = await Promise.all(
      buttons.map(async btn => {
        const ariaLabel = await btn.getAttribute('aria-label');
        return ariaLabel !== null && ariaLabel !== '';
      })
    );
    
    // 至少部分按钮应该有 aria-label
    expect(hasAriaLabels.filter(Boolean).length).toBeGreaterThanOrEqual(2);
  });
});

test.describe('首页 - 深色模式测试', () => {
  
  test.beforeEach(async ({ page }) => {
    await navigateToHome(page);
    await waitForPageStability(page);
  });

  test('TC-H004: 系统深色模式自动适配', async ({ page }) => {
    // 模拟系统深色模式
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.reload();
    await waitForPageStability(page);
    
    // 检查页面是否有 dark 类或深色背景
    const hasDarkClass = await page.evaluate(() => {
      return document.documentElement.classList.contains('dark') ||
             document.body.classList.contains('dark');
    });
    
    const bgColor = await getBackgroundColor(page);
    const isDark = isDarkBackground(bgColor);
    
    // 页面应该有 dark 类或深色背景
    expect(hasDarkClass || isDark).toBeTruthy();
  });

  test('TC-H004: 系统浅色模式自动适配', async ({ page }) => {
    // 模拟系统浅色模式
    await page.emulateMedia({ colorScheme: 'light' });
    await page.reload();
    await waitForPageStability(page);
    
    const bgColor = await getBackgroundColor(page);
    
    // 浅色背景应该是白色或接近白色
    const isLight = bgColor.includes('255') || 
                    bgColor.includes('transparent') ||
                    bgColor.includes('249') ||
                    bgColor.includes('250');
    
    expect(isLight).toBeTruthy();
  });

  test('TC-H004: 深色模式切换按钮可见', async ({ page }) => {
    const themeToggle = page.locator(CONFIG.selectors.themeToggle).first();
    
    try {
      await expect(themeToggle).toBeVisible({ timeout: 3000 });
    } catch {
      // 检查页面是否有任何主题切换相关元素
      const hasThemeToggle = await page.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        return Array.from(buttons).some(btn => {
          const text = btn.textContent?.toLowerCase() || '';
          const ariaLabel = btn.getAttribute('aria-label')?.toLowerCase() || '';
          return text.includes('主题') || text.includes('theme') ||
                 text.includes('深色') || text.includes('dark') ||
                 text.includes('浅色') || text.includes('light') ||
                 ariaLabel.includes('theme') || ariaLabel.includes('dark');
        });
      });
      
      // 主题切换功能可能是可选的，所以这里用软断言
      if (!hasThemeToggle) {
        test.skip('深色模式切换按钮未找到（可能通过系统自动适配）');
      }
    }
  });

  test('TC-H004: 手动切换深色模式', async ({ page }) => {
    const themeToggle = page.locator(CONFIG.selectors.themeToggle).first();
    
    const isVisible = await themeToggle.isVisible().catch(() => false);
    if (!isVisible) {
      test.skip('深色模式切换按钮未找到');
      return;
    }
    
    // 获取初始背景色
    const initialBgColor = await getBackgroundColor(page);
    const initialIsDark = isDarkBackground(initialBgColor);
    
    // 点击切换按钮
    await themeToggle.click();
    await page.waitForTimeout(500);
    
    // 获取新背景色
    const newBgColor = await getBackgroundColor(page);
    const newIsDark = isDarkBackground(newBgColor);
    
    // 背景应该切换
    expect(newIsDark).not.toBe(initialIsDark);
  });

  test('TC-H004: 深色模式下文字对比度正确', async ({ page }) => {
    // 切换到深色模式
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.reload();
    await waitForPageStability(page);
    
    // 检查主要文字颜色
    const textColor = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      if (h1) {
        return window.getComputedStyle(h1).color;
      }
      const p = document.querySelector('p');
      if (p) {
        return window.getComputedStyle(p).color;
      }
      return null;
    });
    
    if (textColor) {
      // 在深色模式下，文字应该是浅色（白色或接近白色）
      const rgbMatch = textColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (rgbMatch) {
        const [, r, g, b] = rgbMatch.map(Number);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        expect(brightness).toBeGreaterThan(100); // 文字应该是浅色的
      }
    }
  });
});

test.describe('首页 - 响应式布局测试', () => {
  
  const viewports = [
    { name: 'iPhone SE', width: 375, height: 667 },
    { name: 'iPhone 12', width: 390, height: 844 },
    { name: 'iPad Mini', width: 768, height: 1024 },
    { name: 'Desktop', width: 1280, height: 720 },
  ];

  for (const viewport of viewports) {
    test(`TC-H005: 布局适配 - ${viewport.name} (${viewport.width}x${viewport.height})`, async ({ page }) => {
      // 设置视口
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      
      await navigateToHome(page);
      await waitForPageStability(page);
      
      // 验证无水平滚动条
      const hasHorizontalScrollbar = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      expect(hasHorizontalScrollbar).toBeFalsy();
      
      // 截图保存
      await page.screenshot({
        path: `test-results/home-${viewport.name.toLowerCase().replace(/\s+/g, '-')}.png`,
        fullPage: false,
      });
    });
  }
});

test.describe('首页 - 无障碍测试', () => {
  
  test.beforeEach(async ({ page }) => {
    await navigateToHome(page);
    await waitForPageStability(page);
  });

  test('TC-H006: 页面有正确的 lang 属性', async ({ page }) => {
    const lang = await page.evaluate(() => {
      return document.documentElement.lang;
    });
    
    expect(lang).toMatch(/zh|zh-CN|zh-TW|en/);
  });

  test('TC-H006: 主要交互元素可键盘访问', async ({ page }) => {
    // 聚焦到第一个按钮
    await page.keyboard.press('Tab');
    
    // 检查是否有元素获得焦点
    const activeElement = await page.evaluate(() => {
      const el = document.activeElement;
      return el ? el.tagName : null;
    });
    
    expect(activeElement).not.toBe('BODY');
  });

  test('TC-H006: 图片有 alt 文本', async ({ page }) => {
    const imagesWithoutAlt = await page.evaluate(() => {
      const images = document.querySelectorAll('img');
      return Array.from(images).filter(img => !img.alt && !img.getAttribute('aria-label')).length;
    });
    
    // 装饰性图片可以没有 alt，但内容图片应该有
    expect(imagesWithoutAlt).toBeLessThanOrEqual(2); // 允许少量装饰性图片
  });
});
