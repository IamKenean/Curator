import type { UserProfile } from "../types";
import { supabase } from "./supabase";
import { getDiscoveryTitlePool } from "./tmdb";
import {
  fetchVisibleOpenPutMeOnRequests,
  getUserPutMeOnRequests,
  isPutMeOnBackendReady,
  isPutMeOnRequestVisibleToViewer,
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
  backendReady: boolean;
};

export type PutMeOnSort = "newest" | "most_responses" | "ending_soon";

const MOCK_USERS: UserProfile[] = [
  { id: "mock-chris", username: "Chris", avatar_url: null, created_at: "2026-01-01T00:00:00Z" },
  { id: "mock-maya", username: "Maya Lin", avatar_url: null, created_at: "2026-01-01T00:00:00Z" },
  { id: "mock-jordan", username: "Jordan", avatar_url: null, created_at: "2026-01-01T00:00:00Z" },
  { id: "mock-jake", username: "Jake Morrison", avatar_url: null, created_at: "2026-01-01T00:00:00Z" }
];

function pick(pool: import("../types").TmdbSearchResult[], start: number, count: number) {
  const picks: import("../types").TmdbSearchResult[] = [];
  for (let index = 0; index < count; index += 1) {
    picks.push(pool[(start + index) % pool.length]);
  }
  return picks;
}

export async function getPutMeOnFeed(currentUserId: string, friends: UserProfile[]): Promise<PutMeOnFeed> {
  const pool = await getDiscoveryTitlePool();
  const backendReady = await isPutMeOnBackendReady();

  const yourStored = await getUserPutMeOnRequests(currentUserId);
  const yourRequests = yourStored.map(toActivePutMeOnRequest);

  const ownersById = new Map(friends.map((friend) => [friend.id, friend]));
  const openRequests: PutMeOnRequest[] = [];

  if (backendReady) {
    const friendOpenStored = await fetchVisibleOpenPutMeOnRequests(currentUserId);
    const missingOwnerIds = [
      ...new Set(friendOpenStored.map((request) => request.owner_id).filter((ownerId) => !ownersById.has(ownerId)))
    ];

    if (missingOwnerIds.length > 0) {
      const { data: users, error } = await supabase.from("users").select("*").in("id", missingOwnerIds);
      if (error) {
        throw error;
      }

      for (const user of users ?? []) {
        ownersById.set(user.id, user as UserProfile);
      }
    }

    for (const request of friendOpenStored) {
      if (!isPutMeOnRequestVisibleToViewer(request, currentUserId)) {
        continue;
      }

      const owner = ownersById.get(request.owner_id);
      if (!owner) {
        continue;
      }

      openRequests.push(toPutMeOnRequest(request, owner));
    }
  }

  openRequests.sort((a, b) => b.responseCount - a.responseCount);

  return {
    yourRequests,
    openRequests,
    backendReady,
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
