import * as cheerio from 'cheerio';
import { ExtractionEngine } from './extraction-engine';
import type { DomainRule, ParseResult, Platform } from './models';

export interface PlatformParser {
  platform: Platform;
  parse(html: string, url: string, rule?: DomainRule, includeRawHTML?: boolean): ParseResult;
}

class WechatParser implements PlatformParser {
  platform: Platform = 'wechat';
  private readonly engine = new ExtractionEngine();

  parse(html: string, url: string, rule?: DomainRule, includeRawHTML = false): ParseResult {
    const result = this.engine.extract(html, url, this.platform, rule, includeRawHTML);

    if (result.cleanedHTML) {
      const $content = cheerio.load(`<div id="__wechat_content__">${result.cleanedHTML}</div>`);
      $content('#__wechat_content__ img[data-src]').each((_, el) => {
        const $img = $content(el);
        const dataSrc = $img.attr('data-src');
        if (dataSrc) $img.attr('src', dataSrc);
      });
      result.cleanedHTML = $content('#__wechat_content__').html() ?? result.cleanedHTML;
    }

    if ((!result.content || !result.content.trim()) && (!result.cleanedHTML || !result.cleanedHTML.trim())) {
      const $raw = cheerio.load(html);
      const rawContent = $raw('#js_content').first();
      const fallbackHTML = rawContent.html()?.trim();
      const fallbackText = rawContent.text().replace(/\s+/g, ' ').trim();

      if (fallbackHTML || fallbackText) {
        result.cleanedHTML = fallbackHTML || result.cleanedHTML;
        result.content = fallbackText || result.content;
        result.textContent = result.content;

        if (result.content.length >= 80) {
          result.status = 'success';
          result.parseMode = 'full';
        } else if (result.content.length > 20) {
          result.status = 'partial';
          result.parseMode = 'partial';
        }
      }
    }

    if (!result.metadata.publishDate) {
      const match = html.match(/var\s+ct\s*=\s*["'](\d{10,13})["']/);
      if (match) {
        const ts = Number.parseInt(match[1], 10);
        if (Number.isFinite(ts)) {
          const date = new Date(ts > 1_000_000_000_000 ? ts : ts * 1000);
          result.metadata.publishDate = date.toISOString();
        }
      }
    }

    result.metadata.siteName = result.metadata.siteName || '微信公众号';
    result.metadata.language = result.metadata.language || 'zh';

    return result;
  }
}

class XiaohongshuParser implements PlatformParser {
  platform: Platform = 'xiaohongshu';
  private readonly engine = new ExtractionEngine();

  parse(html: string, url: string, rule?: DomainRule, includeRawHTML = false): ParseResult {
    const resultFromState = this.parseInitialState(html, url, includeRawHTML);
    if (resultFromState) return resultFromState;

    // 尝试解析 meta 标签中的内容（针对某些预览页或受限页）
    const resultFromMeta = this.parseFromMeta(html, url, includeRawHTML);
    if (resultFromMeta) return resultFromMeta;

    const result = this.engine.extract(html, url, this.platform, rule, includeRawHTML);
    result.metadata.siteName = result.metadata.siteName || '小红书';
    result.metadata.language = result.metadata.language || 'zh';
    return result;
  }

  private parseFromMeta(html: string, url: string, includeRawHTML: boolean): ParseResult | undefined {
    const $ = cheerio.load(html);
    const title = $('meta[property="og:title"]').attr('content') || $('title').text();
    const desc = $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content');
    const author = $('meta[name="author"]').attr('content') || $('.nickname').text();
    
    if (!title || title.includes('验证码') || title.includes('Captcha')) return undefined;

    const content = [title, desc].filter(Boolean).join('\n\n');
    if (content.length < 10) return undefined;

    return {
      status: 'success',
      platform: 'xiaohongshu',
      contentType: 'socialPost',
      metadata: {
        title: title.replace(' - 小红书', ''),
        author: author || '小红书用户',
        siteName: '小红书',
        canonicalURL: url,
        wordCount: content.length,
        estimatedReadTime: Math.max(1, Math.ceil(content.length / 300)),
        tags: [],
      },
      content,
      rawHTML: includeRawHTML ? html : undefined,
      cleanedHTML: undefined,
      textContent: content,
      images: [],
      links: [],
      errors: [],
      parseMode: 'full',
      parseTimeMs: 0,
    };
  }

  private parseInitialState(html: string, url: string, includeRawHTML: boolean): ParseResult | undefined {
    // 调试：打印是否找到状态
    const matched = html.match(/window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\})\s*<\/script>/);
    if (!matched) {
      // 尝试匹配另一种可能的混淆格式
      const matchedAlt = html.match(/window\[['"]__INITIAL_STATE__['"]\]\s*=\s*(\{[\s\S]*?\})\s*<\/script>/);
      if (!matchedAlt) return undefined;
      return this.processStateData(matchedAlt[1], html, url, includeRawHTML);
    }
    return this.processStateData(matched[1], html, url, includeRawHTML);
  }

  private processStateData(jsonStr: string, html: string, url: string, includeRawHTML: boolean): ParseResult | undefined {
    const data = jsonStr.replace(/undefined/g, 'null');
    let parsed: Record<string, unknown> | undefined;
    try {
      parsed = JSON.parse(data) as Record<string, unknown>;
    } catch {
      return undefined;
    }

    const note = this.readFirstNote(parsed);
    if (!note) return undefined;

    const title = this.pickString(note.title);
    const desc = this.pickString(note.desc) || '';
    const author = this.pickString((note.user as Record<string, unknown> | undefined)?.nickname) || 
                   this.pickString((parsed?.user as Record<string, any>)?.nickname);

    const content = [title, desc].filter(Boolean).join('\n\n');
    const wordCount = content.length;

    return {
      status: content.length > 5 ? 'success' : 'partial',
      platform: 'xiaohongshu',
      contentType: 'socialPost',
      metadata: {
        title: title || '小红书笔记',
        author: author || '未知作者',
        siteName: '小红书',
        canonicalURL: url,
        wordCount,
        estimatedReadTime: Math.max(1, Math.ceil(wordCount / 300)),
        tags: this.readTags(note),
      },
      content,
      rawHTML: includeRawHTML ? html : undefined,
      cleanedHTML: undefined,
      textContent: content,
      images: this.readImages(note),
      links: [],
      errors: [],
      parseMode: 'full',
      parseTimeMs: 0,
    };
  }

  private readFirstNote(parsed?: Record<string, unknown>): Record<string, unknown> | undefined {
    const note = parsed?.note as Record<string, unknown> | undefined;
    
    // 如果是新版笔记详情结构
    const noteDetailMap = note?.noteDetailMap as Record<string, unknown> | undefined;
    if (noteDetailMap) {
      const first = Object.values(noteDetailMap)[0] as Record<string, unknown> | undefined;
      if (first?.note) return first.note as Record<string, unknown>;
    }

    // 备选结构：直接在 note 下
    if (note?.title || note?.desc) return note;
    
    // 另一种结构：detail 下
    const detail = parsed?.detail as Record<string, unknown> | undefined;
    if (detail?.title || detail?.desc) return detail;

    return undefined;
  }

  private readTags(note: Record<string, unknown>): string[] {
    const tagList = note.tagList as Array<Record<string, unknown>> | undefined;
    if (!Array.isArray(tagList)) return [];
    return tagList
      .map((item) => this.pickString(item.name))
      .filter((x): x is string => Boolean(x));
  }

  private readImages(note: Record<string, unknown>) {
    const imageList = note.imageList as Array<Record<string, unknown>> | undefined;
    if (!Array.isArray(imageList)) return [];

    return imageList
      .map((item) => ({
        src: this.pickString(item.urlDefault) || this.pickString(item.url) || '',
        width: this.pickNumber(item.width),
        height: this.pickNumber(item.height),
      }))
      .filter((item) => item.src);
  }

  private pickString(input: unknown): string | undefined {
    return typeof input === 'string' && input.trim() ? input.trim() : undefined;
  }

  private pickNumber(input: unknown): number | undefined {
    return typeof input === 'number' && Number.isFinite(input) ? input : undefined;
  }
}

export class PlatformParserRegistry {
  private readonly parsers = new Map<Platform, PlatformParser>();
  private readonly engine = new ExtractionEngine();

  constructor() {
    const all: PlatformParser[] = [new WechatParser(), new XiaohongshuParser()];
    for (const parser of all) {
      this.parsers.set(parser.platform, parser);
    }
  }

  parse(platform: Platform, html: string, url: string, rule?: DomainRule, includeRawHTML = false): ParseResult {
    const parser = this.parsers.get(platform);
    if (parser) {
      return parser.parse(html, url, rule, includeRawHTML);
    }

    return this.engine.extract(html, url, platform, rule, includeRawHTML);
  }
}
