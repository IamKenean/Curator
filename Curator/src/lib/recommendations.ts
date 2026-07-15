import { averagePredictionAccuracy } from "./ratings";
import { getTrustScoreSnapshot, insertCalibrationEvents } from "./calibrationEvents";
import { cancelRecommendationReminder } from "./notifications";
import { getTmdbTitle } from "./tmdb";
import { upsertTitleRating } from "./titleRatings";
import { supabase } from "./supabase";
import type { CalibrationRatingSummary, MediaType, RatedRecommendation, Rating, Recommendation, TrustScore, UserProfile, UserRatedItem } from "../types";

function formatRecommendationError(error: { message: string; code?: string }) {
  if (error.code === "23503") {
    return "That friend is not fully set up yet. Ask them to sign in once, then try again.";
  }

  if (error.code === "42501") {
    return "Permission denied. Sign out and sign back in, then try again.";
  }

  if (error.message.toLowerCase().includes("row-level security")) {
    return "Permission denied. Sign out and sign back in, then try again.";
  }

  if (error.message.toLowerCase().includes("sender_rating")) {
    return "Database needs an update. Run supabase/sender-rating-upgrade.sql in Supabase → SQL Editor, then try again.";
  }

  return error.message;
}

function isMissingSenderRatingColumn(error: { message: string }) {
  return error.message.toLowerCase().includes("sender_rating");
}

export async function sendRecommendation(input: {
  fromUserId: string;
  toUserId: string;
  tmdbId: number;
  mediaType: MediaType;
  reason?: string;
  estimatedRating?: number | null;
  senderRating?: number | null;
}): Promise<{ warning?: string }> {
  if (input.fromUserId === input.toUserId) {
    throw new Error("You cannot send a recommendation to yourself.");
  }

  const trimmedReason = input.reason?.trim();
  const reason = trimmedReason ? trimmedReason.slice(0, 150) : null;

  const { data: friendProfile, error: friendError } = await supabase
    .from("users")
    .select("id")
    .eq("id", input.toUserId)
    .maybeSingle();

  if (friendError) {
    throw new Error(formatRecommendationError(friendError));
  }

  if (!friendProfile) {
    throw new Error("That friend does not have a profile yet. Ask them to sign in once, then try again.");
  }

  const senderRating = input.senderRating && input.senderRating > 0 ? input.senderRating : null;

  const baseRow = {
    from_user_id: input.fromUserId,
    to_user_id: input.toUserId,
    tmdb_id: input.tmdbId,
    media_type: input.mediaType,
    reason,
    estimated_rating: input.estimatedRating && input.estimatedRating > 0 ? input.estimatedRating : null,
    status: "pending" as const
  };

  let { error } = await supabase.from("recommendations").insert({
    ...baseRow,
    sender_rating: senderRating
  });

  if (error && isMissingSenderRatingColumn(error) && senderRating) {
    ({ error } = await supabase.from("recommendations").insert(baseRow));
    if (!error) {
      return {
        warning: "Sent without your personal rating. Run supabase/sender-rating-upgrade.sql in Supabase SQL Editor to enable it."
      };
    }
  }

  if (error) {
    throw new Error(formatRecommendationError(error));
  }

  return {};
}

