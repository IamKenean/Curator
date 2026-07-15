import { Ionicons } from "@expo/vector-icons";
import { useMemo, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../providers/ThemeProvider";
import type { ColorScheme } from "../theme";
import { spacing } from "../theme";
import { Button } from "./Button";

type AddFriendsBannerProps = {
  onAddFriends: () => void;
};

export function AddFriendsBanner({ onAddFriends }: AddFriendsBannerProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.card}>
      <View style={styles.copy}>
        <View style={styles.labelRow}>
          <Ionicons name="people-outline" size={16} color={colors.accent} />
          <Text style={styles.eyebrow}>Friends unlock Curator</Text>
        </View>
        <Text style={styles.title}>Add friends to see real recommendations</Text>
        <Text style={styles.body}>
          Your feed fills up when friends send picks, rate titles, and build trust with you.
        </Text>
      </View>
      <Button title="Add friends" onPress={onAddFriends} />
    </View>
  );
}

export function DimmedFeedOverlay({ children, dimmed }: { children: ReactNode; dimmed: boolean }) {
  if (!dimmed) {
    return <>{children}</>;
  }

  return (
    <View style={overlayStyles.wrap} pointerEvents="box-none">
      <View style={overlayStyles.content} pointerEvents="none">
        {children}
      </View>
    </View>
  );
}

const overlayStyles = StyleSheet.create({
  wrap: {
    position: "relative"
  },
  content: {
    opacity: 0.38
  }
});

function createStyles(colors: ColorScheme) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderColor: colors.accent,
      borderRadius: 16,
      borderWidth: 1,
      gap: spacing.md,
      padding: spacing.md
    },
    copy: {
      gap: spacing.xs
    },
    labelRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: spacing.xs
    },
    eyebrow: {
      color: colors.accent,
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 0.6,
      textTransform: "uppercase"
    },
    title: {
      color: colors.text,
      fontSize: 18,
      fontWeight: "800"
    },
    body: {
      color: colors.muted,
      fontSize: 14,
      lineHeight: 20
    }
  });
}
