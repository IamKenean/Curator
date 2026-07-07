import { useMemo } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../providers/ThemeProvider";
import type { ColorScheme } from "../../theme";
import { posterBaseUrl, spacing } from "../../theme";
import type { TmdbSearchResult } from "../../types";

type PutMeOnExampleFilmsProps = {
  films: TmdbSearchResult[];
};

const POSTER_WIDTH = 34;
const POSTER_HEIGHT = 50;

export function PutMeOnExampleFilms({ films }: PutMeOnExampleFilmsProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (films.length === 0) {
    return null;
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>In the vein of</Text>
      <View style={styles.row}>
        {films.map((film) => {
          const uri = film.poster_path ? `${posterBaseUrl}${film.poster_path}` : undefined;

          return (
            <View key={`${film.media_type}-${film.id}`} style={styles.item}>
              {uri ? (
                <Image source={{ uri }} style={styles.poster} />
              ) : (
                <View style={[styles.poster, styles.posterFallback]} />
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

function createStyles(colors: ColorScheme) {
  return StyleSheet.create({
    wrap: {
      gap: spacing.xs,
      marginTop: spacing.xs,
      opacity: 0.82
    },
    label: {
      color: colors.muted,
      fontSize: 9,
      fontWeight: "600",
      letterSpacing: 0.4,
      textTransform: "lowercase"
    },
    row: {
      flexDirection: "row",
      gap: spacing.xs
    },
    item: {
      borderRadius: 4,
      overflow: "hidden"
    },
    poster: {
      backgroundColor: colors.border,
      height: POSTER_HEIGHT,
      opacity: 0.88,
      width: POSTER_WIDTH
    },
    posterFallback: {
      opacity: 0.5
    }
  });
}
