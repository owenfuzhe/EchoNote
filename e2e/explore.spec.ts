import { test, expect } from '@playwright/test';

test.describe('Explore Page Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    // 点击探索导航按钮
    const exploreButton = page.locator('button svg[class*="compass"], button[aria-label="探索"], button svg[class*="infinity"]').first();
    await exploreButton.click();
    await page.waitForTimeout(500);
  });

  test('explore page loads', async ({ page }) => {
    // 验证探索页面内容加载
    const hasContent = await page.locator('text=/技能|探索|发现|关联/').count() > 0;
    expect(hasContent).toBeTruthy();
  });

  test('skills section or templates visible', async ({ page }) => {
    // 验证技能中心或模板区域存在
    const hasSkills = await page.locator('text=/技能中心|联网搜索|播客|模板/').count() > 0;
    expect(hasSkills).toBeTruthy();
  });

  test('relation discovery or insights visible', async ({ page }) => {
    // 验证关联发现或洞察区域存在
    const hasInsights = await page.locator('text=/关联发现|发现|洞察/').count() > 0;
    expect(hasInsights).toBeTruthy();
  });
});
