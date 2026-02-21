import { useState, useCallback } from 'react'
import { useNotebookStore } from '@/store/notebook-store'
import { supabase } from '@/lib/supabase'
import { tavilySearch, searchWithSummary, TavilySearchResult } from '@/lib/tavily'

const QUICK_NOTE_SYSTEM = `你是 EchoNotes AI 助手。用户会给你一个简短的想法或灵感，请将其扩展成一份结构化的笔记。

## 输出格式 (JSON)
{
  "title": "笔记标题（简洁有力）",
  "content": "扩展后的笔记内容（2-4段，包含背景、核心观点、可能的行动方向）",
  "tags": ["标签1", "标签2"],
  "action_items": [
    {
      "text": "待办事项",
      "priority": "high|medium|low"
    }
  ],
  "related_topics": ["可能相关的主题"]
}

## 要求
1. 标题要吸引人且准确
2. 内容要有深度，不是简单重复
3. 如果想法模糊，合理推断和扩展
4. 只返回有效 JSON`

const SEARCH_SYSTEM = `你是 EchoNotes AI 搜索助手。基于搜索结果，用简洁的语言回答用户问题。

## 输出格式 (JSON)
{
  "answer": "基于搜索结果的回答（2-3句话）",
  "highlights": [
    {
      "notebook_id": "笔记ID",
      "notebook_title": "笔记标题",
      "relevant_text": "相关内容片段",
      "relevance": "high|medium"
    }
  ],
  "suggestions": ["相关搜索建议"]
}

## 要求
1. 如果没有找到相关内容，诚实告知
2. 高亮最相关的片段
3. 只返回有效 JSON`

const RAG_SYSTEM = `你是 EchoNotes AI 知识助手。基于用户笔记内容回答问题。

## 规则
1. 只使用提供的笔记内容回答
2. 如果笔记中没有相关信息，诚实告知
3. 引用来源时标注 [笔记名]
4. 回答要简洁但有深度`

const DAILY_REVIEW_SYSTEM = `你是 EchoNotes AI 助手。总结用户今天记录的内容。

## 输出格式 (JSON)
{
  "summary": "今日总结（2-3句话）",
  "key_topics": ["主题1", "主题2"],
  "highlights": [
    {
      "content": "重要内容",
      "notebook_title": "来源笔记"
    }
  ],
  "suggestions": ["明天可以继续的方向"],
  "pending_todos": ["待办提醒"]
}

## 要求
1. 突出最重要的内容
2. 发现内容之间的联系
3. 给出行动建议
4. 只返回有效 JSON`

const THINKING_PROMPT_SYSTEM = `你是 EchoNotes 思考助手。基于用户笔记，生成一个帮助深化理解的思考问题。

## 输出格式 (JSON)
{
  "question": "思考问题（开放性，没有标准答案）",
  "context": "这个问题与你之前关于XXX的笔记相关",
  "relatedNotebookId": "相关笔记ID（可选）",
  "hints": ["思考方向1", "思考方向2"]
}

## 要求
1. 问题要开放性，激发新的思考方向
2. 要与用户已有笔记相关
3. 避免过于抽象，要有具体场景
4. 提供2-3个思考方向的提示
5. 只返回有效 JSON`

export interface QuickNoteResult {
  title: string
  content: string
  tags: string[]
  action_items: Array<{ text: string; priority: 'high' | 'medium' | 'low' }>
  related_topics: string[]
  notebookId?: string
}

export interface SearchResult {
  answer: string
  highlights: Array<{
    notebook_id: string
    notebook_title: string
    relevant_text: string
    relevance: 'high' | 'medium'
  }>
  suggestions: string[]
}

export interface RelatedNotebook {
  notebook_id: string
  notebook_title: string
  similarity: number
  matched_content: any[]
}

export interface TodoItem {
  id: string
  text: string
  priority: 'high' | 'medium' | 'low'
  notebook_id: string
  notebook_title: string
  due_date?: string
  status: 'pending' | 'in_progress' | 'completed'
  created_at: string
}

export interface DailyReview {
  summary: string
  key_topics: string[]
  highlights: Array<{ content: string; notebook_title: string }>
  suggestions: string[]
  pending_todos: string[]
}

export interface PodcastSection {
  type: 'intro' | 'content' | 'summary'
  title: string
  content: string
  duration_seconds: number
}

export interface PodcastResult {
  title: string
  duration_minutes: number
  sections: PodcastSection[]
  key_points: string[]
  action_reminders: string[]
}

export interface Recommendation {
  type: 'read' | 'action' | 'explore'
  title: string
  description: string
  related_notebook_id?: string
  priority: 'high' | 'medium' | 'low'
}

export interface InspirationResult {
  recommendations: Recommendation[]
  trending_topics: string[]
  connections: string[]
}

export interface ClusterResult {
  clusters: Array<{
    theme: string
    description: string
    notebook_ids: string[]
    notebook_titles: string[]
    merge_suggestion?: string
  }>
  orphan_notes: Array<{
    id: string
    title: string
    reason: string
  }>
  insights: string[]
}

export interface KnowledgeGap {
  topic: string
  description: string
  related_notes: string[]
  suggested_actions: string[]
  priority: 'high' | 'medium' | 'low'
}

export interface KnowledgeGapResult {
  gaps: KnowledgeGap[]
  coverage_score: number
  recommendations: string[]
}

export interface TimelineEvent {
  date: string
  type: 'note' | 'link' | 'todo' | 'insight'
  title: string
  description: string
  notebook_id?: string
  tags: string[]
}

export interface TimelineResult {
  events: TimelineEvent[]
  themes: Array<{
    name: string
    trend: 'rising' | 'stable' | 'declining'
    count: number
  }>
  insights: string[]
}

