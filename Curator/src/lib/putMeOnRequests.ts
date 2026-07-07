import AsyncStorage from "@react-native-async-storage/async-storage";
import type { MediaType, TmdbSearchResult, UserProfile } from "../types";
import { supabase } from "./supabase";
import { getTmdbTitle } from "./tmdb";

export const PUT_ME_ON_GENRES = [
  "Horror",
  "Comedy",
  "Drama",
  "Sci-Fi",
  "Romance",
  "Thriller",
  "Documentary",
  "Animation",
  "Action",
  "Indie"
] as const;

export type PutMeOnGenre = (typeof PUT_ME_ON_GENRES)[number];
export type PutMeOnAudience = "all_friends" | "selected";

export type CreatePutMeOnRequestInput = {
  prompt: string;
  audience: PutMeOnAudience;
  friendIds: string[];
  genres: string[];
  exampleFilms: TmdbSearchResult[];
};

export const MAX_PUT_ME_ON_EXAMPLE_FILMS = 3;
export const MAX_USER_PUT_ME_ON_REQUESTS = 2;
export const PUT_ME_ON_REQUEST_DAYS = 7;
const STORAGE_KEY = "curator.putMeOnRequests.v1";

export type PutMeOnResponse = {
  id: string;
  tmdb_id: number;
  media_type: MediaType;
  from_user_id: string;
  created_at: string;
  tmdb?: TmdbSearchResult;
};

export type StoredPutMeOnRequest = {
  id: string;
  owner_id: string;
  prompt: string;
  created_at: string;
  expires_at: string;
  responses: PutMeOnResponse[];
  audience?: PutMeOnAudience;
  friend_ids?: string[];
  genres?: string[];
  example_films?: TmdbSearchResult[];
};

function requestStorageKey(userId: string) {
  return `${STORAGE_KEY}:${userId}`;
}

