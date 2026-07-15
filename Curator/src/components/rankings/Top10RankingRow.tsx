import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import { getTmdbTitleDetail } from "../../lib/tmdb";
import { useTheme } from "../../providers/ThemeProvider";
import type { ColorScheme } from "../../theme/colorSchemes";
import { backdropBaseUrl, posterBaseUrl, spacing } from "../../theme";
import type { TmdbTitleDetail, UserRanking } from "../../types";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_WIDTH = SCREEN_WIDTH - spacing.sm * 4;
const CARD_HEIGHT_FIRST = Math.round(CARD_WIDTH * 1.08);
const CARD_HEIGHT_DEFAULT = Math.round(CARD_WIDTH * 0.94);
const HERO_HEIGHT_FIRST = Math.round(CARD_WIDTH * 0.56);
const HERO_HEIGHT_DEFAULT = Math.round(CARD_WIDTH * 0.46);
const POSTER_WIDTH_FIRST = 96;
const POSTER_HEIGHT_FIRST = 144;
const POSTER_WIDTH_DEFAULT = 80;
const POSTER_HEIGHT_DEFAULT = 120;
const POSTER_OVERHANG = 36;

type Top10RankingRowProps = {
  item: UserRanking;
  drag?: () => void;
  isActive?: boolean;
  onRemove?: () => void;
};

function HeroFade({ backgroundColor, height }: { backgroundColor: string; height: number }) {
  return (
    <LinearGradient
      colors={["transparent", backgroundColor]}
      locations={[0.2, 1]}
      pointerEvents="none"
      style={[fadeStyles.fade, { height: height * 0.9 }]}
    />
  );
}

const fadeStyles = StyleSheet.create({
  fade: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0
  }
});

