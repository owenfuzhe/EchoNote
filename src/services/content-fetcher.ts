/**
 * 内容抓取服务 - Web 适配版
 * 支持微信公众号文章和 B站视频解析
 */

// =============================================================================
// Types
// =============================================================================

export interface WechatArticle {
  /** 文章标题 */
  title: string;
  /** 作者/公众号名称 */
  author: string;
  /** 正文内容（HTML 或纯文本） */
  content: string;
  /** 发布时间 */
  publishedAt: string;
  /** 原文链接 */
  url: string;
  /** 封面图片 */
  coverImage?: string;
  /** 摘要 */
  summary?: string;
}

export interface BilibiliVideo {
  /** 视频标题 */
  title: string;
  /** UP主名称 */
  uploader: string;
  /** 视频描述 */
  description: string;
  /** 封面图片 */
  coverImage?: string;
  /** BV号 */
  bvid: string;
  /** 视频时长（秒） */
  duration?: number;
  /** 播放量 */
  viewCount?: number;
  /** 点赞数 */
  likeCount?: number;
  /** 发布时间 */
  publishedAt?: string;
  /** 原文链接 */
  url: string;
  /** 字幕/AI总结 */
  subtitle?: string;
}

export interface XiaohongshuNote {
  /** 笔记标题 */
  title: string;
  /** 作者 */
  author: string;
  /** 正文内容 */
  content: string;
  /** 封面图片 */
  coverImage?: string;
  /** 点赞数 */
  likeCount?: number;
  /** 浏览量 */
  viewCount?: number;
  /** 发布时间 */
  publishedAt: string;
  /** 原文链接 */
  url: string;
  /** 平台标识 */
  platform: 'xiaohongshu';
  /** 是否受保护 */
  restricted?: boolean;
}

export interface FetchOptions {
  /** 是否返回纯文本内容（去除 HTML 标签） */
  plainText?: boolean;
  /** 超时时间（毫秒） */
  timeout?: number;
}

export interface FetchResult<T> {
  success: boolean;
  data?: T;
  error?: FetchError;
}

export interface FetchError {
  code: string;
  message: string;
  details?: any;
}

// =============================================================================
// Configuration
// =============================================================================

const DEFAULT_TIMEOUT = 30000;

// 从环境变量获取后端 URL
const getBackendUrl = (): string => {
  return import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
};

// 微信文章 URL 模式
const WECHAT_URL_PATTERNS = [
  /^https?:\/\/mp\.weixin\.qq\.com\/s\/.+/i,
  /^https?:\/\/mp\.weixin\.qq\.com\/mp\/appmsg\/show\?/i,
];

// B站视频 URL 模式
const BILIBILI_URL_PATTERNS = [
  /^https?:\/\/www\.bilibili\.com\/video\/(BV[\w]+)/i,
  /^https?:\/\/b23\.tv\/(BV[\w]+)/i,
  /^https?:\/\/www\.bilibili\.com\/video\/av(\d+)/i,
];

// 小红书 URL 模式
const XIAOHONGSHU_URL_PATTERNS = [
  /^https?:\/\/(www\.)?xiaohongshu\.com\/explore\/[a-zA-Z0-9]+/i,
  /^https?:\/\/xhslink\.com\/[a-zA-Z0-9]+/i,
];

// =============================================================================
// Error Classes
// =============================================================================

export class ContentFetcherError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'ContentFetcherError';
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * 检查 URL 是否为微信文章链接
 */
export function isWechatUrl(url: string): boolean {
  return WECHAT_URL_PATTERNS.some(pattern => pattern.test(url));
}

/**
 * 检查 URL 是否为B站视频链接
 */
export function isBilibiliUrl(url: string): boolean {
  return BILIBILI_URL_PATTERNS.some(pattern => pattern.test(url));
}

/**
 * 检查 URL 是否为小红书笔记链接
 */
export function isXiaohongshuUrl(url: string): boolean {
  return XIAOHONGSHU_URL_PATTERNS.some(pattern => pattern.test(url));
}

/**
 * 从B站URL提取BV号
 */
export function extractBvidFromUrl(url: string): string | null {
  for (const pattern of BILIBILI_URL_PATTERNS) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }
  return null;
}

/**
 * HTML 转纯文本
 */
function htmlToPlainText(html: string): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

// =============================================================================
// Main Fetch Functions
// =============================================================================

/**
 * 抓取微信公众号文章
 * 使用后端代理避免 CORS 限制
 */
export async function fetchWechatArticle(
  url: string,
  options: FetchOptions = {}
): Promise<FetchResult<WechatArticle>> {
  const { timeout = DEFAULT_TIMEOUT, plainText = false } = options;

  // 验证 URL
  if (!isWechatUrl(url)) {
    return {
      success: false,
      error: {
        code: 'INVALID_URL',
        message: 'Invalid WeChat article URL',
        details: 'URL must match mp.weixin.qq.com pattern',
      },
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${getBackendUrl()}/api/fetch/wechat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        plain_text: plainText,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ContentFetcherError(
        errorData.message || `Proxy request failed: ${response.status}`,
        errorData.code || 'PROXY_ERROR',
        { status: response.status }
      );
    }

    const data = await response.json();

    let content = data.content || '';
    if (plainText) {
      content = htmlToPlainText(content);
    }

    return {
      success: true,
      data: {
        title: data.title || 'Untitled',
        author: data.author || 'Unknown',
        content,
        publishedAt: data.published_at || new Date().toISOString(),
        url: data.url || url,
        coverImage: data.cover_image,
        summary: data.summary,
      },
    };
  } catch (error) {
    clearTimeout(timeoutId);
    return handleError(error);
  }
}

