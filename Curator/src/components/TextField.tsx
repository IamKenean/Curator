import { useMemo } from "react";
import { StyleSheet, Text, TextInput, type TextInputProps, View } from "react-native";
import { useTheme } from "../providers/ThemeProvider";
import type { ColorScheme } from "../theme/colorSchemes";
import { spacing } from "../theme";

type TextFieldProps = TextInputProps & {
  label?: string;
};

export function TextField({ label, style, ...props }: TextFieldProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.muted}
        selectionColor={colors.accent}
        style={[styles.input, style]}
        {...props}
      />
    </View>
  );
}

function createStyles(colors: ColorScheme) {
  return StyleSheet.create({
    wrap: {
      gap: spacing.sm
    },
    label: {
      color: colors.muted,
      fontSize: 13,
      fontWeight: "700",
      textTransform: "uppercase"
    },
    input: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: 12,
      borderWidth: 1,
      color: colors.text,
      fontSize: 16,
      minHeight: 48,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md
    }
  });
}
