import { Note, TodoItem } from '../types';
import { hasSupabaseSession, isSupabaseConfigured, supabase } from './supabase';

type NoteRow = {
  id: string;
  title: string;
  content: string;
  type: Note['type'];
  source_url: string | null;
  snapshot_html: string | null;
  emoji: string | null;
  tags: string[] | null;
  todos_json: TodoItem[] | null;
  created_at: string;
  updated_at: string;
};

const NOTE_COLUMNS = 'id,title,content,type,source_url,snapshot_html,emoji,tags,todos_json,created_at,updated_at';

export class SupabaseNotesError extends Error {
  constructor(message: string, public readonly code: 'NOT_CONFIGURED' | 'NOT_AUTHENTICATED' | 'REQUEST_FAILED') {
    super(message);
    this.name = 'SupabaseNotesError';
  }
}

function ensureSupabaseClient() {
  if (!isSupabaseConfigured || !supabase) {
    throw new SupabaseNotesError('Supabase 未配置', 'NOT_CONFIGURED');
  }
  return supabase;
}

async function ensureSession() {
  const configuredSupabase = ensureSupabaseClient();
  const loggedIn = await hasSupabaseSession();
  if (!loggedIn) {
    throw new SupabaseNotesError('Supabase 已配置，但当前还没有登录用户', 'NOT_AUTHENTICATED');
  }
  return configuredSupabase;
}

function mapRowToNote(row: NoteRow): Note {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    type: row.type,
    sourceUrl: row.source_url || undefined,
    snapshotHtml: row.snapshot_html || undefined,
    emoji: row.emoji || undefined,
    tags: row.tags || [],
    todos: Array.isArray(row.todos_json) ? row.todos_json : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapNoteToRow(note: Partial<Note>) {
  const row: Record<string, unknown> = {};

  if (note.title !== undefined) row.title = note.title;
  if (note.content !== undefined) row.content = note.content;
  if (note.type !== undefined) row.type = note.type;
  if (note.sourceUrl !== undefined) row.source_url = note.sourceUrl ?? null;
  if (note.snapshotHtml !== undefined) row.snapshot_html = note.snapshotHtml ?? null;
  if (note.emoji !== undefined) row.emoji = note.emoji ?? null;
  if (note.tags !== undefined) row.tags = note.tags ?? [];
  if (note.todos !== undefined) row.todos_json = note.todos ?? [];
  if (note.createdAt !== undefined) row.created_at = note.createdAt;
  if (note.updatedAt !== undefined) row.updated_at = note.updatedAt;

  return row;
}

export async function listNotesRemote(): Promise<Note[]> {
  const client = await ensureSession();
  const { data, error } = await client.from('notes').select(NOTE_COLUMNS).order('updated_at', { ascending: false });
  if (error) throw new SupabaseNotesError(error.message, 'REQUEST_FAILED');
  return (data || []).map((row) => mapRowToNote(row as NoteRow));
}

export async function createNoteRemote(note: Note): Promise<Note> {
  const client = await ensureSession();
  const { data, error } = await client
    .from('notes')
    .insert(mapNoteToRow(note))
    .select(NOTE_COLUMNS)
    .single();

  if (error) throw new SupabaseNotesError(error.message, 'REQUEST_FAILED');
  return mapRowToNote(data as NoteRow);
}

export async function updateNoteRemote(id: string, updates: Partial<Note>): Promise<Note> {
  const client = await ensureSession();
  const { data, error } = await client
    .from('notes')
    .update(mapNoteToRow(updates))
    .eq('id', id)
    .select(NOTE_COLUMNS)
    .single();

  if (error) throw new SupabaseNotesError(error.message, 'REQUEST_FAILED');
  return mapRowToNote(data as NoteRow);
}

export async function deleteNoteRemote(id: string): Promise<void> {
  const client = await ensureSession();
  const { error } = await client.from('notes').delete().eq('id', id);
  if (error) throw new SupabaseNotesError(error.message, 'REQUEST_FAILED');
}
