import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { trustScoreToPercent } from "../lib/ratings";
import { useTheme } from "../providers/ThemeProvider";
import type { ColorScheme } from "../theme/colorSchemes";
import { spacing } from "../theme";
import type { FriendListItem } from "../lib/friendInsights";
import { UserAvatar } from "./UserAvatar";

type FriendCardProps = {
  item: FriendListItem;
  onPress: () => void;
  width?: number;
};

export function FriendCard({ item, onPress, width }: FriendCardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const trustPercent = item.trustScore ? trustScoreToPercent(item.trustScore.score) : null;
  const scoreMeta = item.trustScore
    ? `${item.trustScore.total_recs} prediction${item.trustScore.total_recs === 1 ? "" : "s"} rated`
    : item.activityLine;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.scoreItemBox, width ? { width } : null, pressed && styles.cardPressed]}
    >
      <View style={styles.scoreCopy}>
        <View style={styles.nameRow}>
          <UserAvatar profile={item.friend} size={36} />
          <Text style={styles.name} numberOfLines={1}>
            @{item.friend.username}
          </Text>
          {item.pendingFromThem > 0 ? (
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingBadgeText}>{item.pendingFromThem}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.scoreMeta} numberOfLines={2}>
          {scoreMeta}
        </Text>
      </View>
      <Text style={styles.percent}>{trustPercent != null ? `${trustPercent}%` : "—"}</Text>
    </Pressable>
  );
}

function createStyles(colors: ColorScheme) {
  return StyleSheet.create({
    scoreItemBox: {
      alignItems: "center",
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderRadius: 12,
      borderWidth: 1,
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2
    },
    cardPressed: {
      opacity: 0.88
    },
    scoreCopy: {
      flex: 1,
      gap: spacing.xs,
      minWidth: 0,
      paddingRight: spacing.sm
    },
    nameRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: spacing.sm
    },
    name: {
      color: colors.text,
      flex: 1,
      fontSize: 16,
      fontWeight: "800"
    },
    scoreMeta: {
      color: colors.muted,
      fontSize: 12,
      lineHeight: 16,
      paddingLeft: 44
    },
    percent: {
      color: colors.accent,
      fontSize: 26,
      fontWeight: "900"
    },
    pendingBadge: {
      alignItems: "center",
      backgroundColor: colors.accent,
      borderRadius: 999,
      height: 22,
      justifyContent: "center",
      minWidth: 22,
      paddingHorizontal: spacing.xs
    },
    pendingBadgeText: {
      color: colors.text,
      fontSize: 11,
      fontWeight: "900"
    }
  });
}
