import { ReadLaterService, parseResultToLegacyShape } from './read-later-service';

const service = new ReadLaterService();

export async function parseWechatArticle(url: string) {
  const result = await service.parseWechat(url, { includeRawHTML: false });
  if (!result.success || !result.data) {
    return {
      success: false,
      error: result.error ?? 'Parse failed',
    };
  }

  return {
    success: true,
    ...parseResultToLegacyShape('wechat', result.data),
  };
}

export async function parseWechatArticles(urls: string[], delayMs = 1200) {
  const results = [] as Array<Awaited<ReturnType<typeof parseWechatArticle>>>;

  for (const url of urls) {
    results.push(await parseWechatArticle(url));
    if (urls.indexOf(url) < urls.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return results;
}
