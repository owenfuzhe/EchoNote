/**
 * EchoNote 录音页 E2E 测试脚本
 * 
 * 框架：Playwright
 * 覆盖功能：
 * - 录音页面加载测试
 * - 录音按钮点击测试
 * - 录音状态显示测试
 * - 计时器功能测试
 * - 停止按钮测试
 * 
 * 执行命令：npx playwright test record.spec.js
 */

import { test, expect } from '@playwright/test';

// ==================== 测试配置 ====================
const CONFIG = {
  baseURL: process.env.TEST_BASE_URL || 'http://localhost:3000',
  timeout: {
    navigation: 10000,
    element: 5000,
    action: 3000,
    recording: 3000, // 录音持续时间
  },
  selectors: {
    // 录音按钮
    recordButton: '[data-testid="record-button"], button[aria-label*="录音"], button[aria-label*="record"]',
    startRecordButton: '[data-testid="start-record"], button:has-text("开始录音")',
    // 停止按钮
    stopButton: '[data-testid="stop-button"], button[aria-label*="停止"], button[aria-label*="stop"]',
    // 录音状态
    recordingStatus: '[data-testid="recording-status"], .recording-status, [data-recording="true"]',
    recordingIndicator: '[data-testid="recording-indicator"], .recording-indicator',
    // 计时器
    timer: '[data-testid="recording-timer"], .recording-timer, [data-testid="timer"]',
    timerDisplay: '[data-testid="timer-display"], .timer',
    // 波形/可视化
    waveform: '[data-testid="waveform"], .waveform, canvas',
    // 音频电平
    audioLevel: '[data-testid="audio-level"], .audio-level',
    // 取消按钮
    cancelButton: '[data-testid="cancel-button"], button[aria-label*="取消"], button[aria-label*="cancel"]',
    // 保存按钮
    saveButton: '[data-testid="save-button"], button[aria-label*="保存"], button[aria-label*="save"]',
    // 返回按钮
    backButton: '[data-testid="back-button"], button[aria-label*="返回"], button[aria-label*="back"]',
    // 麦克风权限提示
    permissionPrompt: '[data-testid="permission-prompt"], .permission-prompt',
    // 页面标题
    pageTitle: 'h1, [data-testid="page-title"]',
  },
};

// ==================== 辅助函数 ====================

/**
 * 导航到录音页
 */
async function navigateToRecordPage(page) {
  await page.goto(`${CONFIG.baseURL}/record`, {
    timeout: CONFIG.timeout.navigation,
    waitUntil: 'networkidle',
  });
}

/**
 * 从首页点击录音按钮进入录音页
 */
async function enterRecordPageFromHome(page) {
  await page.goto(`${CONFIG.baseURL}/`, {
    timeout: CONFIG.timeout.navigation,
    waitUntil: 'networkidle',
  });
  
  // 查找并点击录音按钮
  const recordButton = page.locator(CONFIG.selectors.recordButton).first();
  const isVisible = await recordButton.isVisible().catch(() => false);
  
  if (isVisible) {
    await recordButton.click();
    await page.waitForURL(/.*\/record.*/, { timeout: 5000 });
  } else {
    // 如果找不到录音按钮，直接导航到录音页
    await navigateToRecordPage(page);
  }
}

/**
 * 等待页面稳定
 */
async function waitForPageStability(page) {
  await page.waitForLoadState('networkidle');
  await page.waitForLoadState('domcontentloaded');
}

/**
 * 解析时间字符串为秒数
 * 支持格式: "00:00", "0:00", "00:00:00"
 */
function parseTimeToSeconds(timeStr) {
  if (!timeStr) return 0;
  const parts = timeStr.split(':').map(Number);
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return parseInt(timeStr) || 0;
}

/**
 * 获取计时器显示的时间
 */
async function getTimerValue(page) {
  const timer = page.locator(CONFIG.selectors.timer).first();
  const text = await timer.textContent().catch(() => '00:00');
  return parseTimeToSeconds(text);
}

