import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { Button } from "../src/components/Button";
import { EmptyState } from "../src/components/EmptyState";
import { PosterCard } from "../src/components/PosterCard";
import { Screen } from "../src/components/Screen";
import { SortChip, SortChipRow } from "../src/components/SortChip";
import { formatComparison, formatStarRating } from "../src/lib/ratings";
import { getSentRecommendations } from "../src/lib/recommendations";
import { useAuth } from "../src/providers/AuthProvider";
import { colors, spacing } from "../src/theme";
import type { RatedRecommendation, UserProfile } from "../src/types";

const PREVIEW_LIMIT = 3;

type SortOption = "newest" | "oldest" | "rating_high" | "rating_low";

function SentRecommendationCard({ item }: { item: RatedRecommendation }) {
  const isWatched = item.status === "watched";
  const actual = item.rating?.rating_value ?? 0;
  const comparison = isWatched ? formatComparison(item.estimated_rating, actual) : null;

  return (
    <View style={styles.card}>
      {item.tmdb ? <PosterCard item={item.tmdb} /> : null}
      <View style={styles.meta}>
        <Text style={styles.recipient}>To @{item.to_user?.username ?? "Unknown"}</Text>
        {item.reason ? <Text style={styles.reason}>{item.reason}</Text> : null}
        {item.estimated_rating ? (
          <Text style={styles.estimate}>Your estimate: {formatStarRating(item.estimated_rating)} ★</Text>
        ) : null}
        {item.sender_rating ? (
          <Text style={styles.senderRating}>You rated it: {formatStarRating(item.sender_rating)} ★</Text>
        ) : null}
        <Text style={[styles.status, isWatched ? styles.statusWatched : styles.statusPending]}>
          {isWatched ? "Watched" : "Pending"}
        </Text>
      </View>
      {isWatched && item.rating ? (
        <View style={styles.response}>
          <Text style={styles.responseLine}>
            Their rating: {formatStarRating(actual)} ★ {item.rating.is_favorite ? "♥" : ""}
          </Text>
          {comparison ? <Text style={styles.diff}>{comparison.diffText}</Text> : null}
          {item.rating.notes ? <Text style={styles.notes}>"{item.rating.notes}"</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

const DEFAULT_SORT: SortOption = "newest";

export default function SentScreen() {
  const { user } = useAuth();
  const [items, setItems] = useState<RatedRecommendation[]>([]);
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
      setItems(await getSentRecommendations(user.id));
    } catch (error) {
      Alert.alert("Could not load sent recommendations", (error as Error).message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const recipients = useMemo(() => {
    const byId = new Map<string, UserProfile>();
    items.forEach((item) => {
      if (item.to_user) {
        byId.set(item.to_user.id, item.to_user);
      }
    });
    return [...byId.values()].sort((a, b) => a.username.localeCompare(b.username));
  }, [items]);

  const filteredItems = useMemo(() => {
    let list = friendFilter === "all" ? [...items] : items.filter((item) => item.to_user_id === friendFilter);

    list.sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }

      if (sortBy === "oldest") {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }

      const aRating = a.rating?.rating_value ?? -1;
      const bRating = b.rating?.rating_value ?? -1;

      if (sortBy === "rating_high") {
        return bRating - aRating;
      }

      const aSort = a.rating?.rating_value ?? Number.POSITIVE_INFINITY;
      const bSort = b.rating?.rating_value ?? Number.POSITIVE_INFINITY;
      return aSort - bSort;
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
        <EmptyState title="Nothing sent yet" body="Recommendations you send to friends will show up here." />
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
            {recipients.map((recipient) => (
              <SortChip
                key={recipient.id}
                label={`@${recipient.username}`}
                selected={friendFilter === recipient.id}
                onPress={() => toggleFriend(recipient.id)}
              />
            ))}
          </SortChipRow>
        </View>
      ) : null}

      {!loading && items.length > 0 && filteredItems.length === 0 ? (
        <EmptyState title="No matches" body="Try a different friend filter." />
      ) : null}

      {visibleItems.map((item) => (
        <SentRecommendationCard key={item.id} item={item} />
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
  recipient: {
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
  senderRating: {
    color: colors.muted,
    fontSize: 14
  },
  status: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  statusPending: {
    color: colors.muted
  },
  statusWatched: {
    color: colors.accent
  },
  response: {
    borderColor: colors.border,
    borderTopWidth: 1,
    gap: spacing.xs,
    marginTop: spacing.xs,
    paddingTop: spacing.sm
  },
  responseLine: {
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
