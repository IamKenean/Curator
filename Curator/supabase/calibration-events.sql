-- Calibration / Journal feed: per-rating trust snapshots and rec accuracy narrative.

create table if not exists public.calibration_events (
  id uuid primary key default gen_random_uuid(),
  recommendation_id uuid not null references public.recommendations(id) on delete cascade,
  viewer_user_id uuid not null references public.users(id) on delete cascade,
  friend_user_id uuid not null references public.users(id) on delete cascade,
  event_type text not null check (event_type in ('received', 'sent_response')),
  tmdb_id integer not null,
  media_type text not null check (media_type in ('movie', 'tv')),
  estimated_rating numeric(2,1),
  actual_rating numeric(2,1) not null,
  rec_accuracy numeric(4,3) not null,
  trust_before numeric(4,3),
  trust_after numeric(4,3) not null,
  trust_delta_percent integer not null,
  reason text,
  notes text,
  is_favorite boolean not null default false,
  rated_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists calibration_events_viewer_rated_idx
  on public.calibration_events (viewer_user_id, rated_at desc);

create index if not exists calibration_events_friend_idx
  on public.calibration_events (viewer_user_id, friend_user_id);

create unique index if not exists calibration_events_unique_per_viewer_rec
  on public.calibration_events (recommendation_id, viewer_user_id, event_type);

alter table public.calibration_events enable row level security;

create policy "Users can read their own calibration events"
  on public.calibration_events for select
  to authenticated
  using (auth.uid() = viewer_user_id);

create policy "Authenticated users can insert calibration events"
  on public.calibration_events for insert
  to authenticated
  with check (true);

grant select, insert on public.calibration_events to authenticated;
