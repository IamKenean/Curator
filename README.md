# Curator

Curator is an iOS-focused Expo app for sharing movie and TV recommendations with friends. It uses Supabase for auth and data, TMDB for title search, and Expo Router for navigation.

Repository: https://github.com/IamKenean/Curator

## Project layout

```
Curator/                 # repo root (npm scripts live here)
  package.json
  Curator/               # Expo app
    app/                 # routes (expo-router)
    src/                 # components, hooks, lib
    supabase/            # SQL migrations / schema
    .env.example         # copy to .env and fill in keys
```

## Prerequisites

- [Node.js](https://nodejs.org/) 20+ and npm
- [Expo Go](https://expo.dev/go) on your iPhone (for device testing)
- A [Supabase](https://supabase.com/) project
- A [TMDB](https://www.themoviedb.org/settings/api) API key (for search)

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

4. Apply the SQL files in `Curator/supabase/` to your Supabase project (SQL editor or CLI), starting with `schema.sql`.

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

This runs `expo start --tunnel`, which routes traffic through Expo's tunnel service so Expo Go can load the app from anywhere.

**Notes:**

- Tunnel startup is slower than LAN mode.
- You may be prompted to log in to Expo (`npx expo login`) the first time.
- If tunnel fails, try clearing cache: `cd Curator && npx expo start --tunnel -c`.
- Firewall or corporate networks sometimes block tunnel connections; LAN mode is faster when both devices share Wi‑Fi.

## Environment validation

The app reads config from `Curator/.env` via `app.config.ts`. Missing Supabase values block auth; a missing TMDB key disables search but the rest of the app can still run.

## Tech stack

- Expo SDK 54, React Native, TypeScript
- Expo Router (file-based routes)
- Supabase (auth, database, realtime)
- TMDB API (posters and metadata)
