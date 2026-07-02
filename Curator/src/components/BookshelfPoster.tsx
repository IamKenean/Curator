import { Image, StyleSheet, Text, View } from "react-native";
import { colors, posterBaseUrl, spacing } from "../theme";
import type { TmdbSearchResult } from "../types";

type BookshelfPosterProps = {
  tmdb?: TmdbSearchResult;
  subtitle?: string;
  meta?: string;
  width: number;
};

export function BookshelfPoster({ tmdb, subtitle, meta, width }: BookshelfPosterProps) {
  const posterUri = tmdb?.poster_path ? `${posterBaseUrl}${tmdb.poster_path}` : undefined;
  const height = width * 1.5;

  return (
    <View style={[styles.card, { width }]}>
      {posterUri ? (
        <Image source={{ uri: posterUri }} style={[styles.poster, { width, height }]} />
      ) : (
        <View style={[styles.poster, styles.fallback, { width, height }]}>
          <Text style={styles.fallbackText}>No Poster</Text>
        </View>
      )}
      {tmdb ? (
        <Text numberOfLines={2} style={styles.title}>
          {tmdb.title}
        </Text>
      ) : null}
      {subtitle ? (
        <Text numberOfLines={1} style={styles.subtitle}>
          {subtitle}
        </Text>
      ) : null}
      {meta ? (
        <Text numberOfLines={1} style={styles.meta}>
          {meta}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.xs
  },
  poster: {
    backgroundColor: colors.border,
    borderRadius: 8
  },
  fallback: {
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
    fontSize: 9,
    fontWeight: "700"
  }
});
