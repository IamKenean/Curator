import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabase";
import type { MediaType, TitleRating, TmdbSearchResult } from "../types";

export const RANKINGS_UNLOCK_RATING_COUNT = 5;
export const TOP_10_SIZE = 10;

const LEGACY_STORAGE_KEY = "curator.titleRatings.v1";
const MIGRATION_FLAG_KEY = "curator.titleRatings.migrated";

type LegacyTitleRating = {
  tmdb_id: number;
  media_type: MediaType;
  title: string;
  year: string;
  poster_path: string | null;
  rating_value: number;
  is_favorite: boolean;
  rated_at: string;
};

function isMissingTable(error: { message?: string; code?: string }) {
  const message = (error.message ?? "").toLowerCase();
  return (
    error.code === "42P01" ||
    message.includes("title_ratings") ||
    message.includes("does not exist")
  );
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

function legacyStorageKey(userId: string) {
  return `${LEGACY_STORAGE_KEY}.${userId}`;
}

function migrationFlagKey(userId: string) {
  return `${MIGRATION_FLAG_KEY}.${userId}`;
}

function mapRow(row: Record<string, unknown>): TitleRating {
  return {
    user_id: String(row.user_id),
    tmdb_id: Number(row.tmdb_id),
    media_type: row.media_type === "tv" ? "tv" : "movie",
    rating_value: Number(row.rating_value),
    is_favorite: Boolean(row.is_favorite),
    source: (row.source as TitleRating["source"]) ?? "standalone",
    rated_at: String(row.rated_at)
  };
}

async function readLegacyRatings(userId: string): Promise<LegacyTitleRating[]> {
  const raw = await AsyncStorage.getItem(legacyStorageKey(userId));
  if (!raw) {
    return [];
  }

  try {
    return JSON.parse(raw) as LegacyTitleRating[];
  } catch {
    return [];
  }
}

export async function migrateLocalTitleRatings(userId: string): Promise<void> {
  const migrated = await AsyncStorage.getItem(migrationFlagKey(userId));
  if (migrated === "1") {
    return;
  }

  const legacy = await readLegacyRatings(userId);
  if (legacy.length === 0) {
    await AsyncStorage.setItem(migrationFlagKey(userId), "1");
    return;
  }

  for (const item of legacy) {
    try {
      await upsertTitleRating(
        userId,
        {
          id: item.tmdb_id,
          media_type: item.media_type,
          title: item.title,
          year: item.year,
          poster_path: item.poster_path
        },
        {
          stars: item.rating_value,
          isFavorite: item.is_favorite,
          source: "import"
        }
      );
    } catch {
      // Skip rows if backend isn't ready yet; retry on next launch.
      return;
    }
  }

  await AsyncStorage.setItem(migrationFlagKey(userId), "1");
}

export async function isRankingsBackendReady(): Promise<boolean> {
  const { error } = await supabase.rpc("is_rankings_ready");
  if (error) {
    if (isMissingRpc(error)) {
      return false;
    }
    throw new Error(error.message);
  }
  return true;
}

export async function getUserRatingCount(userId: string): Promise<number> {
  await migrateLocalTitleRatings(userId);

  const { data, error } = await supabase.rpc("get_user_rating_count", { p_user_id: userId });
  if (error) {
    if (isMissingRpc(error)) {
      return 0;
    }
    throw new Error(error.message);
  }

  return Number(data ?? 0);
}

export async function isRankingsUnlocked(userId: string): Promise<boolean> {
  const count = await getUserRatingCount(userId);
  return count >= RANKINGS_UNLOCK_RATING_COUNT;
}

export async function getTitleRating(
  userId: string,
  tmdbId: number,
  mediaType: MediaType
): Promise<TitleRating | null> {
  const { data, error } = await supabase
    .from("title_ratings")
    .select("*")
    .eq("user_id", userId)
    .eq("tmdb_id", tmdbId)
    .eq("media_type", mediaType)
    .maybeSingle();

  if (error) {
    if (isMissingTable(error)) {
      const legacy = await readLegacyRatings(userId);
      const match = legacy.find((item) => item.tmdb_id === tmdbId && item.media_type === mediaType);
      if (!match) {
        return null;
      }
      return {
        user_id: userId,
        tmdb_id: match.tmdb_id,
        media_type: match.media_type,
        rating_value: match.rating_value,
        is_favorite: match.is_favorite,
        source: "import",
        rated_at: match.rated_at
      };
    }
    throw new Error(error.message);
  }

  return data ? mapRow(data as Record<string, unknown>) : null;
}

export async function upsertTitleRating(
  userId: string,
  item: TmdbSearchResult,
  input: { stars: number; isFavorite?: boolean; source?: TitleRating["source"] }
): Promise<TitleRating> {
  const row = {
    user_id: userId,
    tmdb_id: item.id,
    media_type: item.media_type,
    rating_value: input.stars,
    is_favorite: Boolean(input.isFavorite),
    source: input.source ?? "standalone",
    rated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from("title_ratings")
    .upsert(row, { onConflict: "user_id,tmdb_id,media_type" })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapRow(data as Record<string, unknown>);
}

/** @deprecated Use upsertTitleRating */
export async function saveTitleRating(
  userId: string,
  item: TmdbSearchResult,
  input: { stars: number; isFavorite?: boolean }
): Promise<TitleRating> {
  return upsertTitleRating(userId, item, input);
}
