-- Run in Supabase SQL Editor to add the sender's personal rating on recommendations.
alter table public.recommendations
  add column if not exists sender_rating numeric(2,1)
  check (sender_rating is null or (sender_rating >= 0.5 and sender_rating <= 5));
