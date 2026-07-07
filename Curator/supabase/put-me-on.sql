-- Put Me On requests: friends post prompts, others respond with hidden picks.
-- Run in Supabase → SQL Editor.

create table if not exists public.put_me_on_requests (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users(id) on delete cascade,
  prompt text not null check (char_length(trim(prompt)) > 0),
  audience text not null default 'all_friends' check (audience in ('all_friends', 'selected')),
  friend_ids uuid[] not null default '{}',
  genres text[] not null default '{}',
  example_films jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists put_me_on_requests_owner_active_idx
  on public.put_me_on_requests (owner_id, expires_at desc);

create index if not exists put_me_on_requests_expires_idx
  on public.put_me_on_requests (expires_at desc);

create table if not exists public.put_me_on_responses (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.put_me_on_requests(id) on delete cascade,
  from_user_id uuid not null references public.users(id) on delete cascade,
  tmdb_id integer not null,
  media_type text not null check (media_type in ('movie', 'tv')),
  created_at timestamptz not null default now()
);

create index if not exists put_me_on_responses_request_idx
  on public.put_me_on_responses (request_id, created_at desc);

alter table public.put_me_on_requests enable row level security;
alter table public.put_me_on_responses enable row level security;

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

create or replace function public.can_view_put_me_on_request(viewer uuid, request public.put_me_on_requests)
returns boolean
language sql
stable
as $$
  select
    viewer = request.owner_id
    or (
      public.is_friend_of(viewer, request.owner_id)
      and request.expires_at > now()
      and (
        request.audience = 'all_friends'
        or viewer = any(request.friend_ids)
      )
    );
$$;

drop policy if exists "Put me on requests readable" on public.put_me_on_requests;
create policy "Put me on requests readable"
  on public.put_me_on_requests for select
  to authenticated
  using (public.can_view_put_me_on_request(auth.uid(), put_me_on_requests));

drop policy if exists "Users can create put me on requests" on public.put_me_on_requests;
create policy "Users can create put me on requests"
  on public.put_me_on_requests for insert
  to authenticated
  with check (auth.uid() = owner_id);

drop policy if exists "Users can delete own put me on requests" on public.put_me_on_requests;
create policy "Users can delete own put me on requests"
  on public.put_me_on_requests for delete
  to authenticated
  using (auth.uid() = owner_id);

drop policy if exists "Put me on responses readable" on public.put_me_on_responses;
create policy "Put me on responses readable"
  on public.put_me_on_responses for select
  to authenticated
  using (
    exists (
      select 1
      from public.put_me_on_requests r
      where r.id = request_id
        and public.can_view_put_me_on_request(auth.uid(), r)
    )
  );

drop policy if exists "Friends can respond to put me on requests" on public.put_me_on_responses;
create policy "Friends can respond to put me on requests"
  on public.put_me_on_responses for insert
  to authenticated
  with check (
    auth.uid() = from_user_id
    and exists (
      select 1
      from public.put_me_on_requests r
      where r.id = request_id
        and r.expires_at > now()
        and public.is_friend_of(auth.uid(), r.owner_id)
        and (
          r.audience = 'all_friends'
          or auth.uid() = any(r.friend_ids)
        )
    )
  );
