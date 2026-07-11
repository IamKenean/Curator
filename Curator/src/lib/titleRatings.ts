import AsyncStorage from "@react-native-async-storage/async-storage";
import type { MediaType, TmdbSearchResult } from "../types";

const STORAGE_KEY = "curator.titleRatings.v1";

export type TitleRating = {
  tmdb_id: number;
  media_type: MediaType;
  title: string;
  year: string;
  poster_path: string | null;
  rating_value: number;
  is_favorite: boolean;
  rated_at: string;
};

function filmKey(tmdbId: number, mediaType: MediaType) {
  return `${mediaType}:${tmdbId}`;
}

function storageKey(userId: string) {
  return `${STORAGE_KEY}.${userId}`;
}

async function readAll(userId: string): Promise<TitleRating[]> {
  const raw = await AsyncStorage.getItem(storageKey(userId));
  if (!raw) {
    return [];
  }

  try {
    return JSON.parse(raw) as TitleRating[];
  } catch {
    return [];
  }
}

async function writeAll(userId: string, items: TitleRating[]) {
  await AsyncStorage.setItem(storageKey(userId), JSON.stringify(items));
}

export async function getTitleRating(
  userId: string,
  tmdbId: number,
  mediaType: MediaType
): Promise<TitleRating | null> {
  const items = await readAll(userId);
  return items.find((item) => filmKey(item.tmdb_id, item.media_type) === filmKey(tmdbId, mediaType)) ?? null;
}

export async function saveTitleRating(
  userId: string,
  item: TmdbSearchResult,
  input: { stars: number; isFavorite?: boolean }
): Promise<TitleRating> {
  const items = await readAll(userId);
  const key = filmKey(item.id, item.media_type);
  const next: TitleRating = {
    tmdb_id: item.id,
    media_type: item.media_type,
    title: item.title,
    year: item.year,
    poster_path: item.poster_path,
    rating_value: input.stars,
    is_favorite: Boolean(input.isFavorite),
    rated_at: new Date().toISOString()
  };

  const withoutCurrent = items.filter((entry) => filmKey(entry.tmdb_id, entry.media_type) !== key);
  await writeAll(userId, [next, ...withoutCurrent]);
  return next;
}
