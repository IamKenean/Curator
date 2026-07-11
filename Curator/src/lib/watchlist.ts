import AsyncStorage from "@react-native-async-storage/async-storage";
import type { MediaType, TmdbSearchResult } from "../types";

const STORAGE_KEY = "curator.watchlist.v1";

export type WatchlistItem = TmdbSearchResult & {
  added_at: string;
};

function filmKey(tmdbId: number, mediaType: MediaType) {
  return `${mediaType}:${tmdbId}`;
}

function storageKey(userId: string) {
  return `${STORAGE_KEY}.${userId}`;
}

async function readAll(userId: string): Promise<WatchlistItem[]> {
  const raw = await AsyncStorage.getItem(storageKey(userId));
  if (!raw) {
    return [];
  }

  try {
    return JSON.parse(raw) as WatchlistItem[];
  } catch {
    return [];
  }
}

async function writeAll(userId: string, items: WatchlistItem[]) {
  await AsyncStorage.setItem(storageKey(userId), JSON.stringify(items));
}

export function isSameWatchlistItem(a: Pick<TmdbSearchResult, "id" | "media_type">, b: Pick<TmdbSearchResult, "id" | "media_type">) {
  return filmKey(a.id, a.media_type) === filmKey(b.id, b.media_type);
}

export async function getWatchlist(userId: string): Promise<WatchlistItem[]> {
  const items = await readAll(userId);
  return items.sort((a, b) => new Date(b.added_at).getTime() - new Date(a.added_at).getTime());
}

export async function isInWatchlist(userId: string, item: Pick<TmdbSearchResult, "id" | "media_type">) {
  const items = await readAll(userId);
  return items.some((entry) => isSameWatchlistItem(entry, item));
}

export async function addToWatchlist(userId: string, item: TmdbSearchResult) {
  const items = await readAll(userId);
  if (items.some((entry) => isSameWatchlistItem(entry, item))) {
    return items.find((entry) => isSameWatchlistItem(entry, item))!;
  }

  const created: WatchlistItem = {
    ...item,
    added_at: new Date().toISOString()
  };

  await writeAll(userId, [created, ...items]);
  return created;
}

export async function removeFromWatchlist(userId: string, item: Pick<TmdbSearchResult, "id" | "media_type">) {
  const items = await readAll(userId);
  await writeAll(
    userId,
    items.filter((entry) => !isSameWatchlistItem(entry, item))
  );
}

export async function toggleWatchlist(userId: string, item: TmdbSearchResult) {
  const exists = await isInWatchlist(userId, item);
  if (exists) {
    await removeFromWatchlist(userId, item);
    return false;
  }

  await addToWatchlist(userId, item);
  return true;
}
