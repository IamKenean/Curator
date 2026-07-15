import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, View } from "react-native";
import { getCalibrationFeed } from "../lib/calibrationEvents";
import { useAuth } from "../providers/AuthProvider";
import { useTheme } from "../providers/ThemeProvider";
import type { ColorScheme } from "../theme/colorSchemes";
import { spacing } from "../theme";
import type { CalibrationEvent, CalibrationEventType, TmdbSearchResult, UserProfile } from "../types";
import { CalibrationEventCard } from "./CalibrationEventCard";
import { EmptyState } from "./EmptyState";
import { InviteFriendsCard } from "./InviteFriendsCard";
import { SortChip, SortChipRow } from "./SortChip";

type JournalSort =
  | "newest"
  | "oldest"
  | "best_match"
  | "biggest_miss"
  | "trust_gain"
  | "trust_loss";

type JournalTypeFilter = "all" | CalibrationEventType;

type CalibrationJournalPanelProps = {
  active?: boolean;
  friendCount: number;
  onInviteFriends: () => void;
  onGoToInbox: () => void;
  onOpenFilm: (item: TmdbSearchResult) => void;
};

const DEFAULT_SORT: JournalSort = "newest";

export function CalibrationJournalPanel({
  active = true,
  friendCount,
  onInviteFriends,
  onGoToInbox,
  onOpenFilm
}: CalibrationJournalPanelProps) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [items, setItems] = useState<CalibrationEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState<JournalSort>(DEFAULT_SORT);
  const [typeFilter, setTypeFilter] = useState<JournalTypeFilter>("all");
  const [friendFilter, setFriendFilter] = useState("all");

  const load = useCallback(async () => {
    if (!user) {
      return;
    }

    setLoading(true);
    try {
      setItems(await getCalibrationFeed(user.id));
    } catch (error) {
      Alert.alert("Could not load journal", (error as Error).message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      if (active) {
        void load();
      }
    }, [active, load])
  );

  useEffect(() => {
    if (active) {
      void load();
    }
  }, [active, load]);

  const friends = useMemo(() => {
    const byId = new Map<string, UserProfile>();
    items.forEach((item) => {
      if (item.friend) {
        byId.set(item.friend.id, item.friend);
      }
    });
    return [...byId.values()].sort((a, b) => a.username.localeCompare(b.username));
  }, [items]);

  const filteredItems = useMemo(() => {
    let list = [...items];

    if (typeFilter !== "all") {
      list = list.filter((item) => item.event_type === typeFilter);
    }

    if (friendFilter !== "all") {
      list = list.filter((item) => item.friend_user_id === friendFilter);
    }

    list.sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.rated_at).getTime() - new Date(a.rated_at).getTime();
      }

      if (sortBy === "oldest") {
        return new Date(a.rated_at).getTime() - new Date(b.rated_at).getTime();
      }

      if (sortBy === "best_match") {
        return b.rec_accuracy - a.rec_accuracy;
      }

      if (sortBy === "biggest_miss") {
        return a.rec_accuracy - b.rec_accuracy;
      }

      if (sortBy === "trust_gain") {
        return b.trust_delta_percent - a.trust_delta_percent;
      }

      return a.trust_delta_percent - b.trust_delta_percent;
    });

    return list;
  }, [friendFilter, items, sortBy, typeFilter]);

  function toggleSort(option: JournalSort) {
    setSortBy((current) => (current === option ? DEFAULT_SORT : option));
  }

  function toggleType(option: JournalTypeFilter) {
    setTypeFilter((current) => (current === option ? "all" : option));
  }

  function toggleFriend(friendId: string) {
    setFriendFilter((current) => (current === friendId ? "all" : friendId));
  }

  function openFilmFromEvent(event: CalibrationEvent) {
    if (event.tmdb) {
      onOpenFilm(event.tmdb);
      return;
    }

    onOpenFilm({
      id: event.tmdb_id,
      media_type: event.media_type,
      title: `TMDB #${event.tmdb_id}`,
      year: "",
      poster_path: null
    });
  }

  if (friendCount === 0) {
    return (
      <View style={styles.panel}>
        <InviteFriendsCard onInvite={onInviteFriends} />
      </View>
    );
  }

  if (loading && items.length === 0) {
    return (
      <View style={styles.panel}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!loading && items.length === 0) {
    return (
      <View style={styles.panel}>
        <EmptyState
          title="No calibrations yet"
          body="Rate a recommendation from your inbox to start your taste ledger."
          actionLabel="Go to inbox"
          onAction={onGoToInbox}
        />
      </View>
    );
  }

  return (
    <View style={styles.panel}>
      <SortChipRow>
        <SortChip label="Newest" selected={sortBy === "newest"} onPress={() => toggleSort("newest")} />
        <SortChip label="Oldest" selected={sortBy === "oldest"} onPress={() => toggleSort("oldest")} />
        <SortChip label="Best match" selected={sortBy === "best_match"} onPress={() => toggleSort("best_match")} />
        <SortChip label="Biggest miss" selected={sortBy === "biggest_miss"} onPress={() => toggleSort("biggest_miss")} />
        <SortChip label="Trust gain" selected={sortBy === "trust_gain"} onPress={() => toggleSort("trust_gain")} />
        <SortChip label="Trust loss" selected={sortBy === "trust_loss"} onPress={() => toggleSort("trust_loss")} />
      </SortChipRow>

      <SortChipRow>
        <SortChip label="All" selected={typeFilter === "all"} onPress={() => toggleType("all")} />
        <SortChip
          label="Received"
          selected={typeFilter === "received"}
          onPress={() => toggleType("received")}
        />
        <SortChip
          label="Sent responses"
          selected={typeFilter === "sent_response"}
          onPress={() => toggleType("sent_response")}
        />
        {friends.map((friend) => (
          <SortChip
            key={friend.id}
            label={`@${friend.username}`}
            selected={friendFilter === friend.id}
            onPress={() => toggleFriend(friend.id)}
          />
        ))}
      </SortChipRow>

      {loading ? <Text style={styles.muted}>Refreshing...</Text> : null}

      {filteredItems.length === 0 ? (
        <EmptyState title="No matches" body="Try a different filter." />
      ) : (
        <View style={styles.list}>
          {filteredItems.map((event) => (
            <CalibrationEventCard
              key={event.id}
              event={event}
              onPress={() => openFilmFromEvent(event)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function createStyles(colors: ColorScheme) {
  return StyleSheet.create({
    panel: {
      gap: spacing.md,
      paddingBottom: spacing.md
    },
    list: {
      gap: spacing.sm
    },
    muted: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: "600"
    }
  });
}
