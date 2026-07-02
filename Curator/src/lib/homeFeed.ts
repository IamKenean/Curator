import type {
  AggregateFeedItem,
  FriendActivityFeedItem,
  HomeFeed,
  MediaType,
  TrustFriendPickItem,
  TmdbSearchResult
} from "../types";
import { fillHomeFeedWithMocks } from "./mockHomeFeed";
import { getTrendingThisWeek, getTmdbTitle } from "./tmdb";
import { supabase } from "./supabase";

type TitleKey = `${MediaType}-${number}`;

function titleKey(tmdbId: number, mediaType: MediaType): TitleKey {
  return `${mediaType}-${tmdbId}`;
}

async function hydrateTitles<T extends { tmdb_id: number; media_type: MediaType; tmdb?: TmdbSearchResult }>(
  items: T[]
): Promise<T[]> {
  const unique = new Map<TitleKey, Promise<TmdbSearchResult>>();
  items.forEach((item) => {
    const key = titleKey(item.tmdb_id, item.media_type);
    if (!unique.has(key)) {
      unique.set(key, getTmdbTitle(item.tmdb_id, item.media_type));
    }
  });

  const resolved = new Map<TitleKey, TmdbSearchResult>();
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

const warnedRpcs = new Set<string>();

async function safeRpc<T>(name: string, params?: Record<string, unknown>): Promise<T[]> {
  const { data, error } = await supabase.rpc(name, params ?? {});
  if (error) {
    if (!warnedRpcs.has(name)) {
      warnedRpcs.add(name);
      console.warn(
        `Home feed RPC ${name} unavailable. Run supabase/home-feed.sql in Supabase SQL Editor, then reload the API schema.`
      );
    }
    return [];
  }

  return (data ?? []) as T[];
}

export async function getHomeFeed(userId: string): Promise<HomeFeed> {
  const [
    friendsRatedHighlyRaw,
    popularRaw,
    newFromFriendsRaw,
    highTrustFriendsRaw,
    trustedRecommendersRaw,
    tasteMatchesRaw
  ] = await Promise.all([
    safeRpc<AggregateFeedItem>("get_friends_rated_highly", { p_user_id: userId }),
    safeRpc<AggregateFeedItem>("get_curator_popular_this_week"),
    safeRpc<FriendActivityFeedItem>("get_new_from_friends", { p_user_id: userId }),
    safeRpc<TrustFriendPickItem>("get_high_trust_friends_picks", { p_user_id: userId }),
    safeRpc<AggregateFeedItem>("get_trusted_recommender_picks"),
    safeRpc<AggregateFeedItem>("get_taste_match_picks", { p_user_id: userId })
  ]);

  let popularThisWeek = popularRaw;
  if (popularThisWeek.length === 0) {
    const trending = await getTrendingThisWeek();
    popularThisWeek = trending.map((item) => ({
      tmdb_id: item.id,
      media_type: item.media_type,
      tmdb: item
    }));
  }

  const [friendsRatedHighly, popularHydrated, newFromFriends, highTrustFriends, trustedRecommenders, tasteMatches] =
    await Promise.all([
      hydrateTitles(friendsRatedHighlyRaw),
      hydrateTitles(
        popularThisWeek.map((item) => ({
          tmdb_id: item.tmdb_id,
          media_type: item.media_type,
          avg_rating: item.avg_rating,
          rating_count: item.rating_count,
          tmdb: item.tmdb
        }))
      ),
      hydrateTitles(newFromFriendsRaw),
      hydrateTitles(highTrustFriendsRaw),
      hydrateTitles(trustedRecommendersRaw),
      hydrateTitles(tasteMatchesRaw)
    ]);

  const feed: HomeFeed = {
    friendsRatedHighly,
    popularThisWeek: popularHydrated,
    newFromFriends,
    highTrustFriends,
    trustedRecommenders,
    tasteMatches
  };

  return fillHomeFeedWithMocks(feed);
}
