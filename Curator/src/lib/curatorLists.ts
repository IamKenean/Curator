import AsyncStorage from "@react-native-async-storage/async-storage";
import type { TmdbSearchResult, UserProfile } from "../types";
import { getTmdbTitle } from "./tmdb";
import { supabase } from "./supabase";

export const LIST_TAG_SUGGESTIONS = [
  "Horror",
  "Comedy",
  "Drama",
  "Sci-Fi",
  "Romance",
  "Thriller",
  "Documentary",
  "Animation",
  "Action",
  "Indie",
  "Favorites",
  "Watchlist",
  "Rewatches"
] as const;

export type ListVisibility = "public" | "friends";

export type CreateCuratorListInput = {
  name: string;
  description: string;
  entries: TmdbSearchResult[];
  visibility: ListVisibility;
  tags: string[];
};

export type StoredCuratorList = {
  id: string;
  owner_id: string;
  name: string;
  description: string;
  entries: TmdbSearchResult[];
  visibility: ListVisibility;
  tags: string[];
  created_at: string;
  updated_at: string;
};

export type CuratorList = StoredCuratorList & {
  owner?: UserProfile;
  entry_count: number;
};

const STORAGE_KEY = "curator.lists.v1";

type DbCuratorList = {
  id: string;
  owner_id: string;
  name: string;
  description: string;
  entries: TmdbSearchResult[];
  visibility: ListVisibility;
  tags: string[];
  created_at: string;
  updated_at: string;
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
  return "Run supabase/lists.sql in Supabase SQL Editor to enable shared lists.";
}

function mapDbList(row: DbCuratorList): StoredCuratorList {
  return {
    id: row.id,
    owner_id: row.owner_id,
    name: row.name,
    description: row.description ?? "",
    entries: row.entries ?? [],
    visibility: row.visibility,
    tags: row.tags ?? [],
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

function validateListInput(input: CreateCuratorListInput) {
  const name = input.name.trim();
  const description = input.description.trim();

  if (!name) {
    throw new Error("Give your list a name before saving.");
  }

  if (input.entries.length === 0) {
    throw new Error("Add at least one title to your list.");
  }

  return {
    name,
    description,
    entries: input.entries,
    visibility: input.visibility,
    tags: input.tags.map((tag) => tag.trim()).filter(Boolean)
  };
}

async function readAllLists(): Promise<StoredCuratorList[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    return JSON.parse(raw) as StoredCuratorList[];
  } catch {
    return [];
  }
}

async function writeAllLists(lists: StoredCuratorList[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(lists));
}

export function isListVisibleToViewer(
  list: StoredCuratorList,
  viewerId: string,
  friendIds: Set<string>
) {
  if (list.owner_id === viewerId) {
    return true;
  }

  if (list.visibility === "public") {
    return true;
  }

  return friendIds.has(list.owner_id);
}

async function hydrateListOwners(lists: StoredCuratorList[]): Promise<Map<string, UserProfile>> {
  const ownerIds = [...new Set(lists.map((list) => list.owner_id))];
  if (ownerIds.length === 0) {
    return new Map();
  }

  const mockOwners = ownerIds.filter(isMockUserId);
  const realOwnerIds = ownerIds.filter((id) => !isMockUserId(id));
  const owners = new Map<string, UserProfile>();

  if (realOwnerIds.length > 0) {
    const { data, error } = await supabase.from("users").select("*").in("id", realOwnerIds);
    if (!error && data) {
      for (const user of data as UserProfile[]) {
        owners.set(user.id, user);
      }
    }
  }

  for (const ownerId of mockOwners) {
    owners.set(ownerId, {
      id: ownerId,
      username: ownerId.replace("mock-", ""),
      avatar_url: null,
      created_at: new Date().toISOString()
    });
  }

  return owners;
}

function toCuratorList(list: StoredCuratorList, owner?: UserProfile): CuratorList {
  return {
    ...list,
    owner,
    entry_count: list.entries.length
  };
}

export async function isListsBackendReady(): Promise<boolean> {
  const { error } = await supabase.from("curator_lists").select("id").limit(1);
  if (error) {
    if (isMissingTable(error, "curator_lists")) {
      return false;
    }
    throw error;
  }

  return true;
}

async function fetchSupabaseListsForOwner(ownerId: string): Promise<StoredCuratorList[]> {
  const { data, error } = await supabase
    .from("curator_lists")
    .select("*")
    .eq("owner_id", ownerId)
    .order("updated_at", { ascending: false });

  if (error) {
    if (isMissingTable(error, "curator_lists")) {
      return [];
    }
    throw error;
  }

  return (data ?? []).map((row) => mapDbList(row as DbCuratorList));
}

async function fetchSupabaseVisibleLists(): Promise<StoredCuratorList[]> {
  const { data, error } = await supabase
    .from("curator_lists")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    if (isMissingTable(error, "curator_lists")) {
      return [];
    }
    throw error;
  }

  return (data ?? []).map((row) => mapDbList(row as DbCuratorList));
}

async function fetchSupabaseListById(listId: string): Promise<StoredCuratorList | null> {
  const { data, error } = await supabase.from("curator_lists").select("*").eq("id", listId).maybeSingle();

  if (error) {
    if (isMissingTable(error, "curator_lists")) {
      return null;
    }
    throw error;
  }

  return data ? mapDbList(data as DbCuratorList) : null;
}

