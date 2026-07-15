-- Trust scores were stored as numeric(3,1), which rounds to 0.1 increments (10% jumps in the UI).
-- Widen precision so gradual rating changes are visible.

alter table public.trust_scores
  alter column score type numeric(4,3);
