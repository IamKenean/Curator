import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Alert, Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { EmptyState } from "../../src/components/EmptyState";
import { FriendActivityGridCell } from "../../src/components/FriendActivityGridCell";
import { FriendCard } from "../../src/components/FriendCard";
import { FriendProfileModal } from "../../src/components/FriendProfileModal";
import { Screen } from "../../src/components/Screen";
import { SortChip, SortChipRow } from "../../src/components/SortChip";
import { TextField } from "../../src/components/TextField";
import { UserAvatar } from "../../src/components/UserAvatar";
import {
  getFriendListInsights,
  sortFriendList,
  toFriendProfileDetail,
  type FriendListItem,
  type FriendProfileDetail,
  type FriendSortOption
} from "../../src/lib/friendInsights";
import { getNewFromFriendsActivity } from "../../src/lib/homeFeed";
import { getTrustScores } from "../../src/lib/recommendations";
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
import type { FriendActivityFeedItem, Friendship, UserProfile } from "../../src/types";

const DEFAULT_SORT: FriendSortOption = "trust";
const SCREEN_WIDTH = Dimensions.get("window").width;
const H_PADDING = spacing.md;
const GRID_COLUMNS = 3;
const GRID_GAP = spacing.sm;
const GRID_CELL_WIDTH = (SCREEN_WIDTH - H_PADDING * 2 - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS;
const FRIEND_CARD_HEIGHT = 92;
const FRIEND_LIST_VISIBLE_COUNT = 2;
const FRIEND_LIST_MAX_HEIGHT = FRIEND_CARD_HEIGHT * FRIEND_LIST_VISIBLE_COUNT + spacing.sm;

const SORT_OPTIONS: { id: FriendSortOption; label: string }[] = [
  { id: "trust", label: "Highest trust" },
  { id: "active", label: "Most active" },
  { id: "taste", label: "Taste match" },
  { id: "pending", label: "Pending recs" }
];

export default function FriendsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserProfile[]>([]);
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [friendItems, setFriendItems] = useState<FriendListItem[]>([]);
  const [friendActivity, setFriendActivity] = useState<FriendActivityFeedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState<FriendSortOption>(DEFAULT_SORT);
  const [selectedProfile, setSelectedProfile] = useState<FriendProfileDetail | null>(null);

  const incoming = useMemo(
    () => friendships.filter((friendship) => friendship.status === "pending" && friendship.friend_id === user?.id),
    [friendships, user?.id]
  );

  const acceptedFriends = useMemo(() => {
    if (!user) {
      return [];
    }

    return friendships
      .filter((friendship) => friendship.status === "accepted")
      .map((friendship) => getOtherUser(friendship, user.id))
      .filter((friend): friend is UserProfile => Boolean(friend));
  }, [friendships, user]);

  const sortedFriendItems = useMemo(() => sortFriendList(friendItems, sortBy), [friendItems, sortBy]);

  const load = useCallback(async () => {
    if (!user) {
      return;
    }

    try {
      const [loadedFriendships, loadedTrustScores, activity] = await Promise.all([
        getFriendships(user.id),
        getTrustScores(user.id),
        getNewFromFriendsActivity(user.id)
      ]);
      setFriendships(loadedFriendships);
      setFriendActivity(activity);

      const friends = loadedFriendships
        .filter((friendship) => friendship.status === "accepted")
        .map((friendship) => getOtherUser(friendship, user.id))
        .filter((friend): friend is UserProfile => Boolean(friend));

      setFriendItems(await getFriendListInsights(user.id, friends, loadedTrustScores));
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

  function toggleSort(option: FriendSortOption) {
    setSortBy((current) => (current === option ? DEFAULT_SORT : option));
  }

  function openProfile(item: FriendListItem) {
    setSelectedProfile(toFriendProfileDetail(item));
  }

  function putMeOn(friendId: string) {
    setSelectedProfile(null);
    router.push({ pathname: "/(tabs)/send", params: { friendId } });
  }

  return (
    <Screen edges={["left", "right"]} contentContainerStyle={styles.screenContent}>
      <View style={styles.section}>
        <TextField placeholder="username" value={query} onChangeText={runSearch} autoCapitalize="none" />
        {loading ? <Text style={styles.muted}>Searching...</Text> : null}
        {results.map((profile) => {
          const state = user ? getFriendshipState(friendships, user.id, profile.id) : "none";
          const label =
            state === "accepted" ? "Added" : state === "pending_out" ? "Pending" : state === "pending_in" ? "Requested" : null;

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
        {incoming.length > 0 ? (
          <View style={styles.requestBanner}>
            <Text style={styles.requestCount}>
              {incoming.length} request{incoming.length === 1 ? "" : "s"}
            </Text>
          </View>
        ) : null}

        {acceptedFriends.length > 0 ? (
          <SortChipRow>
            {SORT_OPTIONS.map((option) => (
              <SortChip
                key={option.id}
                label={option.label}
                selected={sortBy === option.id}
                onPress={() => toggleSort(option.id)}
              />
            ))}
          </SortChipRow>
        ) : null}

        {acceptedFriends.length === 0 && incoming.length === 0 ? (
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

        {sortedFriendItems.length > 0 ? (
          <View style={styles.friendListBox}>
            <ScrollView
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: FRIEND_LIST_MAX_HEIGHT }}
              contentContainerStyle={styles.friendListScroll}
            >
              {sortedFriendItems.map((item) => (
                <FriendCard key={item.friend.id} item={item} onPress={() => openProfile(item)} />
              ))}
            </ScrollView>
          </View>
        ) : null}
      </View>

      <View style={styles.feedSection}>
        <Text style={styles.feedTitle}>New From Friends</Text>
        <Text style={styles.feedSubtitle}>Recently watched or rated in your network.</Text>

        {friendActivity.length === 0 ? (
          <Text style={styles.feedEmpty}>No recent friend activity yet.</Text>
        ) : (
          <View style={styles.grid}>
            {friendActivity.map((item, index) => (
              <View
                key={`${item.user_id}-${item.media_type}-${item.tmdb_id}-${item.rated_at}`}
                style={[styles.gridCell, index % GRID_COLUMNS !== GRID_COLUMNS - 1 && styles.gridCellGutter]}
              >
                <FriendActivityGridCell item={item} width={GRID_CELL_WIDTH} />
              </View>
            ))}
          </View>
        )}
      </View>

      <FriendProfileModal
        visible={selectedProfile != null}
        profile={selectedProfile}
        onClose={() => setSelectedProfile(null)}
        onPutMeOn={putMeOn}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
    paddingHorizontal: H_PADDING,
    paddingTop: spacing.xs
  },
  section: {
    gap: spacing.sm
  },
  requestBanner: {
    alignItems: "flex-end"
  },
  requestCount: {
    color: colors.star,
    fontSize: 12,
    fontWeight: "700"
  },
  friendListBox: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    padding: spacing.sm
  },
  friendListScroll: {
    gap: spacing.sm
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
  feedSection: {
    gap: spacing.sm,
    paddingTop: spacing.xs
  },
  feedTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800"
  },
  feedSubtitle: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18
  },
  feedEmpty: {
    color: colors.muted,
    fontSize: 13
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap"
  },
  gridCell: {
    marginBottom: GRID_GAP + spacing.sm
  },
  gridCellGutter: {
    marginRight: GRID_GAP
  }
});
