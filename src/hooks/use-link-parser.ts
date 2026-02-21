import { useState } from 'react'

export interface ParsedContent {
  title: string
  content: string
  url: string
  publishedTime?: string
}

export function useLinkParser() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const parseUrl = async (url: string): Promise<ParsedContent | null> => {
    setLoading(true)
    setError(null)

    try {
      const actualUrl = extractActualUrl(url)
      const jinaUrl = `https://r.jina.ai/${actualUrl}`
      
      const response = await fetch(jinaUrl)
      const text = await response.text()

      if (text.includes('This site can') || text.includes('DNS_PROBE')) {
        throw new Error('无法解析此链接')
      }

      const lines = text.split('\n')
      let title = ''
      let content = ''
      let publishedTime = ''

      for (const line of lines) {
        if (line.startsWith('Title:')) {
          title = line.replace('Title:', '').trim()
        } else if (line.startsWith('Published Time:')) {
          publishedTime = line.replace('Published Time:', '').trim()
        } else if (line.startsWith('URL Source:')) {
          continue
        } else if (line.startsWith('Markdown Content:')) {
          content = text.substring(text.indexOf('Markdown Content:') + 'Markdown Content:'.length).trim()
          break
        }
      }

      if (!title) {
        const titleMatch = text.match(/^Title:\s*(.+)$/m)
        if (titleMatch) title = titleMatch[1]
      }

      if (!content) {
        const contentStartIndex = text.indexOf('\n\n', text.indexOf('URL Source:'))
        if (contentStartIndex !== -1) {
          content = text.substring(contentStartIndex).trim()
        } else {
          content = text
        }
      }

      content = content
        .replace(/!\[Image[^\]]*\]\([^)]+\)/g, '')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/\n{3,}/g, '\n\n')
        .trim()

      setLoading(false)
      return {
        title: title || actualUrl,
        content,
        url: actualUrl,
        publishedTime: publishedTime || undefined,
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : '解析失败'
      setError(errorMessage)
      setLoading(false)
      return null
    }
  }

  return { parseUrl, loading, error }
}

function extractActualUrl(url: string): string {
  try {
    const urlObj = new URL(url)
    
    if (urlObj.hostname.includes('flipboard')) {
      const pathParts = urlObj.pathname.split('/')
      if (pathParts.length > 2) {
        const encodedUrl = pathParts[2]
        try {
          return decodeURIComponent(encodedUrl)
        } catch {
          return url
        }
      }
    }
    
    return url
  } catch {
    return url
  }
}
