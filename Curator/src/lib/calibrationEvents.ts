import {
  formatTrustDeltaPercent,
  predictionAccuracy,
  trustPercentDelta,
  trustScoreToPercent
} from "./ratings";
import { getTmdbTitle } from "./tmdb";
import { supabase } from "./supabase";
import type {
  CalibrationEvent,
  CalibrationEventType,
  CalibrationRatingSummary,
  Recommendation,
  UserProfile
} from "../types";

type DbCalibrationEvent = Omit<CalibrationEvent, "friend" | "tmdb">;

function isMissingTable(error: { message: string }) {
  const message = error.message.toLowerCase();
  return message.includes("calibration_events") && (message.includes("does not exist") || message.includes("could not find"));
}

export async function getTrustScoreSnapshot(
  userId: string,
  friendId: string
): Promise<{ score: number; total_recs: number } | null> {
  const { data, error } = await supabase
    .from("trust_scores")
    .select("score, total_recs")
    .eq("user_id", userId)
    .eq("friend_id", friendId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return {
    score: Number(data.score),
    total_recs: Number(data.total_recs)
  };
}

export function formatRecAccuracy(accuracy: number) {
  if (accuracy <= 0) {
    return "N/A";
  }

  return `${Math.round(accuracy * 100)}% accurate`;
}

export function recAccuracyFlavor(accuracy: number) {
  if (accuracy <= 0) {
    return null;
  }

  if (accuracy >= 0.9) {
    return "Nailed it";
  }

  if (accuracy >= 0.7) {
    return "Close";
  }

  if (accuracy >= 0.5) {
    return "Eh";
  }

  return "Way off";
}

export function formatTrustDelta(input: {
  trustBefore: number | null;
  trustAfter: number;
  trustDeltaPercent: number;
}) {
  const afterLabel = `${trustScoreToPercent(input.trustAfter, 1)}%`;
  const beforeLabel =
    input.trustBefore != null ? `${trustScoreToPercent(input.trustBefore, 1)}%` : null;

  if (beforeLabel == null) {
    return {
      beforeLabel: null,
      afterLabel,
      deltaLabel: `Trust started at ${afterLabel}`,
      deltaTone: "new" as const
    };
  }

  const deltaLabel = formatTrustDeltaPercent(input.trustDeltaPercent);
  const deltaTone: "up" | "down" | "flat" =
    input.trustDeltaPercent > 0 ? "up" : input.trustDeltaPercent < 0 ? "down" : "flat";

  return {
    beforeLabel,
    afterLabel,
    deltaLabel,
    deltaTone
  };
}

export function formatRelativeRatedAt(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / 86_400_000);

  if (days <= 0) {
    return "Today";
  }

  if (days === 1) {
    return "Yesterday";
  }

  if (days < 7) {
    return `${days} days ago`;
  }

  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
  }

  const months = Math.floor(days / 30);
  return months === 1 ? "1 month ago" : `${months} months ago`;
}

function buildEventRow(input: {
  recommendation: Recommendation;
  viewerUserId: string;
  friendUserId: string;
  eventType: CalibrationEventType;
  actualRating: number;
  notes: string | null;
  isFavorite: boolean;
  recAccuracy: number;
  trustBefore: number | null;
  trustAfter: number;
  trustDeltaPercent: number;
  ratedAt: string;
}) {
  return {
    recommendation_id: input.recommendation.id,
    viewer_user_id: input.viewerUserId,
    friend_user_id: input.friendUserId,
    event_type: input.eventType,
    tmdb_id: input.recommendation.tmdb_id,
    media_type: input.recommendation.media_type,
    estimated_rating: input.recommendation.estimated_rating,
    actual_rating: input.actualRating,
    rec_accuracy: input.recAccuracy,
    trust_before: input.trustBefore,
    trust_after: input.trustAfter,
    trust_delta_percent: input.trustDeltaPercent,
    reason: input.recommendation.reason,
    notes: input.eventType === "received" ? input.notes : null,
    is_favorite: input.isFavorite,
    rated_at: input.ratedAt
  };
}

