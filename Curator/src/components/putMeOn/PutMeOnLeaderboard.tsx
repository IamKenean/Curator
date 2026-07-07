import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { LeaderboardEntry } from "../../lib/putMeOnFeed";
import { trustColorForPercent } from "../../lib/trustColors";
import { useTheme } from "../../providers/ThemeProvider";
import type { ColorScheme } from "../../theme";
import { spacing } from "../../theme";
import { UserAvatar } from "../UserAvatar";

type LeaderboardTab = "trust" | "gatekeep" | "consistency";

const TABS: { id: LeaderboardTab; label: string }[] = [
  { id: "trust", label: "Trust Score" },
  { id: "gatekeep", label: "Gatekeep Accuracy" },
  { id: "consistency", label: "Consistency" }
];

type PutMeOnLeaderboardProps = {
  entries: LeaderboardEntry[];
  onViewAll?: () => void;
};

export function PutMeOnLeaderboard({ entries, onViewAll }: PutMeOnLeaderboardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [activeTab, setActiveTab] = useState<LeaderboardTab>("trust");

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.sectionLabel}>Leaderboards</Text>
        {onViewAll ? (
          <Pressable onPress={onViewAll}>
            <Text style={styles.viewAll}>View all</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.tabs}>
        {TABS.map((tab) => {
          const selected = activeTab === tab.id;
          return (
            <Pressable
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              style={[styles.tab, selected && styles.tabSelected]}
            >
              <Text style={[styles.tabText, selected && styles.tabTextSelected]} numberOfLines={1}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.list}>
        {entries.map((entry) => (
          <View key={entry.user.id} style={styles.row}>
            <Text style={styles.rank}>{entry.rank}</Text>
            <UserAvatar profile={entry.user} size={34} />
            <View style={styles.copy}>
              <Text style={styles.name}>{entry.user.username}</Text>
              <Text style={styles.badge}>{entry.badge}</Text>
            </View>
            <View style={styles.stats}>
              <Text style={[styles.trust, { color: trustColorForPercent(entry.trustPercent, colors) }]}>
                {entry.trustPercent}%
              </Text>
              <Text style={styles.gatekeep}>
                {entry.gatekeepCorrect}/{entry.gatekeepTotal}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color={colors.muted} />
          </View>
        ))}
      </View>
    </View>
  );
}

function createStyles(colors: ColorScheme) {
  return StyleSheet.create({
    section: {
      gap: spacing.sm
    },
    header: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between"
    },
    sectionLabel: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.8,
      textTransform: "uppercase"
    },
    viewAll: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: "700"
    },
    tabs: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.xs
    },
    tab: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: spacing.xs + 2
    },
    tabSelected: {
      backgroundColor: colors.accent,
      borderColor: colors.accent
    },
    tabText: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: "700"
    },
    tabTextSelected: {
      color: colors.text
    },
    list: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: 14,
      borderWidth: 1,
      gap: spacing.xs,
      padding: spacing.sm
    },
    row: {
      alignItems: "center",
      flexDirection: "row",
      gap: spacing.sm,
      paddingHorizontal: spacing.xs,
      paddingVertical: spacing.sm
    },
    rank: {
      color: colors.muted,
      fontSize: 14,
      fontWeight: "800",
      width: 16
    },
    copy: {
      flex: 1,
      gap: 1,
      minWidth: 0
    },
    name: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "800"
    },
    badge: {
      color: colors.accent,
      fontSize: 10,
      fontWeight: "700"
    },
    stats: {
      alignItems: "flex-end",
      gap: 1
    },
    trust: {
      fontSize: 13,
      fontWeight: "900"
    },
    gatekeep: {
      color: colors.muted,
      fontSize: 10,
      fontWeight: "700"
    }
  });
}
