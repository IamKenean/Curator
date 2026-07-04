import { averagePredictionAccuracy, predictionAccuracy, trustScoreToPercent } from "./ratings";
import { getTmdbTitle } from "./tmdb";
import { supabase } from "./supabase";
import type { MediaType, TrustScore, UserProfile } from "../types";

export type FriendSortOption = "trust" | "active" | "taste" | "pending";

export type FriendListItem = {
  friend: UserProfile;
  friendshipId: string;
  trustScore: TrustScore | null;
  reverseTrustPercent: number | null;
  tasteMatchPercent: number | null;
  pendingFromThem: number;
  activityLine: string;
  lastActiveAt: string | null;
  hitRateWithYou: number | null;
  topGenres: string[];
  sentCount: number;
};

export type FriendProfileDetail = FriendListItem & {
  yourTrustPercent: number | null;
  theirTrustPercent: number | null;
};

type RecRow = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  tmdb_id: number;
  media_type: MediaType;
  estimated_rating: number | null;
  sender_rating: number | null;
  status: "pending" | "watched";
  created_at: string;
};

type RatingRow = {
  recommendation_id: string;
  rating_value: number;
  rated_at: string;
};

const GENRE_POOL = ["Drama", "Sci-Fi", "Comedy", "Thriller", "Horror", "Action", "Romance", "Documentary"] as const;

function daysAgoLabel(dateString: string) {
  const days = Math.max(0, Math.floor((Date.now() - new Date(dateString).getTime()) / 86400000));
  if (days === 0) {
    return "today";
  }
  if (days === 1) {
    return "1 day ago";
  }
  if (days < 7) {
    return `${days} days ago`;
  }
  const weeks = Math.floor(days / 7);
  return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
}

function weeksSince(dateString: string) {
  return Math.floor((Date.now() - new Date(dateString).getTime()) / (86400000 * 7));
}

function hashGenres(userId: string, sentCount: number) {
  let hash = sentCount;
  for (let index = 0; index < userId.length; index += 1) {
    hash = (hash * 31 + userId.charCodeAt(index)) >>> 0;
  }

  const picks: string[] = [];
  for (let index = 0; index < GENRE_POOL.length && picks.length < 3; index += 1) {
    const candidate = GENRE_POOL[(hash + index * 7) % GENRE_POOL.length];
    if (!picks.includes(candidate)) {
      picks.push(candidate);
    }
  }

  return picks;
}

function computeTrustPercent(recs: RecRow[], ratingsByRec: Map<string, number>, fromId: string, toId: string) {
  const pairs = recs
    .filter(
      (rec) => rec.from_user_id === fromId && rec.to_user_id === toId && rec.status === "watched" && rec.estimated_rating != null
    )
    .flatMap((rec) => {
      const actual = ratingsByRec.get(rec.id);
      if (actual === undefined) {
        return [];
      }
      return [{ predicted: Number(rec.estimated_rating), actual }];
    });

  if (pairs.length === 0) {
    return null;
  }

  return trustScoreToPercent(averagePredictionAccuracy(pairs));
}

function computeHitRate(recs: RecRow[], ratingsByRec: Map<string, number>, fromId: string, toId: string) {
  const watched = recs.filter(
    (rec) => rec.from_user_id === fromId && rec.to_user_id === toId && rec.status === "watched" && rec.estimated_rating != null
  );

  if (watched.length === 0) {
    return null;
  }

  const accuracies = watched.flatMap((rec) => {
    const actual = ratingsByRec.get(rec.id);
    if (actual === undefined) {
      return [];
    }
    return [predictionAccuracy(Number(rec.estimated_rating), actual)];
  });

  if (accuracies.length === 0) {
    return null;
  }

  return Math.round((accuracies.reduce((sum, value) => sum + value, 0) / accuracies.length) * 100);
}

