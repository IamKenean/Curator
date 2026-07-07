import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import type { CuratorList } from "../../lib/curatorLists";
import { useTheme } from "../../providers/ThemeProvider";
import type { ColorScheme } from "../../theme";
import { posterBaseUrl, spacing } from "../../theme";
import { UserAvatar } from "../UserAvatar";

const PREVIEW_COUNT = 4;
const PREVIEW_WIDTH = 48;

type ListCardProps = {
  list: CuratorList;
  showOwner?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
};

export function ListCard({ list, showOwner = false, onPress, onLongPress }: ListCardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const previewEntries = list.entries.slice(0, PREVIEW_COUNT);
  const remaining = Math.max(0, list.entries.length - previewEntries.length);

  return (
    <Pressable
      disabled={!onPress && !onLongPress}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350}
      style={({ pressed }) => [styles.card, (onPress || onLongPress) && pressed && styles.cardPressed]}
    >
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.name} numberOfLines={1}>
            {list.name}
          </Text>
          {showOwner && list.owner ? (
            <View style={styles.ownerRow}>
              <UserAvatar profile={list.owner} size={18} />
              <Text style={styles.ownerName}>@{list.owner.username}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.headerAside}>
          <Text style={styles.count}>
            {list.entry_count} title{list.entry_count === 1 ? "" : "s"}
          </Text>
          {onPress ? <Ionicons name="chevron-forward" size={16} color={colors.muted} /> : null}
        </View>
      </View>

      {list.description ? (
        <Text style={styles.description} numberOfLines={2}>
          {list.description}
        </Text>
      ) : null}

      {previewEntries.length > 0 ? (
        <View style={styles.previewRow}>
          {previewEntries.map((entry) => {
            const uri = entry.poster_path ? `${posterBaseUrl}${entry.poster_path}` : undefined;
            return (
              <View key={`${entry.media_type}-${entry.id}`} style={styles.previewSlot}>
                {uri ? (
                  <Image source={{ uri }} style={styles.previewPoster} />
                ) : (
                  <View style={[styles.previewPoster, styles.previewFallback]}>
                    <Text style={styles.previewFallbackText}>?</Text>
                  </View>
                )}
              </View>
            );
          })}
          {remaining > 0 ? (
            <View style={styles.moreBadge}>
              <Text style={styles.moreBadgeText}>+{remaining}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {list.tags.length > 0 ? (
        <View style={styles.tagRow}>
          {list.tags.slice(0, 4).map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <Text style={styles.visibility}>
        {list.visibility === "public" ? "Public" : "Friends only"}
      </Text>
    </Pressable>
  );
}

function createStyles(colors: ColorScheme) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: 16,
      borderWidth: 1,
      gap: spacing.sm,
      padding: spacing.md
    },
    cardPressed: {
      opacity: 0.92
    },
    header: {
      alignItems: "flex-start",
      flexDirection: "row",
      gap: spacing.sm,
      justifyContent: "space-between"
    },
    headerCopy: {
      flex: 1,
      gap: spacing.xs,
      minWidth: 0
    },
    name: {
      color: colors.text,
      fontSize: 18,
      fontWeight: "900"
    },
    ownerRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: spacing.xs
    },
    ownerName: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: "700"
    },
    headerAside: {
      alignItems: "flex-end",
      gap: 4
    },
    count: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: "700",
      textTransform: "uppercase"
    },
    description: {
      color: colors.muted,
      fontSize: 13,
      lineHeight: 18
    },
    previewRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: spacing.xs
    },
    previewSlot: {
      borderColor: colors.border,
      borderRadius: 6,
      borderWidth: 1,
      overflow: "hidden"
    },
    previewPoster: {
      backgroundColor: colors.border,
      height: PREVIEW_WIDTH * 1.45,
      width: PREVIEW_WIDTH
    },
    previewFallback: {
      alignItems: "center",
      justifyContent: "center"
    },
    previewFallbackText: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: "700"
    },
    moreBadge: {
      alignItems: "center",
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderRadius: 8,
      borderWidth: 1,
      height: PREVIEW_WIDTH * 1.45,
      justifyContent: "center",
      width: PREVIEW_WIDTH
    },
    moreBadgeText: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: "800"
    },
    tagRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.xs
    },
    tag: {
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4
    },
    tagText: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: "700"
    },
    visibility: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.4,
      textTransform: "uppercase"
    }
  });
}
