import * as cheerio from 'cheerio';
import type { ArticleMetadata, DomainRule, ExtractedImage, ExtractedLink, ParseResult, Platform } from './models';

export class ExtractionEngine {
  extract(html: string, url: string, platform: Platform, rule?: DomainRule, includeRawHTML = false): ParseResult {
    const startedAt = Date.now();
    const errors: string[] = [];

    const $ = cheerio.load(html);

    const metadata = this.extractMeta($, url, rule);
    this.removeNoise($, rule);

    const content = this.extractMainContent($, rule);
    const cleanedHTML = this.extractMainHTML($, rule);
    const images = this.extractImages($, url, rule);
    const links = this.extractLinks($, url, rule);

    const wordCount = this.countWords(content);
    metadata.wordCount = wordCount;
    metadata.estimatedReadTime = Math.max(1, Math.ceil(wordCount / 280));

    const status = content.length >= 80 ? 'success' : content.length > 20 ? 'partial' : 'failed';

    return {
      status,
      platform,
      contentType: platform === 'xiaohongshu' ? 'socialPost' : 'article',
      metadata,
      content,
      rawHTML: includeRawHTML ? html : undefined,
      cleanedHTML,
      textContent: content,
      images,
      links,
      errors,
      parseMode: status === 'success' ? 'full' : 'fallback',
      parseTimeMs: Date.now() - startedAt,
    };
  }

  private extractMeta($: cheerio.CheerioAPI, url: string, rule?: DomainRule): ArticleMetadata {
    const title = this.firstText($, [rule?.titleSelector, 'meta[property="og:title"]', 'title']);
    const author = this.firstText($, [rule?.authorSelector, '#js_name', 'meta[name="author"]', 'meta[property="article:author"]']);
    const description = this.firstAttr($, ['meta[property="og:description"]', 'meta[name="description"]'], 'content');
    const featuredImage = this.firstAttr($, ['meta[property="og:image"]'], 'content');
    const language = $('html').attr('lang') || undefined;
    const canonicalURL =
      this.firstAttr($, ['meta[property="og:url"]', 'link[rel="canonical"]'], 'content') ||
      this.firstAttr($, ['link[rel="canonical"]'], 'href') ||
      url;

    return {
      title,
      author,
      description,
      featuredImage,
      language,
      canonicalURL,
      siteName: this.firstAttr($, ['meta[property="og:site_name"]'], 'content'),
      tags: this.extractKeywords($),
    };
  }

  private removeNoise($: cheerio.CheerioAPI, rule?: DomainRule) {
    const baseNoise = [
      'script',
      'style',
      'noscript',
      'iframe',
      'footer',
      'nav',
      'header',
      '[class*="comment"]',
      '[class*="share"]',
      '[class*="recommend"]',
      '[class*="sidebar"]',
      '[class*="ad-"]',
    ];

    const all = [...baseNoise, ...(rule?.noiseSelectors ?? [])];
    for (const selector of all) {
      $(selector).remove();
    }
  }

  private extractMainContent($: cheerio.CheerioAPI, rule?: DomainRule): string {
    if (rule?.contentSelector) {
      const text = this.normalizeText($(rule.contentSelector).first().text());
      if (text.length >= 40) return text;
    }

    const candidates = ['article', 'main', '#js_content', '.rich_media_content', '.post-content', '.entry-content', 'body'];
    let best = '';
    for (const selector of candidates) {
      const text = this.normalizeText($(selector).first().text());
      if (text.length > best.length) best = text;
    }

    return best;
  }

  private extractMainHTML($: cheerio.CheerioAPI, rule?: DomainRule): string | undefined {
    if (rule?.contentSelector) {
      const html = $(rule.contentSelector).first().html();
      if (html && html.trim()) return html;
    }

    const html = $('article').first().html() ?? $('main').first().html() ?? $('#js_content').first().html();
    return html?.trim() ? html : undefined;
  }

  private extractImages($: cheerio.CheerioAPI, url: string, rule?: DomainRule): ExtractedImage[] {
    const root = rule?.contentSelector ? $(rule.contentSelector).first() : $('body');
    const result: ExtractedImage[] = [];

    root.find('img').each((_, el) => {
      const $img = $(el);
      const src =
        $img.attr('data-src') || $img.attr('data-original') || $img.attr('data-lazy-src') || $img.attr('src') || '';
      if (!src || src.startsWith('data:')) return;

      const normalizedSrc = this.resolveUrl(src, url) || src;
      const width = this.toInt($img.attr('width'));
      const height = this.toInt($img.attr('height'));
      if (width !== undefined && height !== undefined && width <= 2 && height <= 2) return;

      result.push({
        src: normalizedSrc,
        alt: $img.attr('alt') || undefined,
        width,
        height,
      });
    });

    return result;
  }

  private extractLinks($: cheerio.CheerioAPI, url: string, rule?: DomainRule): ExtractedLink[] {
    const root = rule?.contentSelector ? $(rule.contentSelector).first() : $('body');
    const currentHost = this.safeHost(url);
    const result: ExtractedLink[] = [];

    root.find('a[href]').each((_, el) => {
      const $a = $(el);
      const href = $a.attr('href') || '';
      if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;

      const resolved = this.resolveUrl(href, url) || href;
      const linkHost = this.safeHost(resolved);

      result.push({
        href: resolved,
        text: this.normalizeText($a.text()),
        isExternal: !!linkHost && !!currentHost && linkHost !== currentHost,
      });
    });

    return result;
  }

  private firstText($: cheerio.CheerioAPI, selectors: Array<string | undefined>): string | undefined {
    for (const selector of selectors) {
      if (!selector) continue;
      const el = $(selector).first();
      if (!el.length) continue;
      const content = el.attr('content') || el.text();
      const normalized = this.normalizeText(content);
      if (normalized) return normalized;
    }
    return undefined;
  }

  private firstAttr($: cheerio.CheerioAPI, selectors: string[], attr: string): string | undefined {
    for (const selector of selectors) {
      const value = $(selector).first().attr(attr);
      if (value && value.trim()) return value.trim();
    }
    return undefined;
  }

  private extractKeywords($: cheerio.CheerioAPI): string[] {
    const raw = $('meta[name="keywords"]').attr('content') || '';
    return raw
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
  }

  private resolveUrl(path: string, base: string): string | undefined {
    try {
      return new URL(path, base).toString();
    } catch {
      return undefined;
    }
  }

  private safeHost(url: string): string | undefined {
    try {
      return new URL(url).host;
    } catch {
      return undefined;
    }
  }

  private toInt(value: string | undefined): number | undefined {
    if (!value) return undefined;
    const n = Number.parseInt(value, 10);
    return Number.isFinite(n) ? n : undefined;
  }

  private normalizeText(value: string): string {
    return value.replace(/\s+/g, ' ').trim();
  }

  private countWords(text: string): number {
    if (!text) return 0;
    const cjk = (text.match(/[\u3400-\u9FBF]/g) ?? []).length;
    const latin = text
      .replace(/[\u3400-\u9FBF]/g, ' ')
      .split(/\s+/)
      .filter(Boolean).length;
    return cjk + latin;
  }
}
