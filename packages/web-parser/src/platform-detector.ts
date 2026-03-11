import type { Platform } from './models';

const DOMAIN_MAP: Record<string, Platform> = {
  'mp.weixin.qq.com': 'wechat',
  'weixin.qq.com': 'wechat',
  'www.xiaohongshu.com': 'xiaohongshu',
  'xiaohongshu.com': 'xiaohongshu',
  'xhslink.com': 'xiaohongshu',
  'www.zhihu.com': 'zhihu',
  'zhuanlan.zhihu.com': 'zhihu',
  'juejin.cn': 'juejin',
  'www.jianshu.com': 'jianshu',
  'jianshu.com': 'jianshu',
};

export function detectPlatform(url: string): Platform {
  let host = '';
  try {
    host = new URL(url).host.toLowerCase();
  } catch {
    return 'generic';
  }

  if (DOMAIN_MAP[host]) return DOMAIN_MAP[host];

  for (const [domain, platform] of Object.entries(DOMAIN_MAP)) {
    if (host.endsWith(`.${domain}`)) return platform;
  }

  return 'generic';
}