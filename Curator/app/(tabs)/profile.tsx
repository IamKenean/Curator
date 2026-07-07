import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ContentSubTabs } from "../../src/components/ContentSubTabs";
import { EmptyState } from "../../src/components/EmptyState";
import { CreateListModal } from "../../src/components/lists/CreateListModal";
import { ListsPanel } from "../../src/components/lists/ListsPanel";
import { Screen } from "../../src/components/Screen";
import { SettingsModal } from "../../src/components/SettingsModal";
import { TabTopBar, TabTopBarSide } from "../../src/components/TabTopBar";
import { UserAvatar } from "../../src/components/UserAvatar";
import {
  createCuratorList,
  deleteCuratorList,
  getUserLists,
  hydrateListEntries,
  setListVisibility,
  updateCuratorList,
  type CreateCuratorListInput,
  type CuratorList
} from "../../src/lib/curatorLists";
import { formatStarRating, trustScoreToPercent } from "../../src/lib/ratings";
import { getRecommendationStats, getSentRecommendations, getTrustScores } from "../../src/lib/recommendations";
import { useAuth } from "../../src/providers/AuthProvider";
import { useTheme } from "../../src/providers/ThemeProvider";
import type { ColorScheme } from "../../src/theme";
import { posterBaseUrl, spacing } from "../../src/theme";
import type { RatedRecommendation, TrustScore } from "../../src/types";

const PROFILE_SUB_TABS = ["Profile", "Reviews", "Lists", "Journal"] as const;
const RECENT_PUT_ONS_LIMIT = 8;
const POSTER_WIDTH = 72;
const AVATAR_SIZE = 72;

type ProfileStyles = ReturnType<typeof createProfileStyles>;

function formatStatCount(count: number) {
  if (count > 99) {
    return "99+";
  }
  return String(count);
}

