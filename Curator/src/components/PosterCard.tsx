import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colors, posterBaseUrl, spacing } from "../theme";
import type { TmdbSearchResult } from "../types";

type PosterCardProps = {
  item: TmdbSearchResult;
  selected?: boolean;
  onPress?: () => void;
};

export function PosterCard({ item, selected, onPress }: PosterCardProps) {
  const posterUri = item.poster_path ? `${posterBaseUrl}${item.poster_path}` : undefined;

  return (
    <TouchableOpacity
      accessibilityRole={onPress ? "button" : undefined}
      activeOpacity={0.85}
      disabled={!onPress}
      onPress={onPress}
      style={[styles.card, selected && styles.selected]}
    >
      {posterUri ? (
        <Image source={{ uri: posterUri }} style={styles.poster} />
      ) : (
        <View style={[styles.poster, styles.posterFallback]}>
          <Text style={styles.posterFallbackText}>No Poster</Text>
        </View>
      )}
      <View style={styles.meta}>
        <Text numberOfLines={2} style={styles.title}>
          {item.title}
        </Text>
        <Text style={styles.sub}>
          {item.year} · {item.media_type.toUpperCase()}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    overflow: "hidden",
    padding: spacing.sm
  },
  selected: {
    borderColor: colors.accent,
    borderWidth: 2
  },
  poster: {
    backgroundColor: colors.border,
    borderRadius: 10,
    height: 126,
    width: 84
  },
  posterFallback: {
    alignItems: "center",
    justifyContent: "center"
  },
  posterFallbackText: {
    color: colors.muted,
    fontSize: 12,
    textAlign: "center"
  },
  meta: {
    flex: 1,
    gap: spacing.sm,
    justifyContent: "center"
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800"
  },
  sub: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700"
  }
});
