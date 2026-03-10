import puppeteer from 'puppeteer';
import TurndownService from 'turndown';

export interface WechatArticle {
  success: boolean;
  title?: string;
  author?: string;
  publishTime?: string;
  content?: string; // markdown
  coverImage?: string;
  error?: string;
}

const turndownService = new TurndownService({
  headingStyle: 'atx',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
});

// 清理微信文章的 HTML，移除不必要的元素
function cleanWechatHTML(html: string): string {
  // 移除脚本和样式
  html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  
  // 移除微信特定的元素
  html = html.replace(/<mp[^>]*>[\s\S]*?<\/mp[^>]*>/gi, '');
  html = html.replace(/<span[^>]*class="[^"]*js_darkmode[^"]*"[^>]*>/gi, '<span>');
  
  return html;
}

export async function parseWechatArticle(url: string): Promise<WechatArticle> {
  // 验证 URL
  if (!url.match(/^https?:\/\/mp\.weixin\.qq\.com\/s\/[a-zA-Z0-9_-]+/)) {
    return {
      success: false,
      error: 'Invalid WeChat article URL. Expected format: https://mp.weixin.qq.com/s/...',
    };
  }

  let browser;
  
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920,1080',
      ],
    });

    const page = await browser.newPage();
    
    // 设置 User-Agent 模拟微信内置浏览器
    await page.setUserAgent(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.38(0x18002628) NetType/WIFI Language/zh_CN'
    );
    
    // 设置 viewport
    await page.setViewport({
      width: 375,
      height: 667,
      deviceScaleFactor: 2,
    });

    // 访问页面
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    // 等待文章加载
    await page.waitForSelector('#js_content', { timeout: 10000 });

    // 提取数据
    const articleData = await page.evaluate(() => {
      const titleEl = document.querySelector('h2.rich_media_title');
      const authorEl = document.querySelector('#js_name');
      const contentEl = document.querySelector('#js_content');
      const metaEl = document.querySelector('#publish_time');
      const coverEl = document.querySelector('img#js_pc_qr_code_img') || 
                      document.querySelector('.rich_media_thumb img');

      // 获取发布时间
      let publishTime = '';
      if (metaEl) {
        publishTime = metaEl.textContent?.trim() || '';
      } else {
        // 尝试从脚本变量中提取
        const scripts = document.querySelectorAll('script');
        for (const script of scripts) {
          const text = script.textContent || '';
          const match = text.match(/svr_time\s*=\s*["']?(\d+)["']?/);
          if (match) {
            const timestamp = parseInt(match[1]) * 1000;
            publishTime = new Date(timestamp).toISOString();
            break;
          }
        }
      }

      // 清理内容中的图片 src
      const contentClone = contentEl?.cloneNode(true) as HTMLElement;
      if (contentClone) {
        const images = contentClone.querySelectorAll('img');
        images.forEach(img => {
          const dataSrc = img.getAttribute('data-src');
          if (dataSrc) {
            img.setAttribute('src', dataSrc);
          }
        });
      }

      return {
        title: titleEl?.textContent?.trim() || '',
        author: authorEl?.textContent?.trim() || '',
        publishTime,
        content: contentClone?.innerHTML || contentEl?.innerHTML || '',
        coverImage: (coverEl as HTMLImageElement)?.src || '',
      };
    });

    // 清理 HTML
    const cleanedHTML = cleanWechatHTML(articleData.content);
    
    // 转换为 Markdown
    const markdown = turndownService.turndown(cleanedHTML);

    await browser.close();

    return {
      success: true,
      title: articleData.title,
      author: articleData.author,
      publishTime: articleData.publishTime,
      content: markdown,
      coverImage: articleData.coverImage,
    };

  } catch (error) {
    if (browser) {
      await browser.close();
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // 判断错误类型
    if (errorMessage.includes('timeout')) {
      return {
        success: false,
        error: 'Page load timeout. The article may be deleted or require authentication.',
      };
    }
    
    if (errorMessage.includes('Navigation failed')) {
      return {
        success: false,
        error: 'Failed to load the article. Please check the URL.',
      };
    }

    return {
      success: false,
      error: `Failed to parse article: ${errorMessage}`,
    };
  }
}

// 批量解析（带速率限制）
export async function parseWechatArticles(urls: string[], delayMs = 2000): Promise<WechatArticle[]> {
  const results: WechatArticle[] = [];
  
  for (const url of urls) {
    const result = await parseWechatArticle(url);
    results.push(result);
    
    // 延迟避免被封
    if (urls.indexOf(url) < urls.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  return results;
}