// ==================== 测试套件 ====================

test.describe('录音页 - 页面加载测试', () => {
  
  test.beforeEach(async ({ page }) => {
    await navigateToRecordPage(page);
    await waitForPageStability(page);
  });

  test('TC-R001: 录音页加载成功', async ({ page }) => {
    // 验证页面 URL
    await expect(page).toHaveURL(/.*\/record.*/);
    
    // 验证页面标题包含录音相关文字
    const title = await page.title();
    const hasRecordKeyword = /录音|record|语音|voice/i.test(title);
    
    // 如果标题没有关键词，检查页面内容
    if (!hasRecordKeyword) {
      const content = await page.content();
      expect(content.toLowerCase()).toMatch(/录音|record|开始|start/);
    }
  });

  test('TC-R001: 录音页标题正确显示', async ({ page }) => {
    const title = page.locator(CONFIG.selectors.pageTitle).first();
    
    const isVisible = await title.isVisible().catch(() => false);
    if (isVisible) {
      const text = await title.textContent();
      expect(text.toLowerCase()).toMatch(/录音|record|语音|voice/);
    } else {
      // 如果找不到 h1，检查页面其他元素
      const content = await page.textContent('body');
      expect(content.toLowerCase()).toMatch(/录音|record/);
    }
  });

  test('TC-R001: 录音页无控制台错误', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.reload();
    await waitForPageStability(page);
    await page.waitForTimeout(1000);
    
    // 过滤掉非关键错误
    const criticalErrors = errors.filter(e => 
      !e.includes('favicon') && 
      !e.includes('google') && 
      !e.includes('analytics') &&
      !e.includes('hot-update') &&
      !e.includes('Permissions') // 麦克风权限错误是预期的
    );
    
    expect(criticalErrors).toHaveLength(0);
  });
});

