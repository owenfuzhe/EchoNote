/**
 * 笔记存储 - Web 适配版 (使用 localStorage)
 */

import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import { MOCK_NOTES_200 } from '../services/mock-data'

export type NoteType = 'voice' | 'text' | 'ai' | 'link' | 'file' | 'image'

export interface TodoItem {
  id: string
  text: string
  priority: 'high' | 'medium' | 'low'
  completed: boolean
  createdAt: string
}

export interface Note {
  id: string
  title: string
  content: string
  type: NoteType
  audioUri?: string
  durationMs?: number
  sourceUrl?: string
  createdAt: string
  updatedAt: string
  tags?: string[]
  todos?: TodoItem[]
  emoji?: string
}

interface NoteState {
  notes: Note[]
  isLoading: boolean
  error: string | null

  // Actions
  fetchNotes: () => Promise<void>
  createNote: (data: Partial<Note>) => Promise<string>
  updateNote: (id: string, updates: Partial<Note>) => Promise<void>
  deleteNote: (id: string) => Promise<void>
  getNoteById: (id: string) => Note | undefined
  getAllTags: () => string[]
  searchNotes: (query: string) => Note[]
}

const STORAGE_KEY = 'crispynote_notes'

// LocalStorage 适配器
const storage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      localStorage.setItem(key, value)
    } catch {
      console.error('Failed to save to localStorage')
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      localStorage.removeItem(key)
    } catch {
      console.error('Failed to remove from localStorage')
    }
  },
}

export const useNoteStore = create<NoteState>((set, get) => ({
  notes: [],
  isLoading: false,
  error: null,

  fetchNotes: async () => {
    set({ isLoading: true, error: null })
    try {
      const json = await storage.getItem(STORAGE_KEY)
      let notes = json ? JSON.parse(json) : []

      // 如果没有数据，加载 200 篇 mock 数据
      if (notes.length === 0) {
        notes = MOCK_NOTES_200
        await storage.setItem(STORAGE_KEY, JSON.stringify(notes))
      }

      // Sort by updatedAt desc
      notes.sort((a: Note, b: Note) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
      set({ notes, isLoading: false })
    } catch (e: any) {
      set({ error: e.message, isLoading: false })
    }
  },

  createNote: async (data) => {
    const now = new Date().toISOString()
    const newNote: Note = {
      id: uuidv4(),
      title: data.title || '未命名笔记',
      content: data.content || '',
      type: data.type || 'text',
      audioUri: data.audioUri,
      durationMs: data.durationMs,
      sourceUrl: data.sourceUrl,
      createdAt: now,
      updatedAt: now,
      tags: data.tags || [],
      todos: data.todos || [],
    }

    const updatedNotes = [newNote, ...get().notes]
    await storage.setItem(STORAGE_KEY, JSON.stringify(updatedNotes))
    set({ notes: updatedNotes })
    return newNote.id
  },

  updateNote: async (id, updates) => {
    const updatedNotes = get().notes.map((note) =>
      note.id === id
        ? { ...note, ...updates, updatedAt: new Date().toISOString() }
        : note
    )
    await storage.setItem(STORAGE_KEY, JSON.stringify(updatedNotes))
    set({ notes: updatedNotes })
  },

  deleteNote: async (id) => {
    const updatedNotes = get().notes.filter((note) => note.id !== id)
    await storage.setItem(STORAGE_KEY, JSON.stringify(updatedNotes))
    set({ notes: updatedNotes })
  },

  getNoteById: (id) => {
    return get().notes.find((note) => note.id === id)
  },

  // 提取所有唯一标签
  getAllTags: () => {
    const notes = get().notes
    const tagSet = new Set<string>()
    notes.forEach((note) => {
      if (note.tags) {
        note.tags.forEach((tag) => tagSet.add(tag))
      }
    })
    return Array.from(tagSet).sort()
  },

  // 搜索笔记
  searchNotes: (query: string) => {
    const lowerQuery = query.toLowerCase()
    return get().notes.filter(
      (note) =>
        note.title.toLowerCase().includes(lowerQuery) ||
        note.content.toLowerCase().includes(lowerQuery) ||
        note.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery))
    )
  },
}))

// 从内容中提取标签的辅助函数
export const extractTagsFromContent = (content: string): string[] => {
  const tagRegex = /#([^\s#]+)/g
  const matches = content.match(tagRegex)
  return matches ? matches.map((tag) => tag.slice(1)) : []
}