/**
 * 抓取B站视频信息
 * 使用后端代理避免 CORS 限制
 */
export async function fetchBilibiliVideo(
  url: string,
  options: FetchOptions = {}
): Promise<FetchResult<BilibiliVideo>> {
  const { timeout = DEFAULT_TIMEOUT } = options;

  // 验证 URL
  if (!isBilibiliUrl(url)) {
    return {
      success: false,
      error: {
        code: 'INVALID_URL',
        message: 'Invalid Bilibili video URL',
        details: 'URL must match bilibili.com/video/BVxxx or b23.tv/BVxxx pattern',
      },
    };
  }

  const bvid = extractBvidFromUrl(url);
  if (!bvid) {
    return {
      success: false,
      error: {
        code: 'INVALID_BVID',
        message: 'Could not extract video ID from URL',
      },
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${getBackendUrl()}/api/fetch/bilibili`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bvid,
        url,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ContentFetcherError(
        errorData.message || `Proxy request failed: ${response.status}`,
        errorData.code || 'PROXY_ERROR',
        { status: response.status }
      );
    }

    const data = await response.json();

    return {
      success: true,
      data: {
        title: data.title || 'Untitled',
        uploader: data.uploader || 'Unknown',
        description: data.description || '',
        coverImage: data.cover_image,
        bvid: data.bvid || bvid,
        duration: data.duration,
        viewCount: data.view_count,
        likeCount: data.like_count,
        publishedAt: data.published_at,
        url: data.url || url,
        subtitle: data.subtitle,
      },
    };
  } catch (error) {
    clearTimeout(timeoutId);
    return handleError(error);
  }
}

/**
 * 抓取小红书笔记
 * 使用后端代理避免 CORS 限制
 */
export async function fetchXiaohongshuNote(
  url: string,
  options: FetchOptions = {}
): Promise<FetchResult<XiaohongshuNote>> {
  const { timeout = DEFAULT_TIMEOUT } = options;

  // 验证 URL
  if (!isXiaohongshuUrl(url)) {
    return {
      success: false,
      error: {
        code: 'INVALID_URL',
        message: 'Invalid Xiaohongshu URL',
        details: 'URL must match xiaohongshu.com or xhslink.com pattern',
      },
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${getBackendUrl()}/api/fetch/xiaohongshu`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ContentFetcherError(
        errorData.message || `Proxy request failed: ${response.status}`,
        errorData.code || 'PROXY_ERROR',
        { status: response.status }
      );
    }

    const data = await response.json();

    return {
      success: true,
      data: {
        title: data.title || 'Untitled',
        author: data.author || 'Unknown',
        content: data.content || '',
        coverImage: data.cover_image,
        likeCount: data.like_count,
        viewCount: data.view_count,
        publishedAt: data.published_at || new Date().toISOString(),
        url: data.url || url,
        platform: 'xiaohongshu',
        restricted: data.restricted,
      },
    };
  } catch (error) {
    clearTimeout(timeoutId);
    return handleError(error);
  }
}

/**
 * 抓取通用网页内容
 * 使用后端代理避免 CORS 限制
 */
export async function fetchWebContent(
  url: string,
  options: FetchOptions = {}
): Promise<FetchResult<{ title: string; content: string; url: string }>> {
  const { timeout = DEFAULT_TIMEOUT } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${getBackendUrl()}/api/fetch/web`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ContentFetcherError(
        errorData.message || `Proxy request failed: ${response.status}`,
        errorData.code || 'PROXY_ERROR',
        { status: response.status }
      );
    }

    const data = await response.json();

    return {
      success: true,
      data: {
        title: data.title || 'Untitled',
        content: data.content || '',
        url: data.url || url,
      },
    };
  } catch (error) {
    clearTimeout(timeoutId);
    return handleError(error);
  }
}

/**
 * 通用内容抓取入口
 * 根据 URL 自动判断类型并调用相应抓取函数
 */
export async function fetchContent(
  url: string,
  options: FetchOptions = {}
): Promise<FetchResult<WechatArticle | BilibiliVideo | XiaohongshuNote | { title: string; content: string; url: string }>> {
  if (isWechatUrl(url)) {
    return fetchWechatArticle(url, options);
  }
  
  if (isBilibiliUrl(url)) {
    return fetchBilibiliVideo(url, options);
  }
  
  if (isXiaohongshuUrl(url)) {
    return fetchXiaohongshuNote(url, options);
  }
  
  // 通用网页抓取
  return fetchWebContent(url, options);
}

// =============================================================================
// Error Handling
// =============================================================================

function handleError(error: unknown): FetchResult<any> {
  if (error instanceof ContentFetcherError) {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    };
  }

  if (error instanceof Error) {
    if (error.name === 'AbortError') {
      return {
        success: false,
        error: {
          code: 'TIMEOUT',
          message: 'Request timeout',
        },
      };
    }

    return {
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: error.message,
      },
    };
  }

  return {
    success: false,
    error: {
      code: 'UNKNOWN_ERROR',
      message: 'An unknown error occurred',
    },
  };
}

// 默认导出
export default {
  fetchWechatArticle,
  fetchBilibiliVideo,
  fetchXiaohongshuNote,
  fetchWebContent,
  fetchContent,
  isWechatUrl,
  isBilibiliUrl,
  isXiaohongshuUrl,
  extractBvidFromUrl,
};
