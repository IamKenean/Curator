import type {
  AggregateFeedItem,
  FriendActivityFeedItem,
  HomeFeed,
  MediaType,
  TrustFriendPickItem,
  TmdbSearchResult
} from "../types";
import { getDiscoveryTitlePool } from "./tmdb";

const MIN_SECTION_ITEMS = 6;

const MOCK_FRIENDS = [
  { id: "mock-maya", username: "maya", avatar_url: null },
  { id: "mock-lex", username: "lex", avatar_url: null },
  { id: "mock-ronan", username: "ronan", avatar_url: null },
  { id: "mock-zia", username: "zia", avatar_url: null },
  { id: "mock-theo", username: "theo", avatar_url: null },
  { id: "mock-nova", username: "nova", avatar_url: null }
] as const;

function titleKey(tmdbId: number, mediaType: MediaType) {
  return `${mediaType}-${tmdbId}`;
}

function collectUsedKeys(feed: HomeFeed) {
  const used = new Set<string>();

  const add = (tmdbId: number, mediaType: MediaType) => used.add(titleKey(tmdbId, mediaType));

  feed.friendsRatedHighly.forEach((item) => add(item.tmdb_id, item.media_type));
  feed.popularThisWeek.forEach((item) => add(item.tmdb_id, item.media_type));
  feed.newFromFriends.forEach((item) => add(item.tmdb_id, item.media_type));
  feed.highTrustFriends.forEach((item) => add(item.tmdb_id, item.media_type));
  feed.trustedRecommenders.forEach((item) => add(item.tmdb_id, item.media_type));
  feed.tasteMatches.forEach((item) => add(item.tmdb_id, item.media_type));
  feed.friendsTop10.forEach((item) => add(item.tmdb_id, item.media_type));

  return used;
}

function pickTitles(pool: TmdbSearchResult[], used: Set<string>, start: number, count: number) {
  const picks: TmdbSearchResult[] = [];
  let index = start;

  while (picks.length < count && index < pool.length + start) {
    const item = pool[index % pool.length];
    const key = titleKey(item.id, item.media_type);

    if (!used.has(key)) {
      picks.push(item);
      used.add(key);
    }

    index += 1;
  }

  return picks;
}

function mockAggregateItems(titles: TmdbSearchResult[], startRating = 4.5): AggregateFeedItem[] {
  return titles.map((tmdb, index) => ({
    tmdb_id: tmdb.id,
    media_type: tmdb.media_type,
    avg_rating: Number((startRating - (index % 3) * 0.5).toFixed(1)),
    rating_count: 2 + (index % 4),
    is_mock: true,
    tmdb
  }));
}

function mockFriendActivityItems(titles: TmdbSearchResult[]): FriendActivityFeedItem[] {
  return titles.map((tmdb, index) => {
    const friend = MOCK_FRIENDS[index % MOCK_FRIENDS.length];
    return {
      tmdb_id: tmdb.id,
      media_type: tmdb.media_type,
      rating_value: 4.5 - (index % 3) * 0.5,
      rated_at: new Date(Date.now() - index * 36 * 60 * 60 * 1000).toISOString(),
      user_id: friend.id,
      username: friend.username,
      avatar_url: friend.avatar_url,
      is_mock: true,
      tmdb
    };
  });
}

function mockTrustFriendItems(titles: TmdbSearchResult[]): TrustFriendPickItem[] {
  return titles.map((tmdb, index) => {
    const friend = MOCK_FRIENDS[index % MOCK_FRIENDS.length];
    return {
      friend_id: friend.id,
      username: friend.username,
      avatar_url: friend.avatar_url,
      trust_score: Number((0.92 - index * 0.05).toFixed(2)),
      tmdb_id: tmdb.id,
      media_type: tmdb.media_type,
      rating_value: 4.5 - (index % 2) * 0.5,
      rated_at: new Date(Date.now() - index * 24 * 60 * 60 * 1000).toISOString(),
      is_mock: true,
      tmdb
    };
  });
}

function mockTasteMatchItems(titles: TmdbSearchResult[]): AggregateFeedItem[] {
  return titles.map((tmdb, index) => ({
    tmdb_id: tmdb.id,
    media_type: tmdb.media_type,
    avg_rating: Number((4.5 - (index % 2) * 0.5).toFixed(1)),
    match_score: Number((0.9 - index * 0.04).toFixed(2)),
    is_mock: true,
    tmdb
  }));
}

export async function fillHomeFeedWithMocks(feed: HomeFeed, minItems = MIN_SECTION_ITEMS): Promise<HomeFeed> {
  const pool = await getDiscoveryTitlePool();
  if (pool.length === 0) {
    return feed;
  }

  const used = collectUsedKeys(feed);

  const fillAggregate = (items: AggregateFeedItem[], offset: number, startRating = 4.5) => {
    if (items.length >= minItems) {
      return items;
    }

    const needed = minItems - items.length;
    const mockTitles = pickTitles(pool, used, offset, needed);
    return [...items, ...mockAggregateItems(mockTitles, startRating)];
  };

  const fillPopular = (items: AggregateFeedItem[]) => {
    if (items.length >= minItems) {
      return items;
    }

    const needed = minItems - items.length;
    const mockTitles = pickTitles(pool, used, 6, needed);
    return [
      ...items,
      ...mockTitles.map((tmdb, index) => ({
        tmdb_id: tmdb.id,
        media_type: tmdb.media_type,
        avg_rating: Number((4.3 - (index % 3) * 0.3).toFixed(1)),
        rating_count: 5 + index,
        is_mock: true,
        tmdb
      }))
    ];
  };

  const fillNewFromFriends = (items: FriendActivityFeedItem[]) => {
    if (items.length >= minItems) {
      return items;
    }

    const needed = minItems - items.length;
    const mockTitles = pickTitles(pool, used, 12, needed);
    return [...items, ...mockFriendActivityItems(mockTitles)];
  };

  const fillTrustFriends = (items: TrustFriendPickItem[]) => {
    if (items.length >= minItems) {
      return items;
    }

    const needed = minItems - items.length;
    const mockTitles = pickTitles(pool, used, 18, needed);
    return [...items, ...mockTrustFriendItems(mockTitles)];
  };

  const fillTaste = (items: AggregateFeedItem[]) => {
    if (items.length >= minItems) {
      return items;
    }

    const needed = minItems - items.length;
    const mockTitles = pickTitles(pool, used, 30, needed);
    return [...items, ...mockTasteMatchItems(mockTitles)];
  };

  return {
    friendsRatedHighly: fillAggregate(feed.friendsRatedHighly, 0),
    popularThisWeek: fillPopular(feed.popularThisWeek),
    newFromFriends: fillNewFromFriends(feed.newFromFriends),
    highTrustFriends: fillTrustFriends(feed.highTrustFriends),
    trustedRecommenders: fillAggregate(feed.trustedRecommenders, 24, 4.6),
    tasteMatches: fillTaste(feed.tasteMatches),
    friendsTop10: feed.friendsTop10
  };
}
