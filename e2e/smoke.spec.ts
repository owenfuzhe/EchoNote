import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('homepage loads', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    // 验证主页标题存在
    await expect(page.locator('text=主页').first()).toBeVisible();

    // 验证最近区域
    await expect(page.locator('text=最近').first()).toBeVisible();
  });

  test('navigation between tabs', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    // Home tab - 验证主页
    await expect(page.locator('text=主页').first()).toBeVisible();

    // Navigate to Library - 点击记忆集按钮
    const libraryButton = page.locator('button svg[class*="book"], button[aria-label="记忆集"]').first();
    await libraryButton.click();
    await page.waitForTimeout(500);
    await expect(page.locator('text=记忆集').first()).toBeVisible();

    // Navigate to Explore - 点击探索按钮
    const exploreButton = page.locator('button svg[class*="compass"], button[aria-label="探索"], button svg[class*="infinity"]').first();
    await exploreButton.click();
    await page.waitForTimeout(500);
    const hasExploreContent = await page.locator('text=/技能|探索/').count() > 0;
    expect(hasExploreContent).toBeTruthy();

    // Navigate back to Home - 返回主页
    const homeButton = page.locator('button svg[class*="home"], button[aria-label="首页"]').first();
    await homeButton.click();
    await page.waitForTimeout(500);
    await expect(page.locator('text=主页').first()).toBeVisible();
  });

  test('capture menu opens', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    // 点击添加按钮（右下角 +）
    const addButton = page.locator('button[aria-label="添加"]').first();
    await expect(addButton).toBeVisible();
    await addButton.click();
    await page.waitForTimeout(300);

    // 验证捕获菜单打开 - 显示链接选项
    await expect(page.locator('text=链接').first()).toBeVisible();
  });
});
