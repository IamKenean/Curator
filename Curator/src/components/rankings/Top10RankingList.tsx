import { useMemo } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import DraggableFlatList, { type RenderItemParams } from "react-native-draggable-flatlist";
import { useTheme } from "../../providers/ThemeProvider";
import type { ColorScheme } from "../../theme/colorSchemes";
import { spacing } from "../../theme";
import type { UserRanking } from "../../types";
import { Top10EmptySlotCard, Top10RankingRow } from "./Top10RankingRow";

type Top10RankingListProps = {
  items: UserRanking[];
  onReorder: (items: UserRanking[]) => void;
  onRemove: (item: UserRanking) => void;
  emptySlots?: number;
  readOnly?: boolean;
};

export function Top10RankingList({
  items,
  onReorder,
  onRemove,
  emptySlots = 0,
  readOnly = false
}: Top10RankingListProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  function renderItem({ item, drag, isActive }: RenderItemParams<UserRanking>) {
    return (
      <Top10RankingRow
        item={item}
        drag={readOnly ? undefined : drag}
        isActive={isActive}
        onRemove={readOnly ? undefined : () => onRemove(item)}
      />
    );
  }

  function renderReadOnlyItem({ item }: { item: UserRanking }) {
    return <Top10RankingRow item={item} />;
  }

  const footer =
    emptySlots > 0 ? (
      <View style={styles.emptySlots}>
        {Array.from({ length: emptySlots }).map((_, index) => (
          <Top10EmptySlotCard
            key={`empty-${index}`}
            isFirstSlot={items.length === 0 && index === 0}
            readOnly={readOnly}
          />
        ))}
      </View>
    ) : null;

  if (readOnly) {
    return (
      <FlatList
        contentContainerStyle={styles.listContent}
        data={items}
        keyExtractor={(item) => `${item.media_type}-${item.tmdb_id}`}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        renderItem={renderReadOnlyItem}
        showsVerticalScrollIndicator
        style={styles.list}
        ListFooterComponent={footer}
      />
    );
  }

  return (
    <DraggableFlatList
      activationDistance={12}
      containerStyle={styles.listContainer}
      contentContainerStyle={styles.listContent}
      data={items}
      keyExtractor={(item) => `${item.media_type}-${item.tmdb_id}`}
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled
      onDragEnd={({ data }) => onReorder(data)}
      renderItem={renderItem}
      showsVerticalScrollIndicator
      style={styles.list}
      ListFooterComponent={footer}
    />
  );
}

function createStyles(colors: ColorScheme) {
  return StyleSheet.create({
    list: {
      flex: 1
    },
    listContainer: {
      flex: 1
    },
    listContent: {
      gap: spacing.md,
      paddingBottom: spacing.xl * 2,
      paddingHorizontal: spacing.sm,
      paddingTop: spacing.xs
    },
    emptySlots: {
      gap: spacing.md,
      marginTop: spacing.xs
    }
  });
}
