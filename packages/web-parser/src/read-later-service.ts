import * as cheerio from 'cheerio';
import * as http from 'node:http';
import * as https from 'node:https';
import puppeteer, { type HTTPRequest } from 'puppeteer';
import { DomainRuleEngine } from './domain-rule-engine';
import { PlatformParserRegistry } from './platform-parsers';
import type { ParseOptions, ParseResponse, Platform } from './models';

export class ReadLaterService {
  private readonly ruleEngine = new DomainRuleEngine();
  private readonly parserRegistry = new PlatformParserRegistry();

  async parseUrl(url: string, options: ParseOptions = {}): Promise<ParseResponse> {
    const normalized = this.normalizeUrl(url);
    if (!normalized) {
      return { success: false, error: 'Invalid URL' };
    }

    const rule = this.ruleEngine.resolve(normalized);
    const platform = options.forcePlatform ?? this.ruleEngine.detectPlatform(normalized);

    try {
      const html = await this.fetchHTML(normalized, {
        useJavaScript: options.preferJavaScript ?? rule?.requiresJavaScript ?? false,
        headers: rule?.customHeaders,
      });

      const data = this.parserRegistry.parse(platform, html, normalized, rule, options.includeRawHTML === true);
      return { success: true, data };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown parser error';
      return { success: false, error: message };
    }
  }

  async parseWechat(url: string, options: Omit<ParseOptions, 'forcePlatform'> = {}): Promise<ParseResponse> {
    return this.parseUrl(url, { ...options, forcePlatform: 'wechat' });
  }

  async parseXiaohongshu(url: string, options: Omit<ParseOptions, 'forcePlatform'> = {}): Promise<ParseResponse> {
    return this.parseUrl(this.normalizeXiaohongshuUrl(url), { ...options, forcePlatform: 'xiaohongshu' });
  }

  private normalizeUrl(input: string): string | undefined {
    try {
      return new URL(input).toString();
    } catch {
      return undefined;
    }
  }

  private normalizeXiaohongshuUrl(input: string): string {
    const normalized = this.normalizeUrl(input) ?? input.trim();

    try {
      const parsed = new URL(normalized);
      const host = parsed.hostname.toLowerCase();

      if (host === 'xiaohongshu.com' || host === 'm.xiaohongshu.com') {
        parsed.hostname = 'www.xiaohongshu.com';
      }

      const discoveryMatch = parsed.pathname.match(/^\/discovery\/item\/([a-zA-Z0-9]+)/i);
      if (discoveryMatch?.[1]) {
        parsed.pathname = `/explore/${discoveryMatch[1]}`;
      }

      return parsed.toString();
    } catch {
      return normalized;
    }
  }

  private async fetchHTML(
    url: string,
    config: { useJavaScript: boolean; headers?: Record<string, string> },
  ): Promise<string> {
    if (config.useJavaScript) {
      return this.fetchByBrowser(url, config.headers);
    }

    const headers = {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      ...(config.headers ?? {}),
    };

    try {
      const response = await fetch(url, {
        headers,
        redirect: 'follow',
      });

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }

      return response.text();
    } catch (error) {
      // Some hosts fail under the built-in fetch client on Render free instances.
      return this.fetchByNodeRequest(url, headers, error);
    }
  }

  private async fetchByBrowser(url: string, headers?: Record<string, string>): Promise<string> {
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
      ],
    });

    try {
      const page = await browser.newPage();
      
      // 隐藏自动化特征
      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
      });

      await page.setViewport({ width: 1280, height: 800 });
      await page.setUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      );

      if (headers && Object.keys(headers).length) {
        await page.setExtraHTTPHeaders(headers);
      }

      await page.setRequestInterception(true);
      page.on('request', (req: HTTPRequest) => {
        const type = req.resourceType();
        if (type === 'image' || type === 'font' || type === 'media') {
          req.abort().catch(() => undefined);
          return;
        }
        req.continue().catch(() => undefined);
      });

      console.log(`[Browser] Navigating to: ${url}`);
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        
        // 增加随机等待
        await new Promise(resolve => setTimeout(resolve, 5000 + Math.random() * 2000));
        
        // 模拟更真实的交互
        await page.mouse.move(100, 100);
        await page.evaluate(() => window.scrollBy(0, 500));
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await page.waitForNetworkIdle({ timeout: 5000 }).catch(() => undefined);
      } catch (gotoError) {
        console.error(`[Browser] Navigation error for ${url}:`, gotoError);
      }
      
      // 等待内容加载
      await page.waitForFunction(
        () => {
          return (
            (window as any).__INITIAL_STATE__ || 
            document.querySelector('#detail-desc') || 
            document.querySelector('.note-content') ||
            document.querySelector('.content') ||
            document.querySelector('meta[property="og:title"]') ||
            (document.querySelector('title')?.innerText.length ?? 0) > 5
          );
        },
        { timeout: 8000 }
      ).catch(() => console.log('[Browser] Wait for content timed out, continuing anyway'));

      const content = await page.content();
      if (content.includes('verify-note') || content.includes('xhs_sec_server') || content.includes('验证码')) {
        console.warn('[Browser] Captcha or Security Redirect detected!');
      }
      return content;
    } catch (error) {
      console.error(`[Browser] Error fetching ${url}:`, error);
      throw error;
    } finally {
      await browser.close().catch(() => undefined);
    }
  }

  private fetchByNodeRequest(
    url: string,
    headers: Record<string, string>,
    originalError?: unknown,
    redirectCount = 0,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      if (redirectCount > 5) {
        reject(new Error('Too many redirects'));
        return;
      }

      const parsed = new URL(url);
      const client = parsed.protocol === 'http:' ? http : https;

      const request = client.request(
        parsed,
        {
          method: 'GET',
          headers,
        },
        (response) => {
          const statusCode = response.statusCode || 0;

          if ([301, 302, 303, 307, 308].includes(statusCode) && response.headers.location) {
            response.resume();
            const nextUrl = new URL(response.headers.location, parsed).toString();
            this.fetchByNodeRequest(nextUrl, headers, originalError, redirectCount + 1).then(resolve).catch(reject);
            return;
          }

          if (statusCode < 200 || statusCode >= 300) {
            response.resume();
            reject(new Error(`Request failed: ${statusCode}`));
            return;
          }

          let body = '';
          response.setEncoding('utf8');
          response.on('data', (chunk) => {
            body += chunk;
          });
          response.on('end', () => {
            resolve(body);
          });
        },
      );

      request.setTimeout(30000, () => {
        request.destroy(new Error('Request timed out'));
      });
      request.on('error', (error) => {
        if (originalError instanceof Error) {
          reject(new Error(`Fetch failed after fallback: ${originalError.message}; ${error.message}`));
          return;
        }
        reject(error);
      });
      request.end();
    });
  }
}