function daysLeft(expiresAt: string) {
  const ms = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

function uniqueRecommenderCount(responses: PutMeOnResponse[]) {
  return new Set(responses.map((response) => response.from_user_id)).size;
}

function visiblePosters(responses: PutMeOnResponse[]) {
  const posters = responses.map((response) => response.tmdb).filter((item): item is TmdbSearchResult => Boolean(item));
  const preview = posters.slice(0, 3);
  const extraCount = Math.max(0, posters.length - preview.length);
  return { preview, extraCount };
}

export type ActivePutMeOnRequest = {
  id: string;
  prompt: string;
  responseCount: number;
  daysLeft: number;
  hiddenPosters: TmdbSearchResult[];
  extraCount: number;
  genres: string[];
  audienceLabel: string;
  exampleFilms: TmdbSearchResult[];
};

export type PutMeOnRequest = {
  id: string;
  user: UserProfile;
  prompt: string;
  responseCount: number;
  hiddenPosters: TmdbSearchResult[];
  extraCount: number;
  isMock?: boolean;
  genres: string[];
  audienceLabel: string;
  exampleFilms: TmdbSearchResult[];
};

type NormalizedPutMeOnRequest = StoredPutMeOnRequest & {
  audience: PutMeOnAudience;
  friend_ids: string[];
  genres: string[];
  example_films: TmdbSearchResult[];
};

function normalizeRequest(request: StoredPutMeOnRequest): NormalizedPutMeOnRequest {
  return {
    ...request,
    audience: request.audience ?? "all_friends",
    friend_ids: request.friend_ids ?? [],
    genres: request.genres ?? [],
    example_films: request.example_films ?? []
  };
}

function audienceLabelFor(request: StoredPutMeOnRequest) {
  const normalized = normalizeRequest(request);
  if (normalized.audience === "all_friends") {
    return "All friends";
  }

  const count = normalized.friend_ids.length;
  if (count === 0) {
    return "Selected friends";
  }

  if (count === 1) {
    return "1 friend";
  }

  return `${count} friends`;
}

export function isPutMeOnRequestVisibleToViewer(
  request: StoredPutMeOnRequest,
  viewerId: string
) {
  const normalized = normalizeRequest(request);
  if (normalized.audience === "all_friends") {
    return true;
  }

  return normalized.friend_ids.includes(viewerId);
}

export function toActivePutMeOnRequest(request: StoredPutMeOnRequest): ActivePutMeOnRequest {
  const normalized = normalizeRequest(request);
  const { preview, extraCount } = visiblePosters(normalized.responses);
  return {
    id: normalized.id,
    prompt: normalized.prompt,
    responseCount: uniqueRecommenderCount(normalized.responses),
    daysLeft: daysLeft(normalized.expires_at),
    hiddenPosters: preview,
    extraCount,
    genres: normalized.genres,
    audienceLabel: audienceLabelFor(normalized),
    exampleFilms: normalized.example_films
  };
}

export function toPutMeOnRequest(
  request: StoredPutMeOnRequest,
  user: UserProfile,
  options?: { isMock?: boolean }
): PutMeOnRequest {
  const normalized = normalizeRequest(request);
  const { preview, extraCount } = visiblePosters(normalized.responses);
  return {
    id: normalized.id,
    user,
    prompt: normalized.prompt,
    responseCount: uniqueRecommenderCount(normalized.responses),
    hiddenPosters: preview,
    extraCount,
    isMock: options?.isMock,
    genres: normalized.genres,
    audienceLabel: audienceLabelFor(normalized),
    exampleFilms: normalized.example_films
  };
}

type DbPutMeOnResponse = {
  id: string;
  request_id: string;
  from_user_id: string;
  tmdb_id: number;
  media_type: MediaType;
  created_at: string;
};

type DbPutMeOnRequest = {
  id: string;
  owner_id: string;
  prompt: string;
  audience: PutMeOnAudience;
  friend_ids: string[];
  genres: string[];
  example_films: TmdbSearchResult[];
  created_at: string;
  expires_at: string;
  put_me_on_responses?: DbPutMeOnResponse[];
};

function isMockUserId(userId: string) {
  return userId.startsWith("mock-");
}

function isMissingTable(error: { message: string }, table: string) {
  const message = error.message.toLowerCase();
  const tableName = table.toLowerCase();
  return (
    message.includes(tableName) &&
    (message.includes("does not exist") || message.includes("could not find"))
  );
}

function setupError() {
  return "Run supabase/put-me-on.sql in Supabase SQL Editor to enable Put Me On requests.";
}

function mapDbRequest(row: DbPutMeOnRequest): StoredPutMeOnRequest {
  return {
    id: row.id,
    owner_id: row.owner_id,
    prompt: row.prompt,
    created_at: row.created_at,
    expires_at: row.expires_at,
    audience: row.audience,
    friend_ids: row.friend_ids ?? [],
    genres: row.genres ?? [],
    example_films: row.example_films ?? [],
    responses: (row.put_me_on_responses ?? []).map((response) => ({
      id: response.id,
      tmdb_id: response.tmdb_id,
      media_type: response.media_type,
      from_user_id: response.from_user_id,
      created_at: response.created_at
    }))
  };
}

async function readUserRequests(userId: string): Promise<StoredPutMeOnRequest[]> {
  const raw = await AsyncStorage.getItem(requestStorageKey(userId));
  if (!raw) {
    return [];
  }

  try {
    return JSON.parse(raw) as StoredPutMeOnRequest[];
  } catch {
    return [];
  }
}

async function writeUserRequests(userId: string, requests: StoredPutMeOnRequest[]) {
  await AsyncStorage.setItem(requestStorageKey(userId), JSON.stringify(requests));
}

async function hydrateResponses(request: StoredPutMeOnRequest): Promise<StoredPutMeOnRequest> {
  const responses = await Promise.all(
    request.responses.map(async (response) => ({
      ...response,
      tmdb: response.tmdb ?? (await getTmdbTitle(response.tmdb_id, response.media_type))
    }))
  );

  return { ...request, responses, example_films: request.example_films ?? [] };
}

async function hydrateRequests(requests: StoredPutMeOnRequest[]) {
  return Promise.all(requests.map(hydrateResponses));
}

function isActive(request: StoredPutMeOnRequest) {
  return new Date(request.expires_at).getTime() > Date.now();
}

async function fetchSupabaseRequestsForOwner(ownerId: string): Promise<StoredPutMeOnRequest[]> {
  const { data, error } = await supabase
    .from("put_me_on_requests")
    .select("*, put_me_on_responses(*)")
    .eq("owner_id", ownerId)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingTable(error, "put_me_on_requests")) {
      return [];
    }
    throw error;
  }

  return (data ?? []).map((row) => mapDbRequest(row as DbPutMeOnRequest));
}

