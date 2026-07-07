import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../providers/ThemeProvider";
import type { ColorScheme } from "../../theme";
import { posterBaseUrl, spacing } from "../../theme";
import type { TmdbSearchResult } from "../../types";

const POSTER_WIDTH = 44;

type ListEntryRowsProps = {
  entries: TmdbSearchResult[];
  onAddPress: () => void;
  onRemove: (entry: TmdbSearchResult) => void;
};

export function ListEntryRows({ entries, onAddPress, onRemove }: ListEntryRowsProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.wrap}>
      {entries.map((entry) => {
        const uri = entry.poster_path ? `${posterBaseUrl}${entry.poster_path}` : undefined;

        return (
          <View key={`${entry.media_type}-${entry.id}`} style={styles.row}>
            {uri ? (
              <Image source={{ uri }} style={styles.poster} />
            ) : (
              <View style={[styles.poster, styles.posterFallback]}>
                <Text style={styles.posterFallbackText}>?</Text>
              </View>
            )}
            <View style={styles.copy}>
              <Text style={styles.title} numberOfLines={1}>
                {entry.title}
              </Text>
              <Text style={styles.meta}>
                {entry.year} · {entry.media_type === "tv" ? "TV" : "Film"}
              </Text>
            </View>
            <Pressable
              accessibilityLabel="Remove entry"
              hitSlop={8}
              onPress={() => onRemove(entry)}
              style={styles.remove}
            >
              <Text style={styles.removeText}>×</Text>
            </Pressable>
          </View>
        );
      })}

      <Pressable
        accessibilityLabel="Add list entry"
        onPress={onAddPress}
        style={({ pressed }) => [styles.addRow, pressed && styles.addRowPressed]}
      >
        <View style={styles.addIconWrap}>
          <Ionicons name="add" size={18} color={colors.accent} />
        </View>
        <Text style={styles.addLabel}>Add title</Text>
      </Pressable>
    </View>
  );
}

function createStyles(colors: ColorScheme) {
  return StyleSheet.create({
    wrap: {
      gap: spacing.sm
    },
    row: {
      alignItems: "center",
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: 12,
      borderWidth: 1,
      flexDirection: "row",
      gap: spacing.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm
    },
    poster: {
      backgroundColor: colors.border,
      borderRadius: 6,
      height: POSTER_WIDTH * 1.45,
      width: POSTER_WIDTH
    },
    posterFallback: {
      alignItems: "center",
      justifyContent: "center"
    },
    posterFallbackText: {
      color: colors.muted,
      fontSize: 14,
      fontWeight: "700"
    },
    copy: {
      flex: 1,
      gap: 2,
      minWidth: 0
    },
    title: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "800"
    },
    meta: {
      color: colors.muted,
      fontSize: 12
    },
    remove: {
      alignItems: "center",
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderRadius: 999,
      borderWidth: 1,
      height: 28,
      justifyContent: "center",
      width: 28
    },
    removeText: {
      color: colors.muted,
      fontSize: 18,
      fontWeight: "800",
      lineHeight: 20
    },
    addRow: {
      alignItems: "center",
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: 12,
      borderStyle: "dashed",
      borderWidth: 1,
      flexDirection: "row",
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md
    },
    addRowPressed: {
      borderColor: colors.accent
    },
    addIconWrap: {
      alignItems: "center",
      backgroundColor: "rgba(230, 57, 70, 0.12)",
      borderRadius: 999,
      height: 30,
      justifyContent: "center",
      width: 30
    },
    addLabel: {
      color: colors.accent,
      fontSize: 14,
      fontWeight: "700"
    }
  });
}
