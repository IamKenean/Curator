import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { formatStarRating } from "../lib/ratings";
import { colors, posterBaseUrl, spacing } from "../theme";
import type { Recommendation, TmdbSearchResult } from "../types";
import { UserAvatar } from "./UserAvatar";

type InboxFilmCardProps = {
  recommendation: Recommendation;
  tmdb?: TmdbSearchResult;
  width: number;
  onPress: () => void;
};

export function InboxFilmCard({ recommendation, tmdb, width, onPress }: InboxFilmCardProps) {
  const posterUri = tmdb?.poster_path ? `${posterBaseUrl}${tmdb.poster_path}` : undefined;
  const posterHeight = width * 1.45;

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.card, { width }]}>
      {posterUri ? (
        <Image source={{ uri: posterUri }} style={[styles.poster, { width, height: posterHeight }]} />
      ) : (
        <View style={[styles.poster, styles.posterFallback, { width, height: posterHeight }]}>
          <Text style={styles.posterFallbackText}>No Poster</Text>
        </View>
      )}
      <View style={styles.senderRow}>
        <UserAvatar user={recommendation.from_user} size={18} />
        <Text numberOfLines={1} style={styles.username}>
          @{recommendation.from_user?.username ?? "unknown"}
        </Text>
      </View>
      {recommendation.estimated_rating ? (
        <Text style={styles.estimate}>{formatStarRating(recommendation.estimated_rating)} ★ estimate</Text>
      ) : null}
      {recommendation.sender_rating ? (
        <Text style={styles.senderRating}>{formatStarRating(recommendation.sender_rating)} ★ their rating</Text>
      ) : null}
      {tmdb ? (
        <Text numberOfLines={1} style={styles.title}>
          {tmdb.title}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.xs
  },
  poster: {
    backgroundColor: colors.border,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1
  },
  posterFallback: {
    alignItems: "center",
    justifyContent: "center"
  },
  posterFallbackText: {
    color: colors.muted,
    fontSize: 9
  },
  senderRow: {
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
  estimate: {
    color: colors.star,
    fontSize: 10,
    fontWeight: "700"
  },
  senderRating: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "700"
  },
  title: {
    color: colors.text,
    fontSize: 11,
    fontWeight: "800"
  }
});