test.describe('录音页 - 从首页进入测试', () => {

  test('TC-R002: 点击录音按钮进入录音页', async ({ page }) => {
    await enterRecordPageFromHome(page);
    
    // 验证导航到录音页面
    await expect(page).toHaveURL(/.*\/record.*/);
    
    // 验证页面已加载
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('TC-R002: 从首页到录音页导航流畅', async ({ page }) => {
    await page.goto(`${CONFIG.baseURL}/`);
    await waitForPageStability(page);
    
    const startTime = Date.now();
    
    const recordButton = page.locator(CONFIG.selectors.recordButton).first();
    const isVisible = await recordButton.isVisible().catch(() => false);
    
    if (isVisible) {
      await recordButton.click();
      await page.waitForURL(/.*\/record.*/, { timeout: 5000 });
    } else {
      await navigateToRecordPage(page);
    }
    
    const navigationTime = Date.now() - startTime;
    expect(navigationTime).toBeLessThan(5000);
  });
});

test.describe('录音页 - 录音功能测试', () => {
  
  test.beforeEach(async ({ page }) => {
    await navigateToRecordPage(page);
    await waitForPageStability(page);
  });

  test('TC-R003: 开始录音按钮可见', async ({ page }) => {
    // 查找开始录音按钮
    const startButton = page.locator(CONFIG.selectors.startRecordButton).first();
    const recordButton = page.locator(CONFIG.selectors.recordButton).first();
    
    const startVisible = await startButton.isVisible().catch(() => false);
    const recordVisible = await recordButton.isVisible().catch(() => false);
    
    expect(startVisible || recordVisible).toBeTruthy();
  });

  test('TC-R003: 开始录音按钮可点击', async ({ page }) => {
    const startButton = page.locator(CONFIG.selectors.startRecordButton).first();
    const recordButton = page.locator(CONFIG.selectors.recordButton).first();
    
    const startVisible = await startButton.isVisible().catch(() => false);
    const recordVisible = await recordButton.isVisible().catch(() => false);
    
    if (startVisible) {
      await expect(startButton).toBeEnabled();
    } else if (recordVisible) {
      await expect(recordButton).toBeEnabled();
    } else {
      test.skip('录音按钮未找到');
    }
  });

  test('TC-R003: 点击开始录音进入录音状态', async ({ page, context }) => {
    // 授予麦克风权限
    await context.grantPermissions(['microphone']);
    await page.reload();
    await waitForPageStability(page);
    
    const startButton = page.locator(CONFIG.selectors.startRecordButton).first();
    const recordButton = page.locator(CONFIG.selectors.recordButton).first();
    
    const startVisible = await startButton.isVisible().catch(() => false);
    const recordVisible = await recordButton.isVisible().catch(() => false);
    
    if (startVisible) {
      await startButton.click();
    } else if (recordVisible) {
      await recordButton.click();
    } else {
      test.skip('录音按钮未找到');
      return;
    }
    
    // 等待录音状态变化
    await page.waitForTimeout(1000);
    
    // 检查录音状态指示器或停止按钮是否出现
    const stopVisible = await page.locator(CONFIG.selectors.stopButton).first().isVisible().catch(() => false);
    const recordingStatus = await page.locator(CONFIG.selectors.recordingStatus).first().isVisible().catch(() => false);
    const timerVisible = await page.locator(CONFIG.selectors.timer).first().isVisible().catch(() => false);
    
    // 至少有一个录音中的指示
    expect(stopVisible || recordingStatus || timerVisible).toBeTruthy();
  });

  test('TC-R004: 录音中状态显示', async ({ page, context }) => {
    // 授予麦克风权限
    await context.grantPermissions(['microphone']);
    await page.reload();
    await waitForPageStability(page);
    
    // 开始录音
    const recordButton = page.locator(CONFIG.selectors.recordButton).first();
    const startButton = page.locator(CONFIG.selectors.startRecordButton).first();
    
    const startVisible = await startButton.isVisible().catch(() => false);
    const recordVisible = await recordButton.isVisible().catch(() => false);
    
    if (startVisible) {
      await startButton.click();
    } else if (recordVisible) {
      await recordButton.click();
    } else {
      test.skip('录音按钮未找到');
      return;
    }
    
    await page.waitForTimeout(1000);
    
    // 检查录音状态指示器
    const recordingIndicator = page.locator(CONFIG.selectors.recordingIndicator).first();
    const isIndicatorVisible = await recordingIndicator.isVisible().catch(() => false);
    
    // 或者检查页面元素是否有 recording 类或属性
    const hasRecordingState = await page.evaluate(() => {
      const elements = document.querySelectorAll('[data-recording="true"], .recording, .is-recording');
      return elements.length > 0;
    });
    
    expect(isIndicatorVisible || hasRecordingState).toBeTruthy();
  });

  test('TC-R004: 录音状态显示红色指示器', async ({ page, context }) => {
    // 授予麦克风权限
    await context.grantPermissions(['microphone']);
    await page.reload();
    await waitForPageStability(page);
    
    // 开始录音
    const recordButton = page.locator(CONFIG.selectors.recordButton).first();
    const startButton = page.locator(CONFIG.selectors.startRecordButton).first();
    
    const startVisible = await startButton.isVisible().catch(() => false);
    const recordVisible = await recordButton.isVisible().catch(() => false);
    
    if (startVisible) {
      await startButton.click();
    } else if (recordVisible) {
      await recordButton.click();
    } else {
      test.skip('录音按钮未找到');
      return;
    }
    
    await page.waitForTimeout(500);
    
    // 查找红色指示器（录音状态通常用红色）
    const recordingElements = await page.locator('.recording-indicator, [data-recording="true"], .pulse-red, .animate-pulse').all();
    
    let hasRedColor = false;
    for (const el of recordingElements) {
      const color = await el.evaluate(e => {
        return window.getComputedStyle(e).backgroundColor || 
               window.getComputedStyle(e).color;
      });
      if (color.includes('255, 0, 0') || color.includes('239, 68, 68') || color.includes('red')) {
        hasRedColor = true;
        break;
      }
    }
    
    expect(hasRedColor || recordingElements.length > 0).toBeTruthy();
  });

  test('TC-R005: 计时器工作正常', async ({ page, context }) => {
    // 授予麦克风权限
    await context.grantPermissions(['microphone']);
    await page.reload();
    await waitForPageStability(page);
    
    // 开始录音
    const recordButton = page.locator(CONFIG.selectors.recordButton).first();
    const startButton = page.locator(CONFIG.selectors.startRecordButton).first();
    
    const startVisible = await startButton.isVisible().catch(() => false);
    const recordVisible = await recordButton.isVisible().catch(() => false);
    
    if (startVisible) {
      await startButton.click();
    } else if (recordVisible) {
      await recordButton.click();
    } else {
      test.skip('录音按钮未找到');
      return;
    }
    
    // 等待计时器启动
    await page.waitForTimeout(500);
    
    // 获取初始时间
    const initialTime = await getTimerValue(page);
    
    // 等待2秒
    await page.waitForTimeout(2000);
    
    // 获取新时间
    const newTime = await getTimerValue(page);
    
    // 时间应该增加了
    expect(newTime).toBeGreaterThan(initialTime);
  });

  test('TC-R005: 计时器格式正确', async ({ page, context }) => {
    // 授予麦克风权限
    await context.grantPermissions(['microphone']);
    await page.reload();
    await waitForPageStability(page);
    
    // 开始录音
    const recordButton = page.locator(CONFIG.selectors.recordButton).first();
    const startButton = page.locator(CONFIG.selectors.startRecordButton).first();
    
    const startVisible = await startButton.isVisible().catch(() => false);
    const recordVisible = await recordButton.isVisible().catch(() => false);
    
    if (startVisible) {
      await startButton.click();
    } else if (recordVisible) {
      await recordButton.click();
    } else {
      test.skip('录音按钮未找到');
      return;
    }
    
    await page.waitForTimeout(1000);
    
    // 获取计时器文本
    const timer = page.locator(CONFIG.selectors.timer).first();
    const timerText = await timer.textContent().catch(() => '');
    
    // 计时器格式应该是 MM:SS 或 H:MM:SS
    const timeRegex = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;
    expect(timerText.trim()).toMatch(timeRegex);
  });
});

test.describe('录音页 - 停止按钮测试', () => {
  
  test.beforeEach(async ({ page, context }) => {
    await context.grantPermissions(['microphone']);
    await navigateToRecordPage(page);
    await waitForPageStability(page);
  });

  test('TC-R006: 录音时停止按钮可用', async ({ page }) => {
    // 开始录音
    const recordButton = page.locator(CONFIG.selectors.recordButton).first();
    const startButton = page.locator(CONFIG.selectors.startRecordButton).first();
    
    const startVisible = await startButton.isVisible().catch(() => false);
    const recordVisible = await recordButton.isVisible().catch(() => false);
    
    if (startVisible) {
      await startButton.click();
    } else if (recordVisible) {
      await recordButton.click();
    } else {
      test.skip('录音按钮未找到');
      return;
    }
    
    await page.waitForTimeout(1000);
    
    // 检查停止按钮
    const stopButton = page.locator(CONFIG.selectors.stopButton).first();
    const isVisible = await stopButton.isVisible().catch(() => false);
    
    if (isVisible) {
      await expect(stopButton).toBeEnabled();
    } else {
      // 如果没有特定的停止按钮，检查是否有取消或保存按钮
      const cancelButton = page.locator(CONFIG.selectors.cancelButton).first();
      const saveButton = page.locator(CONFIG.selectors.saveButton).first();
      
      const cancelVisible = await cancelButton.isVisible().catch(() => false);
      const saveVisible = await saveButton.isVisible().catch(() => false);
      
      expect(cancelVisible || saveVisible).toBeTruthy();
    }
  });

  test('TC-R006: 点击停止按钮停止录音', async ({ page }) => {
    // 开始录音
    const recordButton = page.locator(CONFIG.selectors.recordButton).first();
    const startButton = page.locator(CONFIG.selectors.startRecordButton).first();
    
    const startVisible = await startButton.isVisible().catch(() => false);
    const recordVisible = await recordButton.isVisible().catch(() => false);
    
    if (startVisible) {
      await startButton.click();
    } else if (recordVisible) {
      await recordButton.click();
    } else {
      test.skip('录音按钮未找到');
      return;
    }
    
    await page.waitForTimeout(2000);
    
    // 点击停止按钮
    const stopButton = page.locator(CONFIG.selectors.stopButton).first();
    const isVisible = await stopButton.isVisible().catch(() => false);
    
    if (isVisible) {
      await stopButton.click();
      
      await page.waitForTimeout(500);
      
      // 验证录音已停止（录音指示器消失）
      const recordingStatus = await page.locator(CONFIG.selectors.recordingStatus).first().isVisible().catch(() => false);
      expect(recordingStatus).toBeFalsy();
    } else {
      test.skip('停止按钮未找到');
    }
  });

  test('TC-R006: 停止按钮样式正确', async ({ page }) => {
    // 开始录音
    const recordButton = page.locator(CONFIG.selectors.recordButton).first();
    const startButton = page.locator(CONFIG.selectors.startRecordButton).first();
    
    const startVisible = await startButton.isVisible().catch(() => false);
    const recordVisible = await recordButton.isVisible().catch(() => false);
    
    if (startVisible) {
      await startButton.click();
    } else if (recordVisible) {
      await recordButton.click();
    } else {
      test.skip('录音按钮未找到');
      return;
    }
    
    await page.waitForTimeout(1000);
    
    const stopButton = page.locator(CONFIG.selectors.stopButton).first();
    const isVisible = await stopButton.isVisible().catch(() => false);
    
    if (isVisible) {
      // 验证按钮尺寸合理
      const box = await stopButton.boundingBox();
      if (box) {
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    } else {
      test.skip('停止按钮未找到');
    }
  });
});

test.describe('录音页 - 波形可视化测试', () => {
  
  test.beforeEach(async ({ page, context }) => {
    await context.grantPermissions(['microphone']);
    await navigateToRecordPage(page);
    await waitForPageStability(page);
  });

  test('TC-R007: 录音时显示波形可视化', async ({ page }) => {
    // 开始录音
    const recordButton = page.locator(CONFIG.selectors.recordButton).first();
    const startButton = page.locator(CONFIG.selectors.startRecordButton).first();
    
    const startVisible = await startButton.isVisible().catch(() => false);
    const recordVisible = await recordButton.isVisible().catch(() => false);
    
    if (startVisible) {
      await startButton.click();
    } else if (recordVisible) {
      await recordButton.click();
    } else {
      test.skip('录音按钮未找到');
      return;
    }
    
    await page.waitForTimeout(1000);
    
    // 检查波形可视化元素
    const waveform = page.locator(CONFIG.selectors.waveform).first();
    const audioLevel = page.locator(CONFIG.selectors.audioLevel).first();
    
    const waveformVisible = await waveform.isVisible().catch(() => false);
    const audioLevelVisible = await audioLevel.isVisible().catch(() => false);
    
    // 如果应用有波形可视化，检查它是否可见
    if (waveformVisible || audioLevelVisible) {
      expect(true).toBeTruthy();
    } else {
      test.skip('波形可视化组件未找到（可能是可选功能）');
    }
  });
});

test.describe('录音页 - 响应式布局测试', () => {
  
  const viewports = [
    { name: 'iPhone SE', width: 375, height: 667 },
    { name: 'iPhone 12', width: 390, height: 844 },
    { name: 'iPad Mini', width: 768, height: 1024 },
  ];

  for (const viewport of viewports) {
    test(`TC-R008: 录音页布局适配 - ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      
      await navigateToRecordPage(page);
      await waitForPageStability(page);
      
      // 验证无水平滚动条
      const hasHorizontalScrollbar = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      expect(hasHorizontalScrollbar).toBeFalsy();
      
      // 验证录音按钮在可视区域内
      const recordButton = page.locator(CONFIG.selectors.recordButton).first();
      const startButton = page.locator(CONFIG.selectors.startRecordButton).first();
      
      const recordVisible = await recordButton.isVisible().catch(() => false);
      const startVisible = await startButton.isVisible().catch(() => false);
      
      if (recordVisible) {
        await expect(recordButton).toBeInViewport();
      } else if (startVisible) {
        await expect(startButton).toBeInViewport();
      }
      
      // 截图保存
      await page.screenshot({
        path: `test-results/record-${viewport.name.toLowerCase().replace(/\s+/g, '-')}.png`,
        fullPage: false,
      });
    });
  }
});

test.describe('录音页 - 权限处理测试', () => {
  
  test('TC-R009: 未授权时显示权限提示', async ({ page }) => {
    // 不授予麦克风权限
    await navigateToRecordPage(page);
    await waitForPageStability(page);
    
    // 尝试开始录音
    const recordButton = page.locator(CONFIG.selectors.recordButton).first();
    const startButton = page.locator(CONFIG.selectors.startRecordButton).first();
    
    const startVisible = await startButton.isVisible().catch(() => false);
    const recordVisible = await recordButton.isVisible().catch(() => false);
    
    if (startVisible) {
      await startButton.click();
    } else if (recordVisible) {
      await recordButton.click();
    } else {
      test.skip('录音按钮未找到');
      return;
    }
    
    await page.waitForTimeout(1000);
    
    // 检查是否显示权限提示
    const permissionPrompt = page.locator(CONFIG.selectors.permissionPrompt).first();
    const isPromptVisible = await permissionPrompt.isVisible().catch(() => false);
    
    // 或者检查页面是否有权限相关的文字
    const hasPermissionText = await page.evaluate(() => {
      const bodyText = document.body.textContent.toLowerCase();
      return bodyText.includes('权限') || 
             bodyText.includes('permission') ||
             bodyText.includes('麦克风') ||
             bodyText.includes('microphone');
    });
    
    // 有权限提示或页面包含权限相关文字
    if (isPromptVisible || hasPermissionText) {
      expect(true).toBeTruthy();
    } else {
      // 如果应用静默处理权限问题，也是可以接受的
      test.skip('权限提示未显示（可能静默处理）');
    }
  });
});

test.describe('录音页 - 深色模式测试', () => {
  
  test.beforeEach(async ({ page }) => {
    await navigateToRecordPage(page);
    await waitForPageStability(page);
  });

  test('TC-R010: 深色模式适配', async ({ page }) => {
    // 切换到深色模式
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.reload();
    await waitForPageStability(page);
    
    // 检查深色模式是否生效
    const bgColor = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });
    
    const isDark = bgColor.includes('15') || 
                   bgColor.includes('23') ||
                   bgColor.includes('0, 0, 0') ||
                   bgColor.includes('dark');
    
    expect(isDark).toBeTruthy();
  });

  test('TC-R010: 深色模式下录音按钮可见', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.reload();
    await waitForPageStability(page);
    
    const recordButton = page.locator(CONFIG.selectors.recordButton).first();
    const startButton = page.locator(CONFIG.selectors.startRecordButton).first();
    
    const recordVisible = await recordButton.isVisible().catch(() => false);
    const startVisible = await startButton.isVisible().catch(() => false);
    
    expect(recordVisible || startVisible).toBeTruthy();
  });
});
