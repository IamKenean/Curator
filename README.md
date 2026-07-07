# Curator

Curator is an iOS-focused Expo app for sharing movie and TV recommendations with friends. It uses Supabase for auth and data, TMDB for title search and metadata, and Expo Router for navigation.

Repository: https://github.com/IamKenean/Curator

## Features

- **Home feed** — Category rows, inbox recommendations, curator lists, and sub-tabs (Films, Reviews, Lists, Journal)
- **Film detail** — TMDB-backed detail sheet with backdrop, poster, director, runtime, trailer, and overview
- **Send & receive** — Recommend titles to friends; rate and review after watching
- **Put Me On** — Post open requests; friends respond with picks (synced via Supabase)
- **Curator lists** — Create, share, and browse ranked title lists
- **Friends** — Sort/filter friends, trust scores, and profile insights
- **Themes** — Default palette, **Midnight** app theme, and poster-derived color themes
- **Rec of the Week** — Weekly recommendation leaderboard (requires Supabase migration)
- **Opening splash** — Curtain splash with rotating quotes on launch

## Project layout

```
Curator/                 # repo root (npm scripts live here)
  package.json
  README.md
  Curator/               # Expo app
    app/                 # routes (expo-router)
    assets/              # static assets (e.g. splash quotes CSV)
    src/                 # components, hooks, lib, providers
    supabase/            # SQL migrations / schema
    .env.example         # copy to .env and fill in keys
    metro.config.js      # Metro config (CSV asset support)
```

## Prerequisites

- [Node.js](https://nodejs.org/) 20+ and npm
- [Expo Go](https://expo.dev/go) on your iPhone (for device testing)
- A [Supabase](https://supabase.com/) project
- A [TMDB](https://www.themoviedb.org/settings/api) API key (for search and film detail)

## Setup

1. Clone the repo:

   ```bash
   git clone https://github.com/IamKenean/Curator.git
   cd Curator
   ```

2. Install dependencies:

   ```bash
   cd Curator
   npm install
   ```

3. Create your env file:

   ```bash
   cp .env.example .env
   ```

   Edit `Curator/.env` and set:

   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   EXPO_PUBLIC_TMDB_API_KEY=your-tmdb-api-key
   ```

4. Apply Supabase SQL in order (SQL editor or CLI). Run each file once on a fresh project:

   | Order | File | Purpose |
   |------:|------|---------|
   | 1 | `schema.sql` | Core tables, profiles, recommendations, friendships |
   | 2 | `home-feed.sql` | Homepage feed RPCs and categories |
   | 3 | `lists.sql` | Curator lists tables and RLS |
   | 4 | `put-me-on.sql` | Put Me On requests (cross-device sync) |
   | 5 | `rec-of-week.sql` | Rec of the Week tables |
   | 6 | `notifications-realtime.sql` | Realtime notifications (if not in schema) |
   | 7 | `rating-upgrade.sql` / `sender-rating-upgrade.sql` | Rating schema upgrades (existing projects only) |
   | 8 | `fix-auth.sql` | Auth fixes (only if needed) |

   **Minimum for local dev:** run at least `schema.sql`, `home-feed.sql`, `lists.sql`, and `put-me-on.sql`.

## Run locally (LAN)

From the repo root:

```bash
npm start
```

Or from `Curator/`:

```bash
npm start
```

This runs `expo start` on your local network. Open Expo Go on your phone and scan the QR code. Your phone and computer must be on the same Wi‑Fi.

Other useful commands from the repo root:

```bash
npm run ios          # open iOS simulator (macOS only)
npm run typecheck    # TypeScript check
npm run lint         # ESLint
```

Clear Metro cache if the bundler acts stale:

```bash
cd Curator
npm run start:clear
```

## Run with tunnel (remote / different network)

Use tunnel mode when your phone is not on the same network as your dev machine, or when LAN discovery fails.

From the repo root:

```bash
npm run start:tunnel
```

Or from `Curator/`:

```bash
npm run start:tunnel
```

This runs `expo start --tunnel`. `@expo/ngrok` is included as a dev dependency for tunnel support.

**Notes:**

- Tunnel startup is slower than LAN mode.
- You may be prompted to log in to Expo (`npx expo login`) the first time.
- If tunnel fails, try clearing cache: `cd Curator && npx expo start --tunnel -c`.
- If you see ngrok connection errors, fall back to LAN mode or configure ngrok manually.
- Firewall or corporate networks sometimes block tunnel connections; LAN mode is faster when both devices share Wi‑Fi.

## Environment validation

The app reads config from `Curator/.env` via `app.config.ts`. Missing Supabase values block auth; a missing TMDB key disables search and film detail but the rest of the app can still run.

## Tech stack

- Expo SDK 54, React Native, TypeScript
- Expo Router (file-based routes)
- Supabase (auth, database, realtime, RLS)
- TMDB API (posters, backdrops, credits, trailers)

## Branches

- `main` — stable baseline
- `cursor/put-me-on-requests` — Put Me On Supabase sync, film detail modal, lists feed, theme system, friends/search/send UI polish, splash, and Rec of the Week
