import { Pressable, StyleSheet, Text, View } from "react-native";
import { trustScoreToPercent } from "../lib/ratings";
import { trustColorForPercent } from "../lib/trustColors";
import { colors, spacing } from "../theme";
import type { FriendListItem } from "../lib/friendInsights";
import { UserAvatar } from "./UserAvatar";

type FriendCardProps = {
  item: FriendListItem;
  onPress: () => void;
  width?: number;
};

export function FriendCard({ item, onPress, width }: FriendCardProps) {
  const trustPercent = item.trustScore ? trustScoreToPercent(item.trustScore.score) : null;
  const trustColor = trustColorForPercent(trustPercent);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, width ? { width } : null, pressed && styles.cardPressed]}
    >
      <View style={styles.trustColumn}>
        <Text style={[styles.trustValue, { color: trustColor }]}>{trustPercent != null ? `${trustPercent}%` : "—"}</Text>
        <Text style={styles.trustLabel}>trust</Text>
      </View>

      <View style={styles.body}>
        <View style={styles.nameRow}>
          <UserAvatar profile={item.friend} size={36} />
          <View style={styles.nameBlock}>
            <Text style={styles.name}>@{item.friend.username}</Text>
          </View>
          {item.pendingFromThem > 0 ? (
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingBadgeText}>{item.pendingFromThem}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.activity} numberOfLines={2}>
          {item.activityLine}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md
  },
  cardPressed: {
    opacity: 0.88
  },
  trustColumn: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 56
  },
  trustValue: {
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 30
  },
  trustLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
    marginTop: 2,
    textTransform: "uppercase"
  },
  body: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0
  },
  nameRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm
  },
  nameBlock: {
    flex: 1,
    gap: 2,
    minWidth: 0
  },
  name: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800"
  },
  activity: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    paddingLeft: 44
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
