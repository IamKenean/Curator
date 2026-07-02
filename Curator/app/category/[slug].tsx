import { Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Dimensions, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { BookshelfPoster } from "../../src/components/BookshelfPoster";
import { EmptyState } from "../../src/components/EmptyState";
import { RatingModal } from "../../src/components/RatingModal";
import { RecommendationActionModal } from "../../src/components/RecommendationActionModal";
import { Screen } from "../../src/components/Screen";
import { SortChip, SortChipRow } from "../../src/components/SortChip";
import {
  HOME_CATEGORIES,
  isHomeCategorySlug,
  loadCategoryItems,
  sortBookshelfItems,
  type BookshelfItem,
  type CategorySortOption
} from "../../src/lib/homeCategories";
import { formatComparison, formatStarRating } from "../../src/lib/ratings";
import { markRecommendationWatchedAndRate } from "../../src/lib/recommendations";
import { useAuth } from "../../src/providers/AuthProvider";
import { colors, spacing } from "../../src/theme";
import type { Recommendation, TmdbSearchResult } from "../../src/types";

const NUM_COLUMNS = 4;
const GRID_GAP = spacing.sm;
const H_PADDING = spacing.lg;
const SCREEN_WIDTH = Dimensions.get("window").width;
const CELL_WIDTH = (SCREEN_WIDTH - H_PADDING * 2 - GRID_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

export default function CategoryScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { user } = useAuth();
  const [items, setItems] = useState<BookshelfItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState<CategorySortOption | null>(null);
  const [selectedRecommendation, setSelectedRecommendation] = useState<
    (Recommendation & { tmdb?: TmdbSearchResult }) | null
  >(null);
  const [ratingTarget, setRatingTarget] = useState<(Recommendation & { tmdb?: TmdbSearchResult }) | null>(null);

  const categorySlug = slug && isHomeCategorySlug(slug) ? slug : null;
  const config = categorySlug ? HOME_CATEGORIES[categorySlug] : null;

  useEffect(() => {
    if (config) {
      setSortBy(config.defaultSort);
    }
  }, [categorySlug, config]);

  const load = useCallback(async () => {
    if (!user || !config) {
      return;
    }

    setLoading(true);
    try {
      const loaded = await loadCategoryItems(user.id, config.slug);
      setItems(loaded);
    } catch (error) {
      Alert.alert("Could not load category", (error as Error).message);
    } finally {
      setLoading(false);
    }
  }, [config, user]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const activeSort = sortBy ?? config?.defaultSort ?? "rating_high";
  const sortedItems = useMemo(() => sortBookshelfItems(items, activeSort), [activeSort, items]);

  function toggleSort(optionId: CategorySortOption) {
    if (!config) {
      return;
    }

    setSortBy((current) => {
      const active = current ?? config.defaultSort;
      return active === optionId ? config.defaultSort : optionId;
    });
  }

  async function submitRating(input: { stars: number; notes: string; isFavorite: boolean }) {
    if (!user || !ratingTarget) {
      return;
    }

    await markRecommendationWatchedAndRate({
      recommendation: ratingTarget,
      currentUserId: user.id,
      stars: input.stars,
      notes: input.notes,
      isFavorite: input.isFavorite
    });

    const comparison = formatComparison(ratingTarget.estimated_rating, input.stars);
    if (comparison) {
      Alert.alert(
        "Review sent",
        `Estimate: ${formatStarRating(comparison.estimated)} ★\nYour rating: ${formatStarRating(comparison.actual)} ★\n${comparison.diffText}`
      );
    }

    setRatingTarget(null);
    await load();
  }

  if (!config) {
    return (
      <Screen>
        <EmptyState title="Unknown category" body="Go back and try again." />
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <Stack.Screen options={{ title: config.title }} />
      <View style={styles.wrap}>
        <View style={styles.sortSection}>
          <Text style={styles.subtitle}>{config.subtitle}</Text>
          <SortChipRow>
            {config.sortOptions.map((option) => (
              <SortChip
                key={option.id}
                label={option.label}
                selected={activeSort === option.id}
                onPress={() => toggleSort(option.id)}
              />
            ))}
          </SortChipRow>
        </View>

        {loading ? <Text style={styles.muted}>Loading...</Text> : null}

        {!loading && sortedItems.length === 0 ? (
          <EmptyState title="Nothing here yet" body="Check back when there's more activity." />
        ) : null}

        {!loading && sortedItems.length > 0 ? (
          <FlatList
            style={styles.list}
            data={sortedItems}
            keyExtractor={(item) => item.id}
            numColumns={NUM_COLUMNS}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.gridContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <Pressable
                style={styles.cell}
                onPress={() => {
                  if (item.recommendation) {
                    setSelectedRecommendation(item.recommendation);
                  }
                }}
              >
                <BookshelfPoster tmdb={item.tmdb} subtitle={item.subtitle} meta={item.meta} width={CELL_WIDTH} />
              </Pressable>
            )}
          />
        ) : null}
      </View>

      <RecommendationActionModal
        visible={Boolean(selectedRecommendation)}
        recommendation={selectedRecommendation}
        tmdb={selectedRecommendation?.tmdb}
        onClose={() => setSelectedRecommendation(null)}
        onWatchLater={() => setSelectedRecommendation(null)}
        onMarkWatched={() => {
          if (selectedRecommendation) {
            setRatingTarget(selectedRecommendation);
          }
          setSelectedRecommendation(null);
        }}
      />

      <RatingModal
        visible={Boolean(ratingTarget)}
        recommendation={ratingTarget}
        tmdb={ratingTarget?.tmdb}
        onClose={() => setRatingTarget(null)}
        onSubmit={submitRating}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    gap: spacing.md
  },
  sortSection: {
    flexGrow: 0,
    flexShrink: 0,
    gap: spacing.sm
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20
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
  },
  muted: {
    color: colors.muted
  }
});
