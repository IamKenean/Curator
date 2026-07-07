import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../providers/ThemeProvider";
import type { ColorScheme } from "../../theme";
import { spacing } from "../../theme";

type PutMeOnGenreTagsProps = {
  genres: string[];
};

export function PutMeOnGenreTags({ genres }: PutMeOnGenreTagsProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (genres.length === 0) {
    return null;
  }

  return (
    <View style={styles.row}>
      {genres.map((genre) => (
        <View key={genre} style={styles.chip}>
          <Text style={styles.chipText}>{genre}</Text>
        </View>
      ))}
    </View>
  );
}

function createStyles(colors: ColorScheme) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.xs
    },
    chip: {
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs
    },
    chipText: {
      color: colors.muted,
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 0.3,
      textTransform: "uppercase"
    }
  });
}
