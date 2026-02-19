export type CellType =
  | 'text'
  | 'voice'
  | 'image'
  | 'ai_output'
  | 'todo'
  | 'chart'
  | 'correlation'

export interface BaseCell {
  id: string
  notebook_id: string
  type: CellType
  order_index: number
  created_at: string
  updated_at: string
}

// ── Text ────────────────────────────────────────────────────────────────────
export interface TextCellData extends BaseCell {
  type: 'text'
  content: string // markdown
}

// ── Voice ───────────────────────────────────────────────────────────────────
export interface VoiceCellData extends BaseCell {
  type: 'voice'
  audio_uri: string
  transcription: string | null
  language: 'zh' | 'en' | 'auto'
  duration_ms: number
  is_transcribing: boolean
}

// ── Image ───────────────────────────────────────────────────────────────────
export interface ImageCellData extends BaseCell {
  type: 'image'
  image_uri: string
  analysis: string | null
  is_analyzing: boolean
}

// ── AI Output ───────────────────────────────────────────────────────────────
export interface ActionItem {
  id: string
  text: string
  priority: 'low' | 'medium' | 'high'
  completed: boolean
}

export interface AIOutputCellData extends BaseCell {
  type: 'ai_output'
  source_cell_id: string
  content: string // full markdown response
  structured: {
    intent?: string
    action_items?: ActionItem[]
    suggestions?: string[]
    tags?: string[]
  } | null
  provider: string
  model: string
  is_streaming: boolean
}

// ── Todo ────────────────────────────────────────────────────────────────────
export interface TodoItem {
  id: string
  text: string
  completed: boolean
  due_date?: string
  priority: 'low' | 'medium' | 'high'
}

export interface TodoCellData extends BaseCell {
  type: 'todo'
  title: string
  items: TodoItem[]
}

// ── Chart ───────────────────────────────────────────────────────────────────
export type ChartType = 'bar' | 'line' | 'pie' | 'scatter' | 'area'

export interface ChartDataPoint {
  x: string | number
  y: number
  label?: string
}

export interface ChartCellData extends BaseCell {
  type: 'chart'
  title: string
  chart_type: ChartType
  data: ChartDataPoint[]
  x_label?: string
  y_label?: string
  color?: string
}

// ── Correlation ──────────────────────────────────────────────────────────────
export interface RelatedNote {
  notebook_id: string
  title: string
  similarity: number
  preview: string
}

export interface CorrelationCellData extends BaseCell {
  type: 'correlation'
  query: string
  related_notes: RelatedNote[]
  is_loading: boolean
}

// ── Union ───────────────────────────────────────────────────────────────────
export type Cell =
  | TextCellData
  | VoiceCellData
  | ImageCellData
  | AIOutputCellData
  | TodoCellData
  | ChartCellData
  | CorrelationCellData

export type CellContent = Cell['type'] extends infer T
  ? T extends Cell['type']
    ? Extract<Cell, { type: T }>
    : never
  : never
