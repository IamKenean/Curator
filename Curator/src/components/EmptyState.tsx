import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../providers/ThemeProvider";
import type { ColorScheme } from "../theme/colorSchemes";
import { spacing } from "../theme";
import { Button } from "./Button";

export function EmptyState({
  title,
  body,
  actionLabel,
  onAction
}: {
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      {body ? <Text style={styles.body}>{body}</Text> : null}
      {actionLabel && onAction ? <Button title={actionLabel} onPress={onAction} /> : null}
    </View>
  );
}

function createStyles(colors: ColorScheme) {
  return StyleSheet.create({
    wrap: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: 14,
      borderWidth: 1,
      gap: spacing.sm,
      padding: spacing.lg
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
