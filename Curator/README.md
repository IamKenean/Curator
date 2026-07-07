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
