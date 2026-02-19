-- Enable pgvector for semantic memory
create extension if not exists vector;

-- ── Notebooks ────────────────────────────────────────────────────────────────
create table notebooks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users not null,
  title       text not null,
  description text,
  cover_color text not null default '#6366F1',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table notebooks enable row level security;
create policy "Users own their notebooks"
  on notebooks for all using (auth.uid() = user_id);

-- ── Cells ────────────────────────────────────────────────────────────────────
-- All cell data is stored as JSONB for flexibility across cell types.
create table cells (
  id          uuid primary key default gen_random_uuid(),
  notebook_id uuid references notebooks on delete cascade not null,
  type        text not null check (type in ('text','voice','image','ai_output','todo','chart','correlation')),
  order_index float not null,
  content     jsonb not null default '{}',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create index cells_notebook_order on cells (notebook_id, order_index);

alter table cells enable row level security;
create policy "Users own their cells"
  on cells for all
  using (
    notebook_id in (
      select id from notebooks where user_id = auth.uid()
    )
  );

-- ── Memory embeddings ────────────────────────────────────────────────────────
-- Used for semantic search and note correlations.
create table memory_embeddings (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users not null,
  notebook_id uuid references notebooks on delete cascade,
  cell_id     uuid references cells on delete cascade,
  content     text not null,
  summary     text,
  embedding   vector(1536),       -- OpenAI / Qwen / ZAI text-embedding-3-small
  importance  float default 0.5,  -- 0–1, boosted when user interacts with the note
  created_at  timestamptz default now()
);

create index memory_embeddings_vector on memory_embeddings
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);

alter table memory_embeddings enable row level security;
create policy "Users own their embeddings"
  on memory_embeddings for all using (auth.uid() = user_id);

-- ── Todos (flat table for cross-notebook tracking) ────────────────────────────
create table todos (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users not null,
  cell_id    uuid references cells on delete set null,
  text       text not null,
  completed  boolean default false,
  priority   text default 'medium' check (priority in ('low','medium','high')),
  due_date   timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table todos enable row level security;
create policy "Users own their todos"
  on todos for all using (auth.uid() = user_id);

-- ── Updated-at trigger ───────────────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger notebooks_updated_at before update on notebooks
  for each row execute procedure set_updated_at();
create trigger cells_updated_at before update on cells
  for each row execute procedure set_updated_at();
create trigger todos_updated_at before update on todos
  for each row execute procedure set_updated_at();

-- ── Semantic search function ─────────────────────────────────────────────────
create or replace function match_memories(
  query_embedding vector(1536),
  query_user_id   uuid,
  match_count     int default 5,
  similarity_threshold float default 0.7
)
returns table (
  id          uuid,
  notebook_id uuid,
  cell_id     uuid,
  content     text,
  summary     text,
  similarity  float
)
language sql stable as $$
  select
    id, notebook_id, cell_id, content, summary,
    1 - (embedding <=> query_embedding) as similarity
  from memory_embeddings
  where
    user_id = query_user_id
    and 1 - (embedding <=> query_embedding) > similarity_threshold
  order by embedding <=> query_embedding
  limit match_count;
$$;