export async function isPutMeOnBackendReady(): Promise<boolean> {
  const { error } = await supabase.from("put_me_on_requests").select("id").limit(1);
  if (error) {
    if (isMissingTable(error, "put_me_on_requests")) {
      return false;
    }
    throw error;
  }

  return true;
}

export async function fetchVisibleOpenPutMeOnRequests(
  currentUserId: string
): Promise<StoredPutMeOnRequest[]> {
  const { data, error } = await supabase
    .from("put_me_on_requests")
    .select("*, put_me_on_responses(*)")
    .neq("owner_id", currentUserId)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingTable(error, "put_me_on_requests")) {
      return [];
    }
    throw error;
  }

  return hydrateRequests((data ?? []).map((row) => mapDbRequest(row as DbPutMeOnRequest)));
}

export async function getUserPutMeOnRequests(userId: string): Promise<StoredPutMeOnRequest[]> {
  const requests = isMockUserId(userId)
    ? (await readUserRequests(userId)).filter(isActive)
    : await fetchSupabaseRequestsForOwner(userId);

  return hydrateRequests(requests);
}

export async function createPutMeOnRequest(
  userId: string,
  input: CreatePutMeOnRequestInput
): Promise<StoredPutMeOnRequest> {
  const trimmed = input.prompt.trim();
  if (!trimmed) {
    throw new Error("Write what you're looking for before posting.");
  }

  if (input.audience === "selected" && input.friendIds.length === 0) {
    throw new Error("Select at least one friend, or choose All friends.");
  }

  const now = new Date();
  const expires = new Date(now);
  expires.setDate(expires.getDate() + PUT_ME_ON_REQUEST_DAYS);

  if (isMockUserId(userId)) {
    const existing = (await readUserRequests(userId)).filter(isActive);
    if (existing.length >= MAX_USER_PUT_ME_ON_REQUESTS) {
      throw new Error(`You can only have ${MAX_USER_PUT_ME_ON_REQUESTS} active requests at a time.`);
    }

    const created: StoredPutMeOnRequest = {
      id: `req-${userId}-${now.getTime()}`,
      owner_id: userId,
      prompt: trimmed,
      created_at: now.toISOString(),
      expires_at: expires.toISOString(),
      responses: [],
      audience: input.audience,
      friend_ids: input.audience === "selected" ? input.friendIds : [],
      genres: input.genres,
      example_films: input.exampleFilms.slice(0, MAX_PUT_ME_ON_EXAMPLE_FILMS)
    };

    await writeUserRequests(userId, [...existing, created]);
    return created;
  }

  const active = await fetchSupabaseRequestsForOwner(userId);
  if (active.length >= MAX_USER_PUT_ME_ON_REQUESTS) {
    throw new Error(`You can only have ${MAX_USER_PUT_ME_ON_REQUESTS} active requests at a time.`);
  }

  const { data, error } = await supabase
    .from("put_me_on_requests")
    .insert({
      owner_id: userId,
      prompt: trimmed,
      audience: input.audience,
      friend_ids: input.audience === "selected" ? input.friendIds : [],
      genres: input.genres,
      example_films: input.exampleFilms.slice(0, MAX_PUT_ME_ON_EXAMPLE_FILMS),
      expires_at: expires.toISOString()
    })
    .select("*, put_me_on_responses(*)")
    .single();

  if (error) {
    if (isMissingTable(error, "put_me_on_requests")) {
      throw new Error(setupError());
    }
    throw error;
  }

  return mapDbRequest(data as DbPutMeOnRequest);
}

