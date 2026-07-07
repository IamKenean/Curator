import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "../providers/ThemeProvider";
import type { ColorScheme } from "../theme/colorSchemes";
import { spacing } from "../theme";

type ButtonProps = Omit<PressableProps, "style"> & {
  title: string;
  variant?: "primary" | "secondary" | "ghost";
  icon?: keyof typeof Ionicons.glyphMap;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({ title, variant = "primary", disabled, icon, compact = false, style, ...props }: ButtonProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        compact && styles.baseCompact,
        styles[variant],
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style
      ]}
      {...props}
    >
      <Text style={[styles.text, compact && styles.textCompact, variant === "ghost" && styles.ghostText]}>{title}</Text>
      {icon ? (
        <Ionicons
          name={icon}
          size={compact ? 16 : 18}
          color={variant === "ghost" ? colors.accent : colors.text}
        />
      ) : null}
    </Pressable>
  );
}

function createStyles(colors: ColorScheme) {
  return StyleSheet.create({
    base: {
      alignItems: "center",
      borderRadius: 12,
      flexDirection: "row",
      gap: spacing.sm,
      justifyContent: "center",
      minHeight: 48,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md
    },
    baseCompact: {
      minHeight: 44,
      paddingVertical: spacing.sm + 2
    },
    primary: {
      backgroundColor: colors.accent
    },
    secondary: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderWidth: 1
    },
    ghost: {
      backgroundColor: "transparent"
    },
    disabled: {
      opacity: 0.5
    },
    pressed: {
      opacity: 0.82
    },
    text: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "700"
    },
    textCompact: {
      fontSize: 15
    },
    ghostText: {
      color: colors.accent
    }
  });
}
