import { StyleSheet, Text, View } from "react-native";
import { getBlockingEnvIssues } from "../lib/env";
import { colors, spacing } from "../theme";

export function ConfigErrorScreen() {
  const issues = getBlockingEnvIssues();

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Setup needed</Text>
      <Text style={styles.body}>
        The app cannot reach Supabase because environment variables are missing or invalid.
      </Text>
      {issues.map((issue) => (
        <View key={issue.key} style={styles.card}>
          <Text style={styles.key}>{issue.key}</Text>
          <Text style={styles.message}>{issue.message}</Text>
        </View>
      ))}
      <Text style={styles.steps}>
        1. Copy .env.example to .env{"\n"}
        2. Paste your real Supabase URL and anon key{"\n"}
        3. Restart Expo with: npx expo start -c
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.background,
    flex: 1,
    gap: spacing.md,
    justifyContent: "center",
    padding: spacing.xl
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "800"
  },
  body: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 22
  },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg
  },
  key: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  message: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 21
  },
  steps: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 22
  }
});
