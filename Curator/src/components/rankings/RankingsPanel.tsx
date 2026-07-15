import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import {
  addToTop10,
  getUserTop10,
  removeFromTop10,
  reorderTop10
} from "../../lib/userRankings";
import { DEFAULT_RANKING_LIST_TYPE, rankingListLabel } from "../../lib/rankingListTypes";
import {
  getTitleRating,
  getUserRatingCount,
  isRankingsBackendReady,
  isRankingsUnlocked,
  RANKINGS_UNLOCK_RATING_COUNT,
  TOP_10_SIZE,
  upsertTitleRating
} from "../../lib/titleRatings";
import { useAuth } from "../../providers/AuthProvider";
import { useTheme } from "../../providers/ThemeProvider";
import type { ColorScheme } from "../../theme/colorSchemes";
import { spacing } from "../../theme";
import type { RankingListType, TmdbSearchResult, UserRanking } from "../../types";
import { MovieSearchModal } from "../MovieSearchModal";
import { QuickRatingModal } from "../QuickRatingModal";
import { RankingsListTypePicker } from "./RankingsListTypePicker";
import { RankingsUnlockGate } from "./RankingsUnlockGate";
import { Top10RankingList } from "./Top10RankingList";

type RankingsPanelProps = {
  active?: boolean;
  onGoToInbox?: () => void;
  userId?: string;
  readOnly?: boolean;
};

