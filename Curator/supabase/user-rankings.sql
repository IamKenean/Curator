create table if not exists public.user_rankings (
  user_id uuid not null references public.users(id) on delete cascade,
  list_type text not null default 'all-time',
  tmdb_id integer not null,
  media_type text not null check (media_type in ('movie', 'tv')),
  rank_position integer not null check (rank_position >= 1 and rank_position <= 10),
  updated_at timestamptz not null default now(),
  primary key (user_id, list_type, tmdb_id, media_type),
  constraint user_rankings_unique_position unique (user_id, list_type, rank_position)
);

create index if not exists user_rankings_user_list_idx on public.user_rankings (user_id, list_type, rank_position);

alter table public.user_rankings enable row level security;

drop policy if exists "Users manage own rankings" on public.user_rankings;
create policy "Users manage own rankings"
  on public.user_rankings for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Friends can read rankings" on public.user_rankings;
create policy "Friends can read rankings"
  on public.user_rankings for select to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and (
          (f.user_id = auth.uid() and f.friend_id = user_rankings.user_id)
          or (f.friend_id = auth.uid() and f.user_id = user_rankings.user_id)
        )
    )
  );

create or replace function public.reorder_user_top_10(
  p_user_id uuid,
  p_list_type text,
  p_ordered_tmdb_keys jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'Unauthorized';
  end if;

  delete from public.user_rankings
  where user_id = p_user_id
    and list_type = p_list_type;

  insert into public.user_rankings (user_id, list_type, tmdb_id, media_type, rank_position, updated_at)
  select
    p_user_id,
    p_list_type,
    (item->>'tmdb_id')::integer,
    item->>'media_type',
    ordinality::integer,
    now()
  from jsonb_array_elements(p_ordered_tmdb_keys) with ordinality as t(item, ordinality);
end;
$$;

grant execute on function public.reorder_user_top_10(uuid, text, jsonb) to authenticated;

create or replace function public.get_friends_top_10_picks(p_user_id uuid)
returns table (
  tmdb_id integer,
  media_type text,
  friend_id uuid,
  username text,
  avatar_url text,
  rank_position integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    ur.tmdb_id,
    ur.media_type,
    ur.user_id as friend_id,
    u.username,
    u.avatar_url,
    ur.rank_position
  from public.user_rankings ur
  join public.users u on u.id = ur.user_id
  where ur.user_id in (select public.viewer_friend_ids(p_user_id))
    and ur.list_type = 'all-time'
    and ur.rank_position <= 10
    and not exists (
      select 1
      from public.user_rankings mine
      where mine.user_id = p_user_id
        and mine.list_type = 'all-time'
        and mine.tmdb_id = ur.tmdb_id
        and mine.media_type = ur.media_type
    )
  order by ur.rank_position asc, u.username asc
  limit 40;
$$;

grant execute on function public.get_friends_top_10_picks(uuid) to authenticated;

create or replace function public.is_rankings_ready()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from pg_proc
    where proname = 'get_user_rating_count'
  )
  and exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'user_rankings'
  );
$$;

grant execute on function public.is_rankings_ready() to authenticated;
