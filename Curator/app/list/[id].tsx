import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Alert, Dimensions, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { BookshelfPoster } from "../../src/components/BookshelfPoster";
import { EmptyState } from "../../src/components/EmptyState";
import { CreateListModal } from "../../src/components/lists/CreateListModal";
import { Screen } from "../../src/components/Screen";
import { SortChip, SortChipRow } from "../../src/components/SortChip";
import { UserAvatar } from "../../src/components/UserAvatar";
import {
  deleteCuratorList,
  getCuratorListById,
  setListVisibility,
  updateCuratorList,
  type CreateCuratorListInput,
  type CuratorList
} from "../../src/lib/curatorLists";
import { getFriendships } from "../../src/lib/social";
import { useAuth } from "../../src/providers/AuthProvider";
import { useTheme } from "../../src/providers/ThemeProvider";
import type { ColorScheme } from "../../src/theme";
import { spacing } from "../../src/theme";
import type { TmdbSearchResult } from "../../src/types";

const NUM_COLUMNS = 4;
const GRID_GAP = spacing.sm;
const H_PADDING = spacing.lg;
const SCREEN_WIDTH = Dimensions.get("window").width;
const CELL_WIDTH = (SCREEN_WIDTH - H_PADDING * 2 - GRID_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

type ListSortOption = "title_az" | "title_za" | "year_new" | "year_old";

const SORT_OPTIONS: { id: ListSortOption; label: string }[] = [
  { id: "title_az", label: "Title A–Z" },
  { id: "title_za", label: "Title Z–A" },
  { id: "year_new", label: "Newest year" },
  { id: "year_old", label: "Oldest year" }
];

function sortEntries(entries: TmdbSearchResult[], sortBy: ListSortOption) {
  const sorted = [...entries];

  switch (sortBy) {
    case "title_za":
      return sorted.sort((a, b) => b.title.localeCompare(a.title));
    case "year_new":
      return sorted.sort((a, b) => Number(b.year) - Number(a.year));
    case "year_old":
      return sorted.sort((a, b) => Number(a.year) - Number(b.year));
    case "title_az":
    default:
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
  }
}

export default function ListDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [list, setList] = useState<CuratorList | null>(null);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState<ListSortOption>("title_az");
  const [editOpen, setEditOpen] = useState(false);

  const load = useCallback(async () => {
    if (!user || !id) {
      return;
    }

    setLoading(true);
    try {
      const friendships = await getFriendships(user.id);
      const friendIds = friendships
        .filter((friendship) => friendship.status === "accepted")
        .map((friendship) => (friendship.user_id === user.id ? friendship.friend_id : friendship.user_id));

      const loaded = await getCuratorListById(id, user.id, friendIds);
      setList(loaded);
    } catch (error) {
      Alert.alert("Could not load list", (error as Error).message);
      setList(null);
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const isOwner = Boolean(user && list && list.owner_id === user.id);
  const sortedEntries = useMemo(
    () => (list ? sortEntries(list.entries, sortBy) : []),
    [list, sortBy]
  );

  function openOwnerActions() {
    if (!list || !user) {
      return;
    }

    Alert.alert(list.name, "Manage your list", [
      {
        text: "Edit list",
        onPress: () => setEditOpen(true)
      },
      {
        text: list.visibility === "public" ? "Make friends only" : "Make public",
        onPress: () => {
          void setListVisibility(user.id, list.id, list.visibility === "public" ? "friends" : "public")
            .then(() => load())
            .catch((error: Error) => Alert.alert("Could not update visibility", error.message));
        }
      },
      {
        text: "Delete list",
        style: "destructive",
        onPress: () => {
          Alert.alert("Delete list?", "This cannot be undone.", [
            { text: "Cancel", style: "cancel" },
            {
              text: "Delete",
              style: "destructive",
              onPress: () => {
                void deleteCuratorList(user.id, list.id)
                  .then(() => router.back())
                  .catch((error: Error) => Alert.alert("Could not delete list", error.message));
              }
            }
          ]);
        }
      },
      { text: "Cancel", style: "cancel" }
    ]);
  }

  async function handleSaveList(input: CreateCuratorListInput) {
    if (!user || !list) {
      return;
    }

    try {
      await updateCuratorList(user.id, list.id, input);
      setEditOpen(false);
      await load();
    } catch (error) {
      Alert.alert("Could not save list", (error as Error).message);
      throw error;
    }
  }

  if (!loading && !list) {
    return (
      <Screen edges={["left", "right", "bottom"]} contentContainerStyle={styles.screenContent}>
        <Stack.Screen options={{ title: "List" }} />
        <EmptyState title="List not found" body="This list may be private or no longer available." />
      </Screen>
    );
  }

  return (
    <Screen scroll={false} fill edges={["left", "right", "bottom"]} contentContainerStyle={styles.screenContent}>
      <Stack.Screen
        options={{
          title: list?.name ?? "List",
          headerRight: isOwner
            ? () => (
                <Pressable hitSlop={10} onPress={openOwnerActions}>
                  <Text style={styles.headerAction}>Edit</Text>
                </Pressable>
              )
            : undefined
        }}
      />
      <View style={styles.wrap}>
        {list ? (
          <View style={styles.metaSection}>
            {list.owner ? (
              <View style={styles.ownerRow}>
                <UserAvatar profile={list.owner} size={24} />
                <Text style={styles.ownerName}>@{list.owner.username}</Text>
              </View>
            ) : null}
            {list.description ? <Text style={styles.description}>{list.description}</Text> : null}
            <Text style={styles.visibility}>
              {list.visibility === "public" ? "Public list" : "Friends only"} · {list.entry_count} titles
            </Text>
            {list.tags.length > 0 ? (
              <View style={styles.tagRow}>
                {list.tags.map((tag) => (
                  <View key={tag} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={styles.sortSection}>
          <SortChipRow>
            {SORT_OPTIONS.map((option) => (
              <SortChip
                key={option.id}
                label={option.label}
                selected={sortBy === option.id}
                onPress={() => setSortBy(option.id)}
              />
            ))}
          </SortChipRow>
        </View>

        {!loading && sortedEntries.length === 0 ? (
          <EmptyState title="Empty list" body="No titles have been added yet." />
        ) : null}

        {!loading && sortedEntries.length > 0 ? (
          <FlatList
            style={styles.list}
            data={sortedEntries}
            keyExtractor={(item) => `${item.media_type}-${item.id}`}
            numColumns={NUM_COLUMNS}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.gridContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={styles.cell}>
                <BookshelfPoster
                  tmdb={item}
                  subtitle={`${item.year} · ${item.media_type === "tv" ? "TV" : "Film"}`}
                  width={CELL_WIDTH}
                />
              </View>
            )}
          />
        ) : null}
      </View>

      <CreateListModal
        visible={editOpen}
        list={list}
        onClose={() => setEditOpen(false)}
        onSubmit={handleSaveList}
      />
    </Screen>
  );
}

function createStyles(colors: ColorScheme) {
  return StyleSheet.create({
    screenContent: {
      gap: spacing.md,
      paddingBottom: spacing.lg,
      paddingHorizontal: H_PADDING,
      paddingTop: spacing.sm
    },
    headerAction: {
      color: colors.accent,
      fontSize: 15,
      fontWeight: "700"
    },
    wrap: {
      flex: 1,
      gap: spacing.md
    },
    metaSection: {
      flexGrow: 0,
      flexShrink: 0,
      gap: spacing.sm
    },
    ownerRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: spacing.sm
    },
    ownerName: {
      color: colors.muted,
      fontSize: 14,
      fontWeight: "700"
    },
    description: {
      color: colors.text,
      fontSize: 15,
      lineHeight: 22
    },
    visibility: {
      color: colors.muted,
      fontSize: 13,
      fontWeight: "700"
    },
    tagRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.xs
    },
    tag: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4
    },
    tagText: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: "700"
    },
    sortSection: {
      flexGrow: 0,
      flexShrink: 0
    },
    list: {
      flex: 1
    },
    gridContent: {
      gap: GRID_GAP,
      paddingBottom: spacing.xl * 2
    },
    row: {
      gap: GRID_GAP
    },
    cell: {
      width: CELL_WIDTH
    }
  });
}
