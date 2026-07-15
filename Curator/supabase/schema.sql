create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  friend_id uuid not null references public.users(id) on delete cascade,
  status text not null check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  constraint friendships_not_self check (user_id <> friend_id),
  constraint friendships_unique_pair unique (user_id, friend_id)
);

create table if not exists public.recommendations (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references public.users(id) on delete cascade,
  to_user_id uuid not null references public.users(id) on delete cascade,
  tmdb_id integer not null,
  media_type text not null check (media_type in ('movie', 'tv')),
  reason text check (char_length(reason) <= 150),
  estimated_rating numeric(2,1) check (estimated_rating is null or (estimated_rating >= 0.5 and estimated_rating <= 5)),
  sender_rating numeric(2,1) check (sender_rating is null or (sender_rating >= 0.5 and sender_rating <= 5)),
  status text not null default 'pending' check (status in ('pending', 'watched')),
  created_at timestamptz not null default now()
);

create table if not exists public.ratings (
  id uuid primary key default gen_random_uuid(),
  recommendation_id uuid not null unique references public.recommendations(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  rating_value numeric(2,1) not null check (rating_value >= 0.5 and rating_value <= 5 and mod(rating_value * 2, 1) = 0),
  notes text check (notes is null or char_length(notes) <= 500),
  is_favorite boolean not null default false,
  rated_at timestamptz not null default now()
);

create table if not exists public.trust_scores (
  user_id uuid not null references public.users(id) on delete cascade,
  friend_id uuid not null references public.users(id) on delete cascade,
  score numeric(4,3) not null default 0, -- average prediction accuracy (0.000-1.000)
  total_recs integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, friend_id)
);

create index if not exists users_username_idx on public.users using gin (username gin_trgm_ops);
create index if not exists friendships_user_status_idx on public.friendships (user_id, status);
create index if not exists friendships_friend_status_idx on public.friendships (friend_id, status);
create index if not exists recommendations_to_status_idx on public.recommendations (to_user_id, status, created_at desc);
create index if not exists recommendations_from_idx on public.recommendations (from_user_id, created_at desc);
create index if not exists ratings_user_idx on public.ratings (user_id, rated_at desc);
create index if not exists trust_scores_user_score_idx on public.trust_scores (user_id, score desc);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, username, avatar_url, created_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    null,
    now()
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table public.users enable row level security;
alter table public.friendships enable row level security;
alter table public.recommendations enable row level security;
alter table public.ratings enable row level security;
alter table public.trust_scores enable row level security;

create policy "Users are readable by authenticated users"
  on public.users for select
  to authenticated
  using (true);

create policy "Users can insert their own profile"
  on public.users for insert
  to authenticated
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.users for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

grant usage on schema public to postgres, anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;

create policy "Friendships visible to both users"
  on public.friendships for select
  to authenticated
  using (auth.uid() = user_id or auth.uid() = friend_id);

create policy "Users can send friend requests"
  on public.friendships for insert
  to authenticated
  with check (auth.uid() = user_id and status = 'pending');

create policy "Recipients can accept requests"
  on public.friendships for update
  to authenticated
  using (auth.uid() = friend_id)
  with check (auth.uid() = friend_id and status in ('pending', 'accepted'));

create policy "Participants can delete friend requests"
  on public.friendships for delete
  to authenticated
  using (auth.uid() = user_id or auth.uid() = friend_id);

create policy "Recommendations visible to participants"
  on public.recommendations for select
  to authenticated
  using (auth.uid() = from_user_id or auth.uid() = to_user_id);

create policy "Users can send recommendations"
  on public.recommendations for insert
  to authenticated
  with check (auth.uid() = from_user_id and status = 'pending');

create policy "Recipients can mark recommendations watched"
  on public.recommendations for update
  to authenticated
  using (auth.uid() = to_user_id)
  with check (auth.uid() = to_user_id);

create policy "Ratings visible to recommendation participants"
  on public.ratings for select
  to authenticated
  using (
    exists (
      select 1
      from public.recommendations r
      where r.id = recommendation_id
        and (r.from_user_id = auth.uid() or r.to_user_id = auth.uid())
    )
  );

create policy "Recipients can rate incoming recommendations"
  on public.ratings for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.recommendations r
      where r.id = recommendation_id
        and r.to_user_id = auth.uid()
    )
  );

create policy "Trust scores visible to the owner"
  on public.trust_scores for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can upsert their own trust scores"
  on public.trust_scores for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own trust scores"
  on public.trust_scores for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
