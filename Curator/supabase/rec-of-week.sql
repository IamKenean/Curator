-- Rec of the Week: friends post a pick, others vote.
-- Run in Supabase → SQL Editor (replaces recommendation-based votes if present).

drop table if exists public.rec_of_week_votes cascade;

create table if not exists public.rec_of_week_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  tmdb_id integer not null,
  media_type text not null check (media_type in ('movie', 'tv')),
  pitch text check (pitch is null or char_length(pitch) <= 150),
  week_start date not null,
  created_at timestamptz not null default now(),
  constraint rec_of_week_submissions_one_per_week unique (user_id, week_start)
);

create index if not exists rec_of_week_submissions_week_idx
  on public.rec_of_week_submissions (week_start, created_at desc);

create table if not exists public.rec_of_week_votes (
  id uuid primary key default gen_random_uuid(),
  voter_id uuid not null references public.users(id) on delete cascade,
  submission_id uuid not null references public.rec_of_week_submissions(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint rec_of_week_votes_one_per_submission unique (voter_id, submission_id)
);

create index if not exists rec_of_week_votes_submission_idx
  on public.rec_of_week_votes (submission_id, created_at desc);

alter table public.rec_of_week_submissions enable row level security;
alter table public.rec_of_week_votes enable row level security;

drop policy if exists "Rec of week submissions readable" on public.rec_of_week_submissions;
create policy "Rec of week submissions readable"
  on public.rec_of_week_submissions for select
  to authenticated
  using (public.is_friend_of(auth.uid(), user_id));

drop policy if exists "Users can post weekly submission" on public.rec_of_week_submissions;
create policy "Users can post weekly submission"
  on public.rec_of_week_submissions for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update weekly submission" on public.rec_of_week_submissions;
create policy "Users can update weekly submission"
  on public.rec_of_week_submissions for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Rec of week votes readable" on public.rec_of_week_votes;
create policy "Rec of week votes readable"
  on public.rec_of_week_votes for select
  to authenticated
  using (true);

drop policy if exists "Users can insert weekly vote" on public.rec_of_week_votes;
create policy "Users can insert weekly vote"
  on public.rec_of_week_votes for insert
  to authenticated
  with check (auth.uid() = voter_id);

drop policy if exists "Users can update weekly vote" on public.rec_of_week_votes;
create policy "Users can update weekly vote"
  on public.rec_of_week_votes for update
  to authenticated
  using (auth.uid() = voter_id)
  with check (auth.uid() = voter_id);
