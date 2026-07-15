import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { RANKINGS_UNLOCK_RATING_COUNT } from "../../lib/titleRatings";
import { useTheme } from "../../providers/ThemeProvider";
import type { ColorScheme } from "../../theme/colorSchemes";
import { spacing } from "../../theme";
import { Button } from "../Button";

type RankingsUnlockGateProps = {
  ratingCount: number;
  onSearchRate: () => void;
  onGoToInbox?: () => void;
};

export function RankingsUnlockGate({ ratingCount, onSearchRate, onGoToInbox }: RankingsUnlockGateProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const progress = Math.min(ratingCount / RANKINGS_UNLOCK_RATING_COUNT, 1);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Build your canon</Text>
      <Text style={styles.body}>
        Rate {RANKINGS_UNLOCK_RATING_COUNT} films to unlock Rankings and curate your personal Top 10.
      </Text>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>
      <Text style={styles.progressLabel}>
        {ratingCount}/{RANKINGS_UNLOCK_RATING_COUNT}
      </Text>

      <Button title="Search & rate a film" onPress={onSearchRate} />
      {onGoToInbox ? (
        <Pressable onPress={onGoToInbox}>
          <Text style={styles.secondaryCta}>Or rate from your inbox</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function createStyles(colors: ColorScheme) {
  return StyleSheet.create({
    wrap: {
      gap: spacing.md,
      paddingHorizontal: spacing.sm,
      paddingTop: spacing.md
    },
    title: {
      color: colors.text,
      fontSize: 22,
      fontWeight: "900"
    },
    body: {
      color: colors.muted,
      fontSize: 14,
      lineHeight: 20
    },
    progressTrack: {
      backgroundColor: colors.border,
      borderRadius: 999,
      height: 8,
      overflow: "hidden"
    },
    progressFill: {
      backgroundColor: colors.accent,
      height: "100%"
    },
    progressLabel: {
      color: colors.text,
      fontSize: 13,
      fontWeight: "800",
      textAlign: "center"
    },
    secondaryCta: {
      color: colors.accent,
      fontSize: 13,
      fontWeight: "700",
      textAlign: "center"
    }
  });
}
