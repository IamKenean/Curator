import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import type { CuratorList } from "../../lib/curatorLists";
import { spacing } from "../../theme";
import { EmptyState } from "../EmptyState";
import { ListCard } from "./ListCard";

type ListsPanelProps = {
  lists: CuratorList[];
  showOwner?: boolean;
  emptyTitle?: string;
  emptyBody?: string;
  currentUserId?: string;
  onListPress?: (list: CuratorList) => void;
  onListLongPress?: (list: CuratorList) => void;
};

export function ListsPanel({
  lists,
  showOwner = false,
  emptyTitle = "No lists yet",
  emptyBody = "Create a list to start curating titles.",
  currentUserId,
  onListPress,
  onListLongPress
}: ListsPanelProps) {
  const styles = useMemo(() => createStyles(), []);

  if (lists.length === 0) {
    return <EmptyState title={emptyTitle} body={emptyBody} />;
  }

  return (
    <View style={styles.wrap}>
      {lists.map((list) => (
        <ListCard
          key={list.id}
          list={list}
          showOwner={showOwner}
          onPress={onListPress ? () => onListPress(list) : undefined}
          onLongPress={
            onListLongPress && currentUserId && list.owner_id === currentUserId
              ? () => onListLongPress(list)
              : undefined
          }
        />
      ))}
    </View>
  );
}

function createStyles() {
  return StyleSheet.create({
    wrap: {
      gap: spacing.sm
    }
  });
}
