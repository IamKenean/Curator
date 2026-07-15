# Feature Handoff: Rankings Tab + Easier Rating + Home Feed

**Feature ID:** `rankings-top-10`  
**Version:** 1.0  
**Date:** July 13, 2026  
**Status:** Not started

---

## 1. Summary

Replace the stubbed **Reviews** sub-tab with **Rankings** — a personal Top 10 canon the user curates via drag-to-reorder. Rated films are stored on the server for taste data, but **only films explicitly placed in the Top 10 appear on the Rankings tab** (implicit behavior — no "unranked" section or explanatory copy).

Add a home feed section **"In Friends' Top 10"** showing films friends have placed in their personal canon.

Simplify inbox rating to stars-first (notes optional/collapsed).

---

## 2. Product Principles

| Principle | Implementation |
|-----------|----------------|
| **Canon is curated** | Top 10 = intentional drag order, not auto-sorted |
| **Rating ≠ ranking** | Stars update trust/rec history; rank is separate |
| **Implicit UX** | No "Watched, not ranked" UI; no post-rate "Add to rankings?" modal |
| **Volume gate** | 5 rated films required to unlock Rankings tab (only explicit onboarding) |
| **Server-first** | Replace local `titleRatings.ts` AsyncStorage with Supabase |

---

## 3. User Stories

| # | Story | Acceptance |
|---|-------|------------|
| 1 | As a user with <5 ratings, I see a gate on Rankings | Progress 3/5, CTAs to rate or search |
| 2 | As a user with 5+ ratings, I manage my Top 10 | Drag reorder, add, remove |
| 3 | As a user, I rate an inbox rec quickly | Stars submit → trust updates; notes optional |
| 4 | As a user, I quick-rate from film detail | Saves to server `title_ratings`, not local |
| 5 | As a user, I see friends' canon on Home | "In Friends' Top 10" section with friend positions |
| 6 | As a user, I add a film to Top 10 | Search → lands in next slot (or replace flow if full) |

---

## 4. Rankings Tab UX

### 4.1 Placement

Rename sub-tab **Reviews → Rankings** in:
- `app/(tabs)/index.tsx` — `HOME_SUB_TABS`
- `app/(tabs)/profile.tsx` — `PROFILE_SUB_TABS` (mirror same panel or deep-link to Home Rankings)

**Recommendation:** Build `RankingsPanel` once; use on Home Rankings tab. Profile Rankings tab renders same component (or navigates to Home Rankings tab).

### 4.2 Unlocked state

```
┌─────────────────────────────────────────────┐
│  Rankings                    [+ Add film]   │
├─────────────────────────────────────────────┤
│  YOUR TOP 10                                │
│                                             │
│  #1  [poster] Title (year)    ★4.5    ≡    │
│  #2  ...                                    │
│  ...                                        │
│  #10 ...                                    │
│                                             │
│  [ empty slot — tap + to add ]              │
└─────────────────────────────────────────────┘
```