export async function insertCalibrationEvents(input: {
  recommendation: Recommendation;
  actualRating: number;
  notes: string | null;
  isFavorite: boolean;
  recipientId: string;
  senderId: string;
  trustBefore: number | null;
  trustAfter: number;
  ratedAt?: string;
}): Promise<CalibrationRatingSummary | null> {
  const ratedAt = input.ratedAt ?? new Date().toISOString();
  const estimated = input.recommendation.estimated_rating;
  const recAccuracy =
    estimated != null ? predictionAccuracy(Number(estimated), input.actualRating) : 0;

  const beforePct =
    input.trustBefore != null ? trustScoreToPercent(input.trustBefore, 1) : null;
  const afterPct = trustScoreToPercent(input.trustAfter, 1);
  const trustDeltaPercent =
    input.trustBefore != null
      ? Math.round(trustPercentDelta(input.trustBefore, input.trustAfter))
      : Math.round(afterPct);

  const rows = [
    buildEventRow({
      recommendation: input.recommendation,
      viewerUserId: input.recipientId,
      friendUserId: input.senderId,
      eventType: "received",
      actualRating: input.actualRating,
      notes: input.notes,
      isFavorite: input.isFavorite,
      recAccuracy,
      trustBefore: input.trustBefore,
      trustAfter: input.trustAfter,
      trustDeltaPercent,
      ratedAt
    }),
    buildEventRow({
      recommendation: input.recommendation,
      viewerUserId: input.senderId,
      friendUserId: input.recipientId,
      eventType: "sent_response",
      actualRating: input.actualRating,
      notes: input.notes,
      isFavorite: input.isFavorite,
      recAccuracy,
      trustBefore: input.trustBefore,
      trustAfter: input.trustAfter,
      trustDeltaPercent,
      ratedAt
    })
  ];

  const { error } = await supabase.from("calibration_events").insert(rows);

  if (error) {
    if (isMissingTable(error)) {
      return null;
    }
    throw error;
  }

  const { data: friendProfile } = await supabase
    .from("users")
    .select("*")
    .eq("id", input.senderId)
    .maybeSingle();

  const trust = formatTrustDelta({
    trustBefore: input.trustBefore,
    trustAfter: input.trustAfter,
    trustDeltaPercent
  });

  return {
    recAccuracyLabel: estimated != null ? formatRecAccuracy(recAccuracy) : null,
    trustBeforeLabel: trust.beforeLabel,
    trustAfterLabel: trust.afterLabel,
    trustDeltaLabel: trust.deltaLabel,
    trustDeltaTone: trust.deltaTone,
    friendUsername: (friendProfile as UserProfile | null)?.username ?? "friend"
  };
}

async function hydrateCalibrationEvents(events: DbCalibrationEvent[]): Promise<CalibrationEvent[]> {
  if (events.length === 0) {
    return [];
  }

  const friendIds = [...new Set(events.map((event) => event.friend_user_id))];
  const { data: users, error: usersError } = await supabase.from("users").select("*").in("id", friendIds);

  if (usersError) {
    throw usersError;
  }

  const usersById = new Map((users ?? []).map((user: UserProfile) => [user.id, user]));

  return Promise.all(
    events.map(async (event) => ({
      ...event,
      estimated_rating: event.estimated_rating != null ? Number(event.estimated_rating) : null,
      actual_rating: Number(event.actual_rating),
      rec_accuracy: Number(event.rec_accuracy),
      trust_before: event.trust_before != null ? Number(event.trust_before) : null,
      trust_after: Number(event.trust_after),
      trust_delta_percent: Number(event.trust_delta_percent),
      friend: usersById.get(event.friend_user_id),
      tmdb: await getTmdbTitle(event.tmdb_id, event.media_type)
    }))
  );
}

export async function getCalibrationFeed(
  userId: string,
  options?: { limit?: number; offset?: number }
): Promise<CalibrationEvent[]> {
  const limit = options?.limit ?? 100;
  const offset = options?.offset ?? 0;

  const { data, error } = await supabase
    .from("calibration_events")
    .select("*")
    .eq("viewer_user_id", userId)
    .order("rated_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    if (isMissingTable(error)) {
      return [];
    }
    throw error;
  }

  return hydrateCalibrationEvents((data ?? []) as DbCalibrationEvent[]);
}

export function buildCalibrationAlertMessage(input: {
  comparison: ReturnType<typeof import("./ratings").formatComparison>;
  summary: CalibrationRatingSummary | null;
  hadEstimate?: boolean;
}) {
  const lines: string[] = [];

  if (input.comparison) {
    lines.push(`Estimate: ${input.comparison.estimated.toFixed(1)} ★`);
    lines.push(`Your rating: ${input.comparison.actual.toFixed(1)} ★`);
    lines.push(input.comparison.diffText);
  }

  if (input.summary?.recAccuracyLabel) {
    lines.push(`This rec: ${input.summary.recAccuracyLabel}`);
  }

  if (input.summary) {
    if (input.summary.trustBeforeLabel) {
      lines.push(
        `Your trust in @${input.summary.friendUsername}: ${input.summary.trustBeforeLabel} → ${input.summary.trustAfterLabel} (${input.summary.trustDeltaLabel})`
      );
    } else {
      lines.push(
        `Your trust in @${input.summary.friendUsername}: ${input.summary.trustDeltaLabel}`
      );
    }
  } else if (input.hadEstimate) {
    lines.push("Trust updated, but Journal events need calibration-events.sql in Supabase.");
  } else if (input.hadEstimate === false) {
    lines.push("No star estimate on this rec — friend trust was not updated.");
  }

  return lines.join("\n");
}
