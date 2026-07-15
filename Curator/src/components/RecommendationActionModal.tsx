import { useMemo } from "react";
import { Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { formatStarRating } from "../lib/ratings";
import { useTheme } from "../providers/ThemeProvider";
import type { ColorScheme } from "../theme";
import { posterBaseUrl, spacing } from "../theme";
import type { Recommendation, TmdbSearchResult } from "../types";
import { Button } from "./Button";
import { UserAvatar } from "./UserAvatar";

type RecommendationActionModalProps = {
  visible: boolean;
  recommendation: Recommendation | null;
  tmdb?: TmdbSearchResult;
  onClose: () => void;
  onWatchLater: () => void;
  onMarkWatched: () => void;
  onPosterPress?: () => void;
};

export function RecommendationActionModal({
  visible,
  recommendation,
  tmdb,
  onClose,
  onWatchLater,
  onMarkWatched,
  onPosterPress
}: RecommendationActionModalProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const posterUri = tmdb?.poster_path ? `${posterBaseUrl}${tmdb.poster_path}` : undefined;

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.senderRow}>
              <UserAvatar user={recommendation?.from_user} size={32} />
              <Text style={styles.sender}>@{recommendation?.from_user?.username ?? "unknown"}</Text>
            </View>
            <Pressable onPress={onClose}>
              <Text style={styles.close}>Close</Text>
            </Pressable>
          </View>

          {posterUri ? (
            <Pressable
              accessibilityRole="button"
              disabled={!onPosterPress}
              onPress={onPosterPress}
              style={styles.posterWrap}
            >
              <Image source={{ uri: posterUri }} style={styles.poster} />
            </Pressable>
          ) : null}

          {tmdb ? (
            <View style={styles.meta}>
              <Text style={styles.title}>{tmdb.title}</Text>
              <Text style={styles.sub}>
                {tmdb.year} · {tmdb.media_type.toUpperCase()}
              </Text>
            </View>
          ) : null}

          {recommendation?.estimated_rating ? (
            <Text style={styles.estimate}>Their estimate for you: {formatStarRating(recommendation.estimated_rating)} ★</Text>
          ) : null}
          {recommendation?.sender_rating ? (
            <Text style={styles.senderRating}>They rate it: {formatStarRating(recommendation.sender_rating)} ★</Text>
          ) : null}

          <View style={styles.actions}>
            <Button title="Watch Later" variant="secondary" onPress={onWatchLater} />
            <Button title="Mark as Watched" onPress={onMarkWatched} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: ColorScheme) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: "flex-end"
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.72)"
    },
    sheet: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      gap: spacing.lg,
      padding: spacing.lg,
      paddingBottom: spacing.xl
    },
    header: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between"
    },
    senderRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: spacing.sm
    },
    sender: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "800"
    },
    close: {
      color: colors.accent,
      fontSize: 15,
      fontWeight: "700"
    },
    posterWrap: {
      alignItems: "center"
    },
    poster: {
      backgroundColor: colors.border,
      borderRadius: 16,
      height: 240,
      width: 160
    },
    meta: {
      gap: spacing.xs
    },
    title: {
      color: colors.text,
      fontSize: 24,
      fontWeight: "900"
    },
    sub: {
      color: colors.muted,
      fontSize: 14,
      fontWeight: "700"
    },
    estimate: {
      color: colors.star,
      fontSize: 14,
      fontWeight: "700"
    },
    senderRating: {
      color: colors.muted,
      fontSize: 14,
      fontWeight: "700"
    },
    actions: {
      gap: spacing.md
    }
  });
}
