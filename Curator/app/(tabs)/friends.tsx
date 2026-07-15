import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { AddFriendModal } from "../../src/components/AddFriendModal";
import { EmptyState } from "../../src/components/EmptyState";
import { FilmDetailModal } from "../../src/components/FilmDetailModal";
import { FriendsFeedSections } from "../../src/components/friends/FriendsFeedSections";
import { FriendsTrustCarousel } from "../../src/components/friends/FriendsTrustCarousel";
import { Screen } from "../../src/components/Screen";
import { TabTopBar, TabTopBarSide } from "../../src/components/TabTopBar";
import { UserAvatar } from "../../src/components/UserAvatar";
import { buildFriendsFeedSections } from "../../src/lib/friendsFeed";
import { getFriendListInsights } from "../../src/lib/friendInsights";
import { getHomeFeed } from "../../src/lib/homeFeed";
import type { HomeCategorySlug } from "../../src/lib/homeCategories";
import { getTrustScores } from "../../src/lib/recommendations";
import {
  acceptFriendRequest,
  declineFriendRequest,
  getFriendships,
  getOtherUser
} from "../../src/lib/social";
import { useAuth } from "../../src/providers/AuthProvider";
import { useMockData } from "../../src/providers/MockDataProvider";
import { useTheme } from "../../src/providers/ThemeProvider";
import type { ColorScheme } from "../../src/theme";
import { spacing } from "../../src/theme";
import type { Friendship, HomeFeed, TmdbSearchResult } from "../../src/types";

const emptyFeed: HomeFeed = {
  friendsRatedHighly: [],
  popularThisWeek: [],
  newFromFriends: [],
  highTrustFriends: [],
  trustedRecommenders: [],
  tasteMatches: [],
  friendsTop10: []
};

