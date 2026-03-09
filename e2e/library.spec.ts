import { test, expect } from '@playwright/test';

test.describe('Library Page Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    // 点击记忆集导航按钮
    const libraryButton = page.locator('button svg[class*="book"], button[aria-label="记忆集"]').first();
    await libraryButton.click();
    await page.waitForTimeout(500);
  });

  test('library page loads', async ({ page }) => {
    // 验证页面标题（实际是"记忆库"）
    await expect(page.locator('text=/记忆集|记忆库/').first()).toBeVisible();
  });

  test('search bar visible', async ({ page }) => {
    // 验证搜索框存在
    const searchInput = page.locator('input[placeholder*="搜索"]').first();
    await expect(searchInput).toBeVisible();
  });

  test('active topics or archive section visible', async ({ page }) => {
    // 验证活跃主题或归档区域存在
    const hasContent = await page.locator('text=/活跃主题|归档|主题/').count() > 0;
    expect(hasContent).toBeTruthy();
  });
});
