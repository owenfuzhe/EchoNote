export type Platform =
  | 'wechat'
  | 'xiaohongshu'
  | 'zhihu'
  | 'juejin'
  | 'jianshu'
  | 'generic';

export type ContentType = 'article' | 'socialPost' | 'unknown';

export type ParseStatus = 'success' | 'partial' | 'failed';

export type ParseMode = 'full' | 'partial' | 'fallback';

export interface ExtractedImage {
  src: string;
  alt?: string;
  width?: number;
  height?: number;
}

export interface ExtractedLink {
  href: string;
  text: string;
  isExternal: boolean;
}

export interface ArticleMetadata {
  title?: string;
  author?: string;
  publishDate?: string;
  description?: string;
  siteName?: string;
  language?: string;
  wordCount?: number;
  estimatedReadTime?: number;
  canonicalURL?: string;
  featuredImage?: string;
  tags: string[];
}

export interface ParseResult {
  status: ParseStatus;
  platform: Platform;
  contentType: ContentType;
  metadata: ArticleMetadata;
  content: string;
  rawHTML?: string;
  cleanedHTML?: string;
  textContent?: string;
  images: ExtractedImage[];
  links: ExtractedLink[];
  errors: string[];
  parseMode: ParseMode;
  parseTimeMs: number;
}

export interface DomainRule {
  domain: string;
  platform: Platform;
  contentSelector?: string;
  titleSelector?: string;
  authorSelector?: string;
  dateSelector?: string;
  noiseSelectors: string[];
  requiresJavaScript: boolean;
  customHeaders: Record<string, string>;
}

export interface ParseOptions {
  forcePlatform?: Platform;
  preferJavaScript?: boolean;
  includeRawHTML?: boolean;
}

export interface ParseResponse {
  success: boolean;
  data?: ParseResult;
  error?: string;
}