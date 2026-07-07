import { useMemo } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../providers/ThemeProvider";
import type { ColorScheme } from "../theme/colorSchemes";
import type { UserProfile } from "../types";

type UserAvatarProps = {
  profile?: UserProfile | null;
  user?: UserProfile | null;
  size?: number;
};

export function UserAvatar({ profile, user, size = 44 }: UserAvatarProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const person = profile ?? user;
  const initial = person?.username?.slice(0, 1).toUpperCase() ?? "?";
  const fontSize = Math.max(14, Math.round(size * 0.4));

  if (person?.avatar_url) {
    return (
      <Image
        source={{ uri: person.avatar_url }}
        style={[styles.image, { borderRadius: size / 2, height: size, width: size }]}
      />
    );
  }

  return (
    <View style={[styles.fallback, { borderRadius: size / 2, height: size, width: size }]}>
      <Text style={[styles.initial, { fontSize }]}>{initial}</Text>
    </View>
  );
}

function createStyles(colors: ColorScheme) {
  return StyleSheet.create({
    image: {
      backgroundColor: colors.border
    },
    fallback: {
      alignItems: "center",
      backgroundColor: colors.accent,
      justifyContent: "center"
    },
    initial: {
      color: colors.text,
      fontWeight: "900"
    }
  });
}
