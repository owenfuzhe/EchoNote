import { CapturedContent } from '../types';

const DEFAULT_TIMEOUT = 30000;

const WECHAT_URL_PATTERNS = [
  /^https?:\/\/mp\.weixin\.qq\.com\/s(?:\?.+|\/.+)/i,
  /^https?:\/\/mp\.weixin\.qq\.com\/mp\/appmsg\/show\?/i,
];

const BILIBILI_URL_PATTERNS = [
  /^https?:\/\/www\.bilibili\.com\/video\/(BV[\w]+)/i,
  /^https?:\/\/b23\.tv\/(BV[\w]+)/i,
  /^https?:\/\/www\.bilibili\.com\/video\/av(\d+)/i,
];

const XIAOHONGSHU_URL_PATTERNS = [
  /^https?:\/\/((www|m)\.)?xiaohongshu\.com\/(explore|discovery\/item)\/[a-zA-Z0-9]+/i,
  /^https?:\/\/((www|m)\.)?xhslink\.com\/[a-zA-Z0-9]+/i,
];

export const isWechatUrl = (url: string) => WECHAT_URL_PATTERNS.some((p) => p.test(url));
export const isBilibiliUrl = (url: string) => BILIBILI_URL_PATTERNS.some((p) => p.test(url));
export const isXiaohongshuUrl = (url: string) => XIAOHONGSHU_URL_PATTERNS.some((p) => p.test(url));

function htmlToPlainText(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeXiaohongshuUrl(rawUrl: string): string {
  const input = rawUrl.trim();
  try {
    const parsed = new URL(input);
    const host = parsed.hostname.toLowerCase();
    if (host === 'xiaohongshu.com' || host === 'm.xiaohongshu.com') parsed.hostname = 'www.xiaohongshu.com';
    const discoveryMatch = parsed.pathname.match(/^\/discovery\/item\/([a-zA-Z0-9]+)/i);
    if (discoveryMatch?.[1]) parsed.pathname = `/explore/${discoveryMatch[1]}`;
    return parsed.toString();
  } catch {
    return input;
  }
}

async function requestJSON(baseUrl: string, path: string, body: Record<string, unknown>, timeout = DEFAULT_TIMEOUT) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      const e = await res.text();
      throw new Error(e || `Request failed: ${res.status}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchContent(url: string, backendBaseUrl: string): Promise<CapturedContent> {
  const target = isXiaohongshuUrl(url) ? normalizeXiaohongshuUrl(url) : url;

  if (isWechatUrl(target)) {
    const data = await requestJSON(backendBaseUrl, '/api/fetch/wechat', { url: target, plain_text: true });
    return {
      title: data.title || 'Untitled',
      author: data.author || 'Unknown',
      content: htmlToPlainText(data.content || ''),
      sourceWebpage: data.source_webpage || data.url || target,
      snapshotHtml: data.snapshot_html,
    };
  }

  if (isXiaohongshuUrl(target)) {
    const data = await requestJSON(backendBaseUrl, '/api/fetch/xiaohongshu', { url: target });
    return {
      title: data.title || 'Untitled',
      author: data.author || 'Unknown',
      content: data.content || '',
      sourceWebpage: data.source_webpage || data.url || target,
      snapshotHtml: data.snapshot_html,
      restricted: data.restricted,
    };
  }

  if (isBilibiliUrl(target)) {
    const bvidMatch = target.match(/BV[\w]+/i);
    const bvid = bvidMatch?.[0];
    if (!bvid) throw new Error('无法识别 B 站视频 ID');
    const data = await requestJSON(backendBaseUrl, '/api/fetch/bilibili', { bvid, url: target });
    return {
      title: data.title || 'Untitled',
      content: `${data.description || ''}\n\n${data.subtitle || ''}`.trim(),
      sourceWebpage: data.url || target,
      uploader: data.uploader,
      bvid,
      description: data.description,
    };
  }

  const data = await requestJSON(backendBaseUrl, '/api/fetch/web', { url: target });
  return {
    title: data.title || 'Untitled',
    content: data.content || '',
    sourceWebpage: data.source_webpage || data.url || target,
    snapshotHtml: data.snapshot_html,
  };
}
