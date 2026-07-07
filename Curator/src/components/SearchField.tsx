import { Ionicons } from "@expo/vector-icons";
import { forwardRef, useMemo } from "react";
import { StyleSheet, TextInput, type TextInputProps, View } from "react-native";
import { useTheme } from "../providers/ThemeProvider";
import type { ColorScheme } from "../theme/colorSchemes";
import { spacing } from "../theme";

type SearchFieldProps = TextInputProps & {
  compact?: boolean;
};

export const SearchField = forwardRef<TextInput, SearchFieldProps>(function SearchField(
  { style, compact = false, ...props },
  ref
) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <Ionicons name="search" size={compact ? 16 : 18} color={colors.muted} style={styles.icon} />
      <TextInput
        ref={ref}
        placeholderTextColor={colors.muted}
        selectionColor={colors.accent}
        style={[styles.input, compact && styles.inputCompact, style]}
        {...props}
      />
    </View>
  );
});

function createStyles(colors: ColorScheme) {
  return StyleSheet.create({
    wrap: {
      alignItems: "center",
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderRadius: 10,
      borderWidth: 1,
      flexDirection: "row",
      minHeight: 48,
      paddingHorizontal: spacing.md
    },
    wrapCompact: {
      borderRadius: 10,
      minHeight: 40,
      paddingHorizontal: spacing.sm + 2
    },
    icon: {
      marginRight: spacing.sm
    },
    input: {
      color: colors.text,
      flex: 1,
      fontSize: 16,
      paddingVertical: spacing.sm
    },
    inputCompact: {
      fontSize: 14,
      paddingVertical: spacing.xs
    }
  });
}
