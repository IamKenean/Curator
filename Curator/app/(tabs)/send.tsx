import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Image, LayoutChangeEvent, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "../../src/components/Button";
import { EmptyState } from "../../src/components/EmptyState";
import { FriendPicker } from "../../src/components/FriendPicker";
import { Screen } from "../../src/components/Screen";
import { SendSectionCard } from "../../src/components/SendSectionCard";
import { StarRatingPicker } from "../../src/components/StarRatingPicker";
import { TmdbSearch } from "../../src/components/TmdbSearch";
import { getSentRecommendations, sendRecommendation } from "../../src/lib/recommendations";
import { addPutMeOnResponse, findPutMeOnRequest } from "../../src/lib/putMeOnRequests";
import { getFriendships, getOtherUser } from "../../src/lib/social";
import { useAuth } from "../../src/providers/AuthProvider";
import { colors, posterBaseUrl, spacing } from "../../src/theme";
import type { Friendship, TmdbSearchResult, UserProfile } from "../../src/types";

const ESTIMATE_STAR_EMPTY = "rgba(229, 9, 20, 0.55)";
const RECENT_PUT_ONS_LIMIT = 16;
const RECENT_COLUMNS = 4;
const RECENT_POSTER_ASPECT = 1.45;
const RECENT_ROW_GAP = spacing.sm;
const RECENT_INSET = 0;

function chunkTitles<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    rows.push(items.slice(index, index + size));
  }
  return rows;
}

