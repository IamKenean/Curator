import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { GenreGauntlet } from "../../lib/putMeOnFeed";
import { colors, spacing } from "../../theme";
import { HiddenPosterRow } from "./HiddenPosterRow";

type PutMeOnGauntletCardProps = {
  gauntlet: GenreGauntlet;
  onAnswer: () => void;
};

export function PutMeOnGauntletCard({ gauntlet, onAnswer }: PutMeOnGauntletCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.labelRow}>
          <Ionicons name="skull-outline" size={13} color={colors.accent} />
          <Text style={styles.eyebrow}>{gauntlet.label}</Text>
        </View>
        <Pressable onPress={onAnswer} style={styles.action}>
          <Text style={styles.actionText}>Answer This</Text>
        </Pressable>
      </View>

      <Text style={styles.title}>{gauntlet.title}</Text>
      <Text style={styles.subtitle}>
        {gauntlet.subtitle} ·{" "}
        <Text style={styles.deadline}>Ends in {gauntlet.daysLeft} days</Text>
      </Text>

      <HiddenPosterRow posters={gauntlet.posters} size="md" hidden={false} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderColor: colors.accent,
    borderRadius: 14,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  labelRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase"
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800"
  },
  subtitle: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600"
  },
  deadline: {
    color: colors.accent,
    fontWeight: "700"
  },
  action: {
    borderColor: colors.accent,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2
  },
  actionText: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.3,
    textTransform: "uppercase"
  }
});
