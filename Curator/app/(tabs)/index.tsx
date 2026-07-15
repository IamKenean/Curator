import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Alert, Dimensions, ScrollView, StyleSheet, View } from "react-native";
import { AddFriendsBanner, DimmedFeedOverlay } from "../../src/components/AddFriendsBanner";
import { ContentSubTabs } from "../../src/components/ContentSubTabs";
import { CalibrationJournalPanel } from "../../src/components/CalibrationJournalPanel";
import { FilmDetailModal, filmTargetFromItem } from "../../src/components/FilmDetailModal";
import { FeedTitleCard, TrustFriendCard } from "../../src/components/FeedTitleCard";
import { HomeFeedSetupBanner } from "../../src/components/HomeFeedSetupBanner";
import { HomeSection } from "../../src/components/HomeSection";
import { InboxFilmCard } from "../../src/components/InboxFilmCard";
import { ListsPanel } from "../../src/components/lists/ListsPanel";
import { MockDataToggle } from "../../src/components/MockDataToggle";
import { RankingsPanel } from "../../src/components/rankings/RankingsPanel";
import { RatingModal } from "../../src/components/RatingModal";
import { RecommendationActionModal } from "../../src/components/RecommendationActionModal";
import { Screen } from "../../src/components/Screen";
import { TabTopBar, TabTopBarSpacer } from "../../src/components/TabTopBar";
import { getListsFeed, hydrateListEntries, type CuratorList } from "../../src/lib/curatorLists";
import { formatComparison, formatStarRating } from "../../src/lib/ratings";
import { buildCalibrationAlertMessage } from "../../src/lib/calibrationEvents";
import { loadHomeFeed } from "../../src/lib/homeFeed";
import { getTmdbTitle } from "../../src/lib/tmdb";
import { getIncomingPendingRecommendations, markRecommendationWatchedAndRate } from "../../src/lib/recommendations";
import { syncInboxNotifications } from "../../src/lib/notifications";
import { getFriendships } from "../../src/lib/social";
import { useAuth } from "../../src/providers/AuthProvider";
import { useMockData } from "../../src/providers/MockDataProvider";
import { useTheme } from "../../src/providers/ThemeProvider";
import type { ColorScheme } from "../../src/theme";
import { spacing } from "../../src/theme";
import { formatFriendsTop10Meta } from "../../src/lib/userRankings";
import type { HomeCategorySlug } from "../../src/lib/homeCategories";

import type { HomeFeed, Recommendation, TmdbSearchResult } from "../../src/types";

const HOME_SUB_TABS = ["Films", "Rankings", "Lists", "Journal"] as const;

type HydratedRecommendation = Recommendation & {
  tmdb?: TmdbSearchResult;
};

const INBOX_CARD_WIDTH = Dimensions.get("window").width * 0.68 * 0.3;
const INBOX_GAP = spacing.lg;