- **Drag handle** (≡) or long-press to reorder
- **Rank number** (#1–#10) is primary; stars secondary
- **Remove:** swipe or long-press menu → removes from Top 10 (film stays rated in DB)
- **Empty slots:** show dashed add affordance up to 10 total

### 4.3 Locked state (volume gate)

```
┌─────────────────────────────────────────────┐
│  Build your canon                           │
│  Rate 5 films to unlock Rankings            │
│  ████████░░  3/5                            │
│  [ Search & rate a film ]                   │
└─────────────────────────────────────────────┘
```

Constants:
```ts
export const RANKINGS_UNLOCK_RATING_COUNT = 5;
export const TOP_10_SIZE = 10;
```

**Count toward unlock:** unique films with a server-side rating from any source:
- Inbox/rec-linked `ratings` rows
- Standalone `title_ratings` rows

Do **not** count merely adding to Top 10 without a star rating (adding to Top 10 should require or prompt a rating — see 4.5).

### 4.4 Add film flow

1. Tap **+ Add film** → `MovieSearchModal` (existing)
2. On select:
   - If film has no rating → show compact star picker (min 0.5★) before placing
   - Assign `rank_position` = lowest occupied slot + 1, or #10 if inserting
   - If Top 10 full → prompt: "Replace #10?" or pick slot to bump

### 4.5 Silent rules (do not surface in UI copy)

| Action | Backend | Rankings UI |
|--------|---------|-------------|
| Rate inbox rec | `ratings` + trust update; upsert `title_ratings` | Unchanged |
| Quick rate film detail | Upsert `title_ratings` | Unchanged |
| Add to Top 10 | Upsert `user_rankings` rank 1–10 | Row appears |
| Drag reorder | Batch update `rank_position` 1–10 | Order updates |
| Remove from Top 10 | Delete `user_rankings` row | Slot opens |

---

## 5. Easier Rating (Inbox)

### 5.1 Refactor `RatingModal.tsx`

**Two-step or collapsed layout:**

**Step 1 (default):** Poster + stars + Submit  
**Step 2 (optional):** Expand "Add note" + favorite toggle

On submit with stars only:
- Call existing `markRecommendationWatchedAndRate`
- Also upsert `title_ratings` for the film (same stars)
- Do **not** prompt to add to Rankings

**Files:** `RatingModal.tsx`, `app/(tabs)/index.tsx`, `app/category/[slug].tsx`

### 5.2 Quick rating (`QuickRatingModal` + `FilmDetailModal`)

- Point at Supabase `title_ratings` via new lib (replace `titleRatings.ts` local storage)
- Remove hint: "Quick ratings save locally and do not update friend trust" → update to accurate server copy or remove hint

---

## 6. Home Feed: "In Friends' Top 10"

### 6.1 Section spec

| Field | Value |
|-------|-------|
| **Title** | In Friends' Top 10 |
| **Subtitle** | Films your friends hold in their personal canon. |
| **Empty** | No friends have ranked films yet. |
| **Card meta** | `@maya #2 · @jordan #5` |
| **Sort** | Most friends ranking it highest first |

### 6.2 Logic

- Films where ≥1 friend has `user_rankings.rank_position <= 10`
- Exclude films viewer already has in their own Top 10
- Hydrate TMDB posters (same as other home sections)
- Add to `HomeFeed` type + `fetchHomeFeedFromServer` + `get_home_feed_bundle` RPC

### 6.3 Category page

Add slug `friends-top-10` to `homeCategories.ts` (or reuse pattern from existing categories).

---

## 7. Data Model

### 7.1 Migration: `supabase/title-ratings.sql`

```sql
-- Standalone star ratings (not tied to a recommendation)
create table if not exists public.title_ratings (
  user_id uuid not null references public.users(id) on delete cascade,
  tmdb_id integer not null,
  media_type text not null check (media_type in ('movie', 'tv')),
  rating_value numeric(2,1) not null check (
    rating_value >= 0.5 and rating_value <= 5 and mod(rating_value * 2, 1) = 0
  ),
  is_favorite boolean not null default false,
  source text not null default 'standalone' check (source in ('standalone', 'rec', 'import')),
  rated_at timestamptz not null default now(),
  primary key (user_id, tmdb_id, media_type)
);

create index title_ratings_user_idx on public.title_ratings (user_id, rated_at desc);

alter table public.title_ratings enable row level security;

create policy "Users can read own title ratings"
  on public.title_ratings for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can read friends title ratings"
  on public.title_ratings for select to authenticated
  using (
    exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and (
          (f.user_id = auth.uid() and f.friend_id = title_ratings.user_id)
          or (f.friend_id = auth.uid() and f.user_id = title_ratings.user_id)
        )
    )
  );

create policy "Users can upsert own title ratings"
  on public.title_ratings for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own title ratings"
  on public.title_ratings for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

Also allow users to read **friends'** `title_ratings` only if needed for taste RPCs — optional for v1.

### 7.2 Migration: `supabase/user-rankings.sql`

```sql
create table if not exists public.user_rankings (
  user_id uuid not null references public.users(id) on delete cascade,
  tmdb_id integer not null,
  media_type text not null check (media_type in ('movie', 'tv')),
  rank_position integer not null check (rank_position >= 1 and rank_position <= 10),
  updated_at timestamptz not null default now(),
  primary key (user_id, tmdb_id, media_type),
  constraint user_rankings_unique_position unique (user_id, rank_position)
);

create index user_rankings_user_idx on public.user_rankings (user_id, rank_position);

alter table public.user_rankings enable row level security;

-- Owner full CRUD
create policy "Users manage own rankings"
  on public.user_rankings for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Friends can read (for home feed + social)
create policy "Friends can read rankings"
  on public.user_rankings for select to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and (
          (f.user_id = auth.uid() and f.friend_id = user_rankings.user_id)
          or (f.friend_id = auth.uid() and f.user_id = user_rankings.user_id)
        )
    )
  );
