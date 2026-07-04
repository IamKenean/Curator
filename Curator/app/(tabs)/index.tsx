import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Dimensions, ScrollView, StyleSheet, Text, View } from "react-native";
import { FeedTitleCard, TrustFriendCard } from "../../src/components/FeedTitleCard";
import { HomeSection } from "../../src/components/HomeSection";
import { InboxFilmCard } from "../../src/components/InboxFilmCard";
import { RatingModal } from "../../src/components/RatingModal";
import { RecommendationActionModal } from "../../src/components/RecommendationActionModal";
import { Screen } from "../../src/components/Screen";
import { formatComparison, formatStarRating } from "../../src/lib/ratings";
import { getHomeFeed } from "../../src/lib/homeFeed";
import { getTmdbTitle } from "../../src/lib/tmdb";
import { getIncomingPendingRecommendations, markRecommendationWatchedAndRate } from "../../src/lib/recommendations";
import { syncInboxNotifications } from "../../src/lib/notifications";
import { useAuth } from "../../src/providers/AuthProvider";
import { colors, spacing } from "../../src/theme";
import type { HomeCategorySlug } from "../../src/lib/homeCategories";

import type { HomeFeed, Recommendation, TmdbSearchResult } from "../../src/types";

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
  tasteMatches: []
};

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [inbox, setInbox] = useState<HydratedRecommendation[]>([]);
  const [feed, setFeed] = useState<HomeFeed>(emptyFeed);
  const [loading, setLoading] = useState(false);
  const [selectedRecommendation, setSelectedRecommendation] = useState<HydratedRecommendation | null>(null);
  const [ratingTarget, setRatingTarget] = useState<HydratedRecommendation | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      return;
    }

    setLoading(true);
    try {
      const [recommendations, homeFeed] = await Promise.all([
        getIncomingPendingRecommendations(user.id),
        getHomeFeed(user.id)
      ]);

      const hydratedInbox = await Promise.all(
        recommendations.map(async (recommendation) => ({
          ...recommendation,
          tmdb: await getTmdbTitle(recommendation.tmdb_id, recommendation.media_type)
        }))
      );

      setInbox(hydratedInbox);
      setFeed(homeFeed);
      void syncInboxNotifications(hydratedInbox);
    } catch (error) {
      Alert.alert("Could not load home", (error as Error).message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  async function submitRating(input: { stars: number; notes: string; isFavorite: boolean }) {
    if (!user || !ratingTarget) {
      return;
    }

    await markRecommendationWatchedAndRate({
      recommendation: ratingTarget,
      currentUserId: user.id,
      stars: input.stars,
      notes: input.notes,
      isFavorite: input.isFavorite
    });

    const comparison = formatComparison(ratingTarget.estimated_rating, input.stars);
    if (comparison) {
      Alert.alert(
        "Review sent",
        `Estimate: ${formatStarRating(comparison.estimated)} ★\nYour rating: ${formatStarRating(comparison.actual)} ★\n${comparison.diffText}`
      );
    }

    setRatingTarget(null);
    await load();
  }

  function openCategory(slug: HomeCategorySlug) {
    router.push({ pathname: "/category/[slug]", params: { slug } });
  }

  return (
    <Screen scroll stickyHeaderIndices={[0]} edges={["top", "left", "right"]}>
      <View style={styles.appHeader}>
        <Text style={styles.appTitle}>Curator</Text>
      </View>

      {loading ? <Text style={styles.muted}>Loading...</Text> : null}

      <HomeSection
        title="Inbox"
        count={inbox.length}
        emptyMessage={!loading ? "Inbox is clear." : undefined}
        onHeaderPress={() => openCategory("inbox")}
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
                  onPress={() => setSelectedRecommendation(item)}
                />
              </View>
            ))}
          </ScrollView>
        ) : null}
      </HomeSection>

      <HomeSection
        title="Friends Rated Highly"
        subtitle="Loved in your network — not sent to you yet."
        emptyMessage="No high ratings from friends yet."
        onHeaderPress={() => openCategory("friends-rated-highly")}
        data={feed.friendsRatedHighly}
        keyExtractor={(item) => `frh-${item.media_type}-${item.tmdb_id}`}
        renderItem={(item) => (
          <FeedTitleCard
            tmdb={item.tmdb}
            subtitle={item.avg_rating ? `${formatStarRating(Number(item.avg_rating))} ★ avg` : undefined}
            meta={item.rating_count ? `${item.rating_count} ratings` : undefined}
          />
        )}
      />

      <HomeSection
        title="Popular This Week"
        subtitle="Trending on Curator."
        emptyMessage="Nothing trending yet."
        onHeaderPress={() => openCategory("popular-this-week")}
        data={feed.popularThisWeek}
        keyExtractor={(item) => `pop-${item.media_type}-${item.tmdb_id}`}
        renderItem={(item) => (
          <FeedTitleCard
            tmdb={item.tmdb}
            subtitle={item.avg_rating ? `${formatStarRating(Number(item.avg_rating))} ★ avg` : undefined}
            meta={item.rating_count ? `${item.rating_count} ratings` : undefined}
          />
        )}
      />

      <HomeSection
        title="New From Friends"
        subtitle="Recently watched or rated in your network."
        emptyMessage="No recent friend activity yet."
        onHeaderPress={() => openCategory("new-from-friends")}
        data={feed.newFromFriends}
        keyExtractor={(item) => `nff-${item.user_id}-${item.media_type}-${item.tmdb_id}-${item.rated_at}`}
        renderItem={(item) => (
          <FeedTitleCard
            tmdb={item.tmdb}
            subtitle={`${formatStarRating(Number(item.rating_value))} ★`}
            user={{ username: item.username, avatar_url: item.avatar_url }}
          />
        )}
      />

      <HomeSection
        title="Friends With High Trust Scores"
        subtitle="Your best taste matches and their latest picks."
        emptyMessage="Rate more recommendations to build trust scores."
        onHeaderPress={() => openCategory("high-trust-friends")}
        data={feed.highTrustFriends}
        keyExtractor={(item) => `htf-${item.friend_id}-${item.media_type}-${item.tmdb_id}`}
        renderItem={(item) => (
          <TrustFriendCard
            tmdb={item.tmdb}
            username={item.username}
            avatarUrl={item.avatar_url}
            trustScore={Number(item.trust_score)}
            rating={Number(item.rating_value)}
          />
        )}
      />

      <HomeSection
        title="From People With High Trust Scores"
        subtitle="Platform-wide picks from trusted recommenders."
        emptyMessage="Not enough trust data yet."
        onHeaderPress={() => openCategory("trusted-recommenders")}
        data={feed.trustedRecommenders}
        keyExtractor={(item) => `tr-${item.media_type}-${item.tmdb_id}`}
        renderItem={(item) => (
          <FeedTitleCard
            tmdb={item.tmdb}
            subtitle={item.avg_rating ? `${formatStarRating(Number(item.avg_rating))} ★ avg` : undefined}
            meta={item.rating_count ? `${item.rating_count} ratings` : undefined}
          />
        )}
      />

      <HomeSection
        title="From People With Your Taste"
        subtitle="Titles from users whose ratings match yours."
        emptyMessage="Rate a few titles to unlock taste matches."
        onHeaderPress={() => openCategory("taste-matches")}
        data={feed.tasteMatches}
        keyExtractor={(item) => `taste-${item.media_type}-${item.tmdb_id}`}
        renderItem={(item) => (
          <FeedTitleCard
            tmdb={item.tmdb}
            subtitle={item.avg_rating ? `${formatStarRating(Number(item.avg_rating))} ★ avg` : undefined}
            meta={item.match_score ? `${Math.round(Number(item.match_score) * 100)}% taste match` : undefined}
          />
        )}
      />

      <RecommendationActionModal
        visible={Boolean(selectedRecommendation)}
        recommendation={selectedRecommendation}
        tmdb={selectedRecommendation?.tmdb}
        onClose={() => setSelectedRecommendation(null)}
        onWatchLater={() => setSelectedRecommendation(null)}
        onMarkWatched={() => {
          if (selectedRecommendation) {
            setRatingTarget(selectedRecommendation);
          }
          setSelectedRecommendation(null);
        }}
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

const styles = StyleSheet.create({
  appHeader: {
    backgroundColor: colors.background,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    marginHorizontal: -spacing.lg,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm
  },
  appTitle: {
    color: colors.text,
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: -0.8
  },
  inboxContent: {
    gap: INBOX_GAP,
    paddingRight: spacing.lg
  },
  inboxItem: {
    flexShrink: 0
  },
  muted: {
    color: colors.muted
  }
});
