import type { ReactNode } from "react";
import { useMemo } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "../providers/ThemeProvider";
import type { ColorScheme } from "../theme/colorSchemes";
import { spacing } from "../theme";

type SendSectionCardProps = {
  title?: string;
  helper?: string;
  expand?: boolean;
  flex?: number;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
};

export function SendSectionCard({ title, helper, expand, flex, style, children }: SendSectionCardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={[styles.card, expand && styles.cardExpand, flex != null ? { flex } : null, style]}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
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
    helper: {
      color: colors.muted,
      fontSize: 11,
      lineHeight: 14
    }
  });
}