export function RankingsPanel({
  active = true,
  onGoToInbox,
  userId: viewUserId,
  readOnly = false
}: RankingsPanelProps) {
  const { user } = useAuth();
  const targetUserId = viewUserId ?? user?.id;
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [loading, setLoading] = useState(false);
  const [backendReady, setBackendReady] = useState(true);
  const [ratingCount, setRatingCount] = useState(0);
  const [unlocked, setUnlocked] = useState(false);
  const [rankings, setRankings] = useState<UserRanking[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [ratingTarget, setRatingTarget] = useState<TmdbSearchResult | null>(null);
  const [pendingAdd, setPendingAdd] = useState<TmdbSearchResult | null>(null);
  const [listType, setListType] = useState<RankingListType>(DEFAULT_RANKING_LIST_TYPE);

  const load = useCallback(async () => {
    if (!targetUserId) {
      return;
    }

    setLoading(true);
    try {
      const ready = await isRankingsBackendReady();
      setBackendReady(ready);

      if (readOnly) {
        const top10 = await getUserTop10(targetUserId, listType);
        setRatingCount(0);
        setUnlocked(true);
        setRankings(top10);
        return;
      }

      if (!user) {
        return;
      }

      const [count, isUnlocked, top10] = await Promise.all([
        getUserRatingCount(user.id),
        isRankingsUnlocked(user.id),
        getUserTop10(user.id, listType)
      ]);
      setRatingCount(count);
      setUnlocked(isUnlocked);
      setRankings(top10);
    } catch (error) {
      Alert.alert("Could not load rankings", (error as Error).message);
    } finally {
      setLoading(false);
    }
  }, [listType, readOnly, targetUserId, user]);

  useEffect(() => {
    if (active) {
      void load();
    }
  }, [active, load]);

  async function handleReorder(next: UserRanking[]) {
    if (!user || readOnly) {
      return;
    }

    const optimistic = next.map((item, index) => ({
      ...item,
      rank_position: index + 1
    }));
    setRankings(optimistic);

    try {
      await reorderTop10(
        user.id,
        optimistic.map((item) => ({
          tmdb_id: item.tmdb_id,
          media_type: item.media_type
        })),
        listType
      );
    } catch (error) {
      Alert.alert("Could not reorder", (error as Error).message);
      await load();
    }
  }

  async function handleRemove(item: UserRanking) {
    if (!user || readOnly) {
      return;
    }

    try {
      await removeFromTop10(user.id, item.tmdb_id, item.media_type, listType);
      await load();
    } catch (error) {
      Alert.alert("Could not remove", (error as Error).message);
    }
  }

  async function finalizeAdd(item: TmdbSearchResult) {
    if (!user) {
      return;
    }

    if (rankings.length >= TOP_10_SIZE) {
      Alert.alert("Top 10 is full", "Remove a film before adding another.");
      return;
    }

    try {
      await addToTop10(user.id, { id: item.id, media_type: item.media_type }, listType);
      setPendingAdd(null);
      await load();
    } catch (error) {
      Alert.alert("Could not add to Top 10", (error as Error).message);
    }
  }

  async function handleSearchSelect(item: TmdbSearchResult) {
    if (!user) {
      return;
    }

    setSearchOpen(false);

    const existing = rankings.find(
      (ranking) => ranking.tmdb_id === item.id && ranking.media_type === item.media_type
    );
    if (existing) {
      Alert.alert("Already ranked", `This film is already in your Top 10 ${rankingListLabel(listType)}.`);
      return;
    }

    const rating = await getTitleRating(user.id, item.id, item.media_type);
    if (!rating || rating.rating_value <= 0) {
      setPendingAdd(item);
      setRatingTarget(item);
      return;
    }

    await finalizeAdd(item);
  }

  async function handleRateBeforeAdd(input: { stars: number; isFavorite: boolean }) {
    if (!user || !ratingTarget) {
      return;
    }

    await upsertTitleRating(user.id, ratingTarget, input);
    setRatingCount((count) => Math.max(count, ratingCount + (count >= RANKINGS_UNLOCK_RATING_COUNT ? 0 : 1)));
    setUnlocked(await isRankingsUnlocked(user.id));

    const toAdd = pendingAdd ?? ratingTarget;
    setRatingTarget(null);
    await finalizeAdd(toAdd);
  }

  if (!targetUserId) {
    return null;
  }

  if (!readOnly && !user) {
    return null;
  }

  if (!backendReady) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.setupTitle}>Rankings setup needed</Text>
        <Text style={styles.setupBody}>
          Run `supabase/title-ratings.sql` and `supabase/user-rankings.sql` in Supabase SQL Editor, then reload.
        </Text>
      </View>
    );
  }

  if (!unlocked && !readOnly) {
    return (
      <>
        <RankingsUnlockGate
          ratingCount={ratingCount}
          onSearchRate={() => setSearchOpen(true)}
          onGoToInbox={onGoToInbox}
        />
        <MovieSearchModal
          visible={searchOpen}
          subtitle="Rate films to unlock your Top 10."
          onClose={() => setSearchOpen(false)}
          onSelect={(item) => void handleSearchSelect(item)}
        />
        <QuickRatingModal
          visible={Boolean(ratingTarget)}
          tmdb={ratingTarget}
          onClose={() => {
            setRatingTarget(null);
            setPendingAdd(null);
          }}
          onSubmit={handleRateBeforeAdd}
        />
      </>
    );
  }

  const emptySlots = readOnly ? 0 : Math.max(0, TOP_10_SIZE - rankings.length);
  const ownerLabel = readOnly ? "THEIR TOP 10" : "YOUR TOP 10";

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.heading}>{ownerLabel}</Text>
          <RankingsListTypePicker value={listType} onChange={setListType} />
        </View>
        {!readOnly ? (
          <Pressable onPress={() => setSearchOpen(true)} style={styles.addButton}>
            <Text style={styles.addButtonText}>+ Add film</Text>
          </Pressable>
        ) : null}
      </View>

      {loading && rankings.length === 0 ? (
        <Text style={styles.loading}>Loading rankings...</Text>
      ) : rankings.length === 0 && readOnly ? (
        <Text style={styles.loading}>No rankings in this list yet.</Text>
      ) : (
        <Top10RankingList
          items={rankings}
          emptySlots={emptySlots}
          readOnly={readOnly}
          onReorder={(next) => void handleReorder(next)}
          onRemove={(item) => void handleRemove(item)}
        />
      )}

      {!readOnly ? (
        <>
          <MovieSearchModal
            visible={searchOpen}
            subtitle={`Add a film to your Top 10 ${rankingListLabel(listType)}.`}
            onClose={() => setSearchOpen(false)}
            onSelect={(item) => void handleSearchSelect(item)}
          />

          <QuickRatingModal
            visible={Boolean(ratingTarget)}
            tmdb={ratingTarget}
            onClose={() => {
              setRatingTarget(null);
              setPendingAdd(null);
            }}
            onSubmit={handleRateBeforeAdd}
          />
        </>
      ) : null}
    </View>
  );
}

function createStyles(colors: ColorScheme) {
  return StyleSheet.create({
    wrap: {
      flex: 1,
      gap: spacing.md
    },
    header: {
      alignItems: "center",
      flexDirection: "row",
      gap: spacing.sm,
      justifyContent: "space-between",
      paddingHorizontal: spacing.sm
    },
    titleRow: {
      alignItems: "center",
      flex: 1,
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.xs,
      minWidth: 0
    },
    heading: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 0.8
    },
    addButton: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs
    },
    addButtonText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: "800"
    },
    loading: {
      color: colors.muted,
      fontSize: 13,
      paddingHorizontal: spacing.sm
    },
    setupTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: "800",
      paddingHorizontal: spacing.sm
    },
    setupBody: {
      color: colors.muted,
      fontSize: 13,
      lineHeight: 18,
      paddingHorizontal: spacing.sm
    }
  });
}
