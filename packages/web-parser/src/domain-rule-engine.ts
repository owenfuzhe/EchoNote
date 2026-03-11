import type { DomainRule } from './models';
import { detectPlatform } from './platform-detector';

function builtInRules(): Record<string, DomainRule> {
  return {
    'mp.weixin.qq.com': {
      domain: 'mp.weixin.qq.com',
      platform: 'wechat',
      contentSelector: '#js_content',
      titleSelector: '#activity-name, h1.rich_media_title',
      authorSelector: '#js_name',
      dateSelector: '#publish_time',
      noiseSelectors: ['#js_pc_qr_code', '.qr_code_pc', '#js_share_btn', '.rich_media_tool'],
      requiresJavaScript: false,
      customHeaders: {
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.38',
      },
    },
    'www.xiaohongshu.com': {
      domain: 'www.xiaohongshu.com',
      platform: 'xiaohongshu',
      contentSelector: '#detail-desc, .note-content, .content',
      titleSelector: '#detail-title, .title, h1',
      authorSelector: '.user-nickname, .author-name, .username',
      noiseSelectors: ['script', 'style', '.recommend-container', '.comment-container'],
      requiresJavaScript: true,
      customHeaders: {
        Referer: 'https://www.xiaohongshu.com/',
      },
    },
    'xhslink.com': {
      domain: 'xhslink.com',
      platform: 'xiaohongshu',
      contentSelector: '#detail-desc, .note-content, .content',
      titleSelector: '#detail-title, .title, h1',
      authorSelector: '.user-nickname, .author-name, .username',
      noiseSelectors: ['script', 'style', '.recommend-container', '.comment-container'],
      requiresJavaScript: true,
      customHeaders: {
        Referer: 'https://www.xiaohongshu.com/',
      },
    },
  };
}

export class DomainRuleEngine {
  private readonly rules: Record<string, DomainRule>;
  private readonly customRules: Record<string, DomainRule> = {};

  constructor() {
    this.rules = builtInRules();
  }

  resolve(url: string): DomainRule | undefined {
    let host = '';
    try {
      host = new URL(url).host.toLowerCase();
    } catch {
      return undefined;
    }

    if (this.customRules[host]) return this.customRules[host];
    if (this.rules[host]) return this.rules[host];

    const parts = host.split('.');
    if (parts.length > 2) {
      for (let i = 1; i < parts.length - 1; i += 1) {
        const key = parts.slice(i).join('.');
        if (this.customRules[key]) return this.customRules[key];
        if (this.rules[key]) return this.rules[key];
      }
    }

    return undefined;
  }

  detectPlatform(url: string) {
    return this.resolve(url)?.platform ?? detectPlatform(url);
  }

  addCustomRule(rule: DomainRule) {
    this.customRules[rule.domain.toLowerCase()] = rule;
  }
}
