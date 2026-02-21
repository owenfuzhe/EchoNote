import { create } from 'zustand'
import { Cell, CellType } from '@/types/cell'
import { NotebookSummary } from '@/types/notebook'
import { supabase } from '@/lib/supabase'

interface NotebookState {
  notebooks: NotebookSummary[]
  activeCells: Cell[]
  activeNotebookId: string | null
  isLoading: boolean
  error: string | null

  // Notebook actions
  fetchNotebooks: () => Promise<void>
  createNotebook: (title: string, color: string) => Promise<string>
  deleteNotebook: (id: string) => Promise<void>

  // Cell actions
  loadCells: (notebookId: string) => Promise<void>
  addCell: (notebookId: string, type: CellType, afterIndex?: number) => Promise<Cell>
  updateCell: (id: string, updates: Partial<Cell>) => void
  persistCell: (cell: Cell) => Promise<void>
  deleteCell: (id: string) => Promise<void>
  reorderCells: (fromIndex: number, toIndex: number) => void
}

export const useNotebookStore = create<NotebookState>((set, get) => ({
  notebooks: [],
  activeCells: [],
  activeNotebookId: null,
  isLoading: false,
  error: null,

  fetchNotebooks: async () => {
    set({ isLoading: true, error: null })
    const { data, error } = await supabase
      .from('notebooks')
      .select('id, title, cover_color, updated_at, description, tags')
      .order('updated_at', { ascending: false })
    if (error) { set({ error: error.message, isLoading: false }); return }
    set({
      notebooks: (data ?? []).map((n) => ({
        id: n.id,
        title: n.title,
        cover_color: n.cover_color,
        updated_at: n.updated_at,
        preview: n.description,
        cell_count: 0,
        tags: n.tags || [],
      })),
      isLoading: false,
    })
  },

  createNotebook: async (title, color) => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('notebooks')
      .insert({ title, cover_color: color, user_id: user!.id })
      .select('id')
      .single()
    if (error) throw new Error(error.message)
    await get().fetchNotebooks()
    return data.id
  },

  deleteNotebook: async (id) => {
    await supabase.from('notebooks').delete().eq('id', id)
    await get().fetchNotebooks()
  },

  loadCells: async (notebookId) => {
    set({ isLoading: true, activeNotebookId: notebookId })
    const { data, error } = await supabase
      .from('cells')
      .select('*')
      .eq('notebook_id', notebookId)
      .order('order_index')
    if (error) { set({ error: error.message, isLoading: false }); return }
    const cells = (data ?? []).map(transformCellFromDB)
    set({ activeCells: cells as Cell[], isLoading: false })
  },

  addCell: async (notebookId, type, afterIndex) => {
    const cells = get().activeCells
    const insertAt = afterIndex !== undefined ? afterIndex + 1 : cells.length
    // Fractional indexing: place between neighbors
    const prev = cells[insertAt - 1]?.order_index ?? 0
    const next = cells[insertAt]?.order_index ?? prev + 2
    const orderIndex = (prev + next) / 2

    const defaultContent = getDefaultContent(type)
    const { data, error } = await supabase
      .from('cells')
      .insert({ notebook_id: notebookId, type, order_index: orderIndex, content: defaultContent })
      .select('*')
      .single()
    if (error) throw new Error(error.message)

    const newCell = transformCellFromDB(data)
    set((s) => {
      const updated = [...s.activeCells]
      updated.splice(insertAt, 0, newCell)
      return { activeCells: updated }
    })
    return newCell
  },

  updateCell: (id, updates) => {
    set((s) => ({
      activeCells: s.activeCells.map((c) => (c.id === id ? { ...c, ...updates } as Cell : c)),
    }))
  },

  persistCell: async (cell) => {
    const content = extractContentForDB(cell)
    await supabase.from('cells').update({ content, updated_at: new Date().toISOString() }).eq('id', cell.id)
  },

  deleteCell: async (id) => {
    await supabase.from('cells').delete().eq('id', id)
    set((s) => ({ activeCells: s.activeCells.filter((c) => c.id !== id) }))
  },

  reorderCells: (fromIndex, toIndex) => {
    set((s) => {
      const cells = [...s.activeCells]
      const [moved] = cells.splice(fromIndex, 1)
      cells.splice(toIndex, 0, moved)
      return { activeCells: cells }
    })
  },
}))

