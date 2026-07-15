import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Button } from "../../src/components/Button";
import { ContentSubTabs } from "../../src/components/ContentSubTabs";
import { EmptyState } from "../../src/components/EmptyState";
import { ListsPanel } from "../../src/components/lists/ListsPanel";
import { RankingsPanel } from "../../src/components/rankings/RankingsPanel";
import { Screen } from "../../src/components/Screen";
import { TabTopBar, TabTopBarSide } from "../../src/components/TabTopBar";
import { UserAvatar } from "../../src/components/UserAvatar";
import {
  getFriendListInsights,
  toFriendProfileDetail,
  type FriendProfileDetail
} from "../../src/lib/friendInsights";
import { hydrateListEntries, getUserLists, isListVisibleToViewer, type CuratorList } from "../../src/lib/curatorLists";
import { trustColorForPercent } from "../../src/lib/trustColors";
import { getRecommendationStats, getSentRecommendations, getTrustScores } from "../../src/lib/recommendations";
import { formatStarRating } from "../../src/lib/ratings";
import { getFriendships, getOtherUser, getUserProfile } from "../../src/lib/social";
import { useAuth } from "../../src/providers/AuthProvider";
import { useTheme } from "../../src/providers/ThemeProvider";
import type { ColorScheme } from "../../src/theme";
import { posterBaseUrl, spacing } from "../../src/theme";
import type { RatedRecommendation, UserProfile } from "../../src/types";

const PROFILE_SUB_TABS = ["Profile", "Rankings", "Lists", "Watchlist"] as const;
const RECENT_PUT_ONS_LIMIT = 8;
const POSTER_WIDTH = 72;
const AVATAR_SIZE = 72;

type FriendProfileStyles = ReturnType<typeof createStyles>;

function formatStatCount(count: number) {
  if (count > 99) {
    return "99+";
  }
  return String(count);
}

function FriendProfileStats({
  sent,
  rated,
  responsesCount,
  styles
}: {
  sent: number;
  rated: number;
  responsesCount: number;
  styles: FriendProfileStyles;
}) {
  const stats = [
    { count: sent, label: "Sent" },
    { count: rated, label: "Rated" },
    { count: responsesCount, label: "Responses" }
  ];

  return (
    <View style={styles.statsRow}>
      {stats.map((stat) => (
        <View key={stat.label} style={styles.statCell}>
          <Text style={styles.statValue}>{formatStatCount(stat.count)}</Text>
          <Text style={styles.statLabel}>{stat.label}</Text>
        </View>
      ))}
    </View>
  );
}

function RecentPutOnPoster({
  item,
  styles,
  starColor,
  mutedColor
}: {
  item: RatedRecommendation;
  styles: FriendProfileStyles;
  starColor: string;
  mutedColor: string;
}) {
  const posterUri = item.tmdb?.poster_path ? `${posterBaseUrl}${item.tmdb.poster_path}` : undefined;
  const rating = item.sender_rating ?? item.estimated_rating;

  return (
    <View style={styles.putOnItem}>
      {posterUri ? (
        <Image source={{ uri: posterUri }} style={styles.putOnPoster} />
      ) : (
        <View style={[styles.putOnPoster, styles.putOnPosterFallback]}>
          <Text style={styles.putOnPosterFallbackText}>No Poster</Text>
        </View>
      )}
      <View style={styles.putOnMeta}>
        {rating ? (
          <View style={styles.putOnRatingRow}>
            <Ionicons name="star" size={11} color={starColor} />
            <Text style={styles.putOnRating}>{formatStarRating(rating)}</Text>
          </View>
        ) : (
          <Text style={styles.putOnPending}>Pending</Text>
        )}
        <Ionicons name="list-outline" size={12} color={mutedColor} />
      </View>
    </View>
  );
}

function StatBlock({
  label,
  value,
  color,
  styles
}: {
  label: string;
  value: string;
  color?: string;
  styles: FriendProfileStyles;
}) {
  return (
    <View style={styles.trustStatBlock}>
      <Text style={[styles.trustStatValue, color ? { color } : null]}>{value}</Text>
      <Text style={styles.trustStatLabel}>{label}</Text>
    </View>
  );
}

