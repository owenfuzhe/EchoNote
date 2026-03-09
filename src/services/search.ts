/**
 * 联网搜索服务 - Jina AI Reader API 集成
 * 支持网页搜索和 URL 内容总结
 */

// =============================================================================
// Types
// =============================================================================

export interface SearchResult {
  /** 结果标题 */
  title: string;
  /** 结果链接 */
  url: string;
  /** 内容摘要 */
  content: string;
  /** 来源域名 */
  source: string;
}

export interface SearchOptions {
  /** 搜索结果数量限制 */
  limit?: number;
  /** 超时时间（毫秒） */
  timeout?: number;
}

export interface SearchResponse {
  success: boolean;
  data?: SearchResult[];
  error?: SearchError;
}

export interface SummarizeResponse {
  success: boolean;
  data?: string;
  error?: SearchError;
}

export interface SearchError {
  code: string;
  message: string;
  details?: any;
}

// =============================================================================
// Configuration
// =============================================================================

const DEFAULT_TIMEOUT = 30000;
const DEFAULT_LIMIT = 5;

// Jina AI Reader API 端点
const JINA_API_BASE = 'https://r.jina.ai';

// =============================================================================
// Error Classes
// =============================================================================

export class SearchServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'SearchServiceError';
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * 从 URL 提取域名作为来源
 */
function extractSourceFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, '');
  } catch {
    return 'unknown';
  }
}

/**
 * 解析 Jina AI 的搜索结果响应
 */
function parseSearchResults(responseText: string): SearchResult[] {
  const results: SearchResult[] = [];

  // Jina AI 返回格式：每个结果以 "- **Title** [URL]\nContent" 格式
  const resultBlocks = responseText.split('\n\n').filter(block => block.trim());

  for (const block of resultBlocks) {
    // 匹配标题和 URL: - **Title** [URL]
    const titleMatch = block.match(/-\s*\*\*(.+?)\*\*\s*\[([^\]]+)\]/);
    if (titleMatch) {
      const title = titleMatch[1].trim();
      const url = titleMatch[2].trim();
      // 剩余部分为内容
      const content = block.replace(titleMatch[0], '').trim();

      results.push({
        title,
        url,
        content: content.slice(0, 500), // 限制长度
        source: extractSourceFromUrl(url),
      });
    }
  }

  return results;
}

// =============================================================================
// Main Functions
// =============================================================================

/**
 * 网页搜索
 * 使用 Jina AI Reader API 进行搜索
 * @returns SearchResult[] 直接返回结果数组，失败时抛出错误
 */
export async function searchWeb(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const { timeout = DEFAULT_TIMEOUT, limit = DEFAULT_LIMIT } = options;

  // 验证查询
  if (!query.trim()) {
    throw new SearchServiceError('搜索关键词不能为空', 'INVALID_QUERY');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    // 使用 Jina AI Reader 搜索端点
    const searchUrl = `${JINA_API_BASE}/search?q=${encodeURIComponent(query)}&n=${limit}`;

    const response = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json, text/plain, */*',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new SearchServiceError(
        `搜索请求失败: ${response.status}`,
        'SEARCH_FAILED',
        { status: response.status }
      );
    }

    const data = await response.json();

    // 解析搜索结果
    const results: SearchResult[] = [];

    if (data.data && Array.isArray(data.data)) {
      // 标准 JSON 响应格式
      for (const item of data.data) {
        if (item.title && item.url) {
          results.push({
            title: item.title,
            url: item.url,
            content: item.content || item.description || '',
            source: extractSourceFromUrl(item.url),
          });
        }
      }
    }

    return results;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof SearchServiceError) {
      throw error;
    }
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new SearchServiceError('请求超时，请稍后重试', 'TIMEOUT');
      }
      if (error.message.includes('fetch') || error.message.includes('network')) {
        throw new SearchServiceError('网络连接失败，请检查网络设置', 'NETWORK_ERROR');
      }
      throw new SearchServiceError(error.message, 'UNKNOWN_ERROR');
    }
    throw new SearchServiceError('发生未知错误，请稍后重试', 'UNKNOWN_ERROR');
  }
}

/**
 * 总结 URL 内容
 * 使用 Jina AI Reader API 提取并总结网页内容
 */
export async function summarizeUrl(
  url: string,
  options: { timeout?: number } = {}
): Promise<SummarizeResponse> {
  const { timeout = DEFAULT_TIMEOUT } = options;

  // 验证 URL
  if (!url.trim()) {
    return {
      success: false,
      error: {
        code: 'INVALID_URL',
        message: 'URL 不能为空',
      },
    };
  }

  // 简单的 URL 格式验证
  try {
    new URL(url);
  } catch {
    return {
      success: false,
      error: {
        code: 'INVALID_URL_FORMAT',
        message: 'URL 格式不正确',
      },
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    // 使用 Jina AI Reader 提取端点
    const extractUrl = `${JINA_API_BASE}/${encodeURIComponent(url)}`;

    const response = await fetch(extractUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json, text/plain, */*',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new SearchServiceError(
        `内容提取失败: ${response.status}`,
        'EXTRACTION_FAILED',
        { status: response.status }
      );
    }

    const contentType = response.headers.get('content-type');
    let data: any;

    if (contentType?.includes('application/json')) {
      data = await response.json();
    } else {
      // 纯文本响应
      const text = await response.text();
      data = { content: text };
    }

    // 提取内容
    const summary = data.content || data.data?.content || data.text || '';

    if (!summary) {
      return {
        success: false,
        error: {
          code: 'NO_CONTENT',
          message: '无法从该 URL 提取内容',
        },
      };
    }

    return {
      success: true,
      data: summary,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    return handleError(error);
  }
}

// =============================================================================
// Error Handling
// =============================================================================

function handleError(error: unknown): { success: false; error: SearchError } {
  if (error instanceof SearchServiceError) {
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
          message: '请求超时，请稍后重试',
        },
      };
    }

    // 网络错误
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: '网络连接失败，请检查网络设置',
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
      message: '发生未知错误，请稍后重试',
    },
  };
}

// =============================================================================
// Default Export
// =============================================================================

export default {
  searchWeb,
  summarizeUrl,
};
