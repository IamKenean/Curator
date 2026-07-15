-- Run in Supabase SQL Editor to power Home feed sections that need cross-user data.
-- Safe to run more than once.

create or replace function public.viewer_friend_ids(viewer_id uuid)
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select friend_id from public.friendships where user_id = viewer_id and status = 'accepted'
  union
  select user_id from public.friendships where friend_id = viewer_id and status = 'accepted';
$$;

create or replace function public.get_friends_rated_highly(p_user_id uuid, p_min_rating numeric default 4)
returns table (
  tmdb_id integer,
  media_type text,
  avg_rating numeric,
  rating_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    r.tmdb_id,
    r.media_type,
    round(avg(rt.rating_value)::numeric, 1) as avg_rating,
    count(*) as rating_count
  from public.ratings rt
  join public.recommendations r on r.id = rt.recommendation_id
  where rt.user_id in (select public.viewer_friend_ids(p_user_id))
    and r.to_user_id <> p_user_id
    and rt.rating_value >= p_min_rating
  group by r.tmdb_id, r.media_type
  order by avg(rt.rating_value) desc, count(*) desc
  limit 20;
$$;

create or replace function public.get_curator_popular_this_week()
returns table (
  tmdb_id integer,
  media_type text,
  rating_count bigint,
  avg_rating numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select
    r.tmdb_id,
    r.media_type,
    count(*) as rating_count,
    round(avg(rt.rating_value)::numeric, 1) as avg_rating
  from public.ratings rt
  join public.recommendations r on r.id = rt.recommendation_id
  where rt.rated_at >= now() - interval '7 days'
  group by r.tmdb_id, r.media_type
  order by count(*) desc, avg(rt.rating_value) desc
  limit 20;
$$;

create or replace function public.get_new_from_friends(p_user_id uuid)
returns table (
  tmdb_id integer,
  media_type text,
  rating_value numeric,
  rated_at timestamptz,
  user_id uuid,
  username text,
  avatar_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    activity.tmdb_id,
    activity.media_type,
    activity.rating_value,
    activity.rated_at,
    activity.user_id,
    activity.username,
    activity.avatar_url
  from (
    select
      r.tmdb_id,
      r.media_type,
      rt.rating_value,
      rt.rated_at,
      u.id as user_id,
      u.username,
      u.avatar_url
    from public.ratings rt
    join public.recommendations r on r.id = rt.recommendation_id
    join public.users u on u.id = rt.user_id
    where rt.user_id in (select public.viewer_friend_ids(p_user_id))

    union all

    select
      r.tmdb_id,
      r.media_type,
      coalesce(r.estimated_rating, 0) as rating_value,
      r.created_at as rated_at,
      u.id as user_id,
      u.username,
      u.avatar_url
    from public.recommendations r
    join public.users u on u.id = r.from_user_id
    where r.from_user_id in (select public.viewer_friend_ids(p_user_id))
      and r.to_user_id = p_user_id
      and r.status = 'pending'
  ) activity
  order by activity.rated_at desc
  limit 20;
$$;

create or replace function public.get_high_trust_friends_picks(p_user_id uuid)
returns table (
  friend_id uuid,
  username text,
  avatar_url text,
  trust_score numeric,
  tmdb_id integer,
  media_type text,
  rating_value numeric,
  rated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with top_friends as (
    select ts.friend_id, ts.score as trust_score
    from public.trust_scores ts
    where ts.user_id = p_user_id
    order by ts.score desc
    limit 5
  ),
  recent_picks as (
    select distinct on (source.user_id)
      source.user_id,
      source.tmdb_id,
      source.media_type,
      source.rating_value,
      source.rated_at
    from (
      select
        rt.user_id,
        r.tmdb_id,
        r.media_type,
        rt.rating_value,
        rt.rated_at
      from public.ratings rt
      join public.recommendations r on r.id = rt.recommendation_id
      where rt.user_id in (select friend_id from top_friends)

      union all

      select
        r.from_user_id as user_id,
        r.tmdb_id,
        r.media_type,
        coalesce(r.estimated_rating, 0) as rating_value,
        r.created_at as rated_at
      from public.recommendations r
      where r.from_user_id in (select friend_id from top_friends)
        and r.to_user_id = p_user_id
    ) source
    order by source.user_id, source.rated_at desc
  )
  select
    tf.friend_id,
    u.username,
    u.avatar_url,
    tf.trust_score,
    rp.tmdb_id,
    rp.media_type,
    rp.rating_value,
    rp.rated_at
  from top_friends tf
  join public.users u on u.id = tf.friend_id
  left join recent_picks rp on rp.user_id = tf.friend_id
  where rp.tmdb_id is not null
  order by tf.trust_score desc, rp.rated_at desc;
$$;

create or replace function public.get_trusted_recommender_picks()
returns table (
  tmdb_id integer,
  media_type text,
  avg_rating numeric,
  rating_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with trusted_recommenders as (
    select ts.friend_id
    from public.trust_scores ts
    group by ts.friend_id
    having avg(ts.score) >= 0.7 and sum(ts.total_recs) >= 2
  )
  select
    r.tmdb_id,
    r.media_type,
    round(avg(rt.rating_value)::numeric, 1) as avg_rating,
    count(*) as rating_count
  from public.recommendations r
  join public.ratings rt on rt.recommendation_id = r.id
  where r.from_user_id in (select friend_id from trusted_recommenders)
    and rt.rating_value >= 4
  group by r.tmdb_id, r.media_type
  order by avg(rt.rating_value) desc, count(*) desc
  limit 20;
$$;

create or replace function public.get_taste_match_picks(p_user_id uuid)
returns table (
  tmdb_id integer,
  media_type text,
  avg_rating numeric,
  match_score numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with my_ratings as (
    select r.tmdb_id, r.media_type, rt.rating_value
    from public.ratings rt
    join public.recommendations r on r.id = rt.recommendation_id
    where rt.user_id = p_user_id
  ),
  taste_matches as (
    select
      rt.user_id,
      count(*) as overlap_count,
      avg(abs(rt.rating_value - mr.rating_value)) as avg_gap
    from public.ratings rt
    join public.recommendations r on r.id = rt.recommendation_id
    join my_ratings mr
      on mr.tmdb_id = r.tmdb_id
     and mr.media_type = r.media_type
    where rt.user_id <> p_user_id
    group by rt.user_id
    having count(*) >= 2 and avg(abs(rt.rating_value - mr.rating_value)) <= 1
    order by avg(abs(rt.rating_value - mr.rating_value)), count(*) desc
    limit 5
  ),
  my_titles as (
    select tmdb_id, media_type from my_ratings
  )
  select
    r.tmdb_id,
    r.media_type,
    round(avg(rt.rating_value)::numeric, 1) as avg_rating,
    round((1 - min(tm.avg_gap) / 4)::numeric, 2) as match_score
  from taste_matches tm
  join public.ratings rt on rt.user_id = tm.user_id
  join public.recommendations r on r.id = rt.recommendation_id
  where rt.rating_value >= 4
    and not exists (
      select 1
      from my_titles mt
      where mt.tmdb_id = r.tmdb_id
        and mt.media_type = r.media_type
    )
  group by r.tmdb_id, r.media_type
  order by match_score desc, avg(rt.rating_value) desc
  limit 20;
$$;

grant execute on function public.viewer_friend_ids(uuid) to authenticated;
grant execute on function public.get_friends_rated_highly(uuid, numeric) to authenticated;
grant execute on function public.get_curator_popular_this_week() to authenticated;
grant execute on function public.get_new_from_friends(uuid) to authenticated;
grant execute on function public.get_high_trust_friends_picks(uuid) to authenticated;
grant execute on function public.get_trusted_recommender_picks() to authenticated;
grant execute on function public.get_taste_match_picks(uuid) to authenticated;

create or replace function public.is_home_feed_ready()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select true;
$$;

create or replace function public.get_home_feed_bundle(p_user_id uuid)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'friends_rated_highly', coalesce((
      select json_agg(row_to_json(section))
      from get_friends_rated_highly(p_user_id) as section
    ), '[]'::json),
    'popular_this_week', coalesce((
      select json_agg(row_to_json(section))
      from get_curator_popular_this_week() as section
    ), '[]'::json),
    'new_from_friends', coalesce((
      select json_agg(row_to_json(section))
      from get_new_from_friends(p_user_id) as section
    ), '[]'::json),
    'high_trust_friends', coalesce((
      select json_agg(row_to_json(section))
      from get_high_trust_friends_picks(p_user_id) as section
    ), '[]'::json),
    'trusted_recommenders', coalesce((
      select json_agg(row_to_json(section))
      from get_trusted_recommender_picks() as section
    ), '[]'::json),
    'taste_matches', coalesce((
      select json_agg(row_to_json(section))
      from get_taste_match_picks(p_user_id) as section
    ), '[]'::json),
    'friends_top_10', coalesce((
      select json_agg(row_to_json(section))
      from get_friends_top_10_picks(p_user_id) as section
    ), '[]'::json)
  );
$$;

grant execute on function public.is_home_feed_ready() to authenticated;
grant execute on function public.get_home_feed_bundle(uuid) to authenticated;
