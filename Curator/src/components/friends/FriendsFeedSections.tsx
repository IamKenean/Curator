import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { formatStarRating } from "../../lib/ratings";
import { timeAgoLabel } from "../../lib/friendsFeed";
import type {
  FriendReviewItem,
  FriendsLeaderboardPreview,
  LovedThisWeekItem,
  TrendingCircleItem
} from "../../lib/friendsFeed";
import { useTheme } from "../../providers/ThemeProvider";
import type { ColorScheme } from "../../theme";
import { posterBaseUrl, spacing } from "../../theme";
import type { FriendActivityFeedItem, TmdbSearchResult } from "../../types";
import { UserAvatar } from "../UserAvatar";

const LOVED_POSTER_WIDTH = 108;
const TRENDING_CARD_WIDTH = 248;
const ACTIVITY_POSTER_WIDTH = 44;

type FriendsFeedSectionsProps = {
  lovedThisWeek: LovedThisWeekItem[];
  reviews: FriendReviewItem[];
  trending: TrendingCircleItem[];
  latestActivity: FriendActivityFeedItem[];
  leaderboard: FriendsLeaderboardPreview;
  onSeeAll: (slug: string) => void;
  onOpenProfile: (userId: string) => void;
  onOpenFilm: (tmdb: TmdbSearchResult) => void;
};

