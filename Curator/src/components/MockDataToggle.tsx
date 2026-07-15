import { useMemo } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";
import { useMockData } from "../providers/MockDataProvider";
import { useTheme } from "../providers/ThemeProvider";
import type { ColorScheme } from "../theme";
import { spacing } from "../theme";

export function MockDataToggle() {
  const { colors } = useTheme();
  const { mockDataEnabled, setMockDataEnabled, ready } = useMockData();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (!ready) {
    return null;
  }

  return (
    <View style={styles.card}>
      <View style={styles.copy}>
        <Text style={styles.title}>Demo data</Text>
        <Text style={styles.body}>
          {mockDataEnabled
            ? "Showing sample friends and feed padding across the app."
            : "Showing only real server data. Sparse sections stay empty until activity builds."}
        </Text>
      </View>
      <Switch
        value={mockDataEnabled}
        onValueChange={(value) => {
          void setMockDataEnabled(value);
        }}
        trackColor={{ false: colors.border, true: colors.accent }}
        thumbColor={colors.text}
      />
    </View>
  );
}

function createStyles(colors: ColorScheme) {
  return StyleSheet.create({
    card: {
      alignItems: "center",
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: 14,
      borderWidth: 1,
      flexDirection: "row",
      gap: spacing.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm
    },
    copy: {
      flex: 1,
      gap: spacing.xs
    },
    title: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "800"
    },
    body: {
      color: colors.muted,
      fontSize: 12,
      lineHeight: 17
    }
  });
}
