-- Rebuild trust_scores and calibration_events from all historical ratings.
-- Run AFTER trust-score-precision.sql (and calibration-events.sql if you use Journal).
--
-- Safe to re-run: replaces aggregates and rebuilds the full journal history.

begin;

-- ---------------------------------------------------------------------------
-- 1) Rebuild trust_scores (recipient's trust in sender's predictions)
-- ---------------------------------------------------------------------------

with scored as (
  select
    r.to_user_id as user_id,
    r.from_user_id as friend_id,
    round(
      avg(greatest(0::numeric, 1 - abs(r.estimated_rating - rt.rating_value) / 4))::numeric,
      3
    ) as score,
    count(*)::integer as total_recs
  from public.recommendations r
  inner join public.ratings rt
    on rt.recommendation_id = r.id
   and rt.user_id = r.to_user_id
  where r.status = 'watched'
    and r.estimated_rating is not null
  group by r.to_user_id, r.from_user_id
)
insert into public.trust_scores (user_id, friend_id, score, total_recs, updated_at)
select user_id, friend_id, score, total_recs, now()
from scored
on conflict (user_id, friend_id) do update
set
  score = excluded.score,
  total_recs = excluded.total_recs,
  updated_at = excluded.updated_at;

delete from public.trust_scores ts
where not exists (
  select 1
  from public.recommendations r
  inner join public.ratings rt
    on rt.recommendation_id = r.id
   and rt.user_id = r.to_user_id
  where r.from_user_id = ts.friend_id
    and r.to_user_id = ts.user_id
    and r.status = 'watched'
    and r.estimated_rating is not null
);

-- ---------------------------------------------------------------------------
-- 2) Rebuild calibration_events (chronological replay per friend pair)
--    Skipped automatically if calibration_events table does not exist yet.
-- ---------------------------------------------------------------------------

do $$
begin
  if to_regclass('public.calibration_events') is null then
    raise notice 'calibration_events table not found — trust_scores rebuilt only.';
    return;
  end if;

  delete from public.calibration_events;

  with rated_events as (
    select
      r.id as recommendation_id,
      r.to_user_id as recipient_id,
      r.from_user_id as sender_id,
      r.tmdb_id,
      r.media_type,
      r.estimated_rating,
      rt.rating_value as actual_rating,
      round(
        greatest(0::numeric, 1 - abs(r.estimated_rating - rt.rating_value) / 4)::numeric,
        3
      ) as rec_accuracy,
      r.reason,
      rt.notes,
      rt.is_favorite,
      rt.rated_at
    from public.recommendations r
    inner join public.ratings rt
      on rt.recommendation_id = r.id
     and rt.user_id = r.to_user_id
    where r.status = 'watched'
      and r.estimated_rating is not null
  ),
  running as (
    select
      rated_events.*,
      round(
        avg(rec_accuracy) over (
          partition by recipient_id, sender_id
          order by rated_at, recommendation_id
          rows between unbounded preceding and 1 preceding
        )::numeric,
        3
      ) as trust_before,
      round(
        avg(rec_accuracy) over (
          partition by recipient_id, sender_id
          order by rated_at, recommendation_id
          rows between unbounded preceding and current row
        )::numeric,
        3
      ) as trust_after
    from rated_events
  ),
  prepared as (
    select
      running.*,
      case
        when trust_before is null then round(trust_after * 100)::integer
        else round((trust_after - trust_before) * 100)::integer
      end as trust_delta_percent
    from running
  )
  insert into public.calibration_events (
    recommendation_id,
    viewer_user_id,
    friend_user_id,
    event_type,
    tmdb_id,
    media_type,
    estimated_rating,
    actual_rating,
    rec_accuracy,
    trust_before,
    trust_after,
    trust_delta_percent,
    reason,
    notes,
    is_favorite,
    rated_at
  )
  select
    recommendation_id,
    recipient_id,
    sender_id,
    'received',
    tmdb_id,
    media_type,
    estimated_rating,
    actual_rating,
    rec_accuracy,
    trust_before,
    trust_after,
    trust_delta_percent,
    reason,
    notes,
    is_favorite,
    rated_at
  from prepared
  union all
  select
    recommendation_id,
    sender_id,
    recipient_id,
    'sent_response',
    tmdb_id,
    media_type,
    estimated_rating,
    actual_rating,
    rec_accuracy,
    trust_before,
    trust_after,
    trust_delta_percent,
    reason,
    null,
    is_favorite,
    rated_at
  from prepared;

  raise notice 'calibration_events rebuilt from historical ratings.';
end $$;

commit;