function computeTasteMatch(
  recs: RecRow[],
  ratingsByRec: Map<string, number>,
  userId: string,
  friendId: string,
  yourTrust: TrustScore | null,
  reverseTrustPercent: number | null
) {
  const sharedTitles = new Map<string, { yours?: number; theirs?: number }>();

  for (const rec of recs) {
    if (rec.status !== "watched") {
      continue;
    }

    const rating = ratingsByRec.get(rec.id);
    if (rating === undefined) {
      continue;
    }

    const key = `${rec.media_type}-${rec.tmdb_id}`;
    const entry = sharedTitles.get(key) ?? {};

    if (rec.from_user_id === friendId && rec.to_user_id === userId) {
      entry.theirs = rec.estimated_rating ?? rating;
      entry.yours = rating;
    }

    if (rec.from_user_id === userId && rec.to_user_id === friendId) {
      entry.yours = rec.sender_rating ?? rating;
      entry.theirs = rating;
    }

    sharedTitles.set(key, entry);
  }

  const overlaps = [...sharedTitles.values()].filter((entry) => entry.yours != null && entry.theirs != null);
  if (overlaps.length >= 2) {
    const avgGap =
      overlaps.reduce((sum, entry) => sum + Math.abs(Number(entry.yours) - Number(entry.theirs)), 0) / overlaps.length;
    return Math.round((1 - Math.min(avgGap, 4) / 4) * 100);
  }

  const trustValues = [yourTrust?.score, reverseTrustPercent != null ? reverseTrustPercent / 100 : null].filter(
    (value): value is number => value != null
  );

  if (trustValues.length === 0) {
    return null;
  }

  return trustScoreToPercent(trustValues.reduce((sum, value) => sum + value, 0) / trustValues.length);
}

