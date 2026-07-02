-- Enable Realtime for instant "Recommendation Received" alerts while the app is open.
-- Also enable in Supabase Dashboard: Database → Replication → supabase_realtime → recommendations.
-- Safe to run more than once.

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'recommendations'
  ) then
    alter publication supabase_realtime add table public.recommendations;
  end if;
end $$;
