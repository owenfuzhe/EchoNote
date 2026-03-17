create table if not exists users (
  id text primary key,
  email text unique,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists notes (
  id text primary key,
  owner_id text not null references users(id) on delete cascade,
  title text not null,
  content text not null default '',
  type text not null check (type in ('voice', 'text', 'ai', 'link', 'file', 'image')),
  source_url text,
  snapshot_html text,
  emoji text,
  todos_json jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists tags (
  id bigserial primary key,
  owner_id text not null references users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (owner_id, name)
);

create table if not exists note_tags (
  note_id text not null references notes(id) on delete cascade,
  tag_id bigint not null references tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (note_id, tag_id)
);

create index if not exists idx_notes_owner_updated_at on notes(owner_id, updated_at desc);
create index if not exists idx_note_tags_tag_id on note_tags(tag_id);
create index if not exists idx_tags_owner_name on tags(owner_id, name);
