import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { EmptyState } from "../../src/components/EmptyState";
import { Screen } from "../../src/components/Screen";
import { TextField } from "../../src/components/TextField";
import { UserAvatar } from "../../src/components/UserAvatar";
import { trustScoreToPercent } from "../../src/lib/ratings";
import { getLatestRecsFromFriends, getTrustScores, type LatestFriendRec } from "../../src/lib/recommendations";
import {
  acceptFriendRequest,
  declineFriendRequest,
  getFriendshipState,
  getFriendships,
  getOtherUser,
  searchUsers,
  sendFriendRequest
} from "../../src/lib/social";
import { useAuth } from "../../src/providers/AuthProvider";
import { colors, spacing } from "../../src/theme";
import type { Friendship, TrustScore, UserProfile } from "../../src/types";

function formatRecSubtitle(rec?: LatestFriendRec) {
  if (!rec) {
    return "No recs sent yet";
  }

  if (rec.reason?.trim()) {
    return rec.reason.trim();
  }

  if (rec.title) {
    return `Sent you ${rec.title}`;
  }

  return "Sent you something";
}

export default function FriendsScreen() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserProfile[]>([]);
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [trustScores, setTrustScores] = useState<TrustScore[]>([]);
  const [latestRecs, setLatestRecs] = useState<Map<string, LatestFriendRec>>(new Map());
  const [loading, setLoading] = useState(false);

  const trustByFriendId = useMemo(() => new Map(trustScores.map((score) => [score.friend_id, score])), [trustScores]);

  const incoming = useMemo(
    () => friendships.filter((friendship) => friendship.status === "pending" && friendship.friend_id === user?.id),
    [friendships, user?.id]
  );
  const accepted = useMemo(() => friendships.filter((friendship) => friendship.status === "accepted"), [friendships]);

  const load = useCallback(async () => {
    if (!user) {
      return;
    }
    try {
      const [loadedFriendships, loadedTrustScores, loadedLatestRecs] = await Promise.all([
        getFriendships(user.id),
        getTrustScores(user.id),
        getLatestRecsFromFriends(user.id)
      ]);
      setFriendships(loadedFriendships);
      setTrustScores(loadedTrustScores);
      setLatestRecs(loadedLatestRecs);
    } catch (error) {
      Alert.alert("Could not load friends", (error as Error).message);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  async function runSearch(text: string) {
    setQuery(text);
    if (!user || text.trim().length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      setResults(await searchUsers(text, user.id));
    } catch (error) {
      Alert.alert("Search failed", (error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function sendRequest(profile: UserProfile) {
    if (!user) {
      return;
    }
    try {
      await sendFriendRequest(user.id, profile.id);
      Alert.alert("Request sent", `Sent a friend request to ${profile.username}.`);
      await load();
    } catch (error) {
      Alert.alert("Could not send request", (error as Error).message);
    }
  }

  async function respond(friendship: Friendship, accept: boolean) {
    try {
      if (accept) {
        await acceptFriendRequest(friendship.id);
      } else {
        await declineFriendRequest(friendship.id);
      }
      await load();
    } catch (error) {
      Alert.alert("Could not update request", (error as Error).message);
    }
  }

  return (
    <Screen>
      <View style={styles.section}>
        <TextField placeholder="username" value={query} onChangeText={runSearch} autoCapitalize="none" />
        {loading ? <Text style={styles.muted}>Searching...</Text> : null}
        {results.map((profile) => {
          const state = user ? getFriendshipState(friendships, user.id, profile.id) : "none";
          const label = state === "accepted" ? "Added" : state === "pending_out" ? "Pending" : state === "pending_in" ? "Requested" : null;

          return (
            <View key={profile.id} style={styles.row}>
              <UserAvatar profile={profile} size={40} />
              <View style={styles.rowBody}>
                <Text style={styles.name}>@{profile.username}</Text>
              </View>
              {label ? (
                <Text style={styles.added}>{label}</Text>
              ) : (
                <Pressable onPress={() => sendRequest(profile)}>
                  <Text style={styles.action}>Add</Text>
                </Pressable>
              )}
            </View>
          );
        })}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.heading}>Friends</Text>
          {incoming.length > 0 ? (
            <Text style={styles.requestCount}>
              {incoming.length} request{incoming.length === 1 ? "" : "s"}
            </Text>
          ) : null}
        </View>

        {accepted.length === 0 && incoming.length === 0 ? (
          <EmptyState title="No friends yet" body="Search by username to send your first request." />
        ) : null}

        {incoming.map((friendship) => {
          const requester = friendship.user;
          return (
            <View key={friendship.id} style={styles.row}>
              <UserAvatar profile={requester} size={44} />
              <View style={styles.rowBody}>
                <Text style={styles.name}>@{requester?.username ?? "Unknown"}</Text>
                <View style={styles.requestActions}>
                  <Pressable onPress={() => respond(friendship, true)}>
                    <Text style={styles.requestActionAccept}>Accept</Text>
                  </Pressable>
                  <Text style={styles.requestDot}>·</Text>
                  <Pressable onPress={() => respond(friendship, false)}>
                    <Text style={styles.requestActionDecline}>Decline</Text>
                  </Pressable>
                </View>
              </View>
              <Text style={styles.requestBadge}>Request</Text>
            </View>
          );
        })}

        {accepted.map((friendship) => {
          const friend = user ? getOtherUser(friendship, user.id) : undefined;
          const trust = friend ? trustByFriendId.get(friend.id) : undefined;
          const latestRec = friend ? latestRecs.get(friend.id) : undefined;

          return (
            <View key={friendship.id} style={styles.row}>
              <UserAvatar profile={friend} size={44} />
              <View style={styles.rowBody}>
                <Text style={styles.name}>@{friend?.username ?? "Unknown"}</Text>
                <Text style={styles.subtitle} numberOfLines={2}>
                  {formatRecSubtitle(latestRec)}
                </Text>
              </View>
              {trust ? (
                <View style={styles.trustBadge}>
                  <Text style={styles.trustValue}>{trustScoreToPercent(trust.score)}%</Text>
                  <Text style={styles.trustLabel}>trust</Text>
                </View>
              ) : (
                <Text style={styles.noScore}>—</Text>
              )}
            </View>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  heading: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800"
  },
  requestCount: {
    color: colors.star,
    fontSize: 12,
    fontWeight: "700"
  },
  row: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2
  },
  rowBody: {
    flex: 1,
    gap: 2,
    minWidth: 0
  },
  name: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800"
  },
  subtitle: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18
  },
  action: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "800"
  },
  added: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700"
  },
  muted: {
    color: colors.muted,
    fontSize: 14
  },
  requestBadge: {
    color: colors.star,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.3,
    textTransform: "uppercase"
  },
  requestActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs
  },
  requestActionAccept: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700"
  },
  requestActionDecline: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700"
  },
  requestDot: {
    color: colors.muted,
    fontSize: 12
  },
  trustBadge: {
    alignItems: "flex-end",
    minWidth: 40
  },
  trustValue: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: "900"
  },
  trustLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  noScore: {
    color: colors.border,
    fontSize: 16,
    fontWeight: "700"
  }
});
