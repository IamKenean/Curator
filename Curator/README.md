# Curator (Expo app)

This folder contains the Expo React Native app. Full setup, Supabase migration order, and run instructions are in the [root README](../README.md).

## Quick start

```bash
npm install
cp .env.example .env
# Fill in Supabase + TMDB keys, then run supabase/*.sql (see root README)
npm start
```

## Supabase SQL (minimum)

Run in the Supabase SQL editor, in order:

1. `supabase/schema.sql`
2. `supabase/home-feed.sql`
3. `supabase/lists.sql`
4. `supabase/put-me-on.sql`
5. `supabase/calibration-events.sql`
6. `supabase/title-ratings.sql` — standalone server ratings + unlock count RPC
7. `supabase/user-rankings.sql` — Top 10 canon + reorder RPC
8. `supabase/ranking-list-types.sql` — genre/theme lists (run after user-rankings on existing DBs)
9. Re-run `supabase/home-feed.sql` (adds `friends_top_10` to feed bundle)
10. `supabase/trust-score-precision.sql` (existing DBs only — fixes 10% trust jumps)
11. `supabase/recalculate-trust.sql` (optional — rebuilds trust + journal from old ratings)

Optional: `rec-of-week.sql`, `notifications-realtime.sql`, and upgrade scripts for existing databases.

## Tunnel mode

Phone on a different network:

```bash
npm run start:tunnel
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Expo dev server (LAN) |
| `npm run start:clear` | Expo with cleared Metro cache |
| `npm run start:tunnel` | Expo tunnel mode |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |
