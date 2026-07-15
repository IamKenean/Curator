import type {
  AggregateFeedItem,
  FriendActivityFeedItem,
  FriendsTop10Pick,
  HomeFeed,
  MediaType,
  TrustFriendPickItem
} from "../types";
import { aggregateFriendsTop10Rows } from "./userRankings";
import { isMockDataEnabled } from "./mockDataSettings";
import { fillHomeFeedWithMocks } from "./mockHomeFeed";
import { getTrendingThisWeek, getTmdbTitle } from "./tmdb";
import { supabase } from "./supabase";

type TitleKey = `${MediaType}-${number}`;

export type HomeFeedLoadResult = {
  feed: HomeFeed;
  backendReady: boolean;
  loadErrors: string[];
};

type HomeFeedBundle = {
  friends_rated_highly?: AggregateFeedItem[] | null;
  popular_this_week?: AggregateFeedItem[] | null;
  new_from_friends?: FriendActivityFeedItem[] | null;
  high_trust_friends?: TrustFriendPickItem[] | null;
  trusted_recommenders?: AggregateFeedItem[] | null;
  taste_matches?: AggregateFeedItem[] | null;
  friends_top_10?: Record<string, unknown>[] | null;
};

const warnedRpcs = new Set<string>();

function isMissingRpc(error: { message?: string; code?: string }) {
  const message = (error.message ?? "").toLowerCase();
  return (
    error.code === "PGRST202" ||
    error.code === "42883" ||
    message.includes("could not find the function") ||
    message.includes("does not exist")
  );
}

function titleKey(tmdbId: number, mediaType: MediaType): TitleKey {
  return `${mediaType}-${tmdbId}`;
}

function normalizeMediaType(value: string): MediaType {
  return value === "tv" ? "tv" : "movie";
}

function normalizeAggregate(item: Record<string, unknown>): AggregateFeedItem {
  return {
    tmdb_id: Number(item.tmdb_id),
    media_type: normalizeMediaType(String(item.media_type)),
    avg_rating: item.avg_rating != null ? Number(item.avg_rating) : undefined,
    rating_count: item.rating_count != null ? Number(item.rating_count) : undefined,
    match_score: item.match_score != null ? Number(item.match_score) : undefined
  };
}

function normalizeFriendActivity(item: Record<string, unknown>): FriendActivityFeedItem {
  return {
    tmdb_id: Number(item.tmdb_id),
    media_type: normalizeMediaType(String(item.media_type)),
    rating_value: Number(item.rating_value),
    rated_at: String(item.rated_at),
    user_id: String(item.user_id),
    username: String(item.username),
    avatar_url: (item.avatar_url as string | null) ?? null
  };
}

function normalizeTrustFriend(item: Record<string, unknown>): TrustFriendPickItem {
  return {
    friend_id: String(item.friend_id),
    username: String(item.username),
    avatar_url: (item.avatar_url as string | null) ?? null,
    trust_score: Number(item.trust_score),
    tmdb_id: Number(item.tmdb_id),
    media_type: normalizeMediaType(String(item.media_type)),
    rating_value: Number(item.rating_value),
    rated_at: String(item.rated_at)
  };
}

function normalizeFriendsTop10Row(item: Record<string, unknown>) {
  return {
    tmdb_id: Number(item.tmdb_id),
    media_type: normalizeMediaType(String(item.media_type)),
    friend_id: String(item.friend_id),
    username: String(item.username),
    avatar_url: (item.avatar_url as string | null) ?? null,
    rank_position: Number(item.rank_position)
  };
}

function emptyHomeFeed(): HomeFeed {
  return {
    friendsRatedHighly: [],
    popularThisWeek: [],
    newFromFriends: [],
    highTrustFriends: [],
    trustedRecommenders: [],
    tasteMatches: [],
    friendsTop10: []
  };
}

async function hydrateTitles<T extends { tmdb_id: number; media_type: MediaType; tmdb?: import("../types").TmdbSearchResult }>(
  items: T[]
): Promise<T[]> {
  if (items.length === 0) {
    return items;
  }

  const unique = new Map<TitleKey, Promise<import("../types").TmdbSearchResult>>();
  items.forEach((item) => {
    const key = titleKey(item.tmdb_id, item.media_type);
    if (!unique.has(key)) {
      unique.set(key, getTmdbTitle(item.tmdb_id, item.media_type));
    }
  });

  const resolved = new Map<TitleKey, import("../types").TmdbSearchResult>();
  await Promise.all(
    [...unique.entries()].map(async ([key, promise]) => {
      resolved.set(key, await promise);
    })
  );

  return items.map((item) => ({
    ...item,
    tmdb: resolved.get(titleKey(item.tmdb_id, item.media_type))
  }));
}