```

**Reorder transaction:** When dragging, update all affected rows in one RPC to avoid unique constraint conflicts on `rank_position`:

```sql
create or replace function public.reorder_user_top_10(
  p_user_id uuid,
  p_ordered_tmdb_keys jsonb  -- [{ "tmdb_id": 123, "media_type": "movie" }, ...]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'Unauthorized';
  end if;

  delete from public.user_rankings where user_id = p_user_id;

  insert into public.user_rankings (user_id, tmdb_id, media_type, rank_position, updated_at)
  select
    p_user_id,
    (item->>'tmdb_id')::integer,
    item->>'media_type',
    ordinality::integer,
    now()
  from jsonb_array_elements(p_ordered_tmdb_keys) with ordinality as t(item, ordinality);
end;
$$;

grant execute on function public.reorder_user_top_10(uuid, jsonb) to authenticated;
```

### 7.3 RPC: rating count for unlock

```sql
create or replace function public.get_user_rating_count(p_user_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(distinct (tmdb_id, media_type))::integer from (
    select r.tmdb_id, r.media_type
    from public.ratings rt
    join public.recommendations r on r.id = rt.recommendation_id
    where rt.user_id = p_user_id
    union
    select tmdb_id, media_type
    from public.title_ratings
    where user_id = p_user_id
  ) rated;
$$;
```

### 7.4 RPC: friends top 10 picks (home feed)

```sql
create or replace function public.get_friends_top_10_picks(p_user_id uuid)
returns table (
  tmdb_id integer,
  media_type text,
  friend_id uuid,
  username text,
  avatar_url text,
  rank_position integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    ur.tmdb_id,
    ur.media_type,
    ur.user_id as friend_id,
    u.username,
    u.avatar_url,
    ur.rank_position
  from public.user_rankings ur
  join public.users u on u.id = ur.user_id
  where ur.user_id in (select public.viewer_friend_ids(p_user_id))
    and ur.rank_position <= 10
    and not exists (
      select 1
      from public.user_rankings mine
      where mine.user_id = p_user_id
        and mine.tmdb_id = ur.tmdb_id
        and mine.media_type = ur.media_type
    )
  order by ur.rank_position asc, u.username asc
  limit 40;
$$;
```

Requires `viewer_friend_ids` from `home-feed.sql`.

### 7.5 Update `get_home_feed_bundle`

Add `friends_top_10` key to bundle JSON in `supabase/home-feed.sql`.

---

## 8. TypeScript Types

Add to `src/types.ts`:

```ts
export type TitleRating = {
  user_id: string;
  tmdb_id: number;
  media_type: MediaType;
  rating_value: number;
  is_favorite: boolean;
  source: "standalone" | "rec" | "import";
  rated_at: string;
  tmdb?: TmdbSearchResult;
};

export type UserRanking = {
  user_id: string;
  tmdb_id: number;
  media_type: MediaType;
  rank_position: number;
  updated_at: string;
  rating_value?: number;
  tmdb?: TmdbSearchResult;
};

export type FriendsTop10Pick = {
  tmdb_id: number;
  media_type: MediaType;
  friends: { friend_id: string; username: string; avatar_url: string | null; rank_position: number }[];
  tmdb?: TmdbSearchResult;
};
```

Extend `HomeFeed`:

```ts
friendsTop10: FriendsTop10Pick[];  // aggregated client-side from RPC rows
```

---

## 9. Lib Layer

### 9.1 New: `src/lib/titleRatings.ts` (rewrite)

Replace AsyncStorage implementation with Supabase:

```ts
export const RANKINGS_UNLOCK_RATING_COUNT = 5;
export const TOP_10_SIZE = 10;

export async function getUserRatingCount(userId: string): Promise<number>
export async function upsertTitleRating(userId, tmdb, input): Promise<TitleRating>
export async function getTitleRating(userId, tmdbId, mediaType): Promise<TitleRating | null>
export async function isRankingsUnlocked(userId: string): Promise<boolean>
```

Optional: one-time migration from local AsyncStorage to Supabase on first load.

### 9.2 New: `src/lib/userRankings.ts`

```ts
export async function getUserTop10(userId: string): Promise<UserRanking[]>
export async function addToTop10(userId, tmdb, rankPosition?): Promise<void>
export async function removeFromTop10(userId, tmdbId, mediaType): Promise<void>
export async function reorderTop10(userId, ordered: { tmdb_id; media_type }[]): Promise<void>
export async function getFriendsTop10Picks(userId: string): Promise<FriendsTop10Pick[]>
```

### 9.3 Modify: `src/lib/recommendations.ts`

In `markRecommendationWatchedAndRate`, after rating insert:

```ts
await upsertTitleRating(currentUserId, tmdbFromRec, {
  stars: input.stars,
  isFavorite: input.isFavorite,
  source: 'rec'
});
```

### 9.4 Modify: `src/lib/homeFeed.ts`

- Fetch `get_friends_top_10_picks` RPC
- Aggregate rows by `(tmdb_id, media_type)` into `FriendsTop10Pick[]`
- Add to bundle parser

---

## 10. Components

### 10.1 Create

| File | Purpose |
|------|---------|
| `src/components/rankings/RankingsPanel.tsx` | Tab content: gate or Top 10 list |
| `src/components/rankings/RankingsUnlockGate.tsx` | 5-film progress + CTA |
| `src/components/rankings/Top10RankingList.tsx` | Draggable list |
| `src/components/rankings/Top10RankingRow.tsx` | Single row: #, poster, title, stars, handle |
| `src/components/rankings/AddToTop10Modal.tsx` | Search + optional rate + slot picker |
| `src/components/home/FriendsTop10Section.tsx` | Home section cards (or inline in index) |

### 10.2 Dependency

Add drag-and-drop library:

```bash
npm install react-native-draggable-flatlist
```

Use for `Top10RankingList`. Match existing theme/spacing from `ListsPanel` / `FeedTitleCard`.

### 10.3 Modify

| File | Change |
|------|--------|
| `app/(tabs)/index.tsx` | Reviews → Rankings; wire `RankingsPanel`; add home section |
| `app/(tabs)/profile.tsx` | Reviews → Rankings; reuse `RankingsPanel` |
| `src/components/RatingModal.tsx` | Stars-first; collapsible notes |
| `src/components/QuickRatingModal.tsx` | Server save; update copy |
| `src/components/FilmDetailModal.tsx` | Use new `titleRatings` lib |
| `src/lib/homeCategories.ts` | Optional category slug |
| `supabase/home-feed.sql` | Bundle + RPC |
| `README.md` | Add migrations to ordered list |

### 10.4 Delete / deprecate

- Local-only logic in old `titleRatings.ts` (rewrite in place)
- Reviews "coming soon" stubs

---

## 11. Home Section Card Design

```tsx
// Meta line example
"@maya #2 · @jordan #5"
// Subtitle on card
"In 2 friends' top 10"
```

Render in `HomeSection` like other rows; tap → `FilmDetailModal`.

Consider showing on film detail when friends ranked it:

```
Friends' canon
@maya #2 · @jordan #5
```

(Optional Phase 2 — not required for v1.)

---

## 12. Implementation Order

### Phase 1 — Database + ratings (foundation)
1. Run `title-ratings.sql` + `user-rankings.sql` in Supabase
2. Rewrite `src/lib/titleRatings.ts` (Supabase)
3. Rewrite `src/lib/userRankings.ts`
4. Wire `markRecommendationWatchedAndRate` → upsert title rating
5. Wire `FilmDetailModal` quick rate → server

### Phase 2 — Easier inbox rating
1. Refactor `RatingModal` stars-first
2. Verify trust + title_ratings on inbox rate

### Phase 3 — Rankings tab
1. `RankingsUnlockGate` + count RPC
2. `Top10RankingList` with drag reorder + RPC
3. Add/remove flows
4. Replace Reviews stub on Home + Profile

### Phase 4 — Home feed
1. `get_friends_top_10_picks` RPC + bundle update
2. Home section "In Friends' Top 10"
3. Category browse page (optional)

### Phase 5 — Polish
1. Migrate local AsyncStorage ratings on first launch
2. `isRankingsReady()` backend check + setup banner (pattern from home feed)
3. Empty states

---

## 13. Acceptance Criteria

### Rankings
- [ ] Tab labeled **Rankings** on Home (and Profile)
- [ ] Locked until 5 unique rated films
- [ ] Top 10 drag reorder persists across reload
- [ ] Add film via search places in Top 10
- [ ] Remove from Top 10 opens slot; film remains rated
- [ ] No "unranked" / "watched not ranked" UI sections
- [ ] No post-rate "Add to rankings?" prompt

### Ratings
- [ ] Inbox rate works with stars only (notes optional)
- [ ] Trust still updates on inbox rate
- [ ] Quick rate saves to Supabase
- [ ] `title_ratings` populated on rec rate

### Home
- [ ] "In Friends' Top 10" shows friends' ranked films
- [ ] Card shows `@username #N` meta
- [ ] Excludes viewer's own Top 10 films

### Data
- [ ] `user_rankings` max 10 rows per user
- [ ] `rank_position` unique per user
- [ ] Reorder RPC atomic (no constraint violations)

---

## 14. Out of Scope (v1)

- Long-form reviews
- Pairwise/Beli comparison ranking
- Auto-rank by stars
- Letterboxd import
- Rankings below #10 (11+ tier)
- Public global leaderboard
- Showing rank on Send flow ("From your #3")

---

## 15. README Migration Update

Add after `calibration-events.sql`:

```
| N | user-rankings.sql | Top 10 canon + reorder RPC |
| N+1 | title-ratings.sql | Standalone server ratings |
```

Update `get_home_feed_bundle` when `home-feed.sql` changes.

---

## 16. Manual Test Plan

1. New user → Rankings locked at 0/5
2. Rate 5 inbox recs → Rankings unlocks
3. Add 3 films to Top 10 → order #1–#3
4. Drag #3 to #1 → persists after app restart
5. Friend adds same film to their Top 10 → appears in "In Friends' Top 10"
6. Add film to own Top 10 → disappears from friends home section for that title
7. Remove film from Top 10 → slot empty; still rated in DB
8. Inbox rate with stars only → trust updates, no rankings prompt

---

## 17. Open Decisions (defaults chosen)

| Question | v1 Default |
|----------|------------|
| Profile Rankings same as Home? | Yes — shared `RankingsPanel` |
| Add to Top 10 without rating? | Require stars in add flow |
| Full Top 10 add behavior | Replace #10 or pick slot |
| Friend rating visibility | Friends can read `user_rankings` only |

---

*End of handoff. Start with Phase 1 (SQL + lib rewrite) before UI.*
