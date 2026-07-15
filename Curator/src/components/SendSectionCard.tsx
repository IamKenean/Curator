import type { ReactNode } from "react";
import { useMemo } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "../providers/ThemeProvider";
import type { ColorScheme } from "../theme/colorSchemes";
import { spacing } from "../theme";

type SendSectionState = "active" | "complete" | "pending";

type SendSectionCardProps = {
  title?: string;
  helper?: string;
  expand?: boolean;
  flex?: number;
  state?: SendSectionState;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
};

export function SendSectionCard({
  title,
  helper,
  expand,
  flex,
  state = "pending",
  style,
  children
}: SendSectionCardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View
      style={[
        styles.card,
        expand && styles.cardExpand,
        state === "active" && styles.cardActive,
        state === "complete" && styles.cardComplete,
        state === "pending" && styles.cardPending,
        flex != null ? { flex } : null,
        style
      ]}
    >
      {title ? (
        <Text
          style={[
            styles.title,
            state === "active" && styles.titleActive,
            state === "complete" && styles.titleComplete
          ]}
        >
          {state === "complete" ? `✓ ${title}` : title}
        </Text>
      ) : null}
      {helper ? <Text style={styles.helper}>{helper}</Text> : null}
      {expand ? <View style={styles.bodyExpand}>{children}</View> : children}
    </View>
  );
}

function createStyles(colors: ColorScheme) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: 16,
      borderWidth: 1,
      gap: spacing.sm,
      padding: spacing.md
    },
    cardActive: {
      borderColor: colors.accent,
      borderWidth: 2,
      shadowColor: colors.accent,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.28,
      shadowRadius: 10
    },
    cardComplete: {
      borderColor: colors.border,
      opacity: 0.72
    },
    cardPending: {
      borderColor: colors.border,
      opacity: 0.48
    },
    cardExpand: {
      minHeight: 0
    },
    bodyExpand: {
      flex: 1,
      gap: spacing.xs,
      minHeight: 0
    },
    title: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.8,
      textTransform: "uppercase"
    },
    titleActive: {
      color: colors.accent,
      fontWeight: "800"
    },
    titleComplete: {
      color: colors.muted
    },
    helper: {
      color: colors.muted,
      fontSize: 11,
      lineHeight: 14
    }
  });
}
