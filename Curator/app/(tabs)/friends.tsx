import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AddFriendModal } from "../../src/components/AddFriendModal";
import { DropdownSelect } from "../../src/components/DropdownSelect";
import { EmptyState } from "../../src/components/EmptyState";
import { FriendActivityGridCell } from "../../src/components/FriendActivityGridCell";
import { FriendCard } from "../../src/components/FriendCard";
import { FriendProfileModal } from "../../src/components/FriendProfileModal";
import { Screen } from "../../src/components/Screen";
import { TabTopBar, TabTopBarSpacer } from "../../src/components/TabTopBar";
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
  getFriendships,
  getOtherUser
} from "../../src/lib/social";
import { useAuth } from "../../src/providers/AuthProvider";
import { useTheme } from "../../src/providers/ThemeProvider";
import type { ColorScheme } from "../../src/theme";
import { spacing } from "../../src/theme";
import type { FriendActivityFeedItem, Friendship, UserProfile } from "../../src/types";

const DEFAULT_SORT: FriendSortOption = "trust";
const SCREEN_WIDTH = Dimensions.get("window").width;
const H_PADDING = spacing.sm;
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
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [friendItems, setFriendItems] = useState<FriendListItem[]>([]);
  const [friendActivity, setFriendActivity] = useState<FriendActivityFeedItem[]>([]);
  const [sortBy, setSortBy] = useState<FriendSortOption>(DEFAULT_SORT);
  const [selectedProfile, setSelectedProfile] = useState<FriendProfileDetail | null>(null);
  const [addFriendOpen, setAddFriendOpen] = useState(false);

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

  useEffect(() => {
    void load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

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

  function openProfile(item: FriendListItem) {
    setSelectedProfile(toFriendProfileDetail(item));
  }

  function putMeOn(friendId: string) {
    setSelectedProfile(null);
    router.push({ pathname: "/(tabs)/send", params: { friendId } });
  }

  return (
    <>
      <Screen fill edges={["left", "right"]} contentContainerStyle={styles.screenContent}>
      <TabTopBar title="Friends" left={<TabTopBarSpacer />} right={<TabTopBarSpacer />} />

      <View style={styles.friendsPane}>
        {incoming.length > 0 ? (
          <View style={styles.requestBanner}>
            <Text style={styles.requestCount}>
              {incoming.length} request{incoming.length === 1 ? "" : "s"}
            </Text>
          </View>
        ) : null}

        {acceptedFriends.length === 0 && incoming.length === 0 ? (
          <EmptyState title="No friends yet" body="Tap Add friend below to send your first request." />
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
          <View style={styles.friendListSlot}>
            <View style={styles.friendListHeader}>
              <DropdownSelect value={sortBy} options={SORT_OPTIONS} onChange={setSortBy} />
            </View>
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
          </View>
        ) : null}

        <Pressable hitSlop={8} onPress={() => setAddFriendOpen(true)} style={styles.addFriendLink}>
          <Text style={styles.addFriendText}>Add friend</Text>
        </Pressable>
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
      </Screen>

      {user ? (
        <AddFriendModal
          visible={addFriendOpen}
          userId={user.id}
          friendships={friendships}
          onClose={() => setAddFriendOpen(false)}
          onUpdated={load}
        />
      ) : null}

      <FriendProfileModal
        visible={selectedProfile != null}
        profile={selectedProfile}
        onClose={() => setSelectedProfile(null)}
        onPutMeOn={putMeOn}
      />
    </>
  );
}

function createStyles(colors: ColorScheme) {
  return StyleSheet.create({
    screenContent: {
      flexGrow: 1,
      gap: spacing.sm,
      paddingBottom: spacing.lg,
      paddingHorizontal: spacing.sm,
      paddingTop: 0
    },
    friendsPane: {
      gap: spacing.sm
    },
    friendListSlot: {
      gap: spacing.xs,
      marginTop: spacing.sm
    },
    friendListHeader: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "flex-end"
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
    addFriendLink: {
      alignSelf: "flex-start",
      marginTop: spacing.xs
    },
    addFriendText: {
      color: colors.accent,
      fontSize: 13,
      fontWeight: "800"
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
      color: colors.muted,
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.8,
      textTransform: "uppercase"
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
}
