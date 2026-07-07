import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { formatStarRating } from "../lib/ratings";
import { useTheme } from "../providers/ThemeProvider";
import type { ColorScheme } from "../theme";
import { posterBaseUrl, spacing } from "../theme";
import type { FriendActivityFeedItem } from "../types";
import { UserAvatar } from "./UserAvatar";

type FriendActivityGridCellProps = {
  item: FriendActivityFeedItem;
  width: number;
};

export function FriendActivityGridCell({ item, width }: FriendActivityGridCellProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const posterUri = item.tmdb?.poster_path ? `${posterBaseUrl}${item.tmdb.poster_path}` : undefined;
  const posterHeight = width * 1.45;

  return (
    <View style={[styles.cell, { width }]}>
      <View style={[styles.posterWrap, { height: posterHeight }]}>
        {posterUri ? (
          <Image source={{ uri: posterUri }} style={[styles.poster, { width, height: posterHeight }]} />
        ) : (
          <View style={[styles.poster, styles.posterFallback, { width, height: posterHeight }]}>
            <Text style={styles.fallbackText}>No Poster</Text>
          </View>
        )}
        <View style={styles.avatarBadge}>
          <UserAvatar
            user={{
              id: item.user_id,
              username: item.username,
              avatar_url: item.avatar_url,
              created_at: ""
            }}
            size={24}
          />
        </View>
      </View>
      <Text numberOfLines={1} style={styles.username}>
        @{item.username}
      </Text>
      <View style={styles.ratingRow}>
        <Ionicons name="star" size={10} color={colors.star} />
        <Text style={styles.rating}>{formatStarRating(Number(item.rating_value))}</Text>
      </View>
    </View>
  );
}

function createStyles(colors: ColorScheme) {
  return StyleSheet.create({
    cell: {
      gap: spacing.xs
    },
    posterWrap: {
      position: "relative"
    },
    poster: {
      backgroundColor: colors.border,
      borderRadius: 10
    },
    posterFallback: {
      alignItems: "center",
      justifyContent: "center"
    },
    fallbackText: {
      color: colors.muted,
      fontSize: 10,
      textAlign: "center"
    },
    avatarBadge: {
      borderColor: colors.card,
      borderRadius: 999,
      borderWidth: 2,
      bottom: -4,
      left: -4,
      position: "absolute"
    },
    username: {
      color: colors.text,
      fontSize: 11,
      fontWeight: "800",
      lineHeight: 14,
      marginTop: spacing.xs
    },
    ratingRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 2
    },
    rating: {
      color: colors.star,
      fontSize: 10,
      fontWeight: "800"
    }
  });
}