export async function getIncomingPendingRecommendations(currentUserId: string): Promise<Recommendation[]> {
  const { data, error } = await supabase
    .from("recommendations")
    .select("*")
    .eq("to_user_id", currentUserId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return hydrateRecommendationUsers((data ?? []) as Recommendation[]);
}

export async function getRecommendationStats(currentUserId: string) {
  const [sent, responses, rated] = await Promise.all([
    supabase.from("recommendations").select("id", { count: "exact", head: true }).eq("from_user_id", currentUserId),
    supabase
      .from("recommendations")
      .select("id", { count: "exact", head: true })
      .eq("from_user_id", currentUserId)
      .eq("status", "watched"),
    getUserRatedFilms(currentUserId, { hydrateTmdb: false })
  ]);

  if (sent.error) {
    throw sent.error;
  }
  if (responses.error) {
    throw responses.error;
  }

  return {
    sent: sent.count ?? 0,
    rated: rated.length,
    responses: responses.count ?? 0
  };
}

export async function markRecommendationWatchedAndRate(input: {
  recommendation: Recommendation;
  currentUserId: string;
  stars: number;
  notes?: string;
  isFavorite?: boolean;
}): Promise<CalibrationRatingSummary | null> {
  const trimmedNotes = input.notes?.trim();
  const notes = trimmedNotes ? trimmedNotes.slice(0, 500) : null;

  const trustBeforeSnapshot = await getTrustScoreSnapshot(
    input.currentUserId,
    input.recommendation.from_user_id
  );

  const { error: ratingError } = await supabase.from("ratings").insert({
    recommendation_id: input.recommendation.id,
    user_id: input.currentUserId,
    rating_value: input.stars,
    notes,
    is_favorite: Boolean(input.isFavorite)
  });

  if (ratingError) {
    throw ratingError;
  }

  const { error: updateError } = await supabase
    .from("recommendations")
    .update({ status: "watched" })
    .eq("id", input.recommendation.id);

  if (updateError) {
    throw updateError;
  }

  await cancelRecommendationReminder(input.recommendation.id);

  const tmdb =
    (await getTmdbTitle(input.recommendation.tmdb_id, input.recommendation.media_type)) ?? {
      id: input.recommendation.tmdb_id,
      media_type: input.recommendation.media_type,
      title: "Unknown",
      year: "",
      poster_path: null
    };

  try {
    await upsertTitleRating(input.currentUserId, tmdb, {
      stars: input.stars,
      isFavorite: input.isFavorite,
      source: "rec"
    });
  } catch {
    // title_ratings table may not exist yet on older DBs; rec rating still succeeds.
  }

  await recalculateTrustScore(input.currentUserId, input.recommendation.from_user_id);

  const trustAfterSnapshot = await getTrustScoreSnapshot(
    input.currentUserId,
    input.recommendation.from_user_id
  );
  const trustAfter = trustAfterSnapshot?.score ?? trustBeforeSnapshot?.score ?? 0;

  return insertCalibrationEvents({
    recommendation: input.recommendation,
    actualRating: input.stars,
    notes,
    isFavorite: Boolean(input.isFavorite),
    recipientId: input.currentUserId,
    senderId: input.recommendation.from_user_id,
    trustBefore: trustBeforeSnapshot?.score ?? null,
    trustAfter
  });
}

export async function recalculateTrustScore(userId: string, friendId: string) {
  // Trust uses only the sender's estimate vs the recipient's rating — not sender_rating.
  const { data: recs, error: recsError } = await supabase
    .from("recommendations")
    .select("id, estimated_rating")
    .eq("from_user_id", friendId)
    .eq("to_user_id", userId)
    .eq("status", "watched")
    .not("estimated_rating", "is", null);

  if (recsError) {
    throw recsError;
  }

  const recIds = (recs ?? []).map((row) => row.id);
  if (recIds.length === 0) {
    await supabase.from("trust_scores").delete().eq("user_id", userId).eq("friend_id", friendId);
    return;
  }

  const { data: ratings, error: ratingsError } = await supabase
    .from("ratings")
    .select("recommendation_id, rating_value")
    .eq("user_id", userId)
    .in("recommendation_id", recIds);

  if (ratingsError) {
    throw ratingsError;
  }

  const ratingsByRec = new Map((ratings ?? []).map((row) => [row.recommendation_id, Number(row.rating_value)]));
  const pairs = (recs ?? []).flatMap((rec) => {
    const actual = ratingsByRec.get(rec.id);
    if (actual === undefined || rec.estimated_rating == null) {
      return [];
    }

    return [{ predicted: Number(rec.estimated_rating), actual }];
  });

  if (pairs.length === 0) {
    await supabase.from("trust_scores").delete().eq("user_id", userId).eq("friend_id", friendId);
    return;
  }

  const score = averagePredictionAccuracy(pairs);
  const total = pairs.length;

  const { error: upsertError } = await supabase.from("trust_scores").upsert(
    {
      user_id: userId,
      friend_id: friendId,
      score,
      total_recs: total,
      updated_at: new Date().toISOString()
    },
    { onConflict: "user_id,friend_id" }
  );

  if (upsertError) {
    throw upsertError;
  }
}

export async function getTrustScores(currentUserId: string): Promise<TrustScore[]> {
  const { data, error } = await supabase
    .from("trust_scores")
    .select("*")
    .eq("user_id", currentUserId)
    .order("score", { ascending: false });

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as TrustScore[];
  const friendIds = rows.map((row) => row.friend_id);
  if (friendIds.length === 0) {
    return rows;
  }

  const { data: users, error: usersError } = await supabase.from("users").select("*").in("id", friendIds);
  if (usersError) {
    throw usersError;
  }

  const usersById = new Map((users ?? []).map((user: UserProfile) => [user.id, user]));
  return rows.map((row) => ({ ...row, friend: usersById.get(row.friend_id) }));
}

export async function getSentRecommendations(
  currentUserId: string,
  options?: { status?: Recommendation["status"] }
): Promise<RatedRecommendation[]> {
  let query = supabase
    .from("recommendations")
    .select("*")
    .eq("from_user_id", currentUserId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (options?.status) {
    query = query.eq("status", options.status);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const recommendations = await hydrateRecommendationUsers((data ?? []) as Recommendation[]);
  const recIds = recommendations.map((row) => row.id);
  if (recIds.length === 0) {
    return recommendations;
  }

  const { data: ratings, error: ratingsError } = await supabase.from("ratings").select("*").in("recommendation_id", recIds);
  if (ratingsError) {
    throw ratingsError;
  }

  const ratingsByRec = new Map((ratings ?? []).map((row: Rating) => [row.recommendation_id, row]));
  const withRatings = recommendations.map((row) => ({
    ...row,
    rating: ratingsByRec.get(row.id)
  }));

  return Promise.all(
    withRatings.map(async (row) => ({
      ...row,
      tmdb: await getTmdbTitle(row.tmdb_id, row.media_type)
    }))
  );
}

export async function getSentRatedRecommendations(currentUserId: string): Promise<RatedRecommendation[]> {
  return getSentRecommendations(currentUserId, { status: "watched" });
}

export async function getReceivedRecommendations(
  currentUserId: string,
  options?: { status?: Recommendation["status"] }
): Promise<RatedRecommendation[]> {
  let query = supabase
    .from("recommendations")
    .select("*")
    .eq("to_user_id", currentUserId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (options?.status) {
    query = query.eq("status", options.status);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const recommendations = await hydrateRecommendationUsers((data ?? []) as Recommendation[]);
  const recIds = recommendations.map((row) => row.id);
  if (recIds.length === 0) {
    return recommendations;
  }

  const { data: ratings, error: ratingsError } = await supabase.from("ratings").select("*").in("recommendation_id", recIds);
  if (ratingsError) {
    throw ratingsError;
  }

  const ratingsByRec = new Map((ratings ?? []).map((row: Rating) => [row.recommendation_id, row]));
  const withRatings = recommendations.map((row) => ({
    ...row,
    rating: ratingsByRec.get(row.id)
  }));

  return Promise.all(
    withRatings.map(async (row) => ({
      ...row,
      tmdb: await getTmdbTitle(row.tmdb_id, row.media_type)
    }))
  );
}

export async function getReceivedRatedRecommendations(currentUserId: string): Promise<RatedRecommendation[]> {
  return getReceivedRecommendations(currentUserId, { status: "watched" });
}

function filmKey(tmdbId: number, mediaType: MediaType) {
  return `${mediaType}:${tmdbId}`;
}

async function getSentWithSenderRating(currentUserId: string): Promise<RatedRecommendation[]> {
  const { data, error } = await supabase
    .from("recommendations")
    .select("*")
    .eq("from_user_id", currentUserId)
    .not("sender_rating", "is", null)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    if (isMissingSenderRatingColumn(error)) {
      return [];
    }
    throw error;
  }

  return hydrateRecommendationUsers((data ?? []) as Recommendation[]);
}

function mergeUserRatedFilms(received: RatedRecommendation[], selfSent: RatedRecommendation[]): UserRatedItem[] {
  const byFilm = new Map<string, UserRatedItem>();

  for (const item of received) {
    if (!item.rating) {
      continue;
    }

    const entry: UserRatedItem = {
      ...item,
      rated_source: "received",
      personal_rating: Number(item.rating.rating_value),
      rated_at_sort: item.rating.rated_at
    };

    const key = filmKey(item.tmdb_id, item.media_type);
    const existing = byFilm.get(key);
    if (!existing || new Date(entry.rated_at_sort).getTime() > new Date(existing.rated_at_sort).getTime()) {
      byFilm.set(key, entry);
    }
  }

  for (const item of selfSent) {
    if (item.sender_rating == null) {
      continue;
    }

    const entry: UserRatedItem = {
      ...item,
      rated_source: "self",
      personal_rating: Number(item.sender_rating),
      rated_at_sort: item.created_at
    };

    const key = filmKey(item.tmdb_id, item.media_type);
    const existing = byFilm.get(key);
    if (!existing || new Date(entry.rated_at_sort).getTime() > new Date(existing.rated_at_sort).getTime()) {
      byFilm.set(key, entry);
    }
  }

  return [...byFilm.values()].sort(
    (a, b) => new Date(b.rated_at_sort).getTime() - new Date(a.rated_at_sort).getTime()
  );
}

export async function getUserRatedFilms(
  currentUserId: string,
  options?: { hydrateTmdb?: boolean }
): Promise<UserRatedItem[]> {
  const hydrateTmdb = options?.hydrateTmdb ?? true;
  const [received, selfSent] = await Promise.all([
    getReceivedRatedRecommendations(currentUserId),
    getSentWithSenderRating(currentUserId)
  ]);

  const merged = mergeUserRatedFilms(received, selfSent);
  if (!hydrateTmdb || merged.length === 0) {
    return merged;
  }

  return Promise.all(
    merged.map(async (item) => ({
      ...item,
      tmdb: await getTmdbTitle(item.tmdb_id, item.media_type)
    }))
  );
}

export type LatestFriendRec = {
  from_user_id: string;
  reason: string | null;
  tmdb_id: number;
  media_type: MediaType;
  created_at: string;
  title?: string;
};

export async function getLatestRecsFromFriends(currentUserId: string): Promise<Map<string, LatestFriendRec>> {
  const { data, error } = await supabase
    .from("recommendations")
    .select("from_user_id, reason, tmdb_id, media_type, created_at")
    .eq("to_user_id", currentUserId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    throw error;
  }

  const latestByFriend = new Map<string, LatestFriendRec>();
  for (const row of data ?? []) {
    const rec = row as LatestFriendRec;
    if (!latestByFriend.has(rec.from_user_id)) {
      latestByFriend.set(rec.from_user_id, rec);
    }
  }

  await Promise.all(
    [...latestByFriend.entries()].map(async ([friendId, rec]) => {
      try {
        const tmdb = await getTmdbTitle(rec.tmdb_id, rec.media_type);
        latestByFriend.set(friendId, { ...rec, title: tmdb.title });
      } catch {
        latestByFriend.set(friendId, rec);
      }
    })
  );

  return latestByFriend;
}

async function hydrateRecommendationUsers(recommendations: Recommendation[]): Promise<Recommendation[]> {
  const ids = [...new Set(recommendations.flatMap((row) => [row.from_user_id, row.to_user_id]))];
  if (ids.length === 0) {
    return recommendations;
  }

  const { data, error } = await supabase.from("users").select("*").in("id", ids);
  if (error) {
    throw error;
  }

  const usersById = new Map((data ?? []).map((user: UserProfile) => [user.id, user]));
  return recommendations.map((row) => ({
    ...row,
    from_user: usersById.get(row.from_user_id),
    to_user: usersById.get(row.to_user_id)
  }));
}