function recordRpcWarning(name: string, message: string) {
  if (warnedRpcs.has(name)) {
    return;
  }

  warnedRpcs.add(name);
  console.warn(`Home feed RPC ${name} unavailable: ${message}`);
}

async function safeRpc<T>(name: string, params?: Record<string, unknown>): Promise<{ data: T[]; error: string | null }> {
  const { data, error } = await supabase.rpc(name, params ?? {});
  if (error) {
    recordRpcWarning(name, error.message);
    return { data: [], error: error.message };
  }

  return { data: (data ?? []) as T[], error: null };
}

function parseBundle(data: unknown): { feed: HomeFeed; errors: string[] } {
  const errors: string[] = [];
  const bundle = (data ?? {}) as HomeFeedBundle;

  const friendsRatedHighly = (bundle.friends_rated_highly ?? []).map((item) =>
    normalizeAggregate(item as unknown as Record<string, unknown>)
  );
  const popularThisWeek = (bundle.popular_this_week ?? []).map((item) =>
    normalizeAggregate(item as unknown as Record<string, unknown>)
  );
  const newFromFriends = (bundle.new_from_friends ?? []).map((item) =>
    normalizeFriendActivity(item as unknown as Record<string, unknown>)
  );
  const highTrustFriends = (bundle.high_trust_friends ?? []).map((item) =>
    normalizeTrustFriend(item as unknown as Record<string, unknown>)
  );
  const trustedRecommenders = (bundle.trusted_recommenders ?? []).map((item) =>
    normalizeAggregate(item as unknown as Record<string, unknown>)
  );
  const tasteMatches = (bundle.taste_matches ?? []).map((item) =>
    normalizeAggregate(item as unknown as Record<string, unknown>)
  );
  const friendsTop10 = aggregateFriendsTop10Rows(
    (bundle.friends_top_10 ?? []).map((item) => normalizeFriendsTop10Row(item as Record<string, unknown>))
  );

  return {
    feed: {
      friendsRatedHighly,
      popularThisWeek,
      newFromFriends,
      highTrustFriends,
      trustedRecommenders,
      tasteMatches,
      friendsTop10
    },
    errors
  };
}

async function fetchHomeFeedBundle(userId: string): Promise<{ feed: HomeFeed | null; error: string | null }> {
  const { data, error } = await supabase.rpc("get_home_feed_bundle", { p_user_id: userId });
  if (error) {
    if (isMissingRpc(error)) {
      recordRpcWarning("get_home_feed_bundle", error.message);
      return { feed: null, error: error.message };
    }

    throw new Error(error.message);
  }

  return { feed: parseBundle(data).feed, error: null };
}

async function fetchHomeFeedFromRpcs(userId: string): Promise<{ feed: HomeFeed; errors: string[] }> {
  const errors: string[] = [];

  const [
    friendsRatedHighlyResult,
    popularResult,
    newFromFriendsResult,
    highTrustFriendsResult,
    trustedRecommendersResult,
    tasteMatchesResult,
    friendsTop10Result
  ] = await Promise.all([
    safeRpc<AggregateFeedItem>("get_friends_rated_highly", { p_user_id: userId }),
    safeRpc<AggregateFeedItem>("get_curator_popular_this_week"),
    safeRpc<FriendActivityFeedItem>("get_new_from_friends", { p_user_id: userId }),
    safeRpc<TrustFriendPickItem>("get_high_trust_friends_picks", { p_user_id: userId }),
    safeRpc<AggregateFeedItem>("get_trusted_recommender_picks"),
    safeRpc<AggregateFeedItem>("get_taste_match_picks", { p_user_id: userId }),
    safeRpc<Record<string, unknown>>("get_friends_top_10_picks", { p_user_id: userId })
  ]);

  for (const result of [
    friendsRatedHighlyResult,
    popularResult,
    newFromFriendsResult,
    highTrustFriendsResult,
    trustedRecommendersResult,
    tasteMatchesResult,
    friendsTop10Result
  ]) {
    if (result.error) {
      errors.push(result.error);
    }
  }

  let popularThisWeek = popularResult.data.map((item) =>
    normalizeAggregate(item as unknown as Record<string, unknown>)
  );

  if (popularThisWeek.length === 0) {
    const trending = await getTrendingThisWeek();
    popularThisWeek = trending.map((item) => ({
      tmdb_id: item.id,
      media_type: item.media_type,
      tmdb: item
    }));
  }

  const feed: HomeFeed = {
    friendsRatedHighly: friendsRatedHighlyResult.data.map((item) =>
      normalizeAggregate(item as unknown as Record<string, unknown>)
    ),
    popularThisWeek,
    newFromFriends: newFromFriendsResult.data.map((item) =>
      normalizeFriendActivity(item as unknown as Record<string, unknown>)
    ),
    highTrustFriends: highTrustFriendsResult.data.map((item) =>
      normalizeTrustFriend(item as unknown as Record<string, unknown>)
    ),
    trustedRecommenders: trustedRecommendersResult.data.map((item) =>
      normalizeAggregate(item as unknown as Record<string, unknown>)
    ),
    tasteMatches: tasteMatchesResult.data.map((item) =>
      normalizeAggregate(item as unknown as Record<string, unknown>)
    ),
    friendsTop10: aggregateFriendsTop10Rows(
      friendsTop10Result.data.map((item) => normalizeFriendsTop10Row(item as Record<string, unknown>))
    )
  };

  return { feed, errors };
}

