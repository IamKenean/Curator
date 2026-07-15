import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../providers/ThemeProvider";
import type { ColorScheme } from "../theme";
import { spacing } from "../theme";

export function HomeFeedSetupBanner() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Home feed needs Supabase setup</Text>
      <Text style={styles.body}>
        Run `supabase/home-feed.sql` in your Supabase SQL Editor, then reload the app. Until then, only inbox recs and
        TMDB trending can appear.
      </Text>
    </View>
  );
}

function createStyles(colors: ColorScheme) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderColor: colors.accent,
      borderRadius: 14,
      borderWidth: 1,
      gap: spacing.xs,
      padding: spacing.md
    },
    title: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "800"
    },
    body: {
      color: colors.muted,
      fontSize: 13,
      lineHeight: 19
    }
  });
}
