import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Image, LayoutChangeEvent, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Button } from "../../src/components/Button";
import { EmptyState } from "../../src/components/EmptyState";
import { FriendPicker } from "../../src/components/FriendPicker";
import { Screen } from "../../src/components/Screen";
import { SendSectionCard } from "../../src/components/SendSectionCard";
import { StarRatingPicker } from "../../src/components/StarRatingPicker";
import { TabTopBar, TabTopBarSide, TabTopBarSpacer } from "../../src/components/TabTopBar";
import { TmdbSearch } from "../../src/components/TmdbSearch";
import { getSentRecommendations, sendRecommendation } from "../../src/lib/recommendations";
import { addPutMeOnResponse, findPutMeOnRequest } from "../../src/lib/putMeOnRequests";
import { getFriendships, getOtherUser } from "../../src/lib/social";
import { getTmdbTitle } from "../../src/lib/tmdb";
import { hexToRgb } from "../../src/lib/colorUtils";
import { useAuth } from "../../src/providers/AuthProvider";
import { useTheme } from "../../src/providers/ThemeProvider";
import type { ColorScheme } from "../../src/theme/colorSchemes";
import { posterBaseUrl, spacing } from "../../src/theme";
import type { Friendship, TmdbSearchResult, UserProfile } from "../../src/types";

const RECENT_PUT_ONS_LIMIT = 4;
const RECENT_POSTER_ASPECT = 1.35;
const RECENT_ROW_GAP = spacing.sm;
const RECENT_INSET = 0;

function hexToRgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
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
  onSelect,
  styles
}: {
  titles: TmdbSearchResult[];
  selected: TmdbSearchResult | null;
  onSelect: (item: TmdbSearchResult | null) => void;
  styles: ReturnType<typeof createSendStyles>;
}) {
  const [containerWidth, setContainerWidth] = useState(0);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    setContainerWidth(event.nativeEvent.layout.width);
  }, []);

  const rowWidth = containerWidth > 0 ? containerWidth - RECENT_INSET * 2 : 0;

  if (titles.length === 0) {
    return null;
  }

  return (
    <View style={styles.recentSection} onLayout={handleLayout}>
      <Text style={styles.recentLabel}>Recent put ons</Text>
      {rowWidth > 0 ? (
        <View style={[styles.recentRow, { width: rowWidth }]}>
          {titles.map((item) => {
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
      ) : null}
    </View>
  );
}

function TitleOverview({
  title,
  loading,
  styles
}: {
  title: TmdbSearchResult;
  loading: boolean;
  styles: ReturnType<typeof createSendStyles>;
}) {
  const { colors } = useTheme();
  const summary = title.overview?.trim();

  return (
    <View style={styles.summarySection}>
      <Text style={styles.summaryLabel}>Summary</Text>
      {loading ? (
        <View style={styles.summaryLoading}>
          <ActivityIndicator color={colors.accent} size="small" />
        </View>
      ) : (
        <ScrollView
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
          style={styles.summaryScroll}
          contentContainerStyle={styles.summaryContent}
        >
          <Text style={styles.summaryText}>{summary || "No summary available for this title."}</Text>
        </ScrollView>
      )}
    </View>
  );
}

export default function SendScreen() {
  const { friendId, requestId, requestOwnerId } = useLocalSearchParams<{
    friendId?: string;
    requestId?: string;
    requestOwnerId?: string;
  }>();
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createSendStyles(colors), [colors]);
  const estimateStarEmpty = useMemo(() => hexToRgba(colors.star, 0.55), [colors.star]);
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<UserProfile | null>(null);
  const [selectedTitle, setSelectedTitle] = useState<TmdbSearchResult | null>(null);
  const [estimatedRating, setEstimatedRating] = useState(0);
  const [senderRating, setSenderRating] = useState(0);
  const [sending, setSending] = useState(false);
  const [recentTitles, setRecentTitles] = useState<TmdbSearchResult[]>([]);
  const [requestPrompt, setRequestPrompt] = useState<string | null>(null);
  const [titleLoading, setTitleLoading] = useState(false);
  const [titleSearching, setTitleSearching] = useState(false);

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

  useEffect(() => {
    void loadFriends();
    void loadRecentPutOns();
  }, [loadFriends, loadRecentPutOns]);

  useFocusEffect(
    useCallback(() => {
      void loadFriends();
      void loadRecentPutOns();
    }, [loadFriends, loadRecentPutOns])
  );

  const handleSelectTitle = useCallback(async (item: TmdbSearchResult | null) => {
    if (!item) {
      setSelectedTitle(null);
      setTitleLoading(false);
      return;
    }

    setTitleSearching(false);
    setSelectedTitle(item);
    setTitleLoading(true);
    try {
      setSelectedTitle(await getTmdbTitle(item.id, item.media_type));
    } catch {
      // Keep the basic selection if TMDB detail fails.
    } finally {
      setTitleLoading(false);
    }
  }, []);

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
      scroll={false}
      edges={["left", "right"]}
      contentContainerStyle={styles.screenContent}
    >
      <TabTopBar
        title="Send"
        left={<TabTopBarSpacer />}
        right={<TabTopBarSide icon="ellipsis-horizontal" onPress={() => showComingSoon("Menu")} />}
      />

      {requestPrompt ? (
        <View style={styles.requestBanner}>
          <Text style={styles.requestBannerLabel}>Putting them on for</Text>
          <Text style={styles.requestBannerPrompt}>"{requestPrompt}"</Text>
        </View>
      ) : null}

      <View style={styles.sections}>
      <SendSectionCard title="1. Pick a friend" expand flex={1}>
        {friends.length === 0 ? (
          <EmptyState title="No friends yet" body="Accept or add a friend before sending recommendations." />
        ) : (
          <FriendPicker
            friends={friends}
            selected={selectedFriend}
            onSelect={setSelectedFriend}
            variant="send"
            fill
          />
        )}
      </SendSectionCard>

      <SendSectionCard title="2. Pick a title" expand flex={1.35}>
        <View style={styles.titleSectionBody}>
          <TmdbSearch
            selected={selectedTitle}
            onSelect={handleSelectTitle}
            onSearchingChange={setTitleSearching}
            variant="send"
            fill={titleSearching}
          />
          {selectedTitle ? (
            <TitleOverview title={selectedTitle} loading={titleLoading} styles={styles} />
          ) : !titleSearching ? (
            <RecentPutOnsPicker
              titles={recentTitles}
              selected={selectedTitle}
              onSelect={handleSelectTitle}
              styles={styles}
            />
          ) : null}
        </View>
      </SendSectionCard>

      <SendSectionCard expand flex={1}>
        <View style={styles.ratingsBody}>
          <View style={styles.ratingBlockExpand}>
            <Text style={styles.ratingLabel}>Your estimate for them</Text>
            <StarRatingPicker
              value={estimatedRating}
              onChange={setEstimatedRating}
              showFavorite={false}
              showClear={false}
              sendStyle
              emptyLabel="Not sure"
              starEmptyColor={estimateStarEmpty}
            />
          </View>
          <View style={styles.ratingBlockExpand}>
            <Text style={styles.ratingLabel}>Your personal rating</Text>
            <StarRatingPicker
              value={senderRating}
              onChange={setSenderRating}
              showFavorite={false}
              showClear={false}
              sendStyle
              emptyLabel="Not rated yet"
              starEmptyColor={colors.muted}
            />
          </View>
        </View>
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

function createSendStyles(colors: ColorScheme) {
  return StyleSheet.create({
  screenContent: {
    flex: 1,
    gap: spacing.sm,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingTop: 0
  },
  sections: {
    flex: 1,
    gap: spacing.sm,
    minHeight: 0
  },
  titleSectionBody: {
    flex: 1,
    gap: spacing.xs,
    justifyContent: "flex-start",
    minHeight: 0
  },
  ratingsBody: {
    flex: 1,
    justifyContent: "space-evenly",
    minHeight: 0
  },
  ratingBlockExpand: {
    flex: 1,
    gap: spacing.sm,
    justifyContent: "center",
    minHeight: 0
  },
  ratingLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase"
  },
  requestBanner: {
    backgroundColor: colors.card,
    borderColor: colors.accent,
    borderRadius: 10,
    borderWidth: 1,
    gap: 2,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2
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
    borderRadius: 10,
    minHeight: 40,
    width: "100%"
  },
  recentSection: {
    gap: spacing.xs,
    marginTop: spacing.md
  },
  recentLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase"
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
  },
  summarySection: {
    flex: 1,
    gap: spacing.xs,
    marginTop: spacing.md,
    minHeight: 0
  },
  summaryLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase"
  },
  summaryLoading: {
    alignItems: "flex-start",
    flex: 1,
    justifyContent: "center",
    minHeight: 0,
    paddingVertical: spacing.sm
  },
  summaryScroll: {
    flex: 1,
    minHeight: 0
  },
  summaryContent: {
    paddingBottom: spacing.xs
  },
  summaryText: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 19
  }
  });
}
