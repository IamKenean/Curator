import { trustScoreToPercent } from "./ratings";
import type { HomeFeed } from "../types";
import type { FriendListItem } from "./friendInsights";
import type {
  AggregateFeedItem,
  FriendActivityFeedItem,
  FriendsTop10Pick,
  MediaType,
  TmdbSearchResult,
  UserProfile
} from "../types";

export type FriendsTrustCarouselItem = {
  friend: UserProfile;
  trustPercent: number | null;
};

export type LovedThisWeekItem = {
  key: string;
  tmdb_id: number;
  media_type: MediaType;
  tmdb?: TmdbSearchResult;
  friendCount: number;
  friends: { user_id: string; username: string; avatar_url: string | null }[];
};

export type TrendingCircleItem = {
  key: string;
  tmdb_id: number;
  media_type: MediaType;
  tmdb?: TmdbSearchResult;
  title: string;
  friendCount: number;
  kind: "watched" | "recommended";
  friends: { user_id: string; username: string; avatar_url: string | null }[];
};

export type FriendReviewItem = {
  key: string;
  activity: FriendActivityFeedItem;
  reviewSnippet: string;
};

export type FriendsLeaderboardPreview = {
  topTrust: { friendId: string; username: string; percent: number } | null;
  topTaste: { friendId: string; username: string; percent: number } | null;
  mostActive: { friendId: string; username: string; label: string } | null;
};

export type FriendsFeedSections = {
  trustCarousel: FriendsTrustCarouselItem[];
  lovedThisWeek: LovedThisWeekItem[];
  reviews: FriendReviewItem[];
  trending: TrendingCircleItem[];
  latestActivity: FriendActivityFeedItem[];
  leaderboard: FriendsLeaderboardPreview;
};

const POSITIVE_REVIEW_SNIPPETS = [
  "Instant favorite.",
  "This wrecked me.",
  "Can't stop thinking about it.",
  "Perfect watch.",
  "Already rewatched it."
] as const;

const MIXED_REVIEW_SNIPPETS = [
  "Interesting but uneven.",
  "Wanted to love it more.",
  "Creepy atmosphere but lost me in the third act.",
  "Good ideas, messy execution.",
  "Not for me, but I get the hype."
] as const;

function titleKey(tmdbId: number, mediaType: MediaType) {
  return `${mediaType}-${tmdbId}`;
}

function hashIndex(seed: string, modulo: number) {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return hash % modulo;
}

export function timeAgoLabel(dateString: string) {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) {
    return "Just now";
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  if (days === 1) {
    return "1d ago";
  }
  if (days < 7) {
    return `${days}d ago`;
  }
  const weeks = Math.floor(days / 7);
  return weeks === 1 ? "1w ago" : `${weeks}w ago`;
}

export function buildReviewSnippet(activity: FriendActivityFeedItem) {
  const pool = activity.rating_value >= 4 ? POSITIVE_REVIEW_SNIPPETS : MIXED_REVIEW_SNIPPETS;
  const seed = `${activity.user_id}-${activity.tmdb_id}-${activity.rating_value}`;
  return pool[hashIndex(seed, pool.length)];
}

export function buildTrustCarousel(friendItems: FriendListItem[]): FriendsTrustCarouselItem[] {
  return friendItems
    .map((item) => ({
      friend: item.friend,
      trustPercent: item.trustScore ? trustScoreToPercent(item.trustScore.score) : null
    }))
    .sort((a, b) => (b.trustPercent ?? -1) - (a.trustPercent ?? -1));
}

function buildLovedFromAggregate(items: AggregateFeedItem[]): LovedThisWeekItem[] {
  return items.map((item) => ({
    key: titleKey(item.tmdb_id, item.media_type),
    tmdb_id: item.tmdb_id,
    media_type: item.media_type,
    tmdb: item.tmdb,
    friendCount: item.rating_count ?? 1,
    friends: []
  }));
}

function buildLovedFromActivity(activity: FriendActivityFeedItem[]): LovedThisWeekItem[] {
  const grouped = new Map<string, LovedThisWeekItem>();

  for (const item of activity) {
    if (item.rating_value < 4) {
      continue;
    }

    const key = titleKey(item.tmdb_id, item.media_type);
    const existing = grouped.get(key);
    const friend = {
      user_id: item.user_id,
      username: item.username,
      avatar_url: item.avatar_url
    };

    if (existing) {
      if (!existing.friends.some((entry) => entry.user_id === friend.user_id)) {
        existing.friends.push(friend);
        existing.friendCount = existing.friends.length;
      }
      continue;
    }

    grouped.set(key, {
      key,
      tmdb_id: item.tmdb_id,
      media_type: item.media_type,
      tmdb: item.tmdb,
      friendCount: 1,
      friends: [friend]
    });
  }

  return [...grouped.values()].sort((a, b) => b.friendCount - a.friendCount);
}