export async function deletePutMeOnRequest(userId: string, requestId: string) {
  if (isMockUserId(userId)) {
    const existing = await readUserRequests(userId);
    const next = existing.filter((request) => request.id !== requestId);
    await writeUserRequests(userId, next);
    return;
  }

  const { error } = await supabase
    .from("put_me_on_requests")
    .delete()
    .eq("id", requestId)
    .eq("owner_id", userId);

  if (error) {
    if (isMissingTable(error, "put_me_on_requests")) {
      throw new Error(setupError());
    }
    throw error;
  }
}

export async function addPutMeOnResponse(
  requestOwnerId: string,
  requestId: string,
  fromUserId: string,
  tmdb: TmdbSearchResult
) {
  if (isMockUserId(requestOwnerId)) {
    const existing = await readUserRequests(requestOwnerId);
    const index = existing.findIndex((request) => request.id === requestId);
    if (index < 0) {
      return;
    }

    const request = existing[index];
    const response: PutMeOnResponse = {
      id: `resp-${Date.now()}`,
      tmdb_id: tmdb.id,
      media_type: tmdb.media_type,
      from_user_id: fromUserId,
      created_at: new Date().toISOString(),
      tmdb
    };

    existing[index] = {
      ...request,
      responses: [response, ...request.responses]
    };

    await writeUserRequests(requestOwnerId, existing);
    return;
  }

  const { error } = await supabase.from("put_me_on_responses").insert({
    request_id: requestId,
    from_user_id: fromUserId,
    tmdb_id: tmdb.id,
    media_type: tmdb.media_type
  });

  if (error) {
    if (isMissingTable(error, "put_me_on_responses")) {
      throw new Error(setupError());
    }
    throw error;
  }
}

export async function seedMockPutMeOnRequests(
  ownerId: string,
  prompt: string,
  seedPosters: TmdbSearchResult[],
  recommenderIds: string[],
  options?: { genres?: string[]; exampleFilms?: TmdbSearchResult[] }
): Promise<void> {
  const existing = await readUserRequests(ownerId);
  if (existing.length > 0) {
    return;
  }

  const now = new Date();
  const expires = new Date(now);
  expires.setDate(expires.getDate() + PUT_ME_ON_REQUEST_DAYS);

  const responses: PutMeOnResponse[] = seedPosters.map((tmdb, index) => ({
    id: `seed-${ownerId}-${index}`,
    tmdb_id: tmdb.id,
    media_type: tmdb.media_type,
    from_user_id: recommenderIds[index % recommenderIds.length] ?? "mock-seed",
    created_at: now.toISOString(),
    tmdb
  }));

  const seeded: StoredPutMeOnRequest = {
    id: `seed-req-${ownerId}`,
    owner_id: ownerId,
    prompt,
    created_at: now.toISOString(),
    expires_at: expires.toISOString(),
    responses,
    audience: "all_friends",
    friend_ids: [],
    genres: options?.genres ?? [],
    example_films: options?.exampleFilms ?? []
  };

  await writeUserRequests(ownerId, [seeded]);
}

export async function findPutMeOnRequest(
  ownerId: string,
  requestId: string
): Promise<StoredPutMeOnRequest | null> {
  if (isMockUserId(ownerId)) {
    const requests = await readUserRequests(ownerId);
    const match = requests.find((request) => request.id === requestId);
    return match ? hydrateResponses(match) : null;
  }

  const { data, error } = await supabase
    .from("put_me_on_requests")
    .select("*, put_me_on_responses(*)")
    .eq("id", requestId)
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (error) {
    if (isMissingTable(error, "put_me_on_requests")) {
      return null;
    }
    throw error;
  }

  if (!data) {
    return null;
  }

  return hydrateResponses(mapDbRequest(data as DbPutMeOnRequest));
}