function buildActivityLine(
  friendId: string,
  recs: RecRow[],
  ratingsByRec: Map<string, RatingRow>,
  userId: string,
  titleByRecId: Map<string, string>
) {
  const incoming = recs
    .filter((rec) => rec.from_user_id === friendId && rec.to_user_id === userId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const latestIncoming = incoming[0];
  const pendingIncoming = incoming.filter((rec) => rec.status === "pending");

  if (pendingIncoming.length > 0) {
    return `${pendingIncoming.length} pending rec${pendingIncoming.length === 1 ? "" : "s"} from them`;
  }

  const ratedYourRec = recs
    .filter((rec) => rec.from_user_id === userId && rec.to_user_id === friendId && rec.status === "watched")
    .flatMap((rec) => {
      const rating = ratingsByRec.get(rec.id);
      if (!rating) {
        return [];
      }
      return [{ rec, ratedAt: rating.rated_at }];
    })
    .sort((a, b) => new Date(b.ratedAt).getTime() - new Date(a.ratedAt).getTime())[0];

  if (ratedYourRec) {
    const title = titleByRecId.get(ratedYourRec.rec.id);
    if (title) {
      return `Rated your rec of ${title}`;
    }
    return "Rated one of your recs";
  }

  if (latestIncoming) {
    const weeks = weeksSince(latestIncoming.created_at);
    if (weeks >= 3) {
      return `Hasn't sent a rec in ${weeks} weeks`;
    }
    return `Put you on ${daysAgoLabel(latestIncoming.created_at)}`;
  }

  return "No recs yet — put each other on something";
}

async function hydrateRecTitles(recs: RecRow[]) {
  const titleByRecId = new Map<string, string>();
  const unique = new Map<string, Promise<string>>();

  for (const rec of recs) {
    const key = `${rec.media_type}-${rec.tmdb_id}`;
    if (!unique.has(key)) {
      unique.set(
        key,
        getTmdbTitle(rec.tmdb_id, rec.media_type)
          .then((title) => title.title)
          .catch(() => "something")
      );
    }
  }

  const resolved = new Map<string, string>();
  await Promise.all(
    [...unique.entries()].map(async ([key, promise]) => {
      resolved.set(key, await promise);
    })
  );

  for (const rec of recs) {
    titleByRecId.set(rec.id, resolved.get(`${rec.media_type}-${rec.tmdb_id}`) ?? "something");
  }

  return titleByRecId;
}

export async function getFriendListInsights(
  currentUserId: string,
  friends: UserProfile[],
  trustScores: TrustScore[]
): Promise<FriendListItem[]> {
  if (friends.length === 0) {
    return [];
  }

  const friendIds = friends.map((friend) => friend.id);
  const trustByFriendId = new Map(trustScores.map((score) => [score.friend_id, score]));

  const { data: recData, error: recError } = await supabase
    .from("recommendations")
    .select("id, from_user_id, to_user_id, tmdb_id, media_type, estimated_rating, sender_rating, status, created_at")
    .or(`from_user_id.eq.${currentUserId},to_user_id.eq.${currentUserId}`)
    .order("created_at", { ascending: false })
    .limit(400);

  if (recError) {
    throw recError;
  }

  const friendIdSet = new Set(friendIds);
  const recs = ((recData ?? []) as RecRow[]).filter(
    (rec) =>
      (rec.from_user_id === currentUserId && friendIdSet.has(rec.to_user_id)) ||
      (rec.to_user_id === currentUserId && friendIdSet.has(rec.from_user_id))
  );
  const recIds = recs.map((rec) => rec.id);

  let ratingsByRec = new Map<string, RatingRow>();
  if (recIds.length > 0) {
    const { data: ratingData, error: ratingError } = await supabase
      .from("ratings")
      .select("recommendation_id, rating_value, rated_at")
      .in("recommendation_id", recIds);

    if (ratingError) {
      throw ratingError;
    }

    ratingsByRec = new Map((ratingData ?? []).map((row) => [row.recommendation_id, row as RatingRow]));
  }

  const titleByRecId = await hydrateRecTitles(recs);
  const ratingValuesByRec = new Map([...ratingsByRec.entries()].map(([id, row]) => [id, Number(row.rating_value)]));

  return friends.map((friend) => {
    const friendRecs = recs.filter(
      (rec) =>
        (rec.from_user_id === friend.id && rec.to_user_id === currentUserId) ||
        (rec.from_user_id === currentUserId && rec.to_user_id === friend.id)
    );

    const trustScore = trustByFriendId.get(friend.id) ?? null;
    const reverseTrustPercent = computeTrustPercent(friendRecs, ratingValuesByRec, currentUserId, friend.id);
    const tasteMatchPercent = computeTasteMatch(friendRecs, ratingValuesByRec, currentUserId, friend.id, trustScore, reverseTrustPercent);
    const pendingFromThem = friendRecs.filter(
      (rec) => rec.from_user_id === friend.id && rec.to_user_id === currentUserId && rec.status === "pending"
    ).length;

    const sentByFriend = friendRecs.filter((rec) => rec.from_user_id === friend.id);
    const hitRateWithYou = computeHitRate(friendRecs, ratingValuesByRec, friend.id, currentUserId);
    const sentCount = sentByFriend.length;

    const lastIncoming = sentByFriend[0]?.created_at ?? null;
    const lastRatedYourRec = friendRecs
      .filter((rec) => rec.from_user_id === currentUserId && rec.to_user_id === friend.id && rec.status === "watched")
      .map((rec) => ratingsByRec.get(rec.id)?.rated_at)
      .filter(Boolean)[0] as string | undefined;

    const lastActiveAt = [lastIncoming, lastRatedYourRec].filter(Boolean).sort().reverse()[0] ?? null;

    return {
      friend,
      friendshipId: friend.id,
      trustScore,
      reverseTrustPercent,
      tasteMatchPercent,
      pendingFromThem,
      activityLine: buildActivityLine(friend.id, friendRecs, ratingsByRec, currentUserId, titleByRecId),
      lastActiveAt,
      hitRateWithYou,
      topGenres: hashGenres(friend.id, sentCount),
      sentCount
    };
  });
}

export function sortFriendList(items: FriendListItem[], sortBy: FriendSortOption) {
  const sorted = [...items];

  sorted.sort((a, b) => {
    switch (sortBy) {
      case "trust": {
        const aScore = a.trustScore?.score ?? -1;
        const bScore = b.trustScore?.score ?? -1;
        return bScore - aScore;
      }
      case "active": {
        const aTime = a.lastActiveAt ? new Date(a.lastActiveAt).getTime() : 0;
        const bTime = b.lastActiveAt ? new Date(b.lastActiveAt).getTime() : 0;
        return bTime - aTime;
      }
      case "taste": {
        const aMatch = a.tasteMatchPercent ?? -1;
        const bMatch = b.tasteMatchPercent ?? -1;
        return bMatch - aMatch;
      }
      case "pending": {
        if (b.pendingFromThem !== a.pendingFromThem) {
          return b.pendingFromThem - a.pendingFromThem;
        }
        return a.friend.username.localeCompare(b.friend.username);
      }
      default:
        return 0;
    }
  });

  return sorted;
}

export function toFriendProfileDetail(item: FriendListItem): FriendProfileDetail {
  return {
    ...item,
    yourTrustPercent: item.trustScore ? trustScoreToPercent(item.trustScore.score) : null,
    theirTrustPercent: item.reverseTrustPercent
  };
}
