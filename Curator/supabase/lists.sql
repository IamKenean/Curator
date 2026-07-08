-- Curator lists: user-curated title collections with public / friends visibility.
-- Requires public.users and public.friendships (see schema.sql).
-- Reuses public.is_friend_of from put-me-on.sql if already applied.

create table if not exists public.curator_lists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  description text not null default '',
  entries jsonb not null default '[]'::jsonb,
  visibility text not null default 'friends' check (visibility in ('public', 'friends')),
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists curator_lists_owner_updated_idx
  on public.curator_lists (owner_id, updated_at desc);

create index if not exists curator_lists_visibility_updated_idx
  on public.curator_lists (visibility, updated_at desc);

-- Normalized list items. The `entries` jsonb column on curator_lists is
-- deprecated and should be migrated to this table; it is kept for now so
-- existing app code continues to work during the transition.
create table if not exists public.curator_list_entries (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.curator_lists(id) on delete cascade,
  tmdb_id integer not null,
  media_type text not null check (media_type in ('movie', 'tv')),
  "order" integer not null default 0,
  added_at timestamptz not null default now(),
  constraint curator_list_entries_unique_item unique (list_id, tmdb_id, media_type)
);

create index if not exists curator_list_entries_list_order_idx
  on public.curator_list_entries (list_id, "order");

create index if not exists curator_list_entries_tmdb_idx
  on public.curator_list_entries (tmdb_id, media_type);

alter table public.curator_list_entries enable row level security;

drop policy if exists "List entries readable by list viewers" on public.curator_list_entries;
create policy "List entries readable by list viewers"
  on public.curator_list_entries for select
  to authenticated
  using (
    exists (
      select 1 from public.curator_lists l
      where l.id = list_id
        and public.can_view_curator_list(auth.uid(), l)
    )
  );

drop policy if exists "List entries editable by list owner" on public.curator_list_entries;
create policy "List entries editable by list owner"
  on public.curator_list_entries for all
  to authenticated
  using (
    exists (
      select 1 from public.curator_lists l
      where l.id = list_id and l.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.curator_lists l
      where l.id = list_id and l.owner_id = auth.uid()
    )
  );

create or replace function public.can_view_curator_list(viewer uuid, list_row public.curator_lists)
returns boolean
language sql
stable
as $$
  select
    viewer = list_row.owner_id
    or list_row.visibility = 'public'
    or (
      list_row.visibility = 'friends'
      and public.is_friend_of(viewer, list_row.owner_id)
    );
$$;

alter table public.curator_lists enable row level security;

drop policy if exists "Curator lists readable" on public.curator_lists;
create policy "Curator lists readable"
  on public.curator_lists for select
  to authenticated
  using (public.can_view_curator_list(auth.uid(), curator_lists));

drop policy if exists "Users can create curator lists" on public.curator_lists;
create policy "Users can create curator lists"
  on public.curator_lists for insert
  to authenticated
  with check (auth.uid() = owner_id);

drop policy if exists "Users can update own curator lists" on public.curator_lists;
create policy "Users can update own curator lists"
  on public.curator_lists for update
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "Users can delete own curator lists" on public.curator_lists;
create policy "Users can delete own curator lists"
  on public.curator_lists for delete
  to authenticated
  using (auth.uid() = owner_id);