function mergeLovedItems(primary: LovedThisWeekItem[], secondary: LovedThisWeekItem[]) {
  const merged = new Map<string, LovedThisWeekItem>();

  for (const item of [...primary, ...secondary]) {
    const existing = merged.get(item.key);
    if (!existing) {
      merged.set(item.key, { ...item, friends: [...item.friends] });
      continue;
    }

    for (const friend of item.friends) {
      if (!existing.friends.some((entry) => entry.user_id === friend.user_id)) {
        existing.friends.push(friend);
      }
    }
    existing.friendCount = Math.max(existing.friendCount, item.friendCount, existing.friends.length);
    existing.tmdb = existing.tmdb ?? item.tmdb;
  }

  return [...merged.values()].sort((a, b) => b.friendCount - a.friendCount);
}

function buildTrendingFromTop10(picks: FriendsTop10Pick[]): TrendingCircleItem[] {
  return picks.slice(0, 6).map((pick) => ({
    key: titleKey(pick.tmdb_id, pick.media_type),
    tmdb_id: pick.tmdb_id,
    media_type: pick.media_type,
    tmdb: pick.tmdb,
    title: pick.tmdb?.title ?? "Unknown title",
    friendCount: pick.friends.length,
    kind: "recommended" as const,
    friends: pick.friends.map((friend) => ({
      user_id: friend.friend_id,
      username: friend.username,
      avatar_url: friend.avatar_url
    }))
  }));
}

function buildTrendingFromRecommenders(items: AggregateFeedItem[]): TrendingCircleItem[] {
  return items.slice(0, 6).map((item) => ({
    key: `rec-${titleKey(item.tmdb_id, item.media_type)}`,
    tmdb_id: item.tmdb_id,
    media_type: item.media_type,
    tmdb: item.tmdb,
    title: item.tmdb?.title ?? "Unknown title",
    friendCount: item.rating_count ?? 1,
    kind: "watched" as const,
    friends: []
  }));
}

function mergeTrending(primary: TrendingCircleItem[], secondary: TrendingCircleItem[]) {
  const merged = new Map<string, TrendingCircleItem>();
  for (const item of [...primary, ...secondary]) {
    if (!merged.has(item.key)) {
      merged.set(item.key, item);
    }
  }
  return [...merged.values()].sort((a, b) => b.friendCount - a.friendCount);
}

function buildReviews(activity: FriendActivityFeedItem[]): FriendReviewItem[] {
  return activity
    .filter((item) => item.rating_value >= 4 || item.rating_value <= 3)
    .slice(0, 6)
    .map((item) => ({
      key: `${item.user_id}-${item.tmdb_id}-${item.rated_at}`,
      activity: item,
      reviewSnippet: buildReviewSnippet(item)
    }));
}

function buildLeaderboard(friendItems: FriendListItem[]): FriendsLeaderboardPreview {
  const topTrust = [...friendItems]
    .filter((item) => item.trustScore)
    .sort((a, b) => (b.trustScore?.score ?? 0) - (a.trustScore?.score ?? 0))[0];

  const topTaste = [...friendItems]
    .filter((item) => item.tasteMatchPercent != null)
    .sort((a, b) => (b.tasteMatchPercent ?? 0) - (a.tasteMatchPercent ?? 0))[0];

  const mostActive = [...friendItems]
    .filter((item) => item.lastActiveAt)
    .sort((a, b) => new Date(b.lastActiveAt ?? 0).getTime() - new Date(a.lastActiveAt ?? 0).getTime())[0];

  return {
    topTrust: topTrust?.trustScore
      ? {
          friendId: topTrust.friend.id,
          username: topTrust.friend.username,
          percent: trustScoreToPercent(topTrust.trustScore.score)
        }
      : null,
    topTaste: topTaste?.tasteMatchPercent != null
      ? {
          friendId: topTaste.friend.id,
          username: topTaste.friend.username,
          percent: topTaste.tasteMatchPercent
        }
      : null,
    mostActive: mostActive
      ? {
          friendId: mostActive.friend.id,
          username: mostActive.friend.username,
          label: mostActive.activityLine
        }
      : null
  };
}

export function buildFriendsFeedSections(
  friendItems: FriendListItem[],
  feed: HomeFeed
): FriendsFeedSections {
  const activity = [...feed.newFromFriends].sort(
    (a, b) => new Date(b.rated_at).getTime() - new Date(a.rated_at).getTime()
  );

  const lovedThisWeek = mergeLovedItems(
    buildLovedFromAggregate(feed.friendsRatedHighly),
    buildLovedFromActivity(activity)
  ).slice(0, 10);

  const trending = mergeTrending(
    buildTrendingFromTop10(feed.friendsTop10),
    buildTrendingFromRecommenders(feed.trustedRecommenders)
  ).slice(0, 6);

  return {
    trustCarousel: buildTrustCarousel(friendItems),
    lovedThisWeek,
    reviews: buildReviews(activity),
    trending,
    latestActivity: activity.slice(0, 8),
    leaderboard: buildLeaderboard(friendItems)
  };
}
