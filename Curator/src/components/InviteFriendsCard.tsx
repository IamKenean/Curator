import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../providers/ThemeProvider";
import type { ColorScheme } from "../theme/colorSchemes";
import { spacing } from "../theme";
import { Button } from "./Button";

type InviteFriendsCardProps = {
  onInvite: () => void;
};

export function InviteFriendsCard({ onInvite }: InviteFriendsCardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>No friends yet</Text>
      <Text style={styles.body}>
        Your Journal fills up when you and friends complete recommendations. Add someone to start
        calibrating taste together.
      </Text>
      <Button title="Add a friend" onPress={onInvite} />
    </View>
  );
}

function createStyles(colors: ColorScheme) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: 14,
      borderWidth: 1,
      gap: spacing.md,
      padding: spacing.lg
    },
    title: {
      color: colors.text,
      fontSize: 18,
      fontWeight: "800"
    },
    body: {
      color: colors.muted,
      fontSize: 13,
      lineHeight: 19
    }
  });
}
