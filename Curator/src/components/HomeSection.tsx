import type { ReactElement, ReactNode } from "react";
import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../providers/ThemeProvider";
import type { ColorScheme } from "../theme/colorSchemes";
import { spacing } from "../theme";
import { FEED_CARD_WIDTH } from "./FeedTitleCard";

type HomeSectionProps<T> = {
  title: string;
  subtitle?: string;
  count?: number;
  emptyMessage?: string;
  onHeaderPress?: () => void;
  children?: ReactNode;
  data?: T[];
  renderItem?: (item: T) => ReactElement | null;
  keyExtractor?: (item: T, index: number) => string;
};

export function HomeSection<T>({
  title,
  subtitle,
  count,
  emptyMessage,
  onHeaderPress,
  children,
  data,
  renderItem,
  keyExtractor
}: HomeSectionProps<T>) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const hasItems = data ? data.length > 0 : Boolean(children);
  const canOpen = Boolean(onHeaderPress && hasItems);

  return (
    <View style={styles.section}>
      <Pressable disabled={!canOpen} onPress={onHeaderPress} style={styles.headerPress}>
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={styles.title}>
              {title}
              {count !== undefined ? ` (${count})` : ""}
            </Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          {canOpen ? <Text style={styles.chevron}>›</Text> : null}
        </View>
      </Pressable>

      {!hasItems && emptyMessage ? <Text style={styles.empty}>{emptyMessage}</Text> : null}

      {children}

      {data && renderItem && data.length > 0 ? (
        <ScrollView
          horizontal
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        >
          {data.map((item, index) => (
            <View key={keyExtractor ? keyExtractor(item, index) : `${title}-${index}`} style={styles.itemWrap}>
              {renderItem(item)}
            </View>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

function createStyles(colors: ColorScheme) {
  return StyleSheet.create({
    section: {
      gap: spacing.md
    },
    headerPress: {
      borderRadius: 10
    },
    headerRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: spacing.md,
      justifyContent: "space-between"
    },
    headerText: {
      flex: 1,
      gap: spacing.xs
    },
    title: {
      color: colors.text,
      fontSize: 18,
      fontWeight: "800"
    },
    subtitle: {
      color: colors.muted,
      fontSize: 13,
      lineHeight: 18
    },
    chevron: {
      color: colors.muted,
      fontSize: 28,
      fontWeight: "300",
      lineHeight: 28
    },
    empty: {
      color: colors.muted,
      fontSize: 13
    },
    listContent: {
      gap: spacing.md,
      paddingRight: spacing.lg
    },
    itemWrap: {
      flexShrink: 0
    }
  });
}

export { FEED_CARD_WIDTH };
