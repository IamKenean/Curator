import { getTmdbTitle } from "./tmdb";
import { supabase } from "./supabase";
import type { MediaType, TmdbSearchResult, UserProfile } from "../types";

export const REC_OF_WEEK_MAX_CANDIDATES = 10;
export const REC_OF_WEEK_PREVIEW_COUNT = 5;

type StoredSubmission = {
  id: string;
  user_id: string;
  tmdb_id: number;
  media_type: MediaType;
  pitch: string | null;
  week_start: string;
  created_at: string;
};

export type RecOfWeekEntry = {
  submissionId: string;
  rank: number;
  voteCount: number;
  user: UserProfile;
  tmdb: TmdbSearchResult;
  pitch: string | null;
  createdAt: string;
  isOwnSubmission: boolean;
};

export type RecOfWeekBoard = {
  weekStart: string;
  endsAt: Date;
  countdownLabel: string;
  entries: RecOfWeekEntry[];
  totalCandidates: number;
  userVoteSubmissionId: string | null;
  userSubmissionId: string | null;
  canSubmit: boolean;
  canChangePick: boolean;
  submissionsEnabled: boolean;
  votingEnabled: boolean;
};

export type WeekBounds = {
  weekStart: Date;
  weekEnd: Date;
  weekStartKey: string;
};

export function getCurrentWeekBounds(now = new Date()): WeekBounds {
  const local = new Date(now);
  local.setHours(0, 0, 0, 0);
  const day = local.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const weekStart = new Date(local);
  weekStart.setDate(local.getDate() + mondayOffset);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  return {
    weekStart,
    weekEnd,
    weekStartKey: weekStart.toISOString().slice(0, 10)
  };
}

export function formatRecOfWeekCountdown(endsAt: Date, now = new Date()): string {
  const ms = endsAt.getTime() - now.getTime();
  if (ms <= 0) {
    return "Ending soon";
  }

  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function isMissingTable(error: { message: string }, table: string) {
  const message = error.message.toLowerCase();
  const tableName = table.toLowerCase();
  return (
    message.includes(tableName) &&
    (message.includes("does not exist") || message.includes("could not find"))
  );
}

function setupError(table: string) {
  return `Run supabase/rec-of-week.sql in Supabase SQL Editor to enable Rec of the Week (${table}).`;
}

async function hydrateSubmitters(submissions: StoredSubmission[]): Promise<Map<string, UserProfile>> {
  const ids = [...new Set(submissions.map((row) => row.user_id))];
  if (ids.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase.from("users").select("*").in("id", ids);
  if (error) {
    throw error;
  }

  return new Map((data ?? []).map((user: UserProfile) => [user.id, user]));
}

export async function getRecOfWeekBoard(currentUserId: string, friendIds: string[]): Promise<RecOfWeekBoard> {
  const { weekEnd, weekStartKey } = getCurrentWeekBounds();
  const networkIds = [currentUserId, ...friendIds];

  let submissions: StoredSubmission[] = [];
  let submissionsEnabled = true;

  const { data, error } = await supabase
    .from("rec_of_week_submissions")
    .select("*")
    .eq("week_start", weekStartKey)
    .in("user_id", networkIds)
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingTable(error, "rec_of_week_submissions")) {
      submissionsEnabled = false;
    } else {
      throw error;
    }
  } else {
    submissions = (data ?? []) as StoredSubmission[];
  }

  const userSubmission = submissions.find((row) => row.user_id === currentUserId) ?? null;
  const submissionIds = submissions.map((row) => row.id);

  let votesBySubmission = new Map<string, number>();
  let userVoteSubmissionId: string | null = null;
  let votingEnabled = submissionsEnabled;

  if (submissionIds.length > 0 && submissionsEnabled) {
    const { data: votes, error: votesError } = await supabase
      .from("rec_of_week_votes")
      .select("submission_id, voter_id")
      .eq("week_start", weekStartKey)
      .in("submission_id", submissionIds);

    if (votesError) {
      if (isMissingTable(votesError, "rec_of_week_votes")) {
        votingEnabled = false;
      } else {
        throw votesError;
      }
    } else {
      for (const vote of votes ?? []) {
        votesBySubmission.set(vote.submission_id, (votesBySubmission.get(vote.submission_id) ?? 0) + 1);
        if (vote.voter_id === currentUserId) {
          userVoteSubmissionId = vote.submission_id;
        }
      }
    }
  }

  const usersById = await hydrateSubmitters(submissions);

  const ranked = submissions
    .map((row) => ({
      row,
      voteCount: votesBySubmission.get(row.id) ?? 0
    }))
    .sort((a, b) => {
      if (b.voteCount !== a.voteCount) {
        return b.voteCount - a.voteCount;
      }
      return new Date(b.row.created_at).getTime() - new Date(a.row.created_at).getTime();
    })
    .slice(0, REC_OF_WEEK_MAX_CANDIDATES);

  const entries: RecOfWeekEntry[] = await Promise.all(
    ranked.map(async ({ row, voteCount }, index) => ({
      submissionId: row.id,
      rank: index + 1,
      voteCount,
      user: usersById.get(row.user_id)!,
      tmdb: await getTmdbTitle(row.tmdb_id, row.media_type),
      pitch: row.pitch,
      createdAt: row.created_at,
      isOwnSubmission: row.user_id === currentUserId
    }))
  );

  const boardFull = submissions.length >= REC_OF_WEEK_MAX_CANDIDATES;

  return {
    weekStart: weekStartKey,
    endsAt: weekEnd,
    countdownLabel: formatRecOfWeekCountdown(weekEnd),
    entries,
    totalCandidates: Math.min(submissions.length, REC_OF_WEEK_MAX_CANDIDATES),
    userVoteSubmissionId,
    userSubmissionId: userSubmission?.id ?? null,
    canSubmit: submissionsEnabled && !userSubmission && !boardFull,
    canChangePick: submissionsEnabled && Boolean(userSubmission),
    submissionsEnabled,
    votingEnabled
  };
}