export function Top10RankingRow({ item, drag, isActive, onRemove }: Top10RankingRowProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [detail, setDetail] = useState<TmdbTitleDetail | null>(null);
  const isFirst = item.rank_position === 1;
  const cardHeight = isFirst ? CARD_HEIGHT_FIRST : CARD_HEIGHT_DEFAULT;
  const heroHeight = isFirst ? HERO_HEIGHT_FIRST : HERO_HEIGHT_DEFAULT;
  const posterWidth = isFirst ? POSTER_WIDTH_FIRST : POSTER_WIDTH_DEFAULT;
  const posterHeight = isFirst ? POSTER_HEIGHT_FIRST : POSTER_HEIGHT_DEFAULT;

  useEffect(() => {
    let cancelled = false;
    void getTmdbTitleDetail(item.tmdb_id, item.media_type)
      .then((loaded) => {
        if (!cancelled) {
          setDetail(loaded);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDetail(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [item.media_type, item.tmdb_id]);

  const display = detail ?? item.tmdb;
  const posterUri = display?.poster_path ? `${posterBaseUrl}${display.poster_path}` : undefined;
  const backdropUri = detail?.backdrop_path ? `${backdropBaseUrl}${detail.backdrop_path}` : null;
  const yearLabel = display?.year && display.year !== "Unknown" ? display.year : null;

  function confirmRemove() {
    Alert.alert("Remove from Top 10?", "The film stays rated — it just leaves your canon.", [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: onRemove }
    ]);
  }

  return (
    <View style={[styles.card, { minHeight: cardHeight }, isFirst && styles.cardFirst, isActive && styles.cardActive]}>
      <View style={styles.rankHeader}>
        <View style={styles.rankTitleGroup}>
          <Text style={[styles.rankText, isFirst && styles.rankTextFirst]}>#{item.rank_position}</Text>
          <View style={styles.titleGroup}>
            <Text numberOfLines={2} style={[styles.headerTitle, isFirst && styles.headerTitleFirst]}>
              {display?.title ?? "Unknown title"}
            </Text>
            {yearLabel ? <Text style={styles.headerYear}>{yearLabel}</Text> : null}
          </View>
        </View>
        {onRemove ? (
          <Pressable hitSlop={10} onPress={confirmRemove} style={styles.removeButton}>
            <Ionicons name="close" size={14} color={colors.text} />
          </Pressable>
        ) : null}
      </View>

      <View style={[styles.hero, { height: heroHeight }]}>
        <View style={styles.bannerClip} pointerEvents="none">
          {backdropUri ? (
            <Image resizeMode="cover" source={{ uri: backdropUri }} style={styles.banner} />
          ) : posterUri ? (
            <Image resizeMode="cover" source={{ uri: posterUri }} style={styles.banner} blurRadius={12} />
          ) : (
            <View style={[styles.banner, styles.bannerFallback]} />
          )}
          <View style={styles.bannerShade} />
          <HeroFade backgroundColor={colors.card} height={heroHeight} />
        </View>

        {posterUri ? (
          <View style={[styles.posterFrame, { width: posterWidth, height: posterHeight, bottom: -POSTER_OVERHANG }]}>
            <Image source={{ uri: posterUri }} style={styles.posterImage} />
          </View>
        ) : null}
      </View>

      <View style={[styles.body, { paddingTop: POSTER_OVERHANG + spacing.sm }]}>
        {detail?.tagline ? (
          <Text numberOfLines={1} style={styles.tagline}>
            {detail.tagline.toUpperCase()}
          </Text>
        ) : null}
        {display?.overview ? (
          <Text numberOfLines={isFirst ? 4 : 3} style={styles.overview}>
            {display.overview}
          </Text>
        ) : (
          <Text style={styles.overviewMuted}>No summary available yet.</Text>
        )}
      </View>

      {drag ? (
        <Pressable
          accessibilityRole="button"
          delayLongPress={140}
          onLongPress={drag}
          style={styles.dragBar}
        >
          <Ionicons name="reorder-three" size={18} color={colors.muted} />
          <Text style={styles.dragText}>Hold to reorder</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function createStyles(colors: ColorScheme) {
  return StyleSheet.create({
    card: {
      alignSelf: "center",
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: 16,
      borderWidth: 1,
      overflow: "visible",
      width: CARD_WIDTH
    },
    cardFirst: {
      borderColor: colors.accent,
      borderWidth: 1.5
    },
    cardActive: {
      opacity: 0.96,
      transform: [{ scale: 1.01 }]
    },
    rankHeader: {
      alignItems: "center",
      backgroundColor: "rgba(0,0,0,0.88)",
      borderTopLeftRadius: 15,
      borderTopRightRadius: 15,
      flexDirection: "row",
      gap: spacing.sm,
      justifyContent: "space-between",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2
    },
    rankTitleGroup: {
      alignItems: "center",
      flex: 1,
      flexDirection: "row",
      gap: spacing.sm,
      minWidth: 0
    },
    titleGroup: {
      flex: 1,
      gap: 1,
      minWidth: 0
    },
    headerTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "800",
      letterSpacing: -0.2,
      lineHeight: 18
    },
    headerTitleFirst: {
      fontSize: 18,
      lineHeight: 21
    },
    headerYear: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: "700"
    },
    hero: {
      overflow: "visible",
      position: "relative"
    },
    bannerClip: {
      ...StyleSheet.absoluteFillObject,
      overflow: "hidden"
    },
    banner: {
      ...StyleSheet.absoluteFillObject
    },
    bannerFallback: {
      backgroundColor: colors.border
    },
    bannerShade: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.2)"
    },
    rankText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "900",
      letterSpacing: -0.3
    },
    rankTextFirst: {
      color: colors.accent,
      fontSize: 22
    },
    removeButton: {
      alignItems: "center",
      justifyContent: "center",
      padding: spacing.xs
    },
    posterFrame: {
      borderColor: colors.border,
      borderRadius: 10,
      borderWidth: 1,
      overflow: "hidden",
      position: "absolute",
      right: spacing.md,
      zIndex: 2
    },
    posterImage: {
      height: "100%",
      width: "100%"
    },
    body: {
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.xs
    },
    tagline: {
      color: colors.muted,
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 0.6
    },
    overview: {
      color: colors.text,
      fontSize: 12,
      lineHeight: 17
    },
    overviewMuted: {
      color: colors.muted,
      fontSize: 12,
      lineHeight: 17
    },
    dragBar: {
      alignItems: "center",
      borderTopColor: colors.border,
      borderTopWidth: 1,
      flexDirection: "row",
      gap: spacing.xs,
      justifyContent: "center",
      paddingVertical: spacing.sm
    },
    dragText: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: "700"
    }
  });
}

export function Top10EmptySlotCard({
  isFirstSlot,
  readOnly = false
}: {
  isFirstSlot: boolean;
  readOnly?: boolean;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createEmptyStyles(colors), [colors]);
  const height = isFirstSlot && CARD_HEIGHT_FIRST > CARD_HEIGHT_DEFAULT ? CARD_HEIGHT_FIRST : CARD_HEIGHT_DEFAULT;

  return (
    <View style={[styles.card, { height: height * 0.42 }]}>
      <Text style={styles.text}>{readOnly ? "Open slot" : "Tap + to add"}</Text>
    </View>
  );
}

function createEmptyStyles(colors: ColorScheme) {
  return StyleSheet.create({
    card: {
      alignItems: "center",
      alignSelf: "center",
      borderColor: colors.border,
      borderRadius: 16,
      borderStyle: "dashed",
      borderWidth: 1,
      justifyContent: "center",
      width: CARD_WIDTH
    },
    text: {
      color: colors.muted,
      fontSize: 13,
      fontWeight: "700"
    }
  });
}
