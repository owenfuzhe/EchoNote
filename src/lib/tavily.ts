const TAVILY_API_URL = 'https://api.tavily.com/search'

export interface TavilySearchResult {
  title: string
  url: string
  content: string
  score: number
  published_date?: string
}

export interface TavilySearchResponse {
  results: TavilySearchResult[]
  answer?: string
  images?: string[]
  follow_up_questions?: string[]
}

export async function tavilySearch(
  query: string, 
  options: {
    maxResults?: number
    searchDepth?: 'basic' | 'advanced'
    includeAnswer?: boolean
    includeDomains?: string[]
    excludeDomains?: string[]
  } = {}
): Promise<TavilySearchResponse> {
  const apiKey = process.env.EXPO_PUBLIC_TAVILY_API_KEY
  
  if (!apiKey) {
    throw new Error('TAVILY_API_KEY not configured')
  }

  const {
    maxResults = 10,
    searchDepth = 'advanced',
    includeAnswer = true,
    includeDomains,
    excludeDomains
  } = options

  const response = await fetch(TAVILY_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query,
      max_results: maxResults,
      search_depth: searchDepth,
      include_answer: includeAnswer,
      include_domains: includeDomains,
      exclude_domains: excludeDomains
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Tavily API error: ${response.status} - ${error}`)
  }

  return response.json()
}

export async function searchWithSummary(
  query: string,
  provider: { chat: (messages: any[], options?: any) => Promise<string> }
): Promise<{
  answer: string
  sources: TavilySearchResult[]
  followUpQuestions?: string[]
}> {
  const searchResult = await tavilySearch(query, {
    maxResults: 10,
    searchDepth: 'advanced',
    includeAnswer: true
  })

  if (!searchResult.results?.length) {
    return {
      answer: '没有找到相关的外部信息。',
      sources: []
    }
  }

  if (searchResult.answer) {
    return {
      answer: searchResult.answer,
      sources: searchResult.results,
      followUpQuestions: searchResult.follow_up_questions
    }
  }

  const contextText = searchResult.results
    .slice(0, 5)
    .map((r, i) => `[${i + 1}] ${r.title}\n${r.content}\n来源: ${r.url}`)
    .join('\n\n')

  const messages = [{
    role: 'user' as const,
    content: `用户问题: ${query}\n\n搜索结果:\n${contextText}\n\n请基于搜索结果回答用户问题，并在回答中标注来源编号（如[1]、[2]）。`
  }]

  const answer = await provider.chat(messages, {
    systemPrompt: `你是一个知识搜索助手。基于搜索结果回答用户问题。

## 规则
1. 只使用搜索结果中的信息回答
2. 在引用信息时标注来源编号，如[1]、[2]
3. 如果搜索结果不足以回答问题，诚实告知
4. 回答要简洁但有价值
5. 最后可以提供1-2个相关问题供用户继续探索`,
    temperature: 0.3
  })

  return {
    answer,
    sources: searchResult.results,
    followUpQuestions: searchResult.follow_up_questions
  }
}