export async function submitRecOfWeekPick(input: {
  userId: string;
  friendIds: string[];
  tmdbId: number;
  mediaType: MediaType;
  pitch?: string | null;
  weekStart: string;
}): Promise<void> {
  const pitch = input.pitch?.trim().slice(0, 150) ?? null;
  const networkIds = [input.userId, ...input.friendIds];

  const { data: existing, error: existingError } = await supabase
    .from("rec_of_week_submissions")
    .select("id")
    .eq("user_id", input.userId)
    .eq("week_start", input.weekStart)
    .maybeSingle();

  if (existingError) {
    if (isMissingTable(existingError, "rec_of_week_submissions")) {
      throw new Error(setupError("submissions"));
    }
    throw existingError;
  }

  if (existing) {
    const { error } = await supabase
      .from("rec_of_week_submissions")
      .update({
        tmdb_id: input.tmdbId,
        media_type: input.mediaType,
        pitch
      })
      .eq("id", existing.id);

    if (error) {
      throw error;
    }
    return;
  }

  const { count, error: countError } = await supabase
    .from("rec_of_week_submissions")
    .select("id", { count: "exact", head: true })
    .eq("week_start", input.weekStart)
    .in("user_id", networkIds);

  if (countError) {
    throw countError;
  }

  if ((count ?? 0) >= REC_OF_WEEK_MAX_CANDIDATES) {
    throw new Error("This week's board is full. Check back next week.");
  }

  const { error } = await supabase.from("rec_of_week_submissions").insert({
    user_id: input.userId,
    tmdb_id: input.tmdbId,
    media_type: input.mediaType,
    pitch,
    week_start: input.weekStart
  });

  if (error) {
    if (isMissingTable(error, "rec_of_week_submissions")) {
      throw new Error(setupError("submissions"));
    }
    throw error;
  }
}

export async function voteRecOfWeek(
  currentUserId: string,
  submissionId: string,
  weekStart: string
): Promise<void> {
  const { data: existing, error: existingError } = await supabase
    .from("rec_of_week_votes")
    .select("id")
    .eq("voter_id", currentUserId)
    .eq("week_start", weekStart)
    .maybeSingle();

  if (existingError) {
    if (isMissingTable(existingError, "rec_of_week_votes")) {
      throw new Error(setupError("votes"));
    }
    throw existingError;
  }

  if (existing) {
    const { error } = await supabase
      .from("rec_of_week_votes")
      .update({ submission_id: submissionId })
      .eq("id", existing.id);

    if (error) {
      throw error;
    }
    return;
  }

  const { error } = await supabase.from("rec_of_week_votes").insert({
    voter_id: currentUserId,
    submission_id: submissionId,
    week_start: weekStart
  });

  if (error) {
    if (isMissingTable(error, "rec_of_week_votes")) {
      throw new Error(setupError("votes"));
    }
    throw error;
  }
}
