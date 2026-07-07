import { useMemo } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { formatStarRating, trustScoreToPercent } from "../lib/ratings";
import { useTheme } from "../providers/ThemeProvider";
import type { ColorScheme } from "../theme/colorSchemes";
import { posterBaseUrl, spacing } from "../theme";
import type { TmdbSearchResult, UserProfile } from "../types";
import { UserAvatar } from "./UserAvatar";

export const FEED_CARD_WIDTH = 100;

type FeedTitleCardProps = {
  tmdb?: TmdbSearchResult;
  subtitle?: string;
  meta?: string;
  user?: Pick<UserProfile, "username" | "avatar_url">;
  onPress?: () => void;
};

export function FeedTitleCard({ tmdb, subtitle, meta, user, onPress }: FeedTitleCardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const posterUri = tmdb?.poster_path ? `${posterBaseUrl}${tmdb.poster_path}` : undefined;
  const posterHeight = FEED_CARD_WIDTH * 1.45;

  return (
    <Pressable disabled={!onPress} onPress={onPress} style={({ pressed }) => [styles.card, pressed && onPress && styles.cardPressed]}>
      {posterUri ? (
        <Image source={{ uri: posterUri }} style={[styles.poster, { height: posterHeight }]} />
      ) : (
        <View style={[styles.poster, styles.posterFallback, { height: posterHeight }]}>
          <Text style={styles.fallbackText}>No Poster</Text>
        </View>
      )}
      {tmdb ? (
        <Text numberOfLines={2} style={styles.title}>
          {tmdb.title}
        </Text>
      ) : null}
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {meta ? <Text style={styles.meta}>{meta}</Text> : null}
      {user ? (
        <View style={styles.userRow}>
          <UserAvatar
            user={{ id: user.username, username: user.username, avatar_url: user.avatar_url, created_at: "" }}
            size={16}
          />
          <Text numberOfLines={1} style={styles.username}>
            @{user.username}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export function TrustFriendCard({
  tmdb,
  username,
  avatarUrl,
  trustScore,
  rating,
  onPress
}: {
  tmdb?: TmdbSearchResult;
  username: string;
  avatarUrl: string | null;
  trustScore: number;
  rating: number;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.trustCard}>
      <View style={styles.trustHeader}>
        <UserAvatar user={{ id: username, username, avatar_url: avatarUrl, created_at: "" }} size={22} />
        <View style={styles.trustMeta}>
          <Text numberOfLines={1} style={styles.trustName}>
            @{username}
          </Text>
          <Text style={styles.trustScore}>{trustScoreToPercent(trustScore)}% trust</Text>
        </View>
      </View>
      <FeedTitleCard tmdb={tmdb} subtitle={`${formatStarRating(rating)} ★`} onPress={onPress} />
    </View>
  );
}

function createStyles(colors: ColorScheme) {
  return StyleSheet.create({
    card: {
      gap: spacing.xs,
      width: FEED_CARD_WIDTH
    },
    cardPressed: {
      opacity: 0.82
    },
    poster: {
      backgroundColor: colors.border,
      borderRadius: 10,
      width: FEED_CARD_WIDTH
    },
    posterFallback: {
      alignItems: "center",
      justifyContent: "center"
    },
    fallbackText: {
      color: colors.muted,
      fontSize: 10
    },
    title: {
      color: colors.text,
      fontSize: 11,
      fontWeight: "800",
      lineHeight: 14
    },
    subtitle: {
      color: colors.star,
      fontSize: 10,
      fontWeight: "700"
    },
    meta: {
      color: colors.muted,
      fontSize: 10,
      fontWeight: "700"
    },
    userRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: spacing.xs
    },
    username: {
      color: colors.muted,
      flex: 1,
      fontSize: 10,
      fontWeight: "700"
    },
    trustCard: {
      gap: spacing.sm,
      width: FEED_CARD_WIDTH
    },
    trustHeader: {
      alignItems: "center",
      flexDirection: "row",
      gap: spacing.sm
    },
    trustMeta: {
      flex: 1,
      gap: 2
    },
    trustName: {
      color: colors.text,
      fontSize: 11,
      fontWeight: "800"
    },
    trustScore: {
      color: colors.accent,
      fontSize: 10,
      fontWeight: "700"
    }
  });
}