export default function FriendsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { revision } = useMockData();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [addFriendOpen, setAddFriendOpen] = useState(false);
  const [filmDetailTarget, setFilmDetailTarget] = useState<TmdbSearchResult | null>(null);
  const [displaySections, setDisplaySections] = useState(() => buildFriendsFeedSections([], emptyFeed));

  const incoming = useMemo(
    () => friendships.filter((friendship) => friendship.status === "pending" && friendship.friend_id === user?.id),
    [friendships, user?.id]
  );

  const load = useCallback(async () => {
    if (!user) {
      return;
    }

    try {
      const [loadedFriendships, loadedTrustScores, loadedFeed] = await Promise.all([
        getFriendships(user.id),
        getTrustScores(user.id),
        getHomeFeed(user.id)
      ]);

      setFriendships(loadedFriendships);

      const friends = loadedFriendships
        .filter((friendship) => friendship.status === "accepted")
        .map((friendship) => getOtherUser(friendship, user.id))
        .filter((friend): friend is NonNullable<typeof friend> => Boolean(friend));

      const friendItems = await getFriendListInsights(user.id, friends, loadedTrustScores);
      setDisplaySections(buildFriendsFeedSections(friendItems, loadedFeed));
    } catch (error) {
      Alert.alert("Could not load friends", (error as Error).message);
    }
  }, [revision, user]);

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

  function openProfile(userId: string) {
    router.push({ pathname: "/user/[id]", params: { id: userId } });
  }

  function openCategory(slug: string) {
    router.push({ pathname: "/category/[slug]", params: { slug } });
  }

  const hasFriends = displaySections.trustCarousel.length > 0;
  const hasFeedContent =
    displaySections.lovedThisWeek.length > 0 ||
    displaySections.trending.length > 0 ||
    displaySections.reviews.length > 0 ||
    displaySections.latestActivity.length > 0;

  return (
    <>
      <Screen fill edges={["left", "right"]} contentContainerStyle={styles.screenContent}>
        <TabTopBar
          title="Friends"
          left={<TabTopBarSide icon="search-outline" onPress={() => router.push("/(tabs)/search")} />}
          right={<TabTopBarSide icon="person-add-outline" onPress={() => setAddFriendOpen(true)} />}
        />

        <Text style={styles.subtitle}>See what your friends are watching and loving.</Text>

        {incoming.length > 0 ? (
          <View style={styles.requestsBlock}>
            {incoming.map((friendship) => {
              const requester = friendship.user;
              return (
                <View key={friendship.id} style={styles.requestRow}>
                  <Pressable
                    onPress={() => requester && openProfile(requester.id)}
                    style={styles.requestMain}
                  >
                    <UserAvatar profile={requester} size={40} />
                    <View style={styles.requestCopy}>
                      <Text style={styles.requestName}>@{requester?.username ?? "Unknown"}</Text>
                      <Text style={styles.requestHint}>Wants to be friends</Text>
                    </View>
                  </Pressable>
                  <View style={styles.requestActions}>
                    <Pressable onPress={() => respond(friendship, true)}>
                      <Text style={styles.requestAccept}>Accept</Text>
                    </Pressable>
                    <Pressable onPress={() => respond(friendship, false)}>
                      <Text style={styles.requestDecline}>Decline</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}

        {!hasFriends && incoming.length === 0 ? (
          <EmptyState
            title="No friends yet"
            body="Add friends to see what they're watching, rating, and putting you on to."
          />
        ) : null}

        {hasFriends ? (
          <>
            <View style={styles.divider} />
            <FriendsTrustCarousel
              items={displaySections.trustCarousel}
              onPressFriend={openProfile}
            />
            <View style={styles.divider} />
          </>
        ) : null}

        {hasFeedContent ? (
          <FriendsFeedSections
            lovedThisWeek={displaySections.lovedThisWeek}
            reviews={displaySections.reviews}
            trending={displaySections.trending}
            latestActivity={displaySections.latestActivity}
            leaderboard={displaySections.leaderboard}
            onSeeAll={(slug) => openCategory(slug as HomeCategorySlug)}
            onOpenProfile={openProfile}
            onOpenFilm={setFilmDetailTarget}
          />
        ) : hasFriends ? (
          <EmptyState
            title="No friend activity yet"
            body="When friends rate films, their picks and reviews will show up here."
          />
        ) : null}

        <Pressable hitSlop={8} onPress={() => setAddFriendOpen(true)} style={styles.addFriendLink}>
          <Text style={styles.addFriendText}>Add friend</Text>
        </Pressable>
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

      <FilmDetailModal
        visible={filmDetailTarget != null}
        title={filmDetailTarget}
        onClose={() => setFilmDetailTarget(null)}
      />
    </>
  );
}

function createStyles(colors: ColorScheme) {
  return StyleSheet.create({
    screenContent: {
      flexGrow: 1,
      gap: spacing.md,
      paddingBottom: spacing.xl,
      paddingHorizontal: spacing.sm,
      paddingTop: 0
    },
    subtitle: {
      color: colors.muted,
      fontSize: 13,
      lineHeight: 18,
      paddingHorizontal: spacing.xs,
      textAlign: "center"
    },
    divider: {
      backgroundColor: colors.border,
      height: 1
    },
    requestsBlock: {
      gap: spacing.sm
    },
    requestRow: {
      alignItems: "center",
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: 14,
      borderWidth: 1,
      flexDirection: "row",
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm
    },
    requestMain: {
      alignItems: "center",
      flex: 1,
      flexDirection: "row",
      gap: spacing.sm,
      minWidth: 0
    },
    requestCopy: {
      flex: 1,
      gap: 2,
      minWidth: 0
    },
    requestName: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "800"
    },
    requestHint: {
      color: colors.muted,
      fontSize: 12
    },
    requestActions: {
      alignItems: "flex-end",
      gap: spacing.xs
    },
    requestAccept: {
      color: colors.accent,
      fontSize: 12,
      fontWeight: "800"
    },
    requestDecline: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: "700"
    },
    addFriendLink: {
      alignSelf: "center",
      marginTop: spacing.sm
    },
    addFriendText: {
      color: colors.accent,
      fontSize: 13,
      fontWeight: "800"
    }
  });
}
