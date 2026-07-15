import { DEFAULT_RANKING_LIST_TYPE, type RankingListType } from "./rankingListTypes";
import { getTmdbTitle } from "./tmdb";
import { supabase } from "./supabase";
import type { FriendsTop10Pick, MediaType, UserRanking } from "../types";
import { TOP_10_SIZE } from "./titleRatings";

type RankingRow = {
  user_id: string;
  list_type: RankingListType;
  tmdb_id: number;
  media_type: MediaType;
  rank_position: number;
  updated_at: string;
};

type FriendsTop10Row = {
  tmdb_id: number;
  media_type: MediaType;
  friend_id: string;
  username: string;
  avatar_url: string | null;
  rank_position: number;
};

export function aggregateFriendsTop10Rows(rows: FriendsTop10Row[]): FriendsTop10Pick[] {
  const grouped = new Map<string, FriendsTop10Pick>();

  for (const row of rows) {
    const key = `${row.media_type}-${row.tmdb_id}`;
    const existing = grouped.get(key);
    const friend = {
      friend_id: row.friend_id,
      username: row.username,
      avatar_url: row.avatar_url,
      rank_position: row.rank_position
    };

    if (existing) {
      existing.friends.push(friend);
      continue;
    }

    grouped.set(key, {
      tmdb_id: row.tmdb_id,
      media_type: row.media_type,
      friends: [friend]
    });
  }

  const picks = [...grouped.values()];
  picks.sort((a, b) => {
    const aBest = Math.min(...a.friends.map((friend) => friend.rank_position));
    const bBest = Math.min(...b.friends.map((friend) => friend.rank_position));
    if (aBest !== bBest) {
      return aBest - bBest;
    }
    return b.friends.length - a.friends.length;
  });

  return picks;
}

function isMissingTable(error: { message?: string; code?: string }) {
  const message = (error.message ?? "").toLowerCase();
  return error.code === "42P01" || message.includes("user_rankings") || message.includes("does not exist");
}

function isMissingRpc(error: { message?: string; code?: string }) {
  const message = (error.message ?? "").toLowerCase();
  return (
    error.code === "PGRST202" ||
    error.code === "42883" ||
    message.includes("could not find the function") ||
    message.includes("does not exist")
  );
}

function mapRanking(row: RankingRow): UserRanking {
  return {
    user_id: row.user_id,
    list_type: row.list_type,
    tmdb_id: row.tmdb_id,
    media_type: row.media_type,
    rank_position: row.rank_position,
    updated_at: row.updated_at
  };
}

export async function getUserTop10(
  userId: string,
  listType: RankingListType = DEFAULT_RANKING_LIST_TYPE
): Promise<UserRanking[]> {
  const { data, error } = await supabase
    .from("user_rankings")
    .select("*")
    .eq("user_id", userId)
    .eq("list_type", listType)
    .order("rank_position", { ascending: true });

  if (error) {
    if (isMissingTable(error)) {
      return [];
    }
    throw new Error(error.message);
  }

  const rows = (data ?? []) as RankingRow[];
  const hydrated = await Promise.all(
    rows.map(async (row) => {
      const [tmdb, ratingResult] = await Promise.all([
        getTmdbTitle(row.tmdb_id, row.media_type),
        supabase
          .from("title_ratings")
          .select("rating_value")
          .eq("user_id", userId)
          .eq("tmdb_id", row.tmdb_id)
          .eq("media_type", row.media_type)
          .maybeSingle()
      ]);

      return {
        ...mapRanking(row),
        rating_value: ratingResult.data?.rating_value != null ? Number(ratingResult.data.rating_value) : undefined,
        tmdb
      };
    })
  );

  return hydrated;
}

export async function addToTop10(
  userId: string,
  tmdb: { id: number; media_type: MediaType },
  listType: RankingListType = DEFAULT_RANKING_LIST_TYPE,
  rankPosition?: number
): Promise<void> {
  const current = await getUserTop10(userId, listType);
  if (current.length >= TOP_10_SIZE && rankPosition == null) {
    throw new Error("Top 10 is full. Remove a film or replace a slot.");
  }

  const existing = current.find((item) => item.tmdb_id === tmdb.id && item.media_type === tmdb.media_type);
  if (existing) {
    return;
  }

  const position = rankPosition ?? current.length + 1;
  if (position < 1 || position > TOP_10_SIZE) {
    throw new Error("Rank position must be between 1 and 10.");
  }

  const occupied = current.find((item) => item.rank_position === position);
  if (occupied && occupied.tmdb_id !== tmdb.id) {
    const reordered = current
      .filter((item) => item.tmdb_id !== tmdb.id || item.media_type !== tmdb.media_type)
      .map((item) => ({
        tmdb_id: item.tmdb_id,
        media_type: item.media_type
      }));

    reordered.splice(position - 1, 0, { tmdb_id: tmdb.id, media_type: tmdb.media_type });
    await reorderTop10(userId, reordered.slice(0, TOP_10_SIZE), listType);
    return;
  }

  const { error } = await supabase.from("user_rankings").insert({
    user_id: userId,
    list_type: listType,
    tmdb_id: tmdb.id,
    media_type: tmdb.media_type,
    rank_position: position,
    updated_at: new Date().toISOString()
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function removeFromTop10(
  userId: string,
  tmdbId: number,
  mediaType: MediaType,
  listType: RankingListType = DEFAULT_RANKING_LIST_TYPE
): Promise<void> {
  const current = await getUserTop10(userId, listType);
  const next = current
    .filter((item) => !(item.tmdb_id === tmdbId && item.media_type === mediaType))
    .map((item) => ({
      tmdb_id: item.tmdb_id,
      media_type: item.media_type
    }));

  await reorderTop10(userId, next, listType);
}

export async function reorderTop10(
  userId: string,
  ordered: { tmdb_id: number; media_type: MediaType }[],
  listType: RankingListType = DEFAULT_RANKING_LIST_TYPE
): Promise<void> {
  if (ordered.length > TOP_10_SIZE) {
    throw new Error("Top 10 cannot exceed 10 films.");
  }

  const { error } = await supabase.rpc("reorder_user_top_10", {
    p_user_id: userId,
    p_list_type: listType,
    p_ordered_tmdb_keys: ordered
  });

  if (error) {
    if (isMissingRpc(error)) {
      throw new Error("Rankings backend not ready. Run supabase/ranking-list-types.sql in Supabase SQL Editor.");
    }
    throw new Error(error.message);
  }
}

export async function getFriendsTop10Picks(userId: string): Promise<FriendsTop10Pick[]> {
  const { data, error } = await supabase.rpc("get_friends_top_10_picks", { p_user_id: userId });
  if (error) {
    if (isMissingRpc(error)) {
      return [];
    }
    throw new Error(error.message);
  }

  const rows = (data ?? []) as FriendsTop10Row[];
  const picks = aggregateFriendsTop10Rows(rows);

  return Promise.all(
    picks.map(async (pick) => ({
      ...pick,
      tmdb: await getTmdbTitle(pick.tmdb_id, pick.media_type)
    }))
  );
}

export function formatFriendsTop10Meta(pick: FriendsTop10Pick): string {
  return pick.friends
    .slice()
    .sort((a, b) => a.rank_position - b.rank_position)
    .map((friend) => `@${friend.username} #${friend.rank_position}`)
    .join(" · ");
}