function SectionHeader({
  emoji,
  title,
  onSeeAll,
  styles
}: {
  emoji: string;
  title: string;
  onSeeAll?: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>
        {emoji} {title}
      </Text>
      {onSeeAll ? (
        <Pressable hitSlop={8} onPress={onSeeAll}>
          <Text style={styles.seeAll}>See all</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function FriendAvatarStack({
  friends,
  styles,
  max = 3
}: {
  friends: { user_id: string; username: string; avatar_url: string | null }[];
  styles: ReturnType<typeof createStyles>;
  max?: number;
}) {
  const visible = friends.slice(0, max);
  const extra = Math.max(0, friends.length - visible.length);

  if (visible.length === 0) {
    return null;
  }

  return (
    <View style={styles.avatarStack}>
      {visible.map((friend, index) => (
        <View key={friend.user_id} style={[styles.avatarStackItem, index > 0 && styles.avatarStackOverlap]}>
          <UserAvatar
            user={{
              id: friend.user_id,
              username: friend.username,
              avatar_url: friend.avatar_url,
              created_at: ""
            }}
            size={20}
          />
        </View>
      ))}
      {extra > 0 ? <Text style={styles.avatarStackExtra}>+{extra}</Text> : null}
    </View>
  );
}

function StarRow({ rating, color }: { rating: number; color: string }) {
  const fullStars = Math.round(rating);
  return (
    <View style={{ flexDirection: "row", gap: 1 }}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Ionicons
          key={index}
          name={index < fullStars ? "star" : "star-outline"}
          size={11}
          color={color}
        />
      ))}
    </View>
  );
}

function PosterThumb({
  tmdb,
  width,
  styles
}: {
  tmdb?: TmdbSearchResult;
  width: number;
  styles: ReturnType<typeof createStyles>;
}) {
  const uri = tmdb?.poster_path ? `${posterBaseUrl}${tmdb.poster_path}` : undefined;
  const height = width * 1.45;

  return uri ? (
    <Image source={{ uri }} style={[styles.poster, { width, height }]} />
  ) : (
    <View style={[styles.poster, styles.posterFallback, { width, height }]}>
      <Text style={styles.posterFallbackText}>?</Text>
    </View>
  );
}

export function FriendsFeedSections({
  lovedThisWeek,
  reviews,
  trending,
  latestActivity,
  leaderboard,
  onSeeAll,
  onOpenProfile,
  onOpenFilm
}: FriendsFeedSectionsProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.wrap}>
      {lovedThisWeek.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader
            emoji="❤️"
            title="Loved this week"
            onSeeAll={() => onSeeAll("friends-rated-highly")}
            styles={styles}
          />
          <ScrollView
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.lovedScroll}
          >
            {lovedThisWeek.map((item) => (
              <Pressable
                key={item.key}
                onPress={() => item.tmdb && onOpenFilm(item.tmdb)}
                style={({ pressed }) => [styles.lovedCard, pressed && styles.cardPressed]}
              >
                <View style={styles.lovedPosterWrap}>
                  <PosterThumb tmdb={item.tmdb} width={LOVED_POSTER_WIDTH} styles={styles} />
                  <View style={styles.lovedBadge}>
                    <FriendAvatarStack friends={item.friends} styles={styles} />
                    {item.friendCount > 0 && item.friends.length === 0 ? (
                      <Text style={styles.lovedCount}>{item.friendCount} friends</Text>
                    ) : null}
                  </View>
                </View>
                <Text numberOfLines={2} style={styles.lovedTitle}>
                  {item.tmdb?.title ?? "Unknown"}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <View style={styles.sectionDivider} />
        </View>
      ) : null}

      {trending.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader
            emoji="🔥"
            title="Trending in your circle"
            onSeeAll={() => onSeeAll("friends-top-10")}
            styles={styles}
          />
          <ScrollView
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.trendingScroll}
          >
            {trending.map((item) => (
              <Pressable
                key={item.key}
                onPress={() => item.tmdb && onOpenFilm(item.tmdb)}
                style={({ pressed }) => [styles.trendingCard, pressed && styles.cardPressed]}
              >
                <PosterThumb tmdb={item.tmdb} width={72} styles={styles} />
                <View style={styles.trendingCopy}>
                  <Text numberOfLines={2} style={styles.trendingTitle}>
                    {item.title}
                  </Text>
                  <Text style={styles.trendingMeta}>
                    {item.friendCount} friend{item.friendCount === 1 ? "" : "s"}{" "}
                    {item.kind === "watched" ? "watched" : "recommended"}
                  </Text>
                  <FriendAvatarStack friends={item.friends} styles={styles} max={4} />
                </View>
              </Pressable>
            ))}
          </ScrollView>
          <View style={styles.sectionDivider} />
        </View>
      ) : null}

      {reviews.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader emoji="✍️" title="Recently reviewed" styles={styles} />
          <View style={styles.reviewList}>
            {reviews.map((item) => (
              <Pressable
                key={item.key}
                onPress={() => item.activity.tmdb && onOpenFilm(item.activity.tmdb)}
                style={({ pressed }) => [styles.reviewRow, pressed && styles.cardPressed]}
              >
                <Pressable onPress={() => onOpenProfile(item.activity.user_id)} style={styles.reviewLeft}>
                  <UserAvatar
                    user={{
                      id: item.activity.user_id,
                      username: item.activity.username,
                      avatar_url: item.activity.avatar_url,
                      created_at: ""
                    }}
                    size={36}
                  />
                  <View style={styles.reviewCopy}>
                    <Text style={styles.reviewUser}>@{item.activity.username}</Text>
                    <StarRow rating={item.activity.rating_value} color={colors.star} />
                    <Text numberOfLines={2} style={styles.reviewQuote}>
                      "{item.reviewSnippet}"
                    </Text>
                  </View>
                </Pressable>
                <PosterThumb tmdb={item.activity.tmdb} width={48} styles={styles} />
              </Pressable>
            ))}
          </View>
          <View style={styles.sectionDivider} />
        </View>
      ) : null}

      {latestActivity.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader
            emoji="🎬"
            title="Latest activity"
            onSeeAll={() => onSeeAll("new-from-friends")}
            styles={styles}
          />
          <View style={styles.activityList}>
            {latestActivity.map((item) => (
              <Pressable
                key={`${item.user_id}-${item.tmdb_id}-${item.rated_at}`}
                onPress={() => item.tmdb && onOpenFilm(item.tmdb)}
                style={({ pressed }) => [styles.activityRow, pressed && styles.cardPressed]}
              >
                <Pressable onPress={() => onOpenProfile(item.user_id)} style={styles.activityLeft}>
                  <UserAvatar
                    user={{
                      id: item.user_id,
                      username: item.username,
                      avatar_url: item.avatar_url,
                      created_at: ""
                    }}
                    size={40}
                  />
                  <View style={styles.activityCopy}>
                    <Text style={styles.activityUser}>
                      <Text style={styles.activityName}>@{item.username}</Text>
                      <Text style={styles.activityVerb}> watched and rated</Text>
                    </Text>
                    <Text numberOfLines={1} style={styles.activityTitle}>
                      {item.tmdb?.title ?? "Unknown title"}
                    </Text>
                    <View style={styles.activityMeta}>
                      <StarRow rating={item.rating_value} color={colors.star} />
                      <Text style={styles.activityRating}>{formatStarRating(item.rating_value)}</Text>
                      <Text style={styles.activityTime}>{timeAgoLabel(item.rated_at)}</Text>
                    </View>
                  </View>
                </Pressable>
                <PosterThumb tmdb={item.tmdb} width={ACTIVITY_POSTER_WIDTH} styles={styles} />
              </Pressable>
            ))}
          </View>
          <View style={styles.sectionDivider} />
        </View>
      ) : null}

      <View style={styles.section}>
        <SectionHeader
          emoji="🏆"
          title="Leaderboard preview"
          onSeeAll={() => onSeeAll("high-trust-friends")}
          styles={styles}
        />
        <View style={styles.leaderboardRow}>
          <Pressable
            disabled={!leaderboard.topTrust}
            onPress={() => leaderboard.topTrust && onOpenProfile(leaderboard.topTrust.friendId)}
            style={styles.leaderboardCard}
          >
            <Ionicons name="star" size={14} color={colors.star} />
            <Text style={styles.leaderboardLabel}>Top trust</Text>
            <Text numberOfLines={1} style={styles.leaderboardValue}>
              {leaderboard.topTrust ? `${leaderboard.topTrust.username} ${leaderboard.topTrust.percent}%` : "—"}
            </Text>
          </Pressable>

          <Pressable
            disabled={!leaderboard.topTaste}
            onPress={() => leaderboard.topTaste && onOpenProfile(leaderboard.topTaste.friendId)}
            style={styles.leaderboardCard}
          >
            <Ionicons name="heart" size={14} color={colors.accent} />
            <Text style={styles.leaderboardLabel}>Taste match</Text>
            <Text numberOfLines={1} style={styles.leaderboardValue}>
              {leaderboard.topTaste ? `${leaderboard.topTaste.username} ${leaderboard.topTaste.percent}%` : "—"}
            </Text>
          </Pressable>

          <Pressable
            disabled={!leaderboard.mostActive}
            onPress={() => leaderboard.mostActive && onOpenProfile(leaderboard.mostActive.friendId)}
            style={styles.leaderboardCard}
          >
            <Ionicons name="pulse" size={14} color={colors.success} />
            <Text style={styles.leaderboardLabel}>Most active</Text>
            <Text numberOfLines={2} style={styles.leaderboardValue}>
              {leaderboard.mostActive?.username ?? "—"}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function createStyles(colors: ColorScheme) {
  return StyleSheet.create({
    wrap: {
      gap: spacing.lg
    },
    section: {
      gap: spacing.sm
    },
    sectionDivider: {
      backgroundColor: colors.border,
      height: 1,
      marginTop: spacing.sm
    },
    sectionHeader: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: spacing.xs
    },
    sectionTitle: {
      color: colors.text,
      fontSize: 13,
      fontWeight: "800",
      letterSpacing: 0.2
    },
    seeAll: {
      color: colors.accent,
      fontSize: 12,
      fontWeight: "800"
    },
    divider: {
      backgroundColor: colors.border,
      height: 1,
      marginVertical: spacing.xs
    },
    lovedScroll: {
      gap: spacing.md,
      paddingHorizontal: spacing.xs
    },
    lovedCard: {
      gap: spacing.xs,
      width: LOVED_POSTER_WIDTH
    },
    lovedPosterWrap: {
      position: "relative"
    },
    lovedBadge: {
      alignItems: "center",
      bottom: spacing.xs,
      flexDirection: "row",
      gap: spacing.xs,
      left: spacing.xs,
      position: "absolute"
    },
    lovedCount: {
      color: colors.text,
      fontSize: 10,
      fontWeight: "800"
    },
    lovedTitle: {
      color: colors.text,
      fontSize: 12,
      fontWeight: "700",
      lineHeight: 15
    },
    trendingScroll: {
      gap: spacing.sm,
      paddingHorizontal: spacing.xs
    },
    trendingCard: {
      alignItems: "center",
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: 14,
      borderWidth: 1,
      flexDirection: "row",
      gap: spacing.sm,
      padding: spacing.sm,
      width: TRENDING_CARD_WIDTH
    },
    trendingCopy: {
      flex: 1,
      gap: spacing.xs,
      minWidth: 0
    },
    trendingTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "800",
      lineHeight: 18
    },
    trendingMeta: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: "600"
    },
    reviewList: {
      gap: spacing.sm
    },
    reviewRow: {
      alignItems: "center",
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: 14,
      borderWidth: 1,
      flexDirection: "row",
      gap: spacing.sm,
      padding: spacing.sm
    },
    reviewLeft: {
      alignItems: "center",
      flex: 1,
      flexDirection: "row",
      gap: spacing.sm,
      minWidth: 0
    },
    reviewCopy: {
      flex: 1,
      gap: 3,
      minWidth: 0
    },
    reviewUser: {
      color: colors.text,
      fontSize: 13,
      fontWeight: "800"
    },
    reviewQuote: {
      color: colors.muted,
      fontSize: 12,
      fontStyle: "italic",
      lineHeight: 16
    },
    activityList: {
      gap: spacing.sm
    },
    activityRow: {
      alignItems: "center",
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: 14,
      borderWidth: 1,
      flexDirection: "row",
      gap: spacing.sm,
      padding: spacing.sm
    },
    activityLeft: {
      alignItems: "center",
      flex: 1,
      flexDirection: "row",
      gap: spacing.sm,
      minWidth: 0
    },
    activityCopy: {
      flex: 1,
      gap: 2,
      minWidth: 0
    },
    activityUser: {
      fontSize: 12,
      lineHeight: 16
    },
    activityName: {
      color: colors.text,
      fontWeight: "800"
    },
    activityVerb: {
      color: colors.muted,
      fontWeight: "600"
    },
    activityTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "800"
    },
    activityMeta: {
      alignItems: "center",
      flexDirection: "row",
      gap: spacing.xs
    },
    activityRating: {
      color: colors.star,
      fontSize: 11,
      fontWeight: "800"
    },
    activityTime: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: "600"
    },
    leaderboardRow: {
      flexDirection: "row",
      gap: spacing.sm
    },
    leaderboardCard: {
      alignItems: "flex-start",
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: 12,
      borderWidth: 1,
      flex: 1,
      gap: spacing.xs,
      minHeight: 88,
      padding: spacing.sm
    },
    leaderboardLabel: {
      color: colors.muted,
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 0.4,
      textTransform: "uppercase"
    },
    leaderboardValue: {
      color: colors.text,
      fontSize: 12,
      fontWeight: "800",
      lineHeight: 15
    },
    poster: {
      backgroundColor: colors.border,
      borderRadius: 10
    },
    posterFallback: {
      alignItems: "center",
      justifyContent: "center"
    },
    posterFallbackText: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: "700"
    },
    avatarStack: {
      alignItems: "center",
      flexDirection: "row"
    },
    avatarStackItem: {
      borderColor: colors.card,
      borderRadius: 999,
      borderWidth: 2
    },
    avatarStackOverlap: {
      marginLeft: -8
    },
    avatarStackExtra: {
      color: colors.text,
      fontSize: 10,
      fontWeight: "800",
      marginLeft: spacing.xs
    },
    cardPressed: {
      opacity: 0.9
    }
  });
}