function ProfileStats({
  sent,
  rated,
  responsesCount,
  onSent,
  onRated,
  onResponses,
  styles
}: {
  sent: number;
  rated: number;
  responsesCount: number;
  onSent: () => void;
  onRated: () => void;
  onResponses: () => void;
  styles: ProfileStyles;
}) {
  const stats = [
    { count: sent, label: "Sent", onPress: onSent },
    { count: rated, label: "Rated", onPress: onRated },
    { count: responsesCount, label: "Responses", onPress: onResponses }
  ];

  return (
    <View style={styles.statsRow}>
      {stats.map((stat) => (
        <Pressable key={stat.label} onPress={stat.onPress} style={styles.statCell}>
          <Text style={styles.statValue}>{formatStatCount(stat.count)}</Text>
          <Text style={styles.statLabel}>{stat.label}</Text>
        </Pressable>
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
  styles: ProfileStyles;
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

function TasteSimilarityPlaceholder({ styles, successColor }: { styles: ProfileStyles; successColor: string }) {
  return (
    <View style={styles.tasteBlock}>
      <View style={styles.tasteHeader}>
        <Ionicons name="time-outline" size={14} color={styles.tasteSoon.color} />
        <Text style={styles.tasteSoon}>Coming soon</Text>
      </View>
      <View style={styles.tasteChart}>
        <Ionicons name="star" size={14} color={successColor} />
        {[16, 24, 32, 40, 48].map((height, index) => (
          <View key={index} style={[styles.tasteBar, { height }]} />
        ))}
        <View style={styles.tasteStarsEnd}>
          {[0, 1, 2, 3, 4].map((index) => (
            <Ionicons key={index} name="star" size={10} color={successColor} />
          ))}
        </View>
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createProfileStyles(colors), [colors]);
  const [sent, setSent] = useState(0);
  const [rated, setRated] = useState(0);
  const [responsesCount, setResponsesCount] = useState(0);
  const [trustScores, setTrustScores] = useState<TrustScore[]>([]);
  const [recentPutOns, setRecentPutOns] = useState<RatedRecommendation[]>([]);
  const [lists, setLists] = useState<CuratorList[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<(typeof PROFILE_SUB_TABS)[number]>("Profile");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [listFormOpen, setListFormOpen] = useState(false);
  const [editingList, setEditingList] = useState<CuratorList | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      return;
    }

    try {
      const [stats, scores, sentRecs, userLists] = await Promise.all([
        getRecommendationStats(user.id),
        getTrustScores(user.id),
        getSentRecommendations(user.id),
        getUserLists(user.id)
      ]);
      setSent(stats.sent);
      setRated(stats.rated);
      setResponsesCount(stats.responses);
      setTrustScores(scores);
      setRecentPutOns(sentRecs.slice(0, RECENT_PUT_ONS_LIMIT));
      setLists(await Promise.all(userLists.map((list) => hydrateListEntries(list))));
    } catch (error) {
      Alert.alert("Could not load profile", (error as Error).message);
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

  function handleSubTab(tab: (typeof PROFILE_SUB_TABS)[number]) {
    setActiveSubTab(tab);
  }

  async function handleSaveList(input: CreateCuratorListInput) {
    if (!user) {
      return;
    }

    try {
      if (editingList) {
        await updateCuratorList(user.id, editingList.id, input);
      } else {
        await createCuratorList(user.id, input);
      }
      setEditingList(null);
      await load();
    } catch (error) {
      Alert.alert(editingList ? "Could not save list" : "Could not create list", (error as Error).message);
      throw error;
    }
  }

  function openCreateList() {
    setEditingList(null);
    setListFormOpen(true);
  }

  function openList(listId: string) {
    router.push({ pathname: "/list/[id]", params: { id: listId } });
  }

  function handleListLongPress(list: CuratorList) {
    if (!user || list.owner_id !== user.id) {
      return;
    }

    Alert.alert(list.name, "Hold actions", [
      {
        text: "Edit list",
        onPress: () => {
          setEditingList(list);
          setListFormOpen(true);
        }
      },
      {
        text: list.visibility === "public" ? "Make friends only" : "Make public",
        onPress: () => {
          void setListVisibility(user.id, list.id, list.visibility === "public" ? "friends" : "public")
            .then(() => load())
            .catch((error: Error) => Alert.alert("Could not update visibility", error.message));
        }
      },
      {
        text: "Delete list",
        style: "destructive",
        onPress: () => {
          Alert.alert("Delete list?", "This cannot be undone.", [
            { text: "Cancel", style: "cancel" },
            {
              text: "Delete",
              style: "destructive",
              onPress: () => {
                void deleteCuratorList(user.id, list.id)
                  .then(() => load())
                  .catch((error: Error) => Alert.alert("Could not delete list", error.message));
              }
            }
          ]);
        }
      },
      { text: "Cancel", style: "cancel" }
    ]);
  }

  function showComingSoon(feature: string) {
    Alert.alert("Coming soon", `${feature} is under development.`);
  }

  const displayName = profile?.username ?? "curator";
  const headerTitle =
    activeSubTab === "Lists" ? `${displayName}'s lists` : displayName;

  return (
    <>
      <Screen fill edges={["left", "right"]} contentContainerStyle={styles.screenContent}>
        <TabTopBar
          title={headerTitle}
          left={<TabTopBarSide icon="settings-outline" onPress={() => setSettingsOpen(true)} />}
          right={
            activeSubTab === "Lists" ? (
              <TabTopBarSide icon="add" onPress={openCreateList} />
            ) : (
              <TabTopBarSide icon="ellipsis-horizontal" onPress={() => showComingSoon("Menu")} />
            )
          }
        />

        <ContentSubTabs tabs={PROFILE_SUB_TABS} activeTab={activeSubTab} onTabPress={handleSubTab} />

        {activeSubTab === "Lists" ? (
          <View style={styles.mainContent}>
            <ListsPanel
              lists={lists}
              currentUserId={user?.id}
              emptyTitle="No lists yet"
              emptyBody="Tap + to create your first curated list. Hold a list to edit or change visibility."
              onListPress={(list) => openList(list.id)}
              onListLongPress={handleListLongPress}
            />
          </View>
        ) : activeSubTab === "Reviews" || activeSubTab === "Journal" ? (
          <View style={styles.mainContent}>
            <EmptyState
              title={`${activeSubTab} coming soon`}
              body="This tab will mirror the home feed once reviews and journal entries ship."
            />
          </View>
        ) : (
        <View style={styles.mainContent}>
          <View style={styles.profileCard}>
            <View style={styles.profileHeader}>
              <View style={styles.avatarWrap}>
                <UserAvatar profile={profile} size={AVATAR_SIZE} />
                <Pressable hitSlop={8} onPress={() => showComingSoon("Avatar edit")} style={styles.avatarEdit}>
                  <Ionicons name="pencil" size={11} color={colors.text} />
                </Pressable>
              </View>
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
                  <Text style={styles.bio}>No bio yet</Text>
                </View>
                <View style={styles.statsSlot}>
                  <ProfileStats
                    sent={sent}
                    rated={rated}
                    responsesCount={responsesCount}
                    onSent={() => router.push("/sent")}
                    onRated={() => router.push("/rated")}
                    onResponses={() => router.push("/responses")}
                    styles={styles}
                  />
                </View>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.panelCard}>
              <Text style={styles.sectionLabelInline}>Trust Scores</Text>
              {trustScores.length === 0 ? (
                <EmptyState
                  title="No trust scores yet"
                  body="Scores appear after you rate friends' recommendations that included their star estimate."
                />
              ) : (
                <View style={styles.scoreList}>
                  {trustScores.map((score) => (
                    <View key={`${score.user_id}-${score.friend_id}`} style={styles.scoreItemBox}>
                      <View style={styles.scoreCopy}>
                        <Text
                          style={styles.friend}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.75}
                        >
                          @{score.friend?.username ?? "Unknown"}
                        </Text>
                        <Text style={styles.scoreMeta}>{score.total_recs} predictions rated</Text>
                      </View>
                      <Text style={styles.percent}>{trustScoreToPercent(score.score)}%</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.panelCard}>
              <View style={styles.putOnsHeader}>
                <Text style={styles.sectionLabelInline}>Recent put ons</Text>
                <Pressable onPress={() => router.push("/sent")} style={styles.viewAllRow}>
                  <Text style={styles.viewAll}>View all</Text>
                  <Ionicons name="chevron-forward" size={11} color={colors.text} />
                </Pressable>
              </View>

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

              <View style={styles.panelDivider} />

              <Text style={styles.sectionLabelInline}>Taste Similarity</Text>
              <TasteSimilarityPlaceholder styles={styles} successColor={colors.success} />
            </View>
          </View>
        </View>
        )}
      </Screen>

      <CreateListModal
        visible={listFormOpen}
        list={editingList}
        onClose={() => {
          setListFormOpen(false);
          setEditingList(null);
        }}
        onSubmit={handleSaveList}
      />

      <SettingsModal
        visible={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSignOut={signOut}
      />
    </>
  );
}

function createProfileStyles(colors: ColorScheme) {
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
    avatarWrap: {
      position: "relative"
    },
    avatarEdit: {
      alignItems: "center",
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderRadius: 999,
      borderWidth: 1,
      bottom: 2,
      height: 24,
      justifyContent: "center",
      position: "absolute",
      right: 0,
      width: 24
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
    section: {
      gap: spacing.sm
    },
    sectionLabelInline: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.8,
      textTransform: "uppercase"
    },
    panelCard: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: 16,
      borderWidth: 1,
      gap: spacing.sm + 2,
      padding: spacing.md
    },
    scoreList: {
      gap: spacing.sm
    },
    scoreItemBox: {
      alignItems: "center",
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderRadius: 12,
      borderWidth: 1,
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2
    },
    scoreCopy: {
      flex: 1,
      gap: 2,
      minWidth: 0,
      paddingRight: spacing.sm
    },
    friend: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "800",
      minWidth: 0
    },
    scoreMeta: {
      color: colors.muted,
      fontSize: 12,
      lineHeight: 16
    },
    percent: {
      color: colors.accent,
      fontSize: 26,
      fontWeight: "900"
    },
    putOnsHeader: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between"
    },
    viewAllRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 2
    },
    viewAll: {
      color: colors.muted,
      fontSize: 10,
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
    },
    panelDivider: {
      backgroundColor: colors.border,
      height: 1
    },
    tasteBlock: {
      gap: spacing.sm
    },
    tasteHeader: {
      alignItems: "center",
      flexDirection: "row",
      gap: spacing.xs
    },
    tasteSoon: {
      color: colors.muted,
      fontSize: 13,
      fontWeight: "700"
    },
    tasteChart: {
      alignItems: "flex-end",
      flexDirection: "row",
      gap: spacing.sm,
      height: 56,
      justifyContent: "space-between",
      paddingHorizontal: spacing.xs
    },
    tasteBar: {
      backgroundColor: colors.border,
      borderRadius: 4,
      flex: 1,
      minHeight: 8
    },
    tasteStarsEnd: {
      alignItems: "center",
      flexDirection: "row",
      gap: 1,
      marginBottom: 2
    }
  });
}