export default function FriendProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [friendProfile, setFriendProfile] = useState<UserProfile | null>(null);
  const [insight, setInsight] = useState<FriendProfileDetail | null>(null);
  const [sent, setSent] = useState(0);
  const [rated, setRated] = useState(0);
  const [responsesCount, setResponsesCount] = useState(0);
  const [recentPutOns, setRecentPutOns] = useState<RatedRecommendation[]>([]);
  const [lists, setLists] = useState<CuratorList[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<(typeof PROFILE_SUB_TABS)[number]>("Profile");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user || !id) {
      return;
    }

    setLoading(true);
    try {
      const profile = await getUserProfile(id);
      if (!profile) {
        Alert.alert("Profile not found", "This user could not be loaded.", [
          { text: "Go back", onPress: () => router.back() }
        ]);
        return;
      }

      setFriendProfile(profile);

      const [friendships, trustScores, stats, sentRecs, userLists] = await Promise.all([
        getFriendships(user.id),
        getTrustScores(user.id),
        getRecommendationStats(id),
        getSentRecommendations(id),
        getUserLists(id)
      ]);

      const acceptedFriendIds = new Set(
        friendships
          .filter((friendship) => friendship.status === "accepted")
          .map((friendship) => getOtherUser(friendship, user.id)?.id)
          .filter((friendId): friendId is string => Boolean(friendId))
      );

      const visibleLists = userLists.filter((list) =>
        isListVisibleToViewer(list, user.id, acceptedFriendIds)
      );

      const friendInsightItems = await getFriendListInsights(user.id, [profile], trustScores);
      const firstInsight = friendInsightItems.at(0);
      setInsight(firstInsight ? toFriendProfileDetail(firstInsight) : null);
      setSent(stats.sent);
      setRated(stats.rated);
      setResponsesCount(stats.responses);
      setRecentPutOns(sentRecs.slice(0, RECENT_PUT_ONS_LIMIT));
      setLists(await Promise.all(visibleLists.map((list) => hydrateListEntries(list))));
    } catch (error) {
      Alert.alert("Could not load profile", (error as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id, router, user]);

  useEffect(() => {
    void load();
  }, [load]);

  function putMeOn() {
    if (!id) {
      return;
    }
    router.push({ pathname: "/(tabs)/send", params: { friendId: id } });
  }

  function openList(listId: string) {
    router.push({ pathname: "/list/[id]", params: { id: listId } });
  }

  if (!user || !id) {
    return null;
  }

  const displayName = friendProfile?.username ?? "curator";
  const headerTitle =
    activeSubTab === "Lists"
      ? `${displayName}'s lists`
      : activeSubTab === "Watchlist"
        ? "Watchlist"
        : displayName;

  const yourTrustColor = insight?.yourTrustPercent != null ? trustColorForPercent(insight.yourTrustPercent, colors) : undefined;
  const theirTrustColor =
    insight?.theirTrustPercent != null ? trustColorForPercent(insight.theirTrustPercent, colors) : undefined;

  return (
    <Screen
      fill
      scroll={activeSubTab !== "Rankings"}
      edges={["left", "right"]}
      contentContainerStyle={styles.screenContent}
    >
      <TabTopBar
        title={headerTitle}
        left={<TabTopBarSide icon="chevron-back" onPress={() => router.back()} />}
        right={<TabTopBarSide icon="paper-plane-outline" onPress={putMeOn} />}
      />

      <ContentSubTabs tabs={PROFILE_SUB_TABS} activeTab={activeSubTab} onTabPress={setActiveSubTab} />

      {activeSubTab === "Rankings" ? (
        <View style={styles.rankingsPanel}>
          <RankingsPanel active userId={id} readOnly />
        </View>
      ) : activeSubTab === "Lists" ? (
        <View style={styles.mainContent}>
          <ListsPanel
            lists={lists}
            currentUserId={user.id}
            emptyTitle="No shared lists yet"
            emptyBody={`@${displayName} hasn't shared any lists you can view.`}
            onListPress={(list) => openList(list.id)}
          />
        </View>
      ) : activeSubTab === "Watchlist" ? (
        <View style={styles.mainContent}>
          <EmptyState
            title="Watchlist is private"
            body={`@${displayName}'s watchlist isn't visible to friends yet.`}
          />
        </View>
      ) : (
        <View style={styles.mainContent}>
          {loading && !friendProfile ? (
            <Text style={styles.loading}>Loading profile...</Text>
          ) : (
            <>
              <View style={styles.profileCard}>
                <View style={styles.profileHeader}>
                  <UserAvatar profile={friendProfile} size={AVATAR_SIZE} />
                  <View style={styles.profileMain}>
                    <View style={styles.identityCol}>
                      <Text
                        style={styles.username}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.65}
                      >
                        {displayName}
                      </Text>
                      <Text style={styles.bio}>{insight?.activityLine ?? "Friend on Curator"}</Text>
                    </View>
                    <View style={styles.statsSlot}>
                      <FriendProfileStats
                        sent={sent}
                        rated={rated}
                        responsesCount={responsesCount}
                        styles={styles}
                      />
                    </View>
                  </View>
                </View>
              </View>

              {insight ? (
                <View style={styles.panelCard}>
                  <Text style={styles.sectionLabelInline}>Trust between you</Text>
                  <View style={styles.trustRow}>
                    <StatBlock
                      label="Your trust in them"
                      value={insight.yourTrustPercent != null ? `${insight.yourTrustPercent}%` : "—"}
                      color={yourTrustColor}
                      styles={styles}
                    />
                    <View style={styles.trustDivider} />
                    <StatBlock
                      label="Their trust in you"
                      value={insight.theirTrustPercent != null ? `${insight.theirTrustPercent}%` : "—"}
                      color={theirTrustColor}
                      styles={styles}
                    />
                  </View>

                  <View style={styles.metricsRow}>
                    <StatBlock
                      label="Hit rate with you"
                      value={insight.hitRateWithYou != null ? `${insight.hitRateWithYou}%` : "—"}
                      styles={styles}
                    />
                    <StatBlock
                      label="Taste match"
                      value={insight.tasteMatchPercent != null ? `${insight.tasteMatchPercent}%` : "—"}
                      styles={styles}
                    />
                    <StatBlock label="Recs sent to you" value={`${insight.sentCount}`} styles={styles} />
                  </View>

                  {insight.topGenres.length > 0 ? (
                    <>
                      <View style={styles.panelDivider} />
                      <Text style={styles.sectionLabelInline}>Genres they rec most</Text>
                      <View style={styles.genreRow}>
                        {insight.topGenres.map((genre) => (
                          <View key={genre} style={styles.genreChip}>
                            <Text style={styles.genreChipText}>{genre}</Text>
                          </View>
                        ))}
                      </View>
                    </>
                  ) : null}
                </View>
              ) : null}

              <View style={styles.panelCard}>
                <Text style={styles.sectionLabelInline}>Recent put ons</Text>
                {recentPutOns.length === 0 ? (
                  <Text style={styles.emptyPutOns}>No recommendations sent yet.</Text>
                ) : (
                  <ScrollView
                    horizontal
                    nestedScrollEnabled
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.putOnsScroll}
                  >
                    {recentPutOns.map((item) => (
                      <RecentPutOnPoster
                        key={item.id}
                        item={item}
                        styles={styles}
                        starColor={colors.star}
                        mutedColor={colors.muted}
                      />
                    ))}
                  </ScrollView>
                )}
              </View>

              <Button title="Put Me On" icon="paper-plane" onPress={putMeOn} />
            </>
          )}
        </View>
      )}
    </Screen>
  );
}

