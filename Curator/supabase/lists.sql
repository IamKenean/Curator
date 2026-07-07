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

create or replace function public.is_friend_of(viewer uuid, other uuid)
returns boolean
language sql
stable
as $$
  select viewer = other or exists (
    select 1
    from public.friendships f
    where f.status = 'accepted'
      and (
        (f.user_id = viewer and f.friend_id = other)
        or (f.friend_id = viewer and f.user_id = other)
      )
  );
$$;

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
