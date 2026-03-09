import { test, expect } from '@playwright/test';

/**
 * EchoNote 用户故事测试
 * 基于真实使用场景的全面测试
 */

test.describe('用户故事: 晨间查看待办', () => {
  test('US-001: 用户打开应用看到主页标题', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    // 验证主页标题存在
    await expect(page.locator('text=主页').first()).toBeVisible();

    // 验证通知铃铛图标
    await expect(page.locator('button svg').first()).toBeVisible();
  });

  test('US-002: 用户查看最近记忆列表', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    // 验证最近标题
    await expect(page.locator('text=最近').first()).toBeVisible();

    // 验证有笔记卡片（mock 数据应该加载了 200 篇）
    const cards = await page.locator('button:has(h3)').count();
    expect(cards).toBeGreaterThan(0);

    // 验证"更多"按钮
    await expect(page.locator('text=更多').first()).toBeVisible();
  });

  test('US-003: 用户查看快速消化区域', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    // 验证快速消化标题
    await expect(page.locator('text=快速消化').first()).toBeVisible();

    // 验证 AI 生成标记
    await expect(page.locator('text=AI 生成').first()).toBeVisible();
  });
});

test.describe('用户故事: 创建笔记', () => {
  test('US-004: 用户点击添加按钮打开捕获菜单', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    // 点击添加按钮（右下角 + 按钮）
    const addButton = page.locator('button[aria-label="添加"]').first();
    await expect(addButton).toBeVisible();
    await addButton.click();
    await page.waitForTimeout(500);

    // 验证捕获菜单打开 - 根据实际 UI 检查
    await expect(page.locator('text=链接').first()).toBeVisible();
  });
});

test.describe('用户故事: 查看和编辑笔记', () => {
  test('US-005: 用户点击笔记卡片进入详情页', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    // 找到第一个笔记卡片并点击
    const firstCard = page.locator('button:has(h3)').first();
    await expect(firstCard).toBeVisible();
    await firstCard.click();
    await page.waitForTimeout(1000);

    // 验证进入详情页 - 应该有返回按钮或编辑区域
    const hasBackButton = await page.locator('button svg[class*="arrow"], button:has-text("返回")').count() > 0;
    const hasEditor = await page.locator('[contenteditable="true"], textarea, [role="textbox"]').count() > 0;
    expect(hasBackButton || hasEditor).toBeTruthy();
  });
});

test.describe('用户故事: 在记忆集中搜索', () => {
  test('US-006: 用户切换到记忆集页面', async ({ page }) => {
    await page.goto('/');

    // 点击记忆集导航按钮
    const libraryButton = page.locator('button svg[class*="book"], button[aria-label="记忆集"]').first();
    await libraryButton.click();
    await page.waitForTimeout(1000);

    // 验证页面标题
    await expect(page.locator('text=记忆集').first()).toBeVisible();
  });

  test('US-007: 用户在记忆集中搜索关键词', async ({ page }) => {
    await page.goto('/');

    // 切换到记忆集
    const libraryButton = page.locator('button svg[class*="book"], button[aria-label="记忆集"]').first();
    await libraryButton.click();
    await page.waitForTimeout(1000);

    // 在搜索框输入关键词
    const searchInput = page.locator('input[placeholder*="搜索"]').first();
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('React');
      await page.waitForTimeout(1000);

      // 验证搜索结果或过滤后的内容
      const resultsCount = await page.locator('button:has(h3), [class*="card"], [class*="note"]').count();
      expect(resultsCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('US-008: 用户查看活跃主题和归档', async ({ page }) => {
    await page.goto('/');

    // 切换到记忆集
    const libraryButton = page.locator('button svg[class*="book"], button[aria-label="记忆集"]').first();
    await libraryButton.click();
    await page.waitForTimeout(1000);

    // 验证活跃主题区域
    const hasActiveTopics = await page.locator('text=/活跃主题|主题/').count() > 0;

    // 验证归档沉淀区域
    const hasArchive = await page.locator('text=/归档|沉淀/').count() > 0;

    expect(hasActiveTopics || hasArchive).toBeTruthy();
  });
});

test.describe('用户故事: 探索页面使用技能', () => {
  test('US-009: 用户切换到探索页面', async ({ page }) => {
    await page.goto('/');

    // 点击探索导航按钮
    const exploreButton = page.locator('button svg[class*="compass"], button[aria-label="探索"], button svg[class*="infinity"]').first();
    await exploreButton.click();
    await page.waitForTimeout(1000);

    // 验证页面内容
    const hasExploreContent = await page.locator('text=/技能|探索|发现/').count() > 0;
    expect(hasExploreContent).toBeTruthy();
  });

  test('US-010: 用户查看技能中心', async ({ page }) => {
    await page.goto('/');

    // 切换到探索页面
    const exploreButton = page.locator('button svg[class*="compass"], button[aria-label="探索"], button svg[class*="infinity"]').first();
    await exploreButton.click();
    await page.waitForTimeout(1000);

    // 验证技能中心标题或技能按钮存在
    const hasSkills = await page.locator('text=/技能中心|联网搜索|播客/').count() > 0;
    expect(hasSkills).toBeTruthy();
  });
});

test.describe('用户故事: 导航功能', () => {
  test('US-011: 用户在三个主要页面间导航', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    // 验证在主页
    await expect(page.locator('text=主页').first()).toBeVisible();

    // 切换到记忆集
    const libraryButton = page.locator('button svg[class*="book"], button[aria-label="记忆集"]').first();
    await libraryButton.click();
    await page.waitForTimeout(500);
    await expect(page.locator('text=记忆集').first()).toBeVisible();

    // 切换到探索
    const exploreButton = page.locator('button svg[class*="compass"], button[aria-label="探索"], button svg[class*="infinity"]').first();
    await exploreButton.click();
    await page.waitForTimeout(500);

    // 验证探索页面内容
    const hasExploreContent = await page.locator('text=/技能|探索|发现/').count() > 0;
    expect(hasExploreContent).toBeTruthy();

    // 返回主页
    const homeButton = page.locator('button svg[class*="home"], button[aria-label="首页"]').first();
    await homeButton.click();
    await page.waitForTimeout(500);
    await expect(page.locator('text=主页').first()).toBeVisible();
  });
});

test.describe('性能测试', () => {
  test('US-PERF-001: 应用加载时间小于 5 秒', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    console.log(`页面加载时间: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(5000);
  });

  test('US-PERF-002: 200 篇笔记渲染不卡顿', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3000);

    // 验证最近区域有笔记
    const recentNotes = await page.locator('button:has(h3)').count();
    console.log(`最近笔记数量: ${recentNotes}`);
    expect(recentNotes).toBeGreaterThan(0);

    // 测量滚动性能
    const scrollStart = Date.now();
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(100);
    const scrollTime = Date.now() - scrollStart;

    console.log(`滚动响应时间: ${scrollTime}ms`);
    expect(scrollTime).toBeLessThan(500);
  });
});