export interface PeriodicReview {
  period: 'daily' | 'weekly' | 'monthly'
  date_range: {
    start: string
    end: string
  }
  summary: string
  key_topics: Array<{
    topic: string
    note_count: number
    key_insight: string
  }>
  progress: {
    new_notes: number
    completed_todos: number
    pending_todos: number
    new_links: number
  }
  highlights: string[]
  recommendations: string[]
  next_focus: string[]
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0
  let dotProduct = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

function findCommonTags(tagArrays: string[][]): string[] {
  if (tagArrays.length === 0) return []
  const tagCounts: Record<string, number> = {}
  tagArrays.forEach(tags => {
    tags.forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1
    })
  })
  return Object.entries(tagCounts)
    .filter(([_, count]) => count >= Math.max(2, tagArrays.length * 0.5))
    .sort((a, b) => b[1] - a[1])
    .map(([tag]) => tag)
}

export function useAIAssistant() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const { createNotebook, addCell, updateCell, persistCell } = useNotebookStore()

  const getProvider = useCallback(async () => {
    const { createProvider } = await import('@/providers/llm')
    const { useSettingsStore, loadProviderApiKey } = await import('@/store/settings-store')
    
    const { activeProviderId, providers } = useSettingsStore.getState()
    const apiKey = await loadProviderApiKey(activeProviderId)
    
    return createProvider({
      ...providers[activeProviderId],
      apiKey: apiKey ?? '',
    })
  }, [])

  const quickNote = useCallback(async (idea: string): Promise<QuickNoteResult | null> => {
    setLoading(true)
    setError(null)
    
    try {
      const provider = await getProvider()
      const messages = [{ role: 'user' as const, content: idea }]
      const raw = await provider.chat(messages, { systemPrompt: QUICK_NOTE_SYSTEM, temperature: 0.7 })
      const json = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const result = JSON.parse(json) as QuickNoteResult
      
      const notebookId = await createNotebook(result.title, '#6366F1')
      const cell = await addCell(notebookId, 'text')
      updateCell(cell.id, { content: result.content })
      await persistCell({ ...cell, content: result.content } as any)
      
      if (result.action_items && result.action_items.length > 0) {
        const todoCell = await addCell(notebookId, 'todo')
        updateCell(todoCell.id, { 
          title: '待办事项',
          items: result.action_items.map((item, i) => ({
            id: `todo-${Date.now()}-${i}`,
            text: item.text,
            completed: false,
            priority: item.priority
          }))
        })
        await persistCell({ 
          ...todoCell, 
          title: '待办事项',
          items: result.action_items.map((item, i) => ({
            id: `todo-${Date.now()}-${i}`,
            text: item.text,
            completed: false,
            priority: item.priority
          }))
        } as any)
      }

      const contentForEmbedding = `${result.title}\n${result.content}`
      await generateAndStoreEmbedding(cell.id, contentForEmbedding)
      
      setLoading(false)
      return { ...result, notebookId }
    } catch (e: any) {
      console.error('Quick note error:', e)
      setError(e.message || '创建笔记失败')
      setLoading(false)
      return null
    }
  }, [createNotebook, addCell, updateCell, persistCell, getProvider])

  const generateAndStoreEmbedding = useCallback(async (cellId: string, text: string) => {
    try {
      const provider = await getProvider()
      const embedding = await provider.embed(text)
      
      await supabase
        .from('cells')
        .update({ embedding: JSON.stringify(embedding) })
        .eq('id', cellId)
    } catch (e) {
      console.error('Embedding error:', e)
    }
  }, [getProvider])

  const globalSearch = useCallback(async (query: string): Promise<SearchResult | null> => {
    setLoading(true)
    setError(null)
    
    try {
      const provider = await getProvider()
      const queryEmbedding = await provider.embed(query)
      
      const { data: vectorResults, error: rpcError } = await supabase.rpc('match_cells', {
        query_embedding: queryEmbedding,
        match_threshold: 0.5,
        match_count: 10
      })
      
      if (rpcError) {
        console.log('Vector search failed, falling back to keyword search:', rpcError)
        const { data: cells, error: dbError } = await supabase
          .from('cells')
          .select('id, notebook_id, type, content, notebooks(id, title)')
          .or(`content.ilike.%${query}%`)
          .limit(20)
        
        if (dbError) throw dbError
        
        if (!cells || cells.length === 0) {
          setLoading(false)
          return {
            answer: '没有找到相关内容',
            highlights: [],
            suggestions: ['试试其他关键词', '检查拼写是否正确']
          }
        }
        
        const context = cells.map((c: any) => ({
          notebook_id: c.notebook_id,
          notebook_title: c.notebooks?.title || 'Untitled',
          content: typeof c.content === 'object' ? JSON.stringify(c.content) : c.content
        }))
        
        const messages = [{
          role: 'user' as const,
          content: `搜索查询: ${query}\n\n搜索结果:\n${context.map((c: any) => `【${c.notebook_title}】\n${c.content}`).join('\n\n')}`
        }]
        const raw = await provider.chat(messages, { systemPrompt: SEARCH_SYSTEM, temperature: 0.3 })
        const json = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
        const result = JSON.parse(json) as SearchResult
        
        setLoading(false)
        return result
      }
      
      if (!vectorResults || vectorResults.length === 0) {
        setLoading(false)
        return {
          answer: '没有找到相关内容',
          highlights: [],
          suggestions: ['试试其他关键词', '检查拼写是否正确']
        }
      }
      
      const { data: notebooks } = await supabase
        .from('notebooks')
        .select('id, title')
        .in('id', vectorResults.map((r: any) => r.notebook_id))
      
      const notebookMap = new Map(notebooks?.map((n: any) => [n.id, n.title]))
      
      const context = vectorResults.map((r: any) => ({
        notebook_id: r.notebook_id,
        notebook_title: notebookMap.get(r.notebook_id) || 'Untitled',
        content: typeof r.content === 'object' ? JSON.stringify(r.content) : r.content,
        similarity: r.similarity
      }))
      
      const messages = [{
        role: 'user' as const,
        content: `搜索查询: ${query}\n\n搜索结果:\n${context.map((c: any) => `【${c.notebook_title}】(相似度: ${(c.similarity * 100).toFixed(0)}%)\n${c.content}`).join('\n\n')}`
      }]
      const raw = await provider.chat(messages, { systemPrompt: SEARCH_SYSTEM, temperature: 0.3 })
      const json = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const result = JSON.parse(json) as SearchResult
      
      setLoading(false)
      return result
    } catch (e: any) {
      console.error('Search error:', e)
      setError(e.message || '搜索失败')
      setLoading(false)
      return null
    }
  }, [getProvider])

  const findRelatedNotebooks = useCallback(async (notebookId: string, query?: string): Promise<RelatedNotebook[]> => {
    try {
      let queryEmbedding: number[]
      
      if (query) {
        const provider = await getProvider()
        queryEmbedding = await provider.embed(query)
      } else {
        const { data: cells } = await supabase
          .from('cells')
          .select('embedding')
          .eq('notebook_id', notebookId)
          .not('embedding', 'is', null)
          .limit(1)
        
        if (!cells || cells.length === 0 || !cells[0].embedding) {
          return []
        }
        
        queryEmbedding = typeof cells[0].embedding === 'string' 
          ? JSON.parse(cells[0].embedding) 
          : cells[0].embedding
      }
      
      const { data: results, error } = await supabase.rpc('find_related_notebooks', {
        query_embedding: queryEmbedding,
        exclude_notebook_id: notebookId,
        match_threshold: 0.6,
        match_count: 5
      })
      
      if (error) {
        console.error('Find related error:', error)
        return []
      }
      
      return results || []
    } catch (e) {
      console.error('Find related notebooks error:', e)
      return []
    }
  }, [getProvider])

  const ragQuery = useCallback(async (question: string): Promise<{ answer: string; sources: Array<{ notebook_id: string; notebook_title: string }> }> => {
    setLoading(true)
    setError(null)
    
    try {
      const provider = await getProvider()
      
      let context: Array<{ notebook_id: string; notebook_title: string; content: string }> = []
      
      try {
        const queryEmbedding = await provider.embed(question)
        
        const { data: vectorResults, error: rpcError } = await supabase.rpc('match_cells', {
          query_embedding: queryEmbedding,
          match_threshold: 0.5,
          match_count: 5
        })
        
        if (!rpcError && vectorResults && vectorResults.length > 0) {
          const { data: notebooks } = await supabase
            .from('notebooks')
            .select('id, title')
            .in('id', vectorResults.map((r: any) => r.notebook_id))
          
          const notebookMap = new Map(notebooks?.map((n: any) => [n.id, n.title]))
          
          context = vectorResults.map((r: any) => ({
            notebook_id: r.notebook_id,
            notebook_title: notebookMap.get(r.notebook_id) || 'Untitled',
            content: typeof r.content === 'object' ? JSON.stringify(r.content) : r.content
          }))
        }
      } catch (embedError) {
        console.log('Embedding failed, falling back to keyword search:', embedError)
      }
      
      if (context.length === 0) {
        const { data: cells, error: dbError } = await supabase
          .from('cells')
          .select('id, notebook_id, type, content, notebooks(id, title)')
          .or(`content.ilike.%${question.split(' ').join('%')}%`)
          .limit(5)
        
        if (dbError) throw dbError
        
        if (!cells || cells.length === 0) {
          setLoading(false)
          return {
            answer: '抱歉，我在你的笔记中没有找到相关信息来回答这个问题。',
            sources: []
          }
        }
        
        context = cells.map((c: any) => ({
          notebook_id: c.notebook_id,
          notebook_title: c.notebooks?.title || 'Untitled',
          content: typeof c.content === 'object' ? JSON.stringify(c.content) : c.content
        }))
      }
      
      const contextText = context.map((c, i) => `[${c.notebook_title}]\n${c.content}`).join('\n\n---\n\n')
      
      const messages = [{
        role: 'user' as const,
        content: `用户问题: ${question}\n\n笔记内容:\n${contextText}`
      }]
      
      const answer = await provider.chat(messages, { systemPrompt: RAG_SYSTEM, temperature: 0.3 })
      
      setLoading(false)
      return {
        answer,
        sources: context.map(c => ({
          notebook_id: c.notebook_id,
          notebook_title: c.notebook_title
        }))
      }
    } catch (e: any) {
      console.error('RAG query error:', e)
      setError(e.message || '查询失败')
      setLoading(false)
      return {
        answer: '抱歉，查询过程中出现了错误。',
        sources: []
      }
    }
  }, [getProvider])

  const getTodos = useCallback(async (): Promise<TodoItem[]> => {
    try {
      const { data: cells, error } = await supabase
        .from('cells')
        .select('id, notebook_id, content, created_at, notebooks(id, title)')
        .eq('type', 'todo')
        .order('created_at', { ascending: false })
        .limit(50)
      
      if (error) throw error
      
      const todos: TodoItem[] = []
      cells?.forEach((cell: any) => {
        const items = cell.content?.items || []
        items.forEach((item: any) => {
          if (!item.done) {
            todos.push({
              id: item.id || `${cell.id}-${Date.now()}`,
              text: item.text,
              priority: item.priority || 'medium',
              notebook_id: cell.notebook_id,
              notebook_title: cell.notebooks?.title || 'Untitled',
              status: 'pending',
              created_at: cell.created_at
            })
          }
        })
      })
      
      return todos.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 }
        return priorityOrder[a.priority] - priorityOrder[b.priority]
      })
    } catch (e) {
      console.error('Get todos error:', e)
      return []
    }
  }, [])

  const getUpcomingTodos = useCallback(async (): Promise<{
    today: TodoItem[]
    thisWeek: TodoItem[]
    overdue: TodoItem[]
  }> => {
    const todos = await getTodos()
    const now = new Date()
    const today = now.toDateString()
    const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    
    return {
      today: todos.filter(t => new Date(t.created_at).toDateString() === today),
      thisWeek: todos.filter(t => {
        const created = new Date(t.created_at)
        return created > now && created <= weekLater
      }),
      overdue: []
    }
  }, [getTodos])

  const getDailyReview = useCallback(async (): Promise<DailyReview | null> => {
    setLoading(true)
    setError(null)
    
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const { data: cells, error } = await supabase
        .from('cells')
        .select('id, notebook_id, type, content, created_at, notebooks(id, title)')
        .gte('created_at', today.toISOString())
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      if (!cells || cells.length === 0) {
        setLoading(false)
        return {
          summary: '今天还没有记录任何内容',
          key_topics: [],
          highlights: [],
          suggestions: ['开始记录你的想法吧！'],
          pending_todos: []
        }
      }
      
      const provider = await getProvider()
      const context = cells.map((c: any) => ({
        notebook_title: c.notebooks?.title || 'Untitled',
        type: c.type,
        content: typeof c.content === 'object' ? JSON.stringify(c.content) : c.content
      }))
      
      const messages = [{
        role: 'user' as const,
        content: `今天记录的内容:\n${context.map((c: any) => `【${c.notebook_title}】(${c.type})\n${c.content}`).join('\n\n')}`
      }]
      
      const raw = await provider.chat(messages, { systemPrompt: DAILY_REVIEW_SYSTEM, temperature: 0.5 })
      const json = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const result = JSON.parse(json) as DailyReview
      
      setLoading(false)
      return result
    } catch (e: any) {
      console.error('Daily review error:', e)
      setError(e.message || '生成每日回顾失败')
      setLoading(false)
      return null
    }
  }, [getProvider])

  const indexAllCells = useCallback(async () => {
    setLoading(true)
    try {
      const { data: cells, error } = await supabase
        .from('cells')
        .select('id, content')
        .is('embedding', null)
        .limit(100)
      
      if (error) throw error
      
      if (!cells || cells.length === 0) {
        setLoading(false)
        return { indexed: 0 }
      }
      
      const provider = await getProvider()
      let indexed = 0
      
      for (const cell of cells) {
        try {
          const text = typeof cell.content === 'object' 
            ? JSON.stringify(cell.content) 
            : String(cell.content)
          
          if (text.length < 10) continue
          
          const embedding = await provider.embed(text)
          
          await supabase
            .from('cells')
            .update({ embedding: JSON.stringify(embedding) })
            .eq('id', cell.id)
          
          indexed++
        } catch (e) {
          console.error(`Failed to index cell ${cell.id}:`, e)
        }
      }
      
      setLoading(false)
      return { indexed }
    } catch (e: any) {
      console.error('Index all cells error:', e)
      setError(e.message || '索引失败')
      setLoading(false)
      return { indexed: 0 }
    }
  }, [getProvider])

  const autoTagNotebook = useCallback(async (notebookId: string): Promise<string[]> => {
    try {
      const { data, error } = await supabase.rpc('auto_tag_notebook', {
        notebook_id: notebookId
      })
      
      if (error) {
        console.error('Auto tag error:', error)
        return []
      }
      
      return data || []
    } catch (e) {
      console.error('Auto tag notebook error:', e)
      return []
    }
  }, [])

  const getAllTags = useCallback(async (): Promise<Array<{ tag: string; count: number }>> => {
    try {
      const { data, error } = await supabase.rpc('get_all_tags')
      
      if (error) {
        console.error('Get all tags error:', error)
        return []
      }
      
      return data || []
    } catch (e) {
      console.error('Get all tags error:', e)
      return []
    }
  }, [])

  const searchByTag = useCallback(async (tag: string): Promise<Array<{
    id: string
    title: string
    cover_color: string
    updated_at: string
    tags: string[]
  }>> => {
    try {
      const { data, error } = await supabase.rpc('search_by_tag', {
        search_tag: tag
      })
      
      if (error) {
        console.error('Search by tag error:', error)
        return []
      }
      
      return data || []
    } catch (e) {
      console.error('Search by tag error:', e)
      return []
    }
  }, [])

  const SMART_TAG_SYSTEM = `你是 EchoNotes 智能标签助手。分析笔记内容，提取最相关的标签。

## 输出格式 (JSON)
{
  "tags": ["标签1", "标签2", "标签3"],
  "category": "分类名称",
  "confidence": 0.85
}

## 标签规则
1. 选择 2-5 个最相关的标签
2. 标签应该简洁（1-4个字）
3. 优先使用已有标签
4. 只返回有效 JSON`

  const PODCAST_SYSTEM = `你是 EchoNotes 每日播客主持人。将用户未读的文章和未推进的想法整理成一份15分钟的播客脚本。

## 输出格式 (JSON)
{
  "title": "播客标题",
  "duration_minutes": 15,
  "sections": [
    {
      "type": "intro|content|summary",
      "title": "章节标题",
      "content": "播客内容（口语化，适合朗读）",
      "duration_seconds": 120
    }
  ],
  "key_points": ["要点1", "要点2"],
  "action_reminders": ["行动提醒1"]
}

## 要求
1. 内容要口语化，像在和朋友聊天
2. 每个章节控制在 1-3 分钟
3. 突出重要信息和行动建议
4. 总时长约 15 分钟
5. 只返回有效 JSON`

  const INSPIRATION_SYSTEM = `你是 EchoNotes 灵感推荐助手。基于用户的历史笔记，推荐相关的阅读和行动建议。

## 输出格式 (JSON)
{
  "recommendations": [
    {
      "type": "read|action|explore",
      "title": "推荐标题",
      "description": "推荐理由",
      "related_notebook_id": "相关笔记ID",
      "priority": "high|medium|low"
    }
  ],
  "trending_topics": ["热门主题1", "热门主题2"],
  "connections": ["发现的关联1", "发现的关联2"]
}

## 要求
1. 推荐要基于用户已有的内容
2. 发现笔记之间的隐藏关联
3. 给出具体的行动建议
4. 只返回有效 JSON`

  const smartTag = useCallback(async (notebookId: string): Promise<{
    tags: string[]
    category: string
    confidence: number
  } | null> => {
    try {
      const { data: cells, error: cellsError } = await supabase
        .from('cells')
        .select('type, content')
        .eq('notebook_id', notebookId)
        .limit(10)
      
      if (cellsError || !cells || cells.length === 0) {
        return null
      }
      
      const content = cells.map((c: any) => {
        if (c.type === 'text') return c.content
        if (c.type === 'voice') return c.content?.transcription || ''
        if (c.type === 'ai_output') return c.content?.content || ''
        if (c.type === 'link') return `${c.content?.title || ''} ${c.content?.content || ''}`
        return ''
      }).join('\n\n')
      
      if (content.length < 20) {
        return null
      }
      
      const provider = await getProvider()
      const messages = [{
        role: 'user' as const,
        content: `请为以下笔记内容生成标签：\n\n${content.slice(0, 2000)}`
      }]
      
      const raw = await provider.chat(messages, { 
        systemPrompt: SMART_TAG_SYSTEM, 
        temperature: 0.3 
      })
      const json = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const result = JSON.parse(json)
      
      if (result.tags && result.tags.length > 0) {
        await supabase
          .from('notebooks')
          .update({ tags: result.tags })
          .eq('id', notebookId)
      }
      
      return result
    } catch (e) {
      console.error('Smart tag error:', e)
      return null
    }
  }, [getProvider])

  const generatePodcast = useCallback(async (): Promise<PodcastResult | null> => {
    setLoading(true)
    setError(null)
    
    try {
      const threeDaysAgo = new Date()
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
      
      const { data: recentCells, error: cellsError } = await supabase
        .from('cells')
        .select('id, notebook_id, type, content, created_at, notebooks(id, title)')
        .gte('created_at', threeDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(20)
      
      if (cellsError) throw cellsError
      
      if (!recentCells || recentCells.length === 0) {
        setLoading(false)
        return {
          title: '今日播客',
          duration_minutes: 15,
          sections: [
            { type: 'intro', title: '开场', content: '最近还没有新的笔记内容。快去记录一些想法吧！', duration_seconds: 30 }
          ],
          key_points: [],
          action_reminders: []
        }
      }
      
      const { data: todoCells, error: todoError } = await supabase
        .from('cells')
        .select('id, notebook_id, content, notebooks(id, title)')
        .eq('type', 'todo')
        .limit(10)
      
      const uncompletedTodos: string[] = []
      if (todoCells) {
        todoCells.forEach((cell: any) => {
          const items = cell.content?.items || []
          items.forEach((item: any) => {
            if (!item.done && !item.completed) {
              uncompletedTodos.push(`${item.text} (来自: ${cell.notebooks?.title || '未知笔记'})`)
            }
          })
        })
      }
      
      const content = recentCells.map((c: any) => {
        let text = ''
        if (c.type === 'text') text = c.content
        else if (c.type === 'voice') text = c.content?.transcription || ''
        else if (c.type === 'ai_output') text = c.content?.content || ''
        else if (c.type === 'link') text = `${c.content?.title || ''} ${c.content?.content || ''}`
        return `【${c.notebooks?.title || '笔记'}】\n${text}`
      }).join('\n\n---\n\n')
      
      const provider = await getProvider()
      const messages = [{
        role: 'user' as const,
        content: `请为以下内容生成播客脚本：\n\n最近笔记:\n${content.slice(0, 4000)}\n\n未完成的待办:\n${uncompletedTodos.join('\n') || '无'}`
      }]
      
      const raw = await provider.chat(messages, { 
        systemPrompt: PODCAST_SYSTEM, 
        temperature: 0.7 
      })
      const json = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const result = JSON.parse(json) as PodcastResult
      
      setLoading(false)
      return result
    } catch (e: any) {
      console.error('Podcast error:', e)
      setError(e.message || '生成播客失败')
      setLoading(false)
      return null
    }
  }, [getProvider])

  const getInspirations = useCallback(async (): Promise<InspirationResult | null> => {
    setLoading(true)
    setError(null)
    
    try {
      const { data: notebooks, error: notebooksError } = await supabase
        .from('notebooks')
        .select('id, title, tags, updated_at')
        .order('updated_at', { ascending: false })
        .limit(20)
      
      if (notebooksError) throw notebooksError
      
      if (!notebooks || notebooks.length < 2) {
        setLoading(false)
        return {
          recommendations: [],
          trending_topics: [],
          connections: ['创建更多笔记以获得个性化推荐']
        }
      }
      
      const { data: recentCells, error: cellsError } = await supabase
        .from('cells')
        .select('notebook_id, type, content, notebooks(id, title)')
        .order('created_at', { ascending: false })
        .limit(30)
      
      if (cellsError) throw cellsError
      
      const content = recentCells?.map((c: any) => {
        let text = ''
        const cellContent = c.content
        if (c.type === 'text') {
          text = typeof cellContent === 'string' ? cellContent?.slice(0, 200) : ''
        } else if (c.type === 'voice') {
          text = typeof cellContent === 'object' ? cellContent?.transcription?.slice(0, 200) || '' : ''
        } else if (c.type === 'ai_output') {
          text = typeof cellContent === 'object' ? cellContent?.content?.slice(0, 200) || '' : typeof cellContent === 'string' ? cellContent?.slice(0, 200) : ''
        } else if (c.type === 'link') {
          text = typeof cellContent === 'object' ? cellContent?.title || cellContent?.url || '' : ''
        }
        return `【${c.notebooks?.title || '笔记'}】${text}`
      }).join('\n') || ''
      
      const tags = notebooks.flatMap((n: any) => n.tags || [])
      const tagCounts = tags.reduce((acc: Record<string, number>, tag: string) => {
        acc[tag] = (acc[tag] || 0) + 1
        return acc
      }, {})
      
      const provider = await getProvider()
      const messages = [{
        role: 'user' as const,
        content: `请基于以下笔记内容生成推荐：\n\n笔记列表:\n${notebooks.map((n: any) => `- ${n.title} (${n.tags?.join(', ') || '无标签'})`).join('\n')}\n\n最近内容:\n${content.slice(0, 2000)}`
      }]
      
      const raw = await provider.chat(messages, { 
        systemPrompt: INSPIRATION_SYSTEM, 
        temperature: 0.5 
      })
      const json = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const result = JSON.parse(json) as InspirationResult
      
      setLoading(false)
      return result
    } catch (e: any) {
      console.error('Inspiration error:', e)
      setError(e.message || '获取推荐失败')
      setLoading(false)
      return null
    }
  }, [getProvider])

  const externalSearch = useCallback(async (query: string): Promise<{
    answer: string
    sources: TavilySearchResult[]
    followUpQuestions?: string[]
  }> => {
    setLoading(true)
    setError(null)
    
    try {
      const provider = await getProvider()
      const result = await searchWithSummary(query, provider)
      
      setLoading(false)
      return result
    } catch (e: any) {
      console.error('External search error:', e)
      setError(e.message || '外部搜索失败')
      setLoading(false)
      return {
        answer: '搜索失败，请稍后重试。',
        sources: []
      }
    }
  }, [getProvider])

  const getThinkingPrompt = useCallback(async (): Promise<{
    question: string
    context: string
    relatedNotebookId?: string
    hints: string[]
  } | null> => {
    setLoading(true)
    setError(null)
    
    try {
      const { data: notebooks } = await supabase
        .from('notebooks')
        .select('id, title, tags, updated_at')
        .order('updated_at', { ascending: false })
        .limit(10)
      
      if (!notebooks || notebooks.length < 2) {
        setLoading(false)
        return null
      }
      
      const { data: recentCells } = await supabase
        .from('cells')
        .select('notebook_id, type, content, notebooks(id, title)')
        .order('created_at', { ascending: false })
        .limit(20)
      
      const content = recentCells?.map((c: any) => {
        let text = ''
        const cellContent = c.content
        if (c.type === 'text') {
          text = typeof cellContent === 'string' ? cellContent?.slice(0, 150) : ''
        } else if (c.type === 'voice') {
          text = typeof cellContent === 'object' ? cellContent?.transcription?.slice(0, 150) || '' : ''
        } else if (c.type === 'ai_output') {
          text = typeof cellContent === 'object' ? cellContent?.content?.slice(0, 150) || '' : typeof cellContent === 'string' ? cellContent?.slice(0, 150) : ''
        } else if (c.type === 'link') {
          text = typeof cellContent === 'object' ? cellContent?.title || cellContent?.url || '' : ''
        }
        return `【${c.notebooks?.title || '笔记'}】${text}`
      }).join('\n') || ''
      
      const provider = await getProvider()
      const messages = [{
        role: 'user' as const,
        content: `基于以下笔记内容，生成一个帮助用户深化理解的思考问题：\n\n${content.slice(0, 2000)}`
      }]
      
      const raw = await provider.chat(messages, { 
        systemPrompt: THINKING_PROMPT_SYSTEM, 
        temperature: 0.7 
      })
      const json = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const result = JSON.parse(json)
      
      setLoading(false)
      return result
    } catch (e: any) {
      console.error('Thinking prompt error:', e)
      setError(e.message || '生成思考提示失败')
      setLoading(false)
      return null
    }
  }, [getProvider])

  const clusterNotes = useCallback(async (): Promise<ClusterResult | null> => {
    setLoading(true)
    setError(null)
    
    try {
      const { data: notebooks } = await supabase
        .from('notebooks')
        .select('id, title, tags')
        .order('updated_at', { ascending: false })
        .limit(30)
      
      if (!notebooks || notebooks.length < 3) {
        setLoading(false)
        return null
      }
      
      const { data: cells } = await supabase
        .from('cells')
        .select('notebook_id, content, type, embedding')
        .not('embedding', 'is', null)
      
      if (!cells || cells.length < 3) {
        setLoading(false)
        return null
      }
      
      const notebookEmbeddings = new Map<string, number[][]>()
      cells.forEach((cell: any) => {
        if (!notebookEmbeddings.has(cell.notebook_id)) {
          notebookEmbeddings.set(cell.notebook_id, [])
        }
        if (cell.embedding) {
          notebookEmbeddings.get(cell.notebook_id)!.push(cell.embedding)
        }
      })
      
      const notebookVectors: { id: string; title: string; tags: string[]; avgEmbedding: number[] }[] = []
      notebookEmbeddings.forEach((embeddings, notebookId) => {
        if (embeddings.length > 0) {
          const nb = notebooks.find(n => n.id === notebookId)
          if (nb) {
            const avgEmbedding = embeddings[0].map((_: number, i: number) =>
              embeddings.reduce((sum: number, emb: number[]) => sum + emb[i], 0) / embeddings.length
            )
            notebookVectors.push({
              id: notebookId,
              title: nb.title || '未命名',
              tags: nb.tags || [],
              avgEmbedding
            })
          }
        }
      })
      
      if (notebookVectors.length < 3) {
        setLoading(false)
        return null
      }
      
      const clusters: Map<string, { id: string; title: string; tags: string[] }[]> = new Map()
      const processed = new Set<string>()
      
      for (const nb of notebookVectors) {
        if (processed.has(nb.id)) continue
        
        const clusterMembers: { id: string; title: string; tags: string[] }[] = [nb]
        processed.add(nb.id)
        
        for (const other of notebookVectors) {
          if (processed.has(other.id)) continue
          
          const similarity = cosineSimilarity(nb.avgEmbedding, other.avgEmbedding)
          if (similarity > 0.7) {
            clusterMembers.push(other)
            processed.add(other.id)
          }
        }
        
        if (clusterMembers.length > 1) {
          const commonTags = findCommonTags(clusterMembers.map(m => m.tags))
          const clusterKey = commonTags.length > 0 ? commonTags[0] : `cluster_${clusters.size + 1}`
          clusters.set(clusterKey, clusterMembers)
        }
      }
      
      const orphanNotes = notebookVectors
        .filter(nb => !processed.has(nb.id))
        .map(nb => ({
          id: nb.id,
          title: nb.title,
          reason: '暂未找到相似笔记'
        }))
      
      const provider = await getProvider()
      const clusterData = Array.from(clusters.entries()).map(([theme, members]) => ({
        theme,
        notebook_ids: members.map(m => m.id),
        notebook_titles: members.map(m => m.title)
      }))
      
      const messages = [{
        role: 'user' as const,
        content: `分析以下笔记聚类结果，为每个聚类生成主题描述和合并建议：

${JSON.stringify(clusterData, null, 2)}

请返回 JSON 格式：
{
  "clusters": [
    {
      "theme": "主题名称",
      "description": "主题描述（一句话）",
      "merge_suggestion": "合并建议（可选）"
    }
  ],
  "insights": ["发现的洞察1", "发现的洞察2"]
}`
      }]
      
      const raw = await provider.chat(messages, {
        systemPrompt: `你是知识管理专家。分析笔记聚类结果，提供有价值的洞察。只返回有效 JSON。`,
        temperature: 0.5
      })
      
      const json = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const aiResult = JSON.parse(json)
      
      const finalClusters = clusterData.map((cd, i) => ({
        theme: aiResult.clusters[i]?.theme || cd.theme,
        description: aiResult.clusters[i]?.description || '',
        notebook_ids: cd.notebook_ids,
        notebook_titles: cd.notebook_titles,
        merge_suggestion: aiResult.clusters[i]?.merge_suggestion
      }))
      
      setLoading(false)
      return {
        clusters: finalClusters,
        orphan_notes: orphanNotes,
        insights: aiResult.insights || []
      }
    } catch (e: any) {
      console.error('Cluster notes error:', e)
      setError(e.message || '聚类分析失败')
      setLoading(false)
      return null
    }
  }, [getProvider])

  const detectKnowledgeGaps = useCallback(async (): Promise<KnowledgeGapResult | null> => {
    setLoading(true)
    setError(null)
    
    try {
      const { data: notebooks } = await supabase
        .from('notebooks')
        .select('id, title, tags, updated_at')
        .order('updated_at', { ascending: false })
        .limit(20)
      
      if (!notebooks || notebooks.length < 3) {
        setLoading(false)
        return null
      }
      
      const allTags = notebooks.flatMap(nb => nb.tags || [])
      const tagCounts: Record<string, number> = {}
      allTags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1
      })
      
      const provider = await getProvider()
      const messages = [{
        role: 'user' as const,
        content: `分析用户的知识体系，发现知识盲区：

## 用户笔记主题
${Object.entries(tagCounts).map(([tag, count]) => `- ${tag}: ${count}篇`).join('\n')}

## 笔记标题
${notebooks.map(nb => `- ${nb.title}`).join('\n')}

请返回 JSON 格式：
{
  "gaps": [
    {
      "topic": "缺失主题",
      "description": "为什么这是知识盲区",
      "suggested_actions": ["建议行动1", "建议行动2"],
      "priority": "high|medium|low"
    }
  ],
  "coverage_score": 0-100的知识覆盖度评分,
  "recommendations": ["整体建议1", "整体建议2"]
}`
      }]
      
      const raw = await provider.chat(messages, {
        systemPrompt: `你是知识管理专家。分析用户的知识体系，发现知识盲区和改进机会。

## 分析维度
1. 主题覆盖度：用户关注哪些领域？哪些领域缺失？
2. 深度 vs 广度：是否有深入探索的主题？
3. 时间分布：是否有长期未更新的主题？
4. 关联性：主题之间是否有良好的关联？

只返回有效 JSON。`,
        temperature: 0.5
      })
      
      const json = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const result = JSON.parse(json) as KnowledgeGapResult
      
      setLoading(false)
      return result
    } catch (e: any) {
      console.error('Detect knowledge gaps error:', e)
      setError(e.message || '知识盲区探测失败')
      setLoading(false)
      return null
    }
  }, [getProvider])

  const getTimeline = useCallback(async (days: number = 30): Promise<TimelineResult | null> => {
    setLoading(true)
    setError(null)
    
    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)
      
      const { data: notebooks } = await supabase
        .from('notebooks')
        .select('id, title, tags, created_at, updated_at')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true })
      
      const { data: cells } = await supabase
        .from('cells')
        .select('id, notebook_id, type, content, created_at, notebooks(id, title)')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true })
      
      if (!cells || cells.length === 0) {
        setLoading(false)
        return { events: [], themes: [], insights: ['这段时间没有记录任何内容'] }
      }
      
      const events: TimelineEvent[] = []
      const tagTimeline: Map<string, { dates: string[]; count: number }> = new Map()
      
      cells.forEach((cell: any) => {
        const date = new Date(cell.created_at).toISOString().split('T')[0]
        const nb = cell.notebooks
        let title = ''
        let description = ''
        let type: TimelineEvent['type'] = 'note'
        
        if (cell.type === 'text') {
          const text = typeof cell.content === 'string' ? cell.content : ''
          title = text.slice(0, 50) || '文本笔记'
          description = text.slice(0, 150)
        } else if (cell.type === 'voice') {
          const trans = typeof cell.content === 'object' ? cell.content?.transcription : ''
          title = trans?.slice(0, 50) || '语音笔记'
          description = trans?.slice(0, 150) || ''
          type = 'note'
        } else if (cell.type === 'link') {
          const linkTitle = typeof cell.content === 'object' ? cell.content?.title : ''
          title = linkTitle || '链接收藏'
          description = typeof cell.content === 'object' ? cell.content?.url : ''
          type = 'link'
        } else if (cell.type === 'ai_output') {
          const aiContent = typeof cell.content === 'object' ? cell.content?.content : cell.content
          title = 'AI 分析'
          description = typeof aiContent === 'string' ? aiContent.slice(0, 100) : ''
          type = 'insight'
        }
        
        const nbTags = notebooks?.find(n => n.id === cell.notebook_id)?.tags || []
        
        events.push({
          date,
          type,
          title: nb?.title || title,
          description,
          notebook_id: cell.notebook_id,
          tags: nbTags
        })
        
        nbTags.forEach((tag: string) => {
          if (!tagTimeline.has(tag)) {
            tagTimeline.set(tag, { dates: [], count: 0 })
          }
          const entry = tagTimeline.get(tag)!
          if (!entry.dates.includes(date)) {
            entry.dates.push(date)
          }
          entry.count++
        })
      })
      
      const themes = Array.from(tagTimeline.entries())
        .map(([name, data]) => {
          const recentDates = data.dates.filter(d => {
            const diff = (new Date().getTime() - new Date(d).getTime()) / (1000 * 60 * 60 * 24)
            return diff <= 7
          })
          const olderDates = data.dates.filter(d => {
            const diff = (new Date().getTime() - new Date(d).getTime()) / (1000 * 60 * 60 * 24)
            return diff > 7 && diff <= 14
          })
          
          let trend: 'rising' | 'stable' | 'declining' = 'stable'
          if (recentDates.length > olderDates.length) {
            trend = 'rising'
          } else if (recentDates.length < olderDates.length) {
            trend = 'declining'
          }
          
          return { name, trend, count: data.count }
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
      
      const provider = await getProvider()
      const recentEvents = events.slice(-20)
      const messages = [{
        role: 'user' as const,
        content: `分析用户最近 ${days} 天的思维时间线：

## 时间线事件
${recentEvents.map(e => `[${e.date}] ${e.type}: ${e.title}`).join('\n')}

## 主题趋势
${themes.map(t => `${t.name}: ${t.count}次 (${t.trend === 'rising' ? '上升' : t.trend === 'declining' ? '下降' : '稳定'})`).join('\n')}

请返回 JSON 格式：
{
  "insights": ["洞察1：描述用户思维演化的模式", "洞察2：发现的主题变化"]
}`
      }]
      
      const raw = await provider.chat(messages, {
        systemPrompt: `你是知识管理专家。分析用户的思维时间线，发现想法演化的模式。只返回有效 JSON。`,
        temperature: 0.5
      })
      
      const json = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const aiResult = JSON.parse(json)
      
      setLoading(false)
      return {
        events,
        themes,
        insights: aiResult.insights || []
      }
    } catch (e: any) {
      console.error('Get timeline error:', e)
      setError(e.message || '获取时间线失败')
      setLoading(false)
      return null
    }
  }, [getProvider])

  const getPeriodicReview = useCallback(async (period: 'daily' | 'weekly' | 'monthly' = 'weekly'): Promise<PeriodicReview | null> => {
    setLoading(true)
    setError(null)
    
    try {
      const now = new Date()
      let startDate = new Date()
      
      if (period === 'daily') {
        startDate.setHours(0, 0, 0, 0)
      } else if (period === 'weekly') {
        startDate.setDate(startDate.getDate() - 7)
      } else {
        startDate.setMonth(startDate.getMonth() - 1)
      }
      
      const { data: notebooks } = await supabase
        .from('notebooks')
        .select('id, title, tags, created_at, updated_at')
        .gte('created_at', startDate.toISOString())
      
      const { data: cells } = await supabase
        .from('cells')
        .select('id, notebook_id, type, content, created_at')
        .gte('created_at', startDate.toISOString())
      
      const { data: todos } = await supabase
        .from('cells')
        .select('id, content, created_at')
        .eq('type', 'todo')
        .gte('created_at', startDate.toISOString())
      
      const newNotes = notebooks?.length || 0
      const newLinks = cells?.filter((c: any) => c.type === 'link').length || 0
      const todoCells = cells?.filter((c: any) => c.type === 'todo') || []
      const completedTodos = todoCells.filter((c: any) => {
        const content = typeof c.content === 'object' ? c.content : {}
        return content?.completed === true
      }).length
      const pendingTodos = todoCells.length - completedTodos
      
      const allTags = notebooks?.flatMap(nb => nb.tags || []) || []
      const tagCounts: Record<string, number> = {}
      allTags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1
      })
      
      const topTopics = Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([tag]) => tag)
      
      const provider = await getProvider()
      const recentContent = cells?.slice(-30).map((c: any) => {
        if (c.type === 'text') return typeof c.content === 'string' ? c.content.slice(0, 100) : ''
        if (c.type === 'voice') return typeof c.content === 'object' ? c.content?.transcription?.slice(0, 100) : ''
        if (c.type === 'ai_output') return typeof c.content === 'object' ? c.content?.content?.slice(0, 100) : typeof c.content === 'string' ? c.content.slice(0, 100) : ''
        return ''
      }).filter(Boolean).join('\n') || ''
      
      const periodLabel = period === 'daily' ? '今日' : period === 'weekly' ? '本周' : '本月'
      
      const messages = [{
        role: 'user' as const,
        content: `生成用户的${periodLabel}知识回顾：

## 时间范围
${startDate.toLocaleDateString('zh-CN')} - ${now.toLocaleDateString('zh-CN')}

## 统计数据
- 新建笔记: ${newNotes}篇
- 收藏链接: ${newLinks}个
- 完成待办: ${completedTodos}项
- 待处理待办: ${pendingTodos}项

## 关注主题
${topTopics.map(t => `- ${t}`).join('\n') || '暂无'}

## 最近内容摘要
${recentContent.slice(0, 1000)}

请返回 JSON 格式：
{
  "summary": "${periodLabel}知识探索的一句话总结",
  "key_topics": [
    { "topic": "主题名", "note_count": 数量, "key_insight": "关键洞察" }
  ],
  "highlights": ["亮点1", "亮点2"],
  "recommendations": ["建议1", "建议2"],
  "next_focus": ["下周/明天可以关注的方向1", "方向2"]
}`
      }]
      
      const raw = await provider.chat(messages, {
        systemPrompt: `你是知识管理专家。生成有价值的知识回顾报告，帮助用户了解自己的学习进展和下一步方向。只返回有效 JSON。`,
        temperature: 0.5
      })
      
      const json = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const aiResult = JSON.parse(json)
      
      setLoading(false)
      return {
        period,
        date_range: {
          start: startDate.toISOString(),
          end: now.toISOString()
        },
        summary: aiResult.summary,
        key_topics: aiResult.key_topics || [],
        progress: {
          new_notes: newNotes,
          completed_todos: completedTodos,
          pending_todos: pendingTodos,
          new_links: newLinks
        },
        highlights: aiResult.highlights || [],
        recommendations: aiResult.recommendations || [],
        next_focus: aiResult.next_focus || []
      }
    } catch (e: any) {
      console.error('Get periodic review error:', e)
      setError(e.message || '获取知识回顾失败')
      setLoading(false)
      return null
    }
  }, [getProvider])

  return {
    loading,
    error,
    quickNote,
    globalSearch,
    findRelatedNotebooks,
    ragQuery,
    getTodos,
    getUpcomingTodos,
    getDailyReview,
    indexAllCells,
    generateAndStoreEmbedding,
    autoTagNotebook,
    getAllTags,
    searchByTag,
    smartTag,
    generatePodcast,
    getInspirations,
    externalSearch,
    getThinkingPrompt,
    clusterNotes,
    detectKnowledgeGaps,
    getTimeline,
    getPeriodicReview
  }
}
