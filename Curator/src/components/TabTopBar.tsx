import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../providers/ThemeProvider";
import type { ColorScheme } from "../theme/colorSchemes";
import { spacing } from "../theme";

type TabTopBarProps = {
  title: string;
  left?: ReactNode;
  right?: ReactNode;
};

export function TabTopBar({ title, left, right }: TabTopBarProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={[styles.topBar, { paddingTop: insets.top + spacing.xs }]}>
      <View style={styles.side}>{left ?? null}</View>
      <Text
        style={styles.title}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
      >
        {title}
      </Text>
      <View style={styles.side}>{right ?? null}</View>
    </View>
  );
}

export function TabTopBarSide({
  icon,
  onPress
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  const { colors } = useTheme();

  return (
    <Pressable hitSlop={8} onPress={onPress} style={styles.sideButton}>
      <Ionicons name={icon} size={22} color={colors.text} />
    </Pressable>
  );
}

export function TabTopBarSpacer() {
  return <View style={styles.sideButton} />;
}

const styles = StyleSheet.create({
  sideButton: {
    alignItems: "center",
    height: 32,
    justifyContent: "center",
    width: 32
  }
});

function createStyles(colors: ColorScheme) {
  return StyleSheet.create({
    topBar: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: spacing.xs
    },
    side: {
      alignItems: "center",
      height: 32,
      justifyContent: "center",
      width: 32
    },
    title: {
      color: colors.text,
      flex: 1,
      fontSize: 18,
      fontWeight: "800",
      minWidth: 0,
      textAlign: "center"
    }
  });
}
