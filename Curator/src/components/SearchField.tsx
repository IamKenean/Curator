import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, TextInput, type TextInputProps, View } from "react-native";
import { colors, spacing } from "../theme";

type SearchFieldProps = TextInputProps & {
  compact?: boolean;
};

export function SearchField({ style, compact = false, ...props }: SearchFieldProps) {
  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <Ionicons name="search" size={compact ? 16 : 18} color={colors.muted} style={styles.icon} />
      <TextInput
        placeholderTextColor={colors.muted}
        selectionColor={colors.accent}
        style={[styles.input, compact && styles.inputCompact, style]}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
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
