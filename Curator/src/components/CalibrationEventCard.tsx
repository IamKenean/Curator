import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import {
  formatRecAccuracy,
  formatRelativeRatedAt,
  formatTrustDelta
} from "../lib/calibrationEvents";
import { formatComparison, formatStarRating } from "../lib/ratings";
import { useTheme } from "../providers/ThemeProvider";
import type { ColorScheme } from "../theme/colorSchemes";
import { posterBaseUrl, spacing } from "../theme";
import type { CalibrationEvent } from "../types";
import { UserAvatar } from "./UserAvatar";

const POSTER_WIDTH = 72;

type CalibrationEventCardProps = {
  event: CalibrationEvent;
  onPress?: () => void;
};

export function CalibrationEventCard({ event, onPress }: CalibrationEventCardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const friendUsername = event.friend?.username ?? "friend";
  const title = event.tmdb?.title ?? `TMDB #${event.tmdb_id}`;
  const year = event.tmdb?.year ?? "";
  const posterUri = event.tmdb?.poster_path ? `${posterBaseUrl}${event.tmdb.poster_path}` : undefined;
  const comparison = formatComparison(event.estimated_rating, event.actual_rating);
  const trust = formatTrustDelta({
    trustBefore: event.trust_before,
    trustAfter: event.trust_after,
    trustDeltaPercent: event.trust_delta_percent
  });
  const recAccuracyLabel = formatRecAccuracy(event.rec_accuracy);
  const trustToneColor =
    trust.deltaTone === "up"
      ? colors.success
      : trust.deltaTone === "down"
        ? colors.accent
        : trust.deltaTone === "new"
          ? colors.star
          : colors.muted;

  const trustLine =
    event.event_type === "received"
      ? trust.beforeLabel
        ? `Your trust in @${friendUsername}: ${trust.beforeLabel} → ${trust.afterLabel} (${trust.deltaLabel})`
        : `Your trust in @${friendUsername}: ${trust.deltaLabel}`
      : trust.beforeLabel
        ? `@${friendUsername}'s trust in you: ${trust.beforeLabel} → ${trust.afterLabel} (${trust.deltaLabel})`
        : `@${friendUsername}'s trust in you: ${trust.deltaLabel}`;

  const contextLine =
    event.event_type === "received"
      ? `@${friendUsername} sent this to you`
      : `You sent this to @${friendUsername}`;

  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && onPress && styles.cardPressed]}
    >
      <View style={styles.headerRow}>
        {posterUri ? (
          <Image source={{ uri: posterUri }} style={styles.poster} />
        ) : (
          <View style={[styles.poster, styles.posterFallback]}>
            <Text style={styles.posterFallbackText}>No Poster</Text>
          </View>
        )}
        <View style={styles.headerCopy}>
          <Text numberOfLines={2} style={styles.title}>
            {title}
            {year ? ` (${year})` : ""}
          </Text>
          <Text style={styles.mediaMeta}>
            {event.media_type} {year ? `· ${year}` : ""}
          </Text>
        </View>
      </View>

      <View style={styles.contextRow}>
        <UserAvatar
          user={{
            id: event.friend_user_id,
            username: friendUsername,
            avatar_url: event.friend?.avatar_url ?? null,
            created_at: ""
          }}
          size={20}
        />
        <Text style={styles.contextText}>{contextLine}</Text>
      </View>

      {event.reason ? <Text style={styles.reason}>"{event.reason}"</Text> : null}

      <View style={styles.ratingBlock}>
        {comparison ? (
          <>
            <Text style={styles.predictionLine}>
              Predicted {formatStarRating(comparison.estimated)}★ → Actual {formatStarRating(comparison.actual)}★
            </Text>
            <Text style={styles.diffLine}>{comparison.diffText}</Text>
          </>
        ) : (
          <Text style={styles.predictionLine}>You gave {formatStarRating(event.actual_rating)}★</Text>
        )}
      </View>

      {event.rec_accuracy > 0 ? (
        <View style={styles.accuracyRow}>
          <Ionicons name="checkmark-circle" size={13} color={colors.success} />
          <Text style={styles.accuracyText}>{recAccuracyLabel} on this rec</Text>
        </View>
      ) : null}

      <Text style={[styles.trustLine, { color: trustToneColor }]}>{trustLine}</Text>

      {event.notes ? <Text style={styles.notes}>"{event.notes}"</Text> : null}
      {event.is_favorite ? <Text style={styles.favorite}>♥ Favorite</Text> : null}

      <Text style={styles.timestamp}>{formatRelativeRatedAt(event.rated_at)}</Text>
    </Pressable>
  );
}

function createStyles(colors: ColorScheme) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: 14,
      borderWidth: 1,
      gap: spacing.sm,
      padding: spacing.md
    },
    cardPressed: {
      opacity: 0.92
    },
    headerRow: {
      flexDirection: "row",
      gap: spacing.md
    },
    poster: {
      backgroundColor: colors.border,
      borderRadius: 8,
      height: POSTER_WIDTH * 1.45,
      width: POSTER_WIDTH
    },
    posterFallback: {
      alignItems: "center",
      justifyContent: "center"
    },
    posterFallbackText: {
      color: colors.muted,
      fontSize: 10,
      fontWeight: "700"
    },
    headerCopy: {
      flex: 1,
      gap: 4,
      justifyContent: "center",
      minWidth: 0
    },
    title: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "800",
      lineHeight: 20
    },
    mediaMeta: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: "600",
      textTransform: "capitalize"
    },
    contextRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: spacing.sm
    },
    contextText: {
      color: colors.text,
      flex: 1,
      fontSize: 12,
      fontWeight: "700"
    },
    reason: {
      color: colors.muted,
      fontStyle: "italic",
      fontSize: 12,
      lineHeight: 17
    },
    ratingBlock: {
      gap: 2
    },
    predictionLine: {
      color: colors.text,
      fontSize: 13,
      fontWeight: "700"
    },
    diffLine: {
      color: colors.star,
      fontSize: 12,
      fontWeight: "700"
    },
    accuracyRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: spacing.xs
    },
    accuracyText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: "700"
    },
    trustLine: {
      fontSize: 12,
      fontWeight: "700",
      lineHeight: 17
    },
    notes: {
      color: colors.muted,
      fontSize: 12,
      fontStyle: "italic",
      lineHeight: 17
    },
    favorite: {
      color: colors.star,
      fontSize: 12,
      fontWeight: "800"
    },
    timestamp: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: "600"
    }
  });
}