const emptyFeed: HomeFeed = {
  friendsRatedHighly: [],
  popularThisWeek: [],
  newFromFriends: [],
  highTrustFriends: [],
  trustedRecommenders: [],
  tasteMatches: [],
  friendsTop10: []
};

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { revision, mockDataEnabled } = useMockData();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [inbox, setInbox] = useState<HydratedRecommendation[]>([]);
  const [feed, setFeed] = useState<HomeFeed>(emptyFeed);
  const [memberLists, setMemberLists] = useState<CuratorList[]>([]);
  const [friendCount, setFriendCount] = useState(0);
  const [homeFeedBackendReady, setHomeFeedBackendReady] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<(typeof HOME_SUB_TABS)[number]>("Films");
  const [loading, setLoading] = useState(false);
  const [selectedRecommendation, setSelectedRecommendation] = useState<HydratedRecommendation | null>(null);
  const [ratingTarget, setRatingTarget] = useState<HydratedRecommendation | null>(null);
  const [filmDetailTarget, setFilmDetailTarget] = useState<TmdbSearchResult | null>(null);

  const shouldDimFeed = friendCount === 0 && !mockDataEnabled && !loading;

  const load = useCallback(async () => {
    if (!user) {
      return;
    }

    setLoading(true);
    try {
      const friendships = await getFriendships(user.id);
      const friendIds = friendships
        .filter((friendship) => friendship.status === "accepted")
        .map((friendship) => (friendship.user_id === user.id ? friendship.friend_id : friendship.user_id));

      setFriendCount(friendIds.length);

      const [recommendations, homeFeedResult, listsFeed] = await Promise.all([
        getIncomingPendingRecommendations(user.id),
        loadHomeFeed(user.id),
        getListsFeed(user.id, friendIds)
      ]);

      const hydratedInbox = await Promise.all(
        recommendations.map(async (recommendation) => ({
          ...recommendation,
          tmdb: await getTmdbTitle(recommendation.tmdb_id, recommendation.media_type)
        }))
      );

      setInbox(hydratedInbox);
      setFeed(homeFeedResult.feed);
      setHomeFeedBackendReady(homeFeedResult.backendReady);
      setMemberLists(
        await Promise.all(
          listsFeed
            .filter((list) => list.owner_id !== user.id)
            .map((list) => hydrateListEntries(list))
        )
      );
      void syncInboxNotifications(hydratedInbox);
    } catch (error) {
      Alert.alert("Could not load home", (error as Error).message);
    } finally {
      setLoading(false);
    }
  }, [user, revision]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  async function submitRating(input: { stars: number; notes: string; isFavorite: boolean }) {
    if (!user || !ratingTarget) {
      return;
    }

    const summary = await markRecommendationWatchedAndRate({
      recommendation: ratingTarget,
      currentUserId: user.id,
      stars: input.stars,
      notes: input.notes,
      isFavorite: input.isFavorite
    });

    const comparison = formatComparison(ratingTarget.estimated_rating, input.stars);
    const hadEstimate = ratingTarget.estimated_rating != null && ratingTarget.estimated_rating > 0;
    if (comparison || summary || !hadEstimate) {
      Alert.alert(
        "Review sent",
        buildCalibrationAlertMessage({ comparison, summary, hadEstimate })
      );
    }

    setRatingTarget(null);
    await load();
  }

  function openCategory(slug: HomeCategorySlug) {
    router.push({ pathname: "/category/[slug]", params: { slug } });
  }

  function openList(listId: string) {
    router.push({ pathname: "/list/[id]", params: { id: listId } });
  }

  function openFriendsTab() {
    router.push("/(tabs)/friends");
  }

  function openFilmDetail(item: { tmdb_id: number; media_type: TmdbSearchResult["media_type"]; tmdb?: TmdbSearchResult }) {
    if (shouldDimFeed) {
      return;
    }

    setFilmDetailTarget(filmTargetFromItem(item));
  }

  function closeRecommendationSheet() {
    setSelectedRecommendation(null);
    setFilmDetailTarget(null);
  }

  return (
    <Screen
      scroll={activeSubTab !== "Rankings"}
      fill={activeSubTab === "Rankings"}
      edges={["left", "right"]}
      contentContainerStyle={styles.screenContent}
    >
      <TabTopBar title="Curator" left={<TabTopBarSpacer />} right={<TabTopBarSpacer />} />

      <ContentSubTabs tabs={HOME_SUB_TABS} activeTab={activeSubTab} onTabPress={setActiveSubTab} />

      {activeSubTab === "Films" ? (
        <>
      {friendCount === 0 ? <AddFriendsBanner onAddFriends={openFriendsTab} /> : null}

      {!homeFeedBackendReady ? <HomeFeedSetupBanner /> : null}

      <DimmedFeedOverlay dimmed={shouldDimFeed}>
      <HomeSection
        title="Inbox"
        count={inbox.length}
        emptyMessage={!loading ? "Inbox is clear." : undefined}
        onHeaderPress={shouldDimFeed ? undefined : () => openCategory("inbox")}
      >
        {inbox.length > 0 ? (
          <ScrollView
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.inboxContent}
          >
            {inbox.map((item) => (
              <View key={item.id} style={styles.inboxItem}>
                <InboxFilmCard
                  recommendation={item}
                  tmdb={item.tmdb}
                  width={INBOX_CARD_WIDTH}
                  onPress={shouldDimFeed ? () => {} : () => setSelectedRecommendation(item)}
                />
              </View>
            ))}
          </ScrollView>
        ) : null}
      </HomeSection>

      <HomeSection
        title="In Friends' Top 10"
        subtitle="Films your friends hold in their personal canon."
        emptyMessage="No friends have ranked films yet."
        onHeaderPress={shouldDimFeed ? undefined : () => openCategory("friends-top-10")}
        data={feed.friendsTop10}
        keyExtractor={(item) => `ft10-${item.media_type}-${item.tmdb_id}`}
        renderItem={(item) => (
          <FeedTitleCard
            tmdb={item.tmdb}
            subtitle={
              item.friends.length === 1
                ? "In 1 friend's top 10"
                : `In ${item.friends.length} friends' top 10`
            }
            meta={formatFriendsTop10Meta(item)}
            onPress={() => openFilmDetail(item)}
          />
        )}
      />

      <HomeSection
        title="Friends Rated Highly"
        subtitle="Loved in your network — not sent to you yet."
        emptyMessage="No high ratings from friends yet."
        onHeaderPress={shouldDimFeed ? undefined : () => openCategory("friends-rated-highly")}
        data={feed.friendsRatedHighly}
        keyExtractor={(item) => `frh-${item.media_type}-${item.tmdb_id}`}
        renderItem={(item) => (
          <FeedTitleCard
            tmdb={item.tmdb}
            subtitle={item.avg_rating ? `${formatStarRating(Number(item.avg_rating))} ★ avg` : undefined}
            meta={item.rating_count ? `${item.rating_count} ratings` : undefined}
            onPress={() => openFilmDetail(item)}
          />
        )}
      />

      <HomeSection
        title="Popular This Week"
        subtitle="Trending on Curator."
        emptyMessage="Nothing trending yet."
        onHeaderPress={shouldDimFeed ? undefined : () => openCategory("popular-this-week")}
        data={feed.popularThisWeek}
        keyExtractor={(item) => `pop-${item.media_type}-${item.tmdb_id}`}
        renderItem={(item) => (
          <FeedTitleCard
            tmdb={item.tmdb}
            subtitle={item.avg_rating ? `${formatStarRating(Number(item.avg_rating))} ★ avg` : undefined}
            meta={item.rating_count ? `${item.rating_count} ratings` : undefined}
            onPress={() => openFilmDetail(item)}
          />
        )}
      />

      <HomeSection
        title="New From Friends"
        subtitle="Recently watched or rated in your network."
        emptyMessage="No recent friend activity yet."
        onHeaderPress={shouldDimFeed ? undefined : () => openCategory("new-from-friends")}
        data={feed.newFromFriends}
        keyExtractor={(item) => `nff-${item.user_id}-${item.media_type}-${item.tmdb_id}-${item.rated_at}`}
        renderItem={(item) => (
          <FeedTitleCard
            tmdb={item.tmdb}
            subtitle={`${formatStarRating(Number(item.rating_value))} ★`}
            user={{ username: item.username, avatar_url: item.avatar_url }}
            onPress={() => openFilmDetail(item)}
          />
        )}
      />

      <HomeSection
        title="Friends With High Trust Scores"
        subtitle="Your best taste matches and their latest picks."
        emptyMessage="Rate more recommendations to build trust scores."
        onHeaderPress={shouldDimFeed ? undefined : () => openCategory("high-trust-friends")}
        data={feed.highTrustFriends}
        keyExtractor={(item) => `htf-${item.friend_id}-${item.media_type}-${item.tmdb_id}`}
        renderItem={(item) => (
          <TrustFriendCard
            tmdb={item.tmdb}
            username={item.username}
            avatarUrl={item.avatar_url}
            trustScore={Number(item.trust_score)}
            rating={Number(item.rating_value)}
            onPress={() => openFilmDetail(item)}
          />
        )}
      />

      <HomeSection
        title="From People With High Trust Scores"
        subtitle="Platform-wide picks from trusted recommenders."
        emptyMessage="Not enough trust data yet."
        onHeaderPress={shouldDimFeed ? undefined : () => openCategory("trusted-recommenders")}
        data={feed.trustedRecommenders}
        keyExtractor={(item) => `tr-${item.media_type}-${item.tmdb_id}`}
        renderItem={(item) => (
          <FeedTitleCard
            tmdb={item.tmdb}
            subtitle={item.avg_rating ? `${formatStarRating(Number(item.avg_rating))} ★ avg` : undefined}
            meta={item.rating_count ? `${item.rating_count} ratings` : undefined}
            onPress={() => openFilmDetail(item)}
          />
        )}
      />

      <HomeSection
        title="From People With Your Taste"
        subtitle="Titles from users whose ratings match yours."
        emptyMessage="Rate a few titles to unlock taste matches."
        onHeaderPress={shouldDimFeed ? undefined : () => openCategory("taste-matches")}
        data={feed.tasteMatches}
        keyExtractor={(item) => `taste-${item.media_type}-${item.tmdb_id}`}
        renderItem={(item) => (
          <FeedTitleCard
            tmdb={item.tmdb}
            subtitle={item.avg_rating ? `${formatStarRating(Number(item.avg_rating))} ★ avg` : undefined}
            meta={item.match_score ? `${Math.round(Number(item.match_score) * 100)}% taste match` : undefined}
            onPress={() => openFilmDetail(item)}
          />
        )}
      />

      </DimmedFeedOverlay>

      <MockDataToggle />

        </>
      ) : activeSubTab === "Lists" ? (
        <View style={styles.tabPanel}>
          <ListsPanel
            lists={memberLists}
            showOwner
            emptyTitle="No member lists yet"
            emptyBody="Public lists and friends-only lists from people you follow will show up here."
            onListPress={(list) => openList(list.id)}
          />
        </View>
      ) : activeSubTab === "Journal" ? (
        <View style={styles.tabPanel}>
          <CalibrationJournalPanel
            active={activeSubTab === "Journal"}
            friendCount={friendCount}
            onInviteFriends={() => router.push("/(tabs)/friends")}
            onGoToInbox={() => setActiveSubTab("Films")}
            onOpenFilm={setFilmDetailTarget}
          />
        </View>
      ) : activeSubTab === "Rankings" ? (
        <View style={styles.rankingsPanel}>
          <RankingsPanel
            active={activeSubTab === "Rankings"}
            onGoToInbox={() => setActiveSubTab("Films")}
          />
        </View>
      ) : null}

      <RecommendationActionModal
        visible={Boolean(selectedRecommendation) && !filmDetailTarget}
        recommendation={selectedRecommendation}
        tmdb={selectedRecommendation?.tmdb}
        onClose={closeRecommendationSheet}
        onWatchLater={closeRecommendationSheet}
        onMarkWatched={() => {
          if (selectedRecommendation) {
            setRatingTarget(selectedRecommendation);
          }
          setSelectedRecommendation(null);
        }}
        onPosterPress={() => {
          if (selectedRecommendation) {
            setFilmDetailTarget(filmTargetFromItem(selectedRecommendation));
          }
        }}
      />

      <FilmDetailModal
        visible={Boolean(filmDetailTarget)}
        title={filmDetailTarget}
        onClose={() => setFilmDetailTarget(null)}
      />

      <RatingModal
        visible={Boolean(ratingTarget)}
        recommendation={ratingTarget}
        tmdb={ratingTarget?.tmdb}
        onClose={() => setRatingTarget(null)}
        onSubmit={submitRating}
      />
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
    tabPanel: {
      gap: spacing.sm,
      paddingBottom: spacing.md
    },
    rankingsPanel: {
      flex: 1,
      minHeight: 0
    },
    inboxContent: {
      gap: INBOX_GAP,
      paddingRight: spacing.lg
    },
    inboxItem: {
      flexShrink: 0
    }
  });
}
