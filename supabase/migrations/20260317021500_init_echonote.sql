create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null default '未命名笔记',
  content text not null default '',
  type text not null check (type in ('voice', 'text', 'ai', 'link', 'file', 'image')),
  source_url text,
  snapshot_html text,
  emoji text,
  tags text[] not null default '{}',
  todos_json jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint notes_todos_json_array check (jsonb_typeof(todos_json) = 'array')
);

create index if not exists notes_user_id_updated_at_idx on public.notes (user_id, updated_at desc);
create index if not exists notes_tags_gin_idx on public.notes using gin (tags);

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'echonote_set_profiles_updated_at'
      and tgrelid = 'public.profiles'::regclass
  ) then
    create trigger echonote_set_profiles_updated_at
    before update on public.profiles
    for each row
    execute function public.set_updated_at();
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'echonote_set_notes_updated_at'
      and tgrelid = 'public.notes'::regclass
  ) then
    create trigger echonote_set_notes_updated_at
    before update on public.notes
    for each row
    execute function public.set_updated_at();
  end if;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(coalesce(new.email, ''), '@', 1), 'EchoNote User')
  )
  on conflict (id) do update
  set email = excluded.email;
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'echonote_on_auth_user_created'
      and tgrelid = 'auth.users'::regclass
  ) then
    create trigger echonote_on_auth_user_created
    after insert on auth.users
    for each row
    execute function public.handle_new_user();
  end if;
end;
$$;

alter table public.profiles enable row level security;
alter table public.notes enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'echonote_profiles_select_own'
  ) then
    create policy echonote_profiles_select_own
    on public.profiles
    for select
    using (auth.uid() = id);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'echonote_profiles_insert_own'
  ) then
    create policy echonote_profiles_insert_own
    on public.profiles
    for insert
    with check (auth.uid() = id);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'echonote_profiles_update_own'
  ) then
    create policy echonote_profiles_update_own
    on public.profiles
    for update
    using (auth.uid() = id)
    with check (auth.uid() = id);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'notes'
      and policyname = 'echonote_notes_select_own'
  ) then
    create policy echonote_notes_select_own
    on public.notes
    for select
    using (auth.uid() = user_id);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'notes'
      and policyname = 'echonote_notes_insert_own'
  ) then
    create policy echonote_notes_insert_own
    on public.notes
    for insert
    with check (auth.uid() = user_id);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'notes'
      and policyname = 'echonote_notes_update_own'
  ) then
    create policy echonote_notes_update_own
    on public.notes
    for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'notes'
      and policyname = 'echonote_notes_delete_own'
  ) then
    create policy echonote_notes_delete_own
    on public.notes
    for delete
    using (auth.uid() = user_id);
  end if;
end;
$$;

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.notes to authenticated;