async function hydrateHomeFeed(feed: HomeFeed): Promise<HomeFeed> {
  const [friendsRatedHighly, popularThisWeek, newFromFriends, highTrustFriends, trustedRecommenders, tasteMatches, friendsTop10] =
    await Promise.all([
      hydrateTitles(feed.friendsRatedHighly),
      hydrateTitles(
        feed.popularThisWeek.map((item) => ({
          tmdb_id: item.tmdb_id,
          media_type: item.media_type,
          avg_rating: item.avg_rating,
          rating_count: item.rating_count,
          match_score: item.match_score,
          tmdb: item.tmdb
        }))
      ),
      hydrateTitles(feed.newFromFriends),
      hydrateTitles(feed.highTrustFriends),
      hydrateTitles(feed.trustedRecommenders),
      hydrateTitles(feed.tasteMatches),
      hydrateTitles(feed.friendsTop10)
    ]);

  return {
    friendsRatedHighly,
    popularThisWeek,
    newFromFriends,
    highTrustFriends,
    trustedRecommenders,
    tasteMatches,
    friendsTop10
  };
}

async function applyPopularFallback(feed: HomeFeed): Promise<HomeFeed> {
  if (feed.popularThisWeek.length > 0) {
    return feed;
  }

  const trending = await getTrendingThisWeek();
  return {
    ...feed,
    popularThisWeek: trending.map((item) => ({
      tmdb_id: item.id,
      media_type: item.media_type,
      tmdb: item
    }))
  };
}

async function applyMockPadding(feed: HomeFeed, minItems?: number): Promise<HomeFeed> {
  if (!isMockDataEnabled()) {
    return feed;
  }

  return fillHomeFeedWithMocks(feed, minItems);
}

export async function isHomeFeedBackendReady(): Promise<boolean> {
  const { error } = await supabase.rpc("is_home_feed_ready");
  if (error) {
    if (isMissingRpc(error)) {
      return false;
    }

    throw new Error(error.message);
  }

  return true;
}

export async function fetchHomeFeedFromServer(userId: string): Promise<HomeFeedLoadResult> {
  const backendReady = await isHomeFeedBackendReady();
  if (!backendReady) {
    const fallback = await applyPopularFallback(emptyHomeFeed());
    const hydrated = await hydrateHomeFeed(fallback);
    return {
      feed: hydrated,
      backendReady: false,
      loadErrors: [`Missing home feed RPCs. Run supabase/home-feed.sql in Supabase SQL Editor.`]
    };
  }

  const bundleResult = await fetchHomeFeedBundle(userId);
  let feed = bundleResult.feed;
  let loadErrors = bundleResult.error ? [bundleResult.error] : [];

  if (!feed) {
    const rpcResult = await fetchHomeFeedFromRpcs(userId);
    feed = rpcResult.feed;
    loadErrors = rpcResult.errors;
  }

  const withPopular = await applyPopularFallback(feed);
  const hydrated = await hydrateHomeFeed(withPopular);

  return {
    feed: hydrated,
    backendReady: true,
    loadErrors
  };
}

export async function getHomeFeed(userId: string): Promise<HomeFeed> {
  const { feed } = await fetchHomeFeedFromServer(userId);
  return applyMockPadding(feed);
}

export async function loadHomeFeed(userId: string): Promise<HomeFeedLoadResult> {
  const result = await fetchHomeFeedFromServer(userId);
  return {
    ...result,
    feed: await applyMockPadding(result.feed)
  };
}

export async function getNewFromFriendsActivity(userId: string): Promise<FriendActivityFeedItem[]> {
  if (!(await isHomeFeedBackendReady())) {
    return [];
  }

  const { data, error } = await safeRpc<FriendActivityFeedItem>("get_new_from_friends", { p_user_id: userId });
  if (error) {
    return [];
  }

  const hydrated = await hydrateTitles(
    data.map((item) => normalizeFriendActivity(item as unknown as Record<string, unknown>))
  );

  if (!isMockDataEnabled()) {
    return hydrated;
  }

  const feed = await fillHomeFeedWithMocks({
    friendsRatedHighly: [],
    popularThisWeek: [],
    newFromFriends: hydrated,
    highTrustFriends: [],
    trustedRecommenders: [],
    tasteMatches: [],
    friendsTop10: []
  });

  return feed.newFromFriends;
}