function transformCellFromDB(row: any): Cell {
  const base = {
    id: row.id,
    notebook_id: row.notebook_id,
    type: row.type,
    order_index: row.order_index,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
  const content = row.content || {}
  
  switch (row.type) {
    case 'text':
      return { ...base, type: 'text', content: content.content || '' }
    case 'voice':
      return { 
        ...base, 
        type: 'voice', 
        audio_uri: content.audio_uri || '',
        transcription: content.transcription || null,
        language: content.language || 'auto',
        duration_ms: content.duration_ms || 0,
        is_transcribing: content.is_transcribing || false,
      }
    case 'image':
      return {
        ...base,
        type: 'image',
        image_uri: content.image_uri || '',
        analysis: content.analysis || null,
        is_analyzing: content.is_analyzing || false,
      }
    case 'ai_output':
      return {
        ...base,
        type: 'ai_output',
        source_cell_id: content.source_cell_id || '',
        content: content.content || '',
        structured: content.structured || null,
        provider: content.provider || '',
        model: content.model || '',
        is_streaming: content.is_streaming || false,
      }
    case 'todo':
      return {
        ...base,
        type: 'todo',
        title: content.title || 'Tasks',
        items: content.items || [],
      }
    case 'chart':
      return {
        ...base,
        type: 'chart',
        title: content.title || 'Chart',
        chart_type: content.chart_type || 'bar',
        data: content.data || [],
        x_label: content.x_label,
        y_label: content.y_label,
        color: content.color,
      }
    case 'correlation':
      return {
        ...base,
        type: 'correlation',
        query: content.query || '',
        related_notes: content.related_notes || [],
        is_loading: content.is_loading || false,
      }
    case 'link':
      return {
        ...base,
        type: 'link',
        url: content.url || '',
        title: content.title || null,
        favicon: content.favicon || null,
        content: content.content || null,
        published_time: content.published_time || null,
      }
    default:
      return { ...base, type: 'text', content: '' }
  }
}

function getDefaultContent(type: CellType): object {
  switch (type) {
    case 'text': return { content: '' }
    case 'voice': return { audio_uri: '', transcription: null, language: 'auto', duration_ms: 0, is_transcribing: false }
    case 'image': return { image_uri: '', analysis: null, is_analyzing: false }
    case 'ai_output': return { source_cell_id: '', content: '', structured: null, provider: '', model: '', is_streaming: false }
    case 'todo': return { title: 'Tasks', items: [] }
    case 'chart': return { title: 'Chart', chart_type: 'bar', data: [] }
    case 'correlation': return { query: '', related_notes: [], is_loading: false }
    case 'link': return { url: '', title: null, favicon: null, content: null, published_time: null }
    default: return {}
  }
}

function extractContentForDB(cell: Cell): object {
  switch (cell.type) {
    case 'text': return { content: cell.content }
    case 'voice': return { audio_uri: cell.audio_uri, transcription: cell.transcription, language: cell.language, duration_ms: cell.duration_ms, is_transcribing: cell.is_transcribing }
    case 'image': return { image_uri: cell.image_uri, analysis: cell.analysis, is_analyzing: cell.is_analyzing }
    case 'ai_output': return { source_cell_id: cell.source_cell_id, content: cell.content, structured: cell.structured, provider: cell.provider, model: cell.model, is_streaming: cell.is_streaming }
    case 'todo': return { title: cell.title, items: cell.items }
    case 'chart': return { title: cell.title, chart_type: cell.chart_type, data: cell.data, x_label: cell.x_label, y_label: cell.y_label, color: cell.color }
    case 'correlation': return { query: cell.query, related_notes: cell.related_notes, is_loading: cell.is_loading }
    case 'link': return { url: cell.url, title: cell.title, favicon: cell.favicon, content: cell.content, published_time: cell.published_time }
    default: return {}
  }
}
