import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { trustColorForPercent } from "../../lib/trustColors";
import type { FriendsTrustCarouselItem } from "../../lib/friendsFeed";
import { useTheme } from "../../providers/ThemeProvider";
import type { ColorScheme } from "../../theme";
import { spacing } from "../../theme";
import { UserAvatar } from "../UserAvatar";

type FriendsTrustCarouselProps = {
  items: FriendsTrustCarouselItem[];
  onPressFriend: (friendId: string) => void;
};

const AVATAR_SIZE = 52;

export function FriendsTrustCarousel({ items, onPressFriend }: FriendsTrustCarouselProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (items.length === 0) {
    return null;
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.headerLabel}>Highest trust</Text>
        <Text style={styles.headerArrow}>→</Text>
      </View>
      <ScrollView
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {items.map((item) => {
          const trustColor =
            item.trustPercent != null ? trustColorForPercent(item.trustPercent, colors) : colors.muted;

          return (
            <Pressable
              key={item.friend.id}
              onPress={() => onPressFriend(item.friend.id)}
              style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
            >
              <View style={styles.avatarRing}>
                <UserAvatar profile={item.friend} size={AVATAR_SIZE} />
              </View>
              <Text style={[styles.trustPercent, { color: trustColor }]}>
                {item.trustPercent != null ? `${item.trustPercent}%` : "—"}
              </Text>
              <Text numberOfLines={1} style={styles.username}>
                @{item.friend.username}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function createStyles(colors: ColorScheme) {
  return StyleSheet.create({
    wrap: {
      gap: spacing.xs
    },
    header: {
      alignItems: "center",
      flexDirection: "row",
      gap: spacing.xs,
      paddingHorizontal: spacing.xs
    },
    headerLabel: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.6,
      textTransform: "uppercase"
    },
    headerArrow: {
      color: colors.accent,
      fontSize: 12,
      fontWeight: "800"
    },
    scroll: {
      gap: spacing.md,
      paddingHorizontal: spacing.xs,
      paddingVertical: spacing.xs
    },
    chip: {
      alignItems: "center",
      gap: 4,
      width: 72
    },
    chipPressed: {
      opacity: 0.86
    },
    avatarRing: {
      borderColor: colors.accent,
      borderRadius: 999,
      borderWidth: 1.5,
      padding: 2
    },
    trustPercent: {
      fontSize: 12,
      fontWeight: "900"
    },
    username: {
      color: colors.text,
      fontSize: 11,
      fontWeight: "700",
      maxWidth: 72,
      textAlign: "center"
    }
  });
}
