import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import type { WatchlistItem } from "../lib/watchlist";
import { spacing } from "../theme";
import { EmptyState } from "./EmptyState";
import { FeedTitleCard } from "./FeedTitleCard";

type WatchlistPanelProps = {
  items: WatchlistItem[];
  onItemPress?: (item: WatchlistItem) => void;
  onItemLongPress?: (item: WatchlistItem) => void;
};

export function WatchlistPanel({ items, onItemPress, onItemLongPress }: WatchlistPanelProps) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="Watchlist is empty"
        body="Tap + to search TMDB and save films you want to watch."
      />
    );
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {items.map((item) => (
        <FeedTitleCard
          key={`${item.media_type}-${item.id}`}
          tmdb={item}
          onPress={onItemPress ? () => onItemPress(item) : undefined}
          onLongPress={
            onItemLongPress
              ? () => {
                  Alert.alert(item.title, "Remove from watchlist?", [
                    { text: "Cancel", style: "cancel" },
                    { text: "Remove", style: "destructive", onPress: () => onItemLongPress(item) }
                  ]);
                }
              : undefined
          }
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: spacing.sm,
    paddingBottom: spacing.xs
  }
});