function dedupeRecentTitles(items: Awaited<ReturnType<typeof getSentRecommendations>>): TmdbSearchResult[] {
  const seen = new Set<string>();
  const titles: TmdbSearchResult[] = [];

  for (const item of items) {
    if (!item.tmdb) {
      continue;
    }

    const key = `${item.media_type}-${item.tmdb_id}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    titles.push(item.tmdb);
    if (titles.length >= RECENT_PUT_ONS_LIMIT) {
      break;
    }
  }

  return titles;
}

function RecentPutOnsPicker({
  titles,
  selected,
  onSelect
}: {
  titles: TmdbSearchResult[];
  selected: TmdbSearchResult | null;
  onSelect: (item: TmdbSearchResult | null) => void;
}) {
  const [containerWidth, setContainerWidth] = useState(0);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    setContainerWidth(event.nativeEvent.layout.width);
  }, []);

  const rowWidth = containerWidth > 0 ? containerWidth - RECENT_INSET * 2 : 0;

  const scrollMaxHeight = useMemo(() => {
    if (rowWidth <= 0) {
      return 120;
    }

    const posterWidth = (rowWidth - RECENT_ROW_GAP * (RECENT_COLUMNS - 1)) / RECENT_COLUMNS;
    return posterWidth * RECENT_POSTER_ASPECT + RECENT_ROW_GAP;
  }, [rowWidth]);

  if (titles.length === 0) {
    return null;
  }

  return (
    <View style={styles.recentSection} onLayout={handleLayout}>
      <Text style={styles.recentLabel}>Recent put ons</Text>
      {rowWidth > 0 ? (
        <ScrollView
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
          style={[styles.recentScroll, { maxHeight: scrollMaxHeight }]}
          contentContainerStyle={styles.recentScrollContent}
        >
          {chunkTitles(titles, RECENT_COLUMNS).map((row, rowIndex) => (
            <View key={`row-${rowIndex}`} style={[styles.recentRow, { width: rowWidth }]}>
              {row.map((item) => {
                const isSelected = selected?.id === item.id && selected.media_type === item.media_type;
                const posterUri = item.poster_path ? `${posterBaseUrl}${item.poster_path}` : undefined;

                return (
                  <Pressable
                    key={`${item.media_type}-${item.id}`}
                    onPress={() => onSelect(isSelected ? null : item)}
                    style={[styles.recentPosterWrap, isSelected && styles.recentPosterSelected]}
                  >
                    {posterUri ? (
                      <Image source={{ uri: posterUri }} style={styles.recentPoster} />
                    ) : (
                      <View style={[styles.recentPoster, styles.recentPosterFallback]}>
                        <Text style={styles.recentPosterFallbackText}>No Poster</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

export default function SendScreen() {
  const { friendId, requestId, requestOwnerId } = useLocalSearchParams<{
    friendId?: string;
    requestId?: string;
    requestOwnerId?: string;
  }>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<UserProfile | null>(null);
  const [selectedTitle, setSelectedTitle] = useState<TmdbSearchResult | null>(null);
  const [estimatedRating, setEstimatedRating] = useState(0);
  const [senderRating, setSenderRating] = useState(0);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [sending, setSending] = useState(false);
  const [recentTitles, setRecentTitles] = useState<TmdbSearchResult[]>([]);
  const [requestPrompt, setRequestPrompt] = useState<string | null>(null);

  const friends = useMemo(() => {
    if (!user) {
      return [];
    }

    return friendships
      .filter((friendship) => friendship.status === "accepted")
      .map((friendship) => getOtherUser(friendship, user.id))
      .filter((friend): friend is UserProfile => Boolean(friend));
  }, [friendships, user]);

  const applyFriendFromParams = useCallback(
    (friendList: UserProfile[]) => {
      if (!friendId) {
        return;
      }

      const match = friendList.find((friend) => friend.id === friendId);
      if (match) {
        setSelectedFriend(match);
      }
    },
    [friendId]
  );

  useEffect(() => {
    if (friendId) {
      return;
    }

    if (friends.length === 1 && !selectedFriend) {
      setSelectedFriend(friends[0]);
    }
  }, [friendId, friends, selectedFriend]);

  const loadFriends = useCallback(async () => {
    if (!user) {
      return;
    }
    try {
      const nextFriendships = await getFriendships(user.id);
      setFriendships(nextFriendships);

      const nextFriends = nextFriendships
        .filter((friendship) => friendship.status === "accepted")
        .map((friendship) => getOtherUser(friendship, user.id))
        .filter((friend): friend is UserProfile => Boolean(friend));

      applyFriendFromParams(nextFriends);
    } catch (error) {
      Alert.alert("Could not load friends", (error as Error).message);
    }
  }, [user, applyFriendFromParams]);

  const loadRecentPutOns = useCallback(async () => {
    if (!user) {
      return;
    }
    try {
      const sent = await getSentRecommendations(user.id);
      setRecentTitles(dedupeRecentTitles(sent));
    } catch {
      // Non-blocking filler content — search still works if this fails.
    }
  }, [user]);

  useEffect(() => {
    if (!requestId || !requestOwnerId) {
      setRequestPrompt(null);
      return;
    }

    void findPutMeOnRequest(requestOwnerId, requestId).then((request) => {
      setRequestPrompt(request?.prompt ?? null);
    });
  }, [requestId, requestOwnerId]);

  useFocusEffect(
    useCallback(() => {
      void loadFriends();
      void loadRecentPutOns();
    }, [loadFriends, loadRecentPutOns])
  );

  async function submit() {
    if (!user) {
      Alert.alert("Sign in required", "Sign in again to send recommendations.");
      return;
    }

    if (!selectedFriend) {
      Alert.alert("Pick a friend", "Choose who you want to send this to in step 1.");
      return;
    }

    if (!selectedTitle) {
      Alert.alert("Pick a title", "Tap a movie or show from the search results in step 2.");
      return;
    }

    setSending(true);
    try {
      const result = await sendRecommendation({
        fromUserId: user.id,
        toUserId: selectedFriend.id,
        tmdbId: selectedTitle.id,
        mediaType: selectedTitle.media_type,
        estimatedRating: estimatedRating > 0 ? estimatedRating : null,
        senderRating: senderRating > 0 ? senderRating : null
      });
      const sentTitle = selectedTitle.title;
      const sentFriend = selectedFriend.username;
      const titleSnapshot = selectedTitle;

      if (requestId && requestOwnerId) {
        await addPutMeOnResponse(requestOwnerId, requestId, user.id, titleSnapshot);
      }

      setSelectedTitle(null);
      setEstimatedRating(0);
      setSenderRating(0);
      void loadRecentPutOns();
      Alert.alert(
        "Sent",
        result.warning ??
          (requestPrompt
            ? `${sentTitle} was put on ${sentFriend} for "${requestPrompt}".`
            : `${sentTitle} was sent to ${sentFriend}.`)
      );
    } catch (error) {
      Alert.alert("Could not send recommendation", (error as Error).message);
    } finally {
      setSending(false);
    }
  }

  function showComingSoon(feature: string) {
    Alert.alert("Coming soon", `${feature} is under development.`);
  }

  return (
    <Screen
      fill
      scrollEnabled={scrollEnabled}
      edges={["left", "right"]}
      contentContainerStyle={styles.screenContent}
    >
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.xs }]}>
        <View style={styles.topBarSide} />
        <Text style={styles.topBarTitle} numberOfLines={1}>
          Send
        </Text>
        <Pressable hitSlop={8} onPress={() => showComingSoon("Menu")} style={styles.topBarSide}>
          <Ionicons name="ellipsis-horizontal" size={22} color={colors.text} />
        </Pressable>
      </View>

      {requestPrompt ? (
        <View style={styles.requestBanner}>
          <Text style={styles.requestBannerLabel}>Putting them on for</Text>
          <Text style={styles.requestBannerPrompt}>"{requestPrompt}"</Text>
        </View>
      ) : null}

      <View style={styles.sections}>
      <SendSectionCard title="1. Pick a friend">
        {friends.length === 0 ? (
          <EmptyState title="No friends yet" body="Accept or add a friend before sending recommendations." />
        ) : (
          <FriendPicker
            friends={friends}
            selected={selectedFriend}
            onSelect={setSelectedFriend}
            variant="send"
          />
        )}
      </SendSectionCard>

      <SendSectionCard title="2. Pick a title">
        <TmdbSearch selected={selectedTitle} onSelect={setSelectedTitle} resultsMaxHeight={176} variant="send" />
        {!selectedTitle ? (
          <RecentPutOnsPicker titles={recentTitles} selected={selectedTitle} onSelect={setSelectedTitle} />
        ) : null}
      </SendSectionCard>

      <SendSectionCard
        title="3. Your estimate (optional)"
        helper="How much you think they'll enjoy it. Used for trust score."
      >
        <StarRatingPicker
          value={estimatedRating}
          onChange={setEstimatedRating}
          showFavorite={false}
          showClear={false}
          sendStyle
          emptyLabel="Not sure"
          starEmptyColor={ESTIMATE_STAR_EMPTY}
          onInteractionChange={(active) => setScrollEnabled(!active)}
        />
      </SendSectionCard>

      <SendSectionCard
        title="4. What do you rate it? (optional)"
        helper="Your personal take on the title. Doesn't affect trust score."
      >
        <StarRatingPicker
          value={senderRating}
          onChange={setSenderRating}
          showFavorite={false}
          showClear={false}
          sendStyle
          emptyLabel="Not rated yet"
          starEmptyColor={colors.muted}
          onInteractionChange={(active) => setScrollEnabled(!active)}
        />
      </SendSectionCard>
      </View>

      <View style={styles.footer}>
        <Button
          title={sending ? "Sending..." : "Send Recommendation"}
          icon="paper-plane"
          compact
          disabled={sending}
          onPress={submit}
          style={styles.sendButton}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    gap: spacing.sm,
    paddingBottom: 0,
    paddingHorizontal: spacing.sm,
    paddingTop: 0
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.xs
  },
  topBarSide: {
    alignItems: "center",
    height: 32,
    justifyContent: "center",
    width: 32
  },
  topBarTitle: {
    color: colors.text,
    flex: 1,
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center"
  },
  sections: {
    flexGrow: 1,
    gap: spacing.sm
  },
  requestBanner: {
    backgroundColor: colors.card,
    borderColor: colors.accent,
    borderRadius: 12,
    borderWidth: 1,
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2
  },
  requestBannerLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase"
  },
  requestBannerPrompt: {
    color: colors.text,
    fontSize: 14,
    fontStyle: "italic",
    fontWeight: "700",
    lineHeight: 18
  },
  footer: {
    marginTop: "auto",
    paddingTop: spacing.sm
  },
  sendButton: {
    borderRadius: 12,
    minHeight: 44,
    width: "100%"
  },
  recentSection: {
    gap: spacing.xs,
    marginTop: spacing.xs
  },
  recentLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase"
  },
  recentScroll: {},
  recentScrollContent: {
    gap: RECENT_ROW_GAP
  },
  recentRow: {
    flexDirection: "row",
    gap: RECENT_ROW_GAP
  },
  recentPosterWrap: {
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    overflow: "hidden"
  },
  recentPosterSelected: {
    borderColor: colors.accent,
    borderWidth: 2
  },
  recentPoster: {
    aspectRatio: 1 / RECENT_POSTER_ASPECT,
    backgroundColor: colors.border,
    width: "100%"
  },
  recentPosterFallback: {
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xs
  },
  recentPosterFallbackText: {
    color: colors.muted,
    fontSize: 9,
    textAlign: "center"
  }
});