function sanitizeWechatHtml(html?: string): string | undefined {
  if (!html || !html.trim()) return undefined;

  const $ = cheerio.load(`<div id="__wechat_root__">${html}</div>`);
  const $root = $('#__wechat_root__');

  $root.find('script,style,iframe,svg,canvas,link,meta,noscript').remove();

  $root.find('img').each((_, el) => {
    const $img = $(el);
    const src =
      $img.attr('src') || $img.attr('data-src') || $img.attr('data-original') || $img.attr('data-lazy-src') || '';

    if (!src || src.startsWith('data:')) {
      $img.remove();
      return;
    }

    const alt = ($img.attr('alt') || '').trim();
    $img.attr('src', src);

    for (const attr of Object.keys(el.attribs || {})) {
      if (attr !== 'src' && attr !== 'alt') $img.removeAttr(attr);
    }

    if (alt) {
      $img.attr('alt', alt);
    } else {
      $img.removeAttr('alt');
    }
  });

  const allowedTags = new Set([
    'p',
    'br',
    'strong',
    'em',
    'b',
    'i',
    'u',
    'blockquote',
    'ul',
    'ol',
    'li',
    'h1',
    'h2',
    'h3',
    'h4',
    'section',
    'img',
    'a',
  ]);
  const unwrapTags = new Set(['span', 'font', 'o:p']);

  $root.find('*').each((_, node) => {
    const $el = $(node);
    const tag = (node.tagName || '').toLowerCase();
    if (!tag) return;

    if (unwrapTags.has(tag)) {
      $el.replaceWith($el.contents());
      return;
    }

    if (!allowedTags.has(tag)) {
      $el.replaceWith($el.contents());
      return;
    }

    if (tag === 'a') {
      const href = $el.attr('href') || '';
      for (const attr of Object.keys(node.attribs || {})) {
        if (attr !== 'href') $el.removeAttr(attr);
      }
      if (!/^https?:\/\//i.test(href)) {
        $el.replaceWith($el.contents());
      }
      return;
    }

    if (tag !== 'img') {
      for (const attr of Object.keys(node.attribs || {})) {
        $el.removeAttr(attr);
      }
    }
  });

  $root.find('*').each((_, node) => {
    const tag = (node.tagName || '').toLowerCase();
    if (!tag || tag === 'img' || tag === 'br') return;
    const $el = $(node);
    const text = $el.text().replace(/\s+/g, ' ').trim();
    if (!text && $el.find('img').length === 0) {
      $el.remove();
    }
  });

  const cleaned = $root.html()?.trim();
  return cleaned || undefined;
}

export function parseResultToLegacyShape(platform: Platform, result: ParseResponse['data']) {
  if (!result) return null;

  if (platform === 'wechat') {
    return {
      title: result.metadata.title ?? 'Untitled',
      author: result.metadata.author ?? 'Unknown',
      content: sanitizeWechatHtml(result.cleanedHTML) ?? result.content,
      published_at: result.metadata.publishDate ?? new Date().toISOString(),
      url: result.metadata.canonicalURL ?? '',
      cover_image: result.metadata.featuredImage,
      raw_html: result.rawHTML,
      cleaned_html: result.cleanedHTML,
      text_content: result.textContent,
    };
  }

  if (platform === 'xiaohongshu') {
    return {
      title: result.metadata.title ?? 'Untitled',
      author: result.metadata.author ?? 'Unknown',
      content: result.content,
      published_at: result.metadata.publishDate ?? new Date().toISOString(),
      url: result.metadata.canonicalURL ?? '',
      cover_image: result.metadata.featuredImage,
      like_count: undefined,
      view_count: undefined,
      platform: 'xiaohongshu',
      restricted: result.status !== 'success',
      raw_html: result.rawHTML,
      cleaned_html: result.cleanedHTML,
      text_content: result.textContent,
    };
  }

  return {
    title: result.metadata.title ?? 'Untitled',
    content: result.content,
    url: result.metadata.canonicalURL ?? '',
    raw_html: result.rawHTML,
    cleaned_html: result.cleanedHTML,
    text_content: result.textContent,
  };
}
