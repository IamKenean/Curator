import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MovieSearchModal } from "../../src/components/MovieSearchModal";
import { CreatePutMeOnRequestModal } from "../../src/components/putMeOn/CreatePutMeOnRequestModal";
import { PutMeOnGauntletCard } from "../../src/components/putMeOn/PutMeOnGauntletCard";
import { PutMeOnLeaderboard } from "../../src/components/putMeOn/PutMeOnLeaderboard";
import { PutMeOnRequestsPanel } from "../../src/components/putMeOn/PutMeOnRequestsPanel";
import { RecOfWeekLeaderboard } from "../../src/components/putMeOn/RecOfWeekLeaderboard";
import { Screen } from "../../src/components/Screen";
import { getPutMeOnFeed, type PutMeOnFeed, type PutMeOnSort } from "../../src/lib/putMeOnFeed";
import { queuePutMeOnRequestNotifications } from "../../src/lib/putMeOnNotifications";
import {
  createPutMeOnRequest,
  deletePutMeOnRequest,
  type CreatePutMeOnRequestInput
} from "../../src/lib/putMeOnRequests";
import { getRecOfWeekBoard, submitRecOfWeekPick, voteRecOfWeek, type RecOfWeekBoard } from "../../src/lib/recOfWeek";
import { getFriendships, getOtherUser } from "../../src/lib/social";
import { useAuth } from "../../src/providers/AuthProvider";
import { useTheme } from "../../src/providers/ThemeProvider";
import type { ColorScheme } from "../../src/theme";
import { spacing } from "../../src/theme";
import type { TmdbSearchResult, UserProfile } from "../../src/types";

export default function PutMeOnScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [feed, setFeed] = useState<PutMeOnFeed | null>(null);
  const [recOfWeek, setRecOfWeek] = useState<RecOfWeekBoard | null>(null);
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [recOfWeekLoading, setRecOfWeekLoading] = useState(true);
  const [votingRecId, setVotingRecId] = useState(false);
  const [sortBy, setSortBy] = useState<PutMeOnSort>("newest");
  const [createOpen, setCreateOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [recOfWeekPostOpen, setRecOfWeekPostOpen] = useState(false);
  const [submittingPick, setSubmittingPick] = useState(false);

  const loadRecOfWeek = useCallback(
    async (friendList: UserProfile[]) => {
      if (!user) {
        return;
      }

      setRecOfWeekLoading(true);
      try {
        setRecOfWeek(await getRecOfWeekBoard(user.id, friendList.map((friend) => friend.id)));
      } catch (error) {
        console.warn("Rec of week load failed:", (error as Error).message);
        setRecOfWeek(null);
      } finally {
        setRecOfWeekLoading(false);
      }
    },
    [user]
  );

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
      await loadRecOfWeek(nextFriends);
    } catch (error) {
      Alert.alert("Could not load Put Me On", (error as Error).message);
    } finally {
      setLoading(false);
    }
  }, [loadRecOfWeek, user]);

  useEffect(() => {
    void load();
  }, [load]);

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

  async function handleVoteRecOfWeek(submissionId: string) {
    if (!user || !recOfWeek) {
      return;
    }

    setVotingRecId(true);
    try {
      await voteRecOfWeek(user.id, submissionId, recOfWeek.weekStart);
      await loadRecOfWeek(friends);
    } catch (error) {
      Alert.alert("Could not vote", (error as Error).message);
    } finally {
      setVotingRecId(false);
    }
  }

  async function handleSubmitRecOfWeekPick(item: TmdbSearchResult) {
    if (!user || !recOfWeek) {
      return;
    }

    setSubmittingPick(true);
    try {
      await submitRecOfWeekPick({
        userId: user.id,
        friendIds: friends.map((friend) => friend.id),
        tmdbId: item.id,
        mediaType: item.media_type,
        weekStart: recOfWeek.weekStart
      });
      setRecOfWeekPostOpen(false);
      await loadRecOfWeek(friends);
    } catch (error) {
      Alert.alert("Could not post pick", (error as Error).message);
    } finally {
      setSubmittingPick(false);
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
            {!feed.backendReady ? (
              <View style={styles.setupBanner}>
                <Text style={styles.setupTitle}>Friend requests need Supabase setup</Text>
                <Text style={styles.setupBody}>
                  Run supabase/put-me-on.sql in your Supabase SQL Editor, then have your friend post again.
                </Text>
              </View>
            ) : null}

            <PutMeOnRequestsPanel
              yourRequests={feed.yourRequests}
              openRequests={feed.openRequests}
              sortBy={sortBy}
              onCreatePress={() => setCreateOpen(true)}
              onDeleteRequest={confirmDeleteRequest}
              onPutThemOn={putThemOn}
              onCycleSort={cycleSort}
            />

            <RecOfWeekLeaderboard
              board={recOfWeek}
              loading={recOfWeekLoading}
              voting={votingRecId}
              onVote={handleVoteRecOfWeek}
              onPostPick={() => setRecOfWeekPostOpen(true)}
            />

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

      <MovieSearchModal
        visible={recOfWeekPostOpen}
        onClose={() => setRecOfWeekPostOpen(false)}
        subtitle="Post a movie you'd want your friends to see this week."
        onSelect={(item) => {
          if (submittingPick) {
            return;
          }
          void handleSubmitRecOfWeekPick(item);
        }}
      />
    </>
  );
}

function createStyles(colors: ColorScheme) {
  return StyleSheet.create({
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
    setupBanner: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: 12,
      borderWidth: 1,
      gap: spacing.xs,
      padding: spacing.md
    },
    setupTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "700"
    },
    setupBody: {
      color: colors.muted,
      fontSize: 13,
      lineHeight: 18
    }
  });
}
