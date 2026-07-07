import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../providers/ThemeProvider";
import type { ColorScheme } from "../../theme";
import { posterBaseUrl, spacing } from "../../theme";
import type { TmdbSearchResult } from "../../types";

const SLOT_WIDTH = 56;
const SLOT_HEIGHT = 84;

type ExampleFilmSlotsProps = {
  films: TmdbSearchResult[];
  maxSlots: number;
  onAddPress: () => void;
  onRemove: (film: TmdbSearchResult) => void;
};

export function ExampleFilmSlots({ films, maxSlots, onAddPress, onRemove }: ExampleFilmSlotsProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.row}>
      {Array.from({ length: maxSlots }, (_, index) => {
        const film = films[index];

        if (film) {
          const uri = film.poster_path ? `${posterBaseUrl}${film.poster_path}` : undefined;

          return (
            <View key={`${film.media_type}-${film.id}`} style={styles.slotWrap}>
              <View style={styles.filledSlot}>
                {uri ? (
                  <Image source={{ uri }} style={styles.poster} />
                ) : (
                  <View style={[styles.poster, styles.posterFallback]}>
                    <Text style={styles.posterFallbackText}>?</Text>
                  </View>
                )}
              </View>
              <Pressable
                accessibilityLabel="Remove example film"
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => onRemove(film)}
                style={styles.remove}
              >
                <Text style={styles.removeText}>×</Text>
              </Pressable>
            </View>
          );
        }

        return (
          <Pressable
            key={`add-${index}`}
            accessibilityLabel="Add example film"
            accessibilityRole="button"
            onPress={onAddPress}
            style={({ pressed }) => [styles.addSlot, pressed && styles.addSlotPressed]}
          >
            <View style={styles.addIconWrap}>
              <Ionicons name="add" size={20} color={colors.accent} />
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

function createStyles(colors: ColorScheme) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      gap: spacing.sm,
      minHeight: SLOT_HEIGHT + 8,
      overflow: "visible",
      paddingTop: 6
    },
    slotWrap: {
      overflow: "visible",
      position: "relative"
    },
    filledSlot: {
      borderColor: colors.border,
      borderRadius: 8,
      borderWidth: 1,
      overflow: "hidden"
    },
    poster: {
      backgroundColor: colors.border,
      height: SLOT_HEIGHT,
      width: SLOT_WIDTH
    },
    posterFallback: {
      alignItems: "center",
      justifyContent: "center"
    },
    posterFallbackText: {
      color: colors.muted,
      fontSize: 16,
      fontWeight: "700"
    },
    remove: {
      alignItems: "center",
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderRadius: 999,
      borderWidth: 1,
      height: 22,
      justifyContent: "center",
      position: "absolute",
      right: -8,
      top: -8,
      width: 22,
      zIndex: 2
    },
    removeText: {
      color: colors.muted,
      fontSize: 14,
      fontWeight: "800",
      lineHeight: 16
    },
    addSlot: {
      alignItems: "center",
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: 8,
      borderWidth: 1,
      height: SLOT_HEIGHT,
      justifyContent: "center",
      width: SLOT_WIDTH
    },
    addSlotPressed: {
      backgroundColor: colors.background,
      borderColor: colors.accent
    },
    addIconWrap: {
      alignItems: "center",
      backgroundColor: "rgba(230, 57, 70, 0.12)",
      borderRadius: 999,
      height: 32,
      justifyContent: "center",
      width: 32
    }
  });
}
