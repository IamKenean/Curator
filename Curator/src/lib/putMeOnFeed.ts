import type { UserProfile } from "../types";
import { getDiscoveryTitlePool } from "./tmdb";
import {
  getUserPutMeOnRequests,
  isPutMeOnRequestVisibleToViewer,
  seedMockPutMeOnRequests,
  toActivePutMeOnRequest,
  toPutMeOnRequest,
  type ActivePutMeOnRequest,
  type PutMeOnRequest
} from "./putMeOnRequests";

export type GenreGauntlet = {
  id: string;
  label: string;
  title: string;
  subtitle: string;
  daysLeft: number;
  posters: import("../types").TmdbSearchResult[];
};

export type LeaderboardEntry = {
  rank: number;
  user: UserProfile;
  badge: string;
  trustPercent: number;
  gatekeepCorrect: number;
  gatekeepTotal: number;
};

export type PutMeOnFeed = {
  yourRequests: ActivePutMeOnRequest[];
  openRequests: PutMeOnRequest[];
  gauntlet: GenreGauntlet;
  leaderboard: LeaderboardEntry[];
};

export type PutMeOnSort = "newest" | "most_responses" | "ending_soon";

const MOCK_USERS: UserProfile[] = [
  { id: "mock-chris", username: "Chris", avatar_url: null, created_at: "2026-01-01T00:00:00Z" },
  { id: "mock-maya", username: "Maya Lin", avatar_url: null, created_at: "2026-01-01T00:00:00Z" },
  { id: "mock-jordan", username: "Jordan", avatar_url: null, created_at: "2026-01-01T00:00:00Z" },
  { id: "mock-jake", username: "Jake Morrison", avatar_url: null, created_at: "2026-01-01T00:00:00Z" }
];

const MOCK_BY_ID = new Map(MOCK_USERS.map((user) => [user.id, user]));

export function isMockPutMeOnUser(userId: string) {
  return userId.startsWith("mock-");
}

function pick(pool: import("../types").TmdbSearchResult[], start: number, count: number) {
  const picks: import("../types").TmdbSearchResult[] = [];
  for (let index = 0; index < count; index += 1) {
    picks.push(pool[(start + index) % pool.length]);
  }
  return picks;
}

async function ensureMockRequests(pool: import("../types").TmdbSearchResult[]) {
  await seedMockPutMeOnRequests(
    "mock-chris",
    "A funny movie, not stupid funny.",
    pick(pool, 4, 5),
    ["mock-maya", "mock-jordan", "mock-jake"],
    { genres: ["Comedy"], exampleFilms: pick(pool, 20, 2) }
  );
  await seedMockPutMeOnRequests(
    "mock-maya",
    "Something that feels like a fever dream.",
    pick(pool, 8, 4),
    ["mock-chris", "mock-jordan"],
    { genres: ["Drama", "Indie"], exampleFilms: pick(pool, 22, 2) }
  );
  await seedMockPutMeOnRequests(
    "mock-jordan",
    "Slow burn where nothing happens but you're still on edge.",
    pick(pool, 12, 5),
    ["mock-chris", "mock-maya", "mock-jake"],
    { genres: ["Thriller", "Drama"], exampleFilms: pick(pool, 24, 2) }
  );
}

export async function getPutMeOnFeed(currentUserId: string, friends: UserProfile[]): Promise<PutMeOnFeed> {
  const pool = await getDiscoveryTitlePool();
  await ensureMockRequests(pool);

  const yourStored = await getUserPutMeOnRequests(currentUserId);
  const yourRequests = yourStored.map(toActivePutMeOnRequest);

  const friendIds = new Set(friends.map((friend) => friend.id));
  const openOwners = [...MOCK_USERS, ...friends].filter(
    (user) => user.id !== currentUserId && (MOCK_BY_ID.has(user.id) || friendIds.has(user.id))
  );

  const openRequests: PutMeOnRequest[] = [];
  for (const owner of openOwners) {
    const stored = await getUserPutMeOnRequests(owner.id);
    for (const request of stored) {
      if (!MOCK_BY_ID.has(owner.id) && !isPutMeOnRequestVisibleToViewer(request, currentUserId)) {
        continue;
      }

      openRequests.push(toPutMeOnRequest(request, owner, { isMock: MOCK_BY_ID.has(owner.id) }));
    }
  }

  openRequests.sort((a, b) => b.responseCount - a.responseCount);

  return {
    yourRequests,
    openRequests,
    gauntlet: {
      id: "gauntlet-horror",
      label: "Genre Gauntlet",
      title: "Horror Gauntlet",
      subtitle: "Best horror rec wins",
      daysLeft: 5,
      posters: pick(pool, 16, 4)
    },
    leaderboard: [
      {
        rank: 1,
        user: MOCK_USERS[3],
        badge: "Taste God",
        trustPercent: 94,
        gatekeepCorrect: 18,
        gatekeepTotal: 21
      },
      {
        rank: 2,
        user: MOCK_USERS[1],
        badge: "Horror Queen",
        trustPercent: 89,
        gatekeepCorrect: 15,
        gatekeepTotal: 17
      },
      {
        rank: 3,
        user: MOCK_USERS[0],
        badge: "Comedy King",
        trustPercent: 86,
        gatekeepCorrect: 22,
        gatekeepTotal: 28
      }
    ]
  };
}

export { MAX_USER_PUT_ME_ON_REQUESTS } from "./putMeOnRequests";
