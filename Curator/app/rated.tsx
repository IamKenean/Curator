import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { Button } from "../src/components/Button";
import { EmptyState } from "../src/components/EmptyState";
import { PosterCard } from "../src/components/PosterCard";
import { Screen } from "../src/components/Screen";
import { SortChip, SortChipRow } from "../src/components/SortChip";
import { formatComparison, formatStarRating } from "../src/lib/ratings";
import { getUserRatedFilms } from "../src/lib/recommendations";
import { useAuth } from "../src/providers/AuthProvider";
import { colors, spacing } from "../src/theme";
import type { UserProfile, UserRatedItem } from "../src/types";

const PREVIEW_LIMIT = 3;

type SortOption = "newest" | "oldest" | "rating_high" | "rating_low";

function RatedRecommendationCard({ item }: { item: UserRatedItem }) {
  const isSelf = item.rated_source === "self";
  const comparison = !isSelf ? formatComparison(item.estimated_rating, item.personal_rating) : null;

  return (
    <View style={styles.card}>
      {item.tmdb ? <PosterCard item={item.tmdb} /> : null}
      <View style={styles.meta}>
        {isSelf ? (
          <Text style={styles.sender}>Sent to @{item.to_user?.username ?? "Unknown"}</Text>
        ) : (
          <Text style={styles.sender}>From @{item.from_user?.username ?? "Unknown"}</Text>
        )}
        {item.reason ? <Text style={styles.reason}>{item.reason}</Text> : null}
        {!isSelf && item.estimated_rating ? (
          <Text style={styles.estimate}>Their estimate: {formatStarRating(item.estimated_rating)} ★</Text>
        ) : null}
        {comparison ? (
          <>
            <Text style={styles.ratingLine}>
              Your rating: {formatStarRating(comparison.actual)} ★ {item.rating?.is_favorite ? "♥" : ""}
            </Text>
            <Text style={styles.diff}>{comparison.diffText}</Text>
          </>
        ) : (
          <Text style={styles.ratingLine}>
            Your rating: {formatStarRating(item.personal_rating)} ★ {item.rating?.is_favorite ? "♥" : ""}
          </Text>
        )}
        {!isSelf && item.rating?.notes ? <Text style={styles.notes}>"{item.rating.notes}"</Text> : null}
      </View>
    </View>
  );
}

const DEFAULT_SORT: SortOption = "newest";

export default function RatedScreen() {
  const { user } = useAuth();
  const [items, setItems] = useState<UserRatedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [friendFilter, setFriendFilter] = useState("all");

  const load = useCallback(async () => {
    if (!user) {
      return;
    }

    setLoading(true);
    try {
      setItems(await getUserRatedFilms(user.id));
    } catch (error) {
      Alert.alert("Could not load rated films", (error as Error).message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const friends = useMemo(() => {
    const byId = new Map<string, UserProfile>();
    items.forEach((item) => {
      const friend = item.rated_source === "self" ? item.to_user : item.from_user;
      if (friend) {
        byId.set(friend.id, friend);
      }
    });
    return [...byId.values()].sort((a, b) => a.username.localeCompare(b.username));
  }, [items]);

  const filteredItems = useMemo(() => {
    let list =
      friendFilter === "all"
        ? [...items]
        : items.filter((item) => {
            const friendId = item.rated_source === "self" ? item.to_user_id : item.from_user_id;
            return friendId === friendFilter;
          });

    list.sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.rated_at_sort).getTime() - new Date(a.rated_at_sort).getTime();
      }

      if (sortBy === "oldest") {
        return new Date(a.rated_at_sort).getTime() - new Date(b.rated_at_sort).getTime();
      }

      if (sortBy === "rating_high") {
        return b.personal_rating - a.personal_rating;
      }

      return a.personal_rating - b.personal_rating;
    });

    return list;
  }, [friendFilter, items, sortBy]);

  const visibleItems = showAll ? filteredItems : filteredItems.slice(0, PREVIEW_LIMIT);
  const hasHiddenItems = filteredItems.length > PREVIEW_LIMIT;

  function toggleSort(option: SortOption) {
    setSortBy((current) => (current === option ? DEFAULT_SORT : option));
  }

  function toggleFriend(friendId: string) {
    setFriendFilter((current) => (current === friendId ? "all" : friendId));
  }

  return (
    <Screen>
      {loading ? <Text style={styles.muted}>Loading...</Text> : null}

      {!loading && items.length === 0 ? (
        <EmptyState
          title="Nothing rated yet"
          body="Films you rate from friends, or when you send a recommendation with your own rating, show up here."
        />
      ) : null}

      {!loading && items.length > 0 ? (
        <View style={styles.filters}>
          <Text style={styles.filterLabel}>Sort</Text>
          <SortChipRow>
            <SortChip label="Newest" selected={sortBy === "newest"} onPress={() => toggleSort("newest")} />
            <SortChip label="Oldest" selected={sortBy === "oldest"} onPress={() => toggleSort("oldest")} />
            <SortChip label="Highest rated" selected={sortBy === "rating_high"} onPress={() => toggleSort("rating_high")} />
            <SortChip label="Lowest rated" selected={sortBy === "rating_low"} onPress={() => toggleSort("rating_low")} />
          </SortChipRow>

          <Text style={styles.filterLabel}>Friend</Text>
          <SortChipRow>
            <SortChip label="All" selected={friendFilter === "all"} onPress={() => setFriendFilter("all")} />
            {friends.map((friend) => (
              <SortChip
                key={friend.id}
                label={`@${friend.username}`}
                selected={friendFilter === friend.id}
                onPress={() => toggleFriend(friend.id)}
              />
            ))}
          </SortChipRow>
        </View>
      ) : null}

      {!loading && items.length > 0 && filteredItems.length === 0 ? (
        <EmptyState title="No matches" body="Try a different friend filter." />
      ) : null}

      {visibleItems.map((item) => (
        <RatedRecommendationCard key={`${item.media_type}-${item.tmdb_id}`} item={item} />
      ))}

      {!loading && hasHiddenItems && !showAll ? (
        <Button title={`Show all (${filteredItems.length})`} variant="secondary" onPress={() => setShowAll(true)} />
      ) : null}

      {!loading && hasHiddenItems && showAll ? (
        <Button title="Show less" variant="ghost" onPress={() => setShowAll(false)} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: {
    gap: spacing.sm
  },
  filterLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase"
  },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md
  },
  meta: {
    gap: spacing.xs
  },
  sender: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "800"
  },
  reason: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22
  },
  estimate: {
    color: colors.muted,
    fontSize: 14
  },
  ratingLine: {
    color: colors.text,
    fontSize: 14
  },
  diff: {
    color: colors.star,
    fontSize: 13,
    fontWeight: "700"
  },
  notes: {
    color: colors.muted,
    fontStyle: "italic",
    fontSize: 14,
    lineHeight: 20
  },
  muted: {
    color: colors.muted
  }
});