export async function getUserLists(userId: string): Promise<CuratorList[]> {
  const lists = isMockUserId(userId)
    ? (await readAllLists()).filter((list) => list.owner_id === userId)
    : await fetchSupabaseListsForOwner(userId);

  const owners = await hydrateListOwners(lists);
  return lists.map((list) => toCuratorList(list, owners.get(list.owner_id)));
}

export async function getListsFeed(viewerId: string, friendIds: string[]): Promise<CuratorList[]> {
  const friendSet = new Set(friendIds);
  const lists = isMockUserId(viewerId)
    ? (await readAllLists()).filter((list) => isListVisibleToViewer(list, viewerId, friendSet))
    : await fetchSupabaseVisibleLists();

  const owners = await hydrateListOwners(lists);
  return lists.map((list) => toCuratorList(list, owners.get(list.owner_id)));
}

export async function createCuratorList(
  userId: string,
  input: CreateCuratorListInput
): Promise<StoredCuratorList> {
  const payload = validateListInput(input);
  const now = new Date().toISOString();

  if (isMockUserId(userId)) {
    const created: StoredCuratorList = {
      id: `list-${userId}-${Date.now()}`,
      owner_id: userId,
      name: payload.name,
      description: payload.description,
      entries: payload.entries,
      visibility: payload.visibility,
      tags: payload.tags,
      created_at: now,
      updated_at: now
    };

    const existing = await readAllLists();
    await writeAllLists([created, ...existing]);
    return created;
  }

  const { data, error } = await supabase
    .from("curator_lists")
    .insert({
      owner_id: userId,
      name: payload.name,
      description: payload.description,
      entries: payload.entries,
      visibility: payload.visibility,
      tags: payload.tags
    })
    .select("*")
    .single();

  if (error) {
    if (isMissingTable(error, "curator_lists")) {
      throw new Error(setupError());
    }
    throw error;
  }

  return mapDbList(data as DbCuratorList);
}

export async function updateCuratorList(
  userId: string,
  listId: string,
  input: CreateCuratorListInput
): Promise<StoredCuratorList> {
  const payload = validateListInput(input);
  const now = new Date().toISOString();

  if (isMockUserId(userId)) {
    const existing = await readAllLists();
    const index = existing.findIndex((list) => list.id === listId && list.owner_id === userId);
    if (index < 0) {
      throw new Error("List not found.");
    }

    const updated: StoredCuratorList = {
      ...existing[index],
      name: payload.name,
      description: payload.description,
      entries: payload.entries,
      visibility: payload.visibility,
      tags: payload.tags,
      updated_at: now
    };

    const next = [...existing];
    next[index] = updated;
    await writeAllLists(next);
    return updated;
  }

  const { data, error } = await supabase
    .from("curator_lists")
    .update({
      name: payload.name,
      description: payload.description,
      entries: payload.entries,
      visibility: payload.visibility,
      tags: payload.tags,
      updated_at: now
    })
    .eq("id", listId)
    .eq("owner_id", userId)
    .select("*")
    .single();

  if (error) {
    if (isMissingTable(error, "curator_lists")) {
      throw new Error(setupError());
    }
    throw error;
  }

  return mapDbList(data as DbCuratorList);
}

export async function setListVisibility(
  userId: string,
  listId: string,
  visibility: ListVisibility
): Promise<StoredCuratorList> {
  const list = await getListById(listId, userId);
  if (!list || list.owner_id !== userId) {
    throw new Error("List not found.");
  }

  return updateCuratorList(userId, listId, {
    name: list.name,
    description: list.description,
    entries: list.entries,
    visibility,
    tags: list.tags
  });
}

export async function deleteCuratorList(userId: string, listId: string) {
  if (isMockUserId(userId)) {
    const existing = await readAllLists();
    await writeAllLists(existing.filter((list) => !(list.id === listId && list.owner_id === userId)));
    return;
  }

  const { error } = await supabase.from("curator_lists").delete().eq("id", listId).eq("owner_id", userId);

  if (error) {
    if (isMissingTable(error, "curator_lists")) {
      throw new Error(setupError());
    }
    throw error;
  }
}

export async function getListById(listId: string, viewerId?: string): Promise<StoredCuratorList | null> {
  if (viewerId && isMockUserId(viewerId)) {
    const lists = await readAllLists();
    return lists.find((list) => list.id === listId) ?? null;
  }

  return fetchSupabaseListById(listId);
}

export async function getCuratorListById(
  listId: string,
  viewerId: string,
  friendIds: string[] = []
): Promise<CuratorList | null> {
  const stored = await getListById(listId, viewerId);
  if (!stored) {
    return null;
  }

  const friendSet = new Set(friendIds);
  if (!isListVisibleToViewer(stored, viewerId, friendSet)) {
    return null;
  }

  const owners = await hydrateListOwners([stored]);
  const list = toCuratorList(stored, owners.get(stored.owner_id));
  return hydrateListEntries(list);
}

export async function hydrateListEntries(list: CuratorList): Promise<CuratorList> {
  const entries = await Promise.all(
    list.entries.map(async (entry) => {
      if (entry.title && entry.poster_path !== undefined) {
        return entry;
      }

      const hydrated = await getTmdbTitle(entry.id, entry.media_type);
      return hydrated ?? entry;
    })
  );

  return {
    ...list,
    entries
  };
}
