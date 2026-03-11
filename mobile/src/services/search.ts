export interface SearchResult {
  title: string;
  url: string;
  content: string;
  source: string;
}

export interface SearchOptions {
  limit?: number;
  timeout?: number;
}

export class SearchServiceError extends Error {
  constructor(message: string, public readonly code: string, public readonly details?: unknown) {
    super(message);
    this.name = 'SearchServiceError';
  }
}

const DEFAULT_TIMEOUT = 30000;
const DEFAULT_LIMIT = 5;
const JINA_API_BASE = 'https://r.jina.ai';

function extractSourceFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return 'unknown';
  }
}

export async function searchWeb(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
  const { timeout = DEFAULT_TIMEOUT, limit = DEFAULT_LIMIT } = options;
  if (!query.trim()) throw new SearchServiceError('搜索关键词不能为空', 'INVALID_QUERY');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const url = `${JINA_API_BASE}/search?q=${encodeURIComponent(query)}&n=${limit}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json, text/plain, */*' },
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      throw new SearchServiceError(`搜索请求失败: ${response.status}`, 'SEARCH_FAILED', { status: response.status });
    }

    const data: any = await response.json();
    if (!Array.isArray(data?.data)) return [];

    return data.data
      .filter((item: any) => item?.title && item?.url)
      .map((item: any) => ({
        title: String(item.title),
        url: String(item.url),
        content: String(item.content || item.description || ''),
        source: extractSourceFromUrl(String(item.url)),
      }));
  } catch (error: any) {
    clearTimeout(timer);
    if (error instanceof SearchServiceError) throw error;
    if (error?.name === 'AbortError') throw new SearchServiceError('请求超时，请稍后重试', 'TIMEOUT');
    throw new SearchServiceError(error?.message || '搜索失败', 'UNKNOWN_ERROR');
  }
}
