import { useMemo } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "../providers/ThemeProvider";
import type { ColorScheme } from "../theme/colorSchemes";
import { posterBaseUrl, spacing } from "../theme";
import type { TmdbSearchResult } from "../types";

type PosterCardProps = {
  item: TmdbSearchResult;
  selected?: boolean;
  compact?: boolean;
  onPress?: () => void;
};

export function PosterCard({ item, selected, compact = false, onPress }: PosterCardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const posterUri = item.poster_path ? `${posterBaseUrl}${item.poster_path}` : undefined;

  return (
    <TouchableOpacity
      accessibilityRole={onPress ? "button" : undefined}
      activeOpacity={0.85}
      disabled={!onPress}
      onPress={onPress}
      style={[styles.card, compact && styles.cardCompact, selected && styles.selected]}
    >
      {posterUri ? (
        <Image source={{ uri: posterUri }} style={[styles.poster, compact && styles.posterCompact]} />
      ) : (
        <View style={[styles.poster, compact && styles.posterCompact, styles.posterFallback]}>
          <Text style={[styles.posterFallbackText, compact && styles.posterFallbackTextCompact]}>No Poster</Text>
        </View>
      )}
      <View style={styles.meta}>
        <Text numberOfLines={compact ? 1 : 2} style={[styles.title, compact && styles.titleCompact]}>
          {item.title}
        </Text>
        <Text style={[styles.sub, compact && styles.subCompact]}>
          {item.year} · {item.media_type.toUpperCase()}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function createStyles(colors: ColorScheme) {
  return StyleSheet.create({
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
    cardCompact: {
      borderRadius: 10,
      gap: spacing.sm,
      padding: spacing.xs + 2
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
    posterCompact: {
      borderRadius: 8,
      height: 72,
      width: 48
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
    posterFallbackTextCompact: {
      fontSize: 9
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
    titleCompact: {
      fontSize: 14,
      lineHeight: 18
    },
    sub: {
      color: colors.muted,
      fontSize: 13,
      fontWeight: "700"
    },
    subCompact: {
      fontSize: 11
    }
  });
}
