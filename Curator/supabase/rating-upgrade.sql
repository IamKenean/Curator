-- Run in Supabase SQL Editor to upgrade ratings to star scale.

alter table public.recommendations
  add column if not exists estimated_rating numeric(2,1)
  check (estimated_rating is null or (estimated_rating >= 0.5 and estimated_rating <= 5));

alter table public.ratings
  add column if not exists notes text check (notes is null or char_length(notes) <= 500);

alter table public.ratings
  add column if not exists is_favorite boolean not null default false;

alter table public.ratings drop constraint if exists ratings_rating_value_check;

update public.ratings
set rating_value = case rating_value
  when 10 then 5
  when 7.5 then 4
  when 5 then 3
  when 2.5 then 1.5
  else rating_value
end
where rating_value > 5;

alter table public.ratings
  add constraint ratings_rating_value_check
  check (rating_value >= 0.5 and rating_value <= 5 and mod(rating_value * 2, 1) = 0);
