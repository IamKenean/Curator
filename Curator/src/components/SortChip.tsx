import type { ReactNode } from "react";
import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../providers/ThemeProvider";
import type { ColorScheme } from "../theme/colorSchemes";
import { spacing } from "../theme";

type SortChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

export function SortChip({ label, selected, onPress }: SortChipProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Pressable onPress={onPress} style={[styles.chip, selected && styles.chipSelected]}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

export function SortChipRow({ children }: { children: ReactNode }) {
  return (
    <View style={rowStyles.rowWrap}>
      <ScrollView
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        style={rowStyles.scroll}
        contentContainerStyle={rowStyles.scrollContent}
      >
        {children}
      </ScrollView>
    </View>
  );
}

function createStyles(colors: ColorScheme) {
  return StyleSheet.create({
    chip: {
      alignSelf: "flex-start",
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: 999,
      borderWidth: 1,
      flexShrink: 0,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm
    },
    chipSelected: {
      backgroundColor: colors.accent,
      borderColor: colors.accent
    },
    chipText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: "700"
    },
    chipTextSelected: {
      color: colors.text
    }
  });
}

const rowStyles = StyleSheet.create({
  rowWrap: {
    flexGrow: 0,
    flexShrink: 0
  },
  scroll: {
    flexGrow: 0,
    flexShrink: 0
  },
  scrollContent: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    paddingRight: spacing.sm
  }
});
