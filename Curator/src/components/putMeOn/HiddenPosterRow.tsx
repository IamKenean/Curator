import { Image, StyleSheet, Text, View } from "react-native";
import { colors, posterBaseUrl, spacing } from "../../theme";
import type { TmdbSearchResult } from "../../types";

type HiddenPosterRowProps = {
  posters: TmdbSearchResult[];
  extraCount?: number;
  size?: "sm" | "md";
  hidden?: boolean;
};

const SIZES = {
  sm: { width: 44, height: 64, radius: 6, fontSize: 11 },
  md: { width: 62, height: 90, radius: 8, fontSize: 12 }
} as const;

export function HiddenPosterRow({
  posters,
  extraCount = 0,
  size = "md",
  hidden = true
}: HiddenPosterRowProps) {
  const dims = SIZES[size];

  return (
    <View style={styles.row}>
      {posters.map((item) => {
        const uri = item.poster_path ? `${posterBaseUrl}${item.poster_path}` : undefined;

        return (
          <View
            key={`${item.media_type}-${item.id}`}
            style={[styles.posterWrap, { borderRadius: dims.radius, height: dims.height, width: dims.width }]}
          >
            {uri ? (
              <Image source={{ uri }} style={[styles.poster, hidden && styles.posterHidden]} />
            ) : (
              <View style={[styles.poster, styles.posterFallback]} />
            )}
            {hidden ? <View style={[styles.veil, { borderRadius: dims.radius }]} /> : null}
          </View>
        );
      })}
      {extraCount > 0 ? (
        <View style={[styles.moreCard, { borderRadius: dims.radius, height: dims.height, width: dims.width }]}>
          <Text style={[styles.moreText, { fontSize: dims.fontSize }]}>+{extraCount}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: spacing.xs + 2
  },
  posterWrap: {
    overflow: "hidden"
  },
  poster: {
    height: "100%",
    width: "100%"
  },
  posterHidden: {
    opacity: 0.55
  },
  posterFallback: {
    backgroundColor: colors.border
  },
  veil: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.42)"
  },
  moreCard: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    justifyContent: "center"
  },
  moreText: {
    color: colors.muted,
    fontWeight: "800"
  }
});
