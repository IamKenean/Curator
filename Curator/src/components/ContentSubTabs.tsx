import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../providers/ThemeProvider";
import type { ColorScheme } from "../theme";
import { spacing } from "../theme";

type ContentSubTabsProps<T extends string> = {
  tabs: readonly T[];
  activeTab: T;
  onTabPress: (tab: T) => void;
};

export function ContentSubTabs<T extends string>({ tabs, activeTab, onTabPress }: ContentSubTabsProps<T>) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.row}>
      {tabs.map((tab) => {
        const selected = activeTab === tab;
        return (
          <Pressable
            key={tab}
            onPress={() => onTabPress(tab)}
            style={[styles.tab, selected && styles.tabSelected]}
          >
            <Text style={[styles.tabText, selected && styles.tabTextSelected]}>{tab}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function accentTint(accent: string) {
  return `${accent}2E`;
}

function createStyles(colors: ColorScheme) {
  return StyleSheet.create({
    row: {
      alignItems: "center",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
      justifyContent: "center",
      paddingBottom: spacing.xs
    },
    tab: {
      borderRadius: 999,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm
    },
    tabSelected: {
      backgroundColor: accentTint(colors.accent)
    },
    tabText: {
      color: colors.muted,
      fontSize: 14,
      fontWeight: "700"
    },
    tabTextSelected: {
      color: colors.accent
    }
  });
}