function createStyles(colors: ColorScheme) {
  return StyleSheet.create({
    screenContent: {
      flexGrow: 1,
      gap: spacing.sm,
      paddingBottom: spacing.md,
      paddingHorizontal: spacing.sm,
      paddingTop: 0
    },
    mainContent: {
      flexGrow: 1,
      gap: spacing.sm
    },
    rankingsPanel: {
      flex: 1,
      minHeight: 0
    },
    loading: {
      color: colors.muted,
      fontSize: 13,
      paddingHorizontal: spacing.sm
    },
    profileCard: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: 16,
      borderWidth: 1,
      padding: spacing.lg
    },
    profileHeader: {
      alignItems: "center",
      flexDirection: "row",
      gap: spacing.md
    },
    profileMain: {
      alignItems: "center",
      flex: 1,
      flexDirection: "row",
      gap: spacing.sm,
      minWidth: 0
    },
    identityCol: {
      flex: 1,
      flexShrink: 1,
      gap: 2,
      justifyContent: "center",
      minWidth: 0
    },
    statsSlot: {
      alignItems: "center",
      flexShrink: 0,
      justifyContent: "center"
    },
    username: {
      color: colors.text,
      fontSize: 20,
      fontWeight: "800",
      lineHeight: 24,
      minWidth: 0
    },
    bio: {
      color: colors.muted,
      fontSize: 13,
      lineHeight: 16
    },
    statsRow: {
      flexDirection: "row",
      flexShrink: 0,
      gap: spacing.xs,
      justifyContent: "center"
    },
    statCell: {
      alignItems: "center",
      justifyContent: "flex-start",
      width: 62
    },
    statValue: {
      color: colors.star,
      fontSize: 20,
      fontWeight: "900",
      lineHeight: 24,
      textAlign: "center",
      width: "100%"
    },
    statLabel: {
      color: colors.muted,
      fontSize: 8,
      fontWeight: "700",
      letterSpacing: 0.2,
      lineHeight: 10,
      textAlign: "center",
      textTransform: "uppercase",
      width: "100%"
    },
    panelCard: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: 16,
      borderWidth: 1,
      gap: spacing.sm + 2,
      padding: spacing.md
    },
    sectionLabelInline: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.8,
      textTransform: "uppercase"
    },
    trustRow: {
      alignItems: "center",
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderRadius: 14,
      borderWidth: 1,
      flexDirection: "row",
      paddingVertical: spacing.md
    },
    trustDivider: {
      backgroundColor: colors.border,
      height: "70%",
      width: 1
    },
    trustStatBlock: {
      alignItems: "center",
      flex: 1,
      gap: spacing.xs
    },
    trustStatValue: {
      color: colors.text,
      fontSize: 24,
      fontWeight: "900"
    },
    trustStatLabel: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: "700",
      lineHeight: 14,
      paddingHorizontal: spacing.sm,
      textAlign: "center"
    },
    metricsRow: {
      flexDirection: "row",
      gap: spacing.sm
    },
    panelDivider: {
      backgroundColor: colors.border,
      height: 1
    },
    genreRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm
    },
    genreChip: {
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm
    },
    genreChipText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: "700"
    },
    emptyPutOns: {
      color: colors.muted,
      fontSize: 13
    },
    putOnsScroll: {
      gap: spacing.sm
    },
    putOnItem: {
      gap: spacing.xs,
      width: POSTER_WIDTH
    },
    putOnPoster: {
      backgroundColor: colors.border,
      borderRadius: 8,
      height: POSTER_WIDTH * 1.45,
      width: POSTER_WIDTH
    },
    putOnPosterFallback: {
      alignItems: "center",
      justifyContent: "center"
    },
    putOnPosterFallbackText: {
      color: colors.muted,
      fontSize: 10,
      textAlign: "center"
    },
    putOnMeta: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between"
    },
    putOnRatingRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 2
    },
    putOnRating: {
      color: colors.star,
      fontSize: 11,
      fontWeight: "800"
    },
    putOnPending: {
      color: colors.muted,
      fontSize: 10,
      fontWeight: "700"
    }
  });
}
