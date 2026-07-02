import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "../theme";

type SendSectionCardProps = {
  title: string;
  helper?: string;
  children: ReactNode;
};

export function SendSectionCard({ title, helper, children }: SendSectionCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      {helper ? <Text style={styles.helper}>{helper}</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2
  },
  title: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800"
  },
  helper: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 16,
    marginTop: -2
  }
});
