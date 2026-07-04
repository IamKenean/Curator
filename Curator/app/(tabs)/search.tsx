import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MovieSearchModal } from "../../src/components/MovieSearchModal";
import { CreatePutMeOnRequestModal } from "../../src/components/putMeOn/CreatePutMeOnRequestModal";
import { PutMeOnGauntletCard } from "../../src/components/putMeOn/PutMeOnGauntletCard";
import { PutMeOnLeaderboard } from "../../src/components/putMeOn/PutMeOnLeaderboard";
import { PutMeOnRequestCard } from "../../src/components/putMeOn/PutMeOnRequestCard";
import { PutMeOnYourRequestsSection } from "../../src/components/putMeOn/PutMeOnYourRequestsSection";
import { Screen } from "../../src/components/Screen";
import { getPutMeOnFeed, type PutMeOnFeed, type PutMeOnSort } from "../../src/lib/putMeOnFeed";
import { queuePutMeOnRequestNotifications } from "../../src/lib/putMeOnNotifications";
import {
  createPutMeOnRequest,
  deletePutMeOnRequest,
  type CreatePutMeOnRequestInput
} from "../../src/lib/putMeOnRequests";
import { getFriendships, getOtherUser } from "../../src/lib/social";
import { useAuth } from "../../src/providers/AuthProvider";
import { colors, spacing } from "../../src/theme";
import type { UserProfile } from "../../src/types";

const SORT_LABELS: Record<PutMeOnSort, string> = {
  newest: "Newest",
  most_responses: "Most responses",
  ending_soon: "Ending soon"
};

export default function PutMeOnScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const [feed, setFeed] = useState<PutMeOnFeed | null>(null);
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<PutMeOnSort>("newest");
  const [createOpen, setCreateOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const load = useCallback(async () => {
    if (!user) {
      return;
    }

    setLoading(true);
    try {
      const nextFriendships = await getFriendships(user.id);
      const nextFriends = nextFriendships
        .filter((friendship) => friendship.status === "accepted")
        .map((friendship) => getOtherUser(friendship, user.id))
        .filter((friend): friend is UserProfile => Boolean(friend));

      setFriends(nextFriends);
      setFeed(await getPutMeOnFeed(user.id, nextFriends));
    } catch (error) {
      Alert.alert("Could not load Put Me On", (error as Error).message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  function showComingSoon(feature: string) {
    Alert.alert("Coming soon", `${feature} is under development.`);
  }

  function putThemOn(ownerId: string, requestId: string) {
    router.push({
      pathname: "/(tabs)/send",
      params: { friendId: ownerId, requestId, requestOwnerId: ownerId }
    });
  }

  function cycleSort() {
    const order: PutMeOnSort[] = ["newest", "most_responses", "ending_soon"];
    setSortBy((current) => order[(order.indexOf(current) + 1) % order.length]);
  }

  async function handleCreateRequest(input: CreatePutMeOnRequestInput) {
    if (!user) {
      return;
    }

    try {
      const created = await createPutMeOnRequest(user.id, input);
      const recipientIds =
        input.audience === "all_friends" ? friends.map((friend) => friend.id) : input.friendIds;

      await queuePutMeOnRequestNotifications(recipientIds, {
        requestId: created.id,
        fromUserId: user.id,
        fromUsername: profile?.username ?? "curator",
        prompt: input.prompt.trim()
      });

      await load();
    } catch (error) {
      Alert.alert("Could not create request", (error as Error).message);
      throw error;
    }
  }

  function confirmDeleteRequest(requestId: string) {
    Alert.alert("Delete request?", "Friends won't be able to put you on for this prompt anymore.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          if (!user) {
            return;
          }
          void deletePutMeOnRequest(user.id, requestId)
            .then(load)
            .catch((error: Error) => Alert.alert("Could not delete request", error.message));
        }
      }
    ]);
  }

  return (
    <>
      <Screen edges={["left", "right"]} contentContainerStyle={styles.screenContent}>
        <View style={[styles.topBar, { paddingTop: insets.top + spacing.xs }]}>
          <Text style={styles.topBarTitle}>Put Me On</Text>
          <View style={styles.topBarActions}>
            <Pressable hitSlop={8} onPress={() => setSearchOpen(true)} style={styles.topBarIcon}>
              <Ionicons name="search-outline" size={21} color={colors.text} />
            </Pressable>
            <Pressable hitSlop={8} onPress={() => showComingSoon("Notifications")} style={styles.topBarIcon}>
              <Ionicons name="notifications-outline" size={21} color={colors.text} />
              <View style={styles.noticeDot} />
            </Pressable>
          </View>
        </View>

        {loading && !feed ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : null}

        {feed ? (
          <>
            <PutMeOnYourRequestsSection
              requests={feed.yourRequests}
              onCreatePress={() => setCreateOpen(true)}
              onDeleteRequest={confirmDeleteRequest}
            />

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>Open requests</Text>
              <Pressable onPress={cycleSort} style={styles.sortButton}>
                <Text style={styles.sortText}>{SORT_LABELS[sortBy]}</Text>
                <Ionicons name="chevron-down" size={12} color={colors.muted} />
              </Pressable>
            </View>

            {feed.openRequests.map((request) => (
              <PutMeOnRequestCard key={request.id} request={request} onPutThemOn={putThemOn} />
            ))}

            <PutMeOnGauntletCard gauntlet={feed.gauntlet} onAnswer={() => showComingSoon("Genre Gauntlet")} />

            <PutMeOnLeaderboard entries={feed.leaderboard} onViewAll={() => showComingSoon("Leaderboards")} />
          </>
        ) : null}
      </Screen>

      <CreatePutMeOnRequestModal
        visible={createOpen}
        activeCount={feed?.yourRequests.length ?? 0}
        friends={friends}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreateRequest}
      />

      <MovieSearchModal visible={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    gap: spacing.md,
    paddingBottom: spacing.xl * 2,
    paddingHorizontal: spacing.sm,
    paddingTop: 0
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.xs
  },
  topBarTitle: {
    color: colors.text,
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.4
  },
  topBarActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm
  },
  topBarIcon: {
    alignItems: "center",
    height: 32,
    justifyContent: "center",
    width: 32
  },
  noticeDot: {
    backgroundColor: colors.accent,
    borderRadius: 999,
    height: 7,
    position: "absolute",
    right: 4,
    top: 4,
    width: 7
  },
  loading: {
    alignItems: "center",
    paddingVertical: spacing.xl
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.xs
  },
  sectionLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase"
  },
  sortButton: {
    alignItems: "center",
    flexDirection: "row",
    gap: 2
  },
  sortText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700"
  }
});
