import { supabase } from "./supabase";
import type { Friendship, UserProfile } from "../types";

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase.from("users").select("*").eq("id", userId).maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function searchUsers(username: string, currentUserId: string): Promise<UserProfile[]> {
  const trimmed = username.trim();
  if (trimmed.length < 2) {
    return [];
  }

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .ilike("username", `%${trimmed}%`)
    .neq("id", currentUserId)
    .limit(20);

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function sendFriendRequest(currentUserId: string, friendId: string) {
  const { data: existing, error: existingError } = await supabase
    .from("friendships")
    .select("id, status, user_id")
    .or(
      `and(user_id.eq.${currentUserId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${currentUserId})`
    )
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existing) {
    if (existing.status === "accepted") {
      throw new Error("You are already friends with this user.");
    }

    throw new Error("A friend request is already pending.");
  }

  const { error } = await supabase.from("friendships").insert({
    user_id: currentUserId,
    friend_id: friendId,
    status: "pending"
  });

  if (error) {
    throw error;
  }
}

export async function getFriendships(currentUserId: string): Promise<Friendship[]> {
  const { data, error } = await supabase
    .from("friendships")
    .select("*")
    .or(`user_id.eq.${currentUserId},friend_id.eq.${currentUserId}`)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as Friendship[];
  const userIds = [...new Set(rows.flatMap((row) => [row.user_id, row.friend_id]))];
  const { data: users, error: usersError } = await supabase.from("users").select("*").in("id", userIds);

  if (usersError) {
    throw usersError;
  }

  const usersById = new Map((users ?? []).map((user) => [user.id, user]));

  return rows.map((row) => ({
    ...row,
    user: usersById.get(row.user_id),
    friend: usersById.get(row.friend_id)
  }));
}

export async function acceptFriendRequest(friendshipId: string) {
  const { error } = await supabase.from("friendships").update({ status: "accepted" }).eq("id", friendshipId);
  if (error) {
    throw error;
  }
}

export async function declineFriendRequest(friendshipId: string) {
  const { error } = await supabase.from("friendships").delete().eq("id", friendshipId);
  if (error) {
    throw error;
  }
}

export function getOtherUser(friendship: Friendship, currentUserId: string): UserProfile | undefined {
  return friendship.user_id === currentUserId ? friendship.friend : friendship.user;
}

export type FriendshipState = "none" | "accepted" | "pending_out" | "pending_in";

export function getFriendshipState(friendships: Friendship[], currentUserId: string, targetUserId: string): FriendshipState {
  for (const friendship of friendships) {
    const involves =
      (friendship.user_id === currentUserId && friendship.friend_id === targetUserId) ||
      (friendship.friend_id === currentUserId && friendship.user_id === targetUserId);

    if (!involves) {
      continue;
    }

    if (friendship.status === "accepted") {
      return "accepted";
    }

    return friendship.user_id === currentUserId ? "pending_out" : "pending_in";
  }

  return "none";
}
