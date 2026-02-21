export interface Notebook {
  id: string
  user_id: string
  title: string
  description: string | null
  cover_color: string
  created_at: string
  updated_at: string
}

export interface NotebookSummary {
  id: string
  title: string
  cover_color: string
  updated_at: string
  preview: string | null
  cell_count: number
  tags: string[]
}

export const COVER_COLORS = [
  '#6366F1', // indigo
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#EF4444', // red
  '#F59E0B', // amber
  '#10B981', // emerald
  '#06B6D4', // cyan
  '#3B82F6', // blue
] as const

export type CoverColor = (typeof COVER_COLORS)[number]
