-- Standalone star ratings (not tied to a recommendation)
create table if not exists public.title_ratings (
  user_id uuid not null references public.users(id) on delete cascade,
  tmdb_id integer not null,
  media_type text not null check (media_type in ('movie', 'tv')),
  rating_value numeric(2,1) not null check (
    rating_value >= 0.5 and rating_value <= 5 and mod(rating_value * 2, 1) = 0
  ),
  is_favorite boolean not null default false,
  source text not null default 'standalone' check (source in ('standalone', 'rec', 'import')),
  rated_at timestamptz not null default now(),
  primary key (user_id, tmdb_id, media_type)
);

create index if not exists title_ratings_user_idx on public.title_ratings (user_id, rated_at desc);

alter table public.title_ratings enable row level security;

drop policy if exists "Users can read own title ratings" on public.title_ratings;
create policy "Users can read own title ratings"
  on public.title_ratings for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can read friends title ratings" on public.title_ratings;
create policy "Users can read friends title ratings"
  on public.title_ratings for select to authenticated
  using (
    exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and (
          (f.user_id = auth.uid() and f.friend_id = title_ratings.user_id)
          or (f.friend_id = auth.uid() and f.user_id = title_ratings.user_id)
        )
    )
  );

drop policy if exists "Users can upsert own title ratings" on public.title_ratings;
create policy "Users can upsert own title ratings"
  on public.title_ratings for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own title ratings" on public.title_ratings;
create policy "Users can update own title ratings"
  on public.title_ratings for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.get_user_rating_count(p_user_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(distinct (tmdb_id, media_type))::integer from (
    select r.tmdb_id, r.media_type
    from public.ratings rt
    join public.recommendations r on r.id = rt.recommendation_id
    where rt.user_id = p_user_id
    union
    select tmdb_id, media_type
    from public.title_ratings
    where user_id = p_user_id
  ) rated;
$$;

grant execute on function public.get_user_rating_count(uuid) to authenticated;
