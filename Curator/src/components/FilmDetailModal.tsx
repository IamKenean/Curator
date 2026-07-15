import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getTmdbTitleDetail } from "../lib/tmdb";
import { getTitleRating, saveTitleRating } from "../lib/titleRatings";
import { addToWatchlist, isInWatchlist, removeFromWatchlist } from "../lib/watchlist";
import { useAuth } from "../providers/AuthProvider";
import { useTheme } from "../providers/ThemeProvider";
import type { ColorScheme } from "../theme/colorSchemes";
import { backdropBaseUrl, posterBaseUrl, spacing } from "../theme";
import type { MediaType, TmdbSearchResult, TmdbTitleDetail } from "../types";
import { QuickRatingModal } from "./QuickRatingModal";

const HERO_HEIGHT = Math.round(Dimensions.get("window").height * 0.46);
const POSTER_WIDTH = 128;
const POSTER_HEIGHT = 192;
const POSTER_OVERHANG = 56;
const POSTER_RIGHT = spacing.xl + 10;
const TITLE_POSTER_ANCHOR = POSTER_HEIGHT * (2 / 12);
const FOOTER_HEIGHT = 58;

type FilmDetailModalProps = {
  visible: boolean;
  title: TmdbSearchResult | null;
  onClose: () => void;
};

function formatRuntime(minutes: number | null) {
  if (!minutes || minutes <= 0) {
    return null;
  }

  return `${minutes} mins`;
}

function tmdbStars(voteAverage: number | null) {
  if (voteAverage == null || voteAverage <= 0) {
    return null;
  }

  return (voteAverage / 2).toFixed(1);
}

function BannerFade({ backgroundColor }: { backgroundColor: string }) {
  return (
    <LinearGradient
      colors={["transparent", backgroundColor]}
      locations={[0.15, 1]}
      pointerEvents="none"
      style={styles.fadeContainer}
    />
  );
}

export function FilmDetailModal({ visible, title, onClose }: FilmDetailModalProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [detail, setDetail] = useState<TmdbTitleDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [ratingOpen, setRatingOpen] = useState(false);
  const [savedRating, setSavedRating] = useState(0);
  const [onWatchlist, setOnWatchlist] = useState(false);
  const [watchlistBusy, setWatchlistBusy] = useState(false);

  useEffect(() => {
    if (!visible || !title) {
      setDetail(null);
      setSavedRating(0);
      setOnWatchlist(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void getTmdbTitleDetail(title.id, title.media_type)
      .then((loaded) => {
        if (!cancelled) {
          setDetail(loaded);
        }
      })
      .catch((error: Error) => {
        if (!cancelled) {
          Alert.alert("Could not load title", error.message);
          onClose();
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    if (user) {
      void Promise.all([
        getTitleRating(user.id, title.id, title.media_type),
        isInWatchlist(user.id, title)
      ]).then(([rating, watchlisted]) => {
        if (!cancelled) {
          setSavedRating(rating?.rating_value ?? 0);
          setOnWatchlist(watchlisted);
        }
      });
    }

    return () => {
      cancelled = true;
    };
  }, [onClose, title, user, visible]);

  const display = detail ?? title;
  const backdropUri =
    detail?.backdrop_path != null ? `${backdropBaseUrl}${detail.backdrop_path}` : null;

  async function openTrailer() {
    if (!detail?.trailer_key) {
      Alert.alert("No trailer", "TMDB does not have a trailer for this title yet.");
      return;
    }

    const url = `https://www.youtube.com/watch?v=${detail.trailer_key}`;
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert("Could not open trailer");
      return;
    }

    await Linking.openURL(url);
  }

  async function handleWatchlistPress() {
    if (!user || !display) {
      Alert.alert("Sign in required", "Sign in to save titles to your watchlist.");
      return;
    }

    setWatchlistBusy(true);
    try {
      if (onWatchlist) {
        await removeFromWatchlist(user.id, display);
        setOnWatchlist(false);
      } else {
        await addToWatchlist(user.id, display);
        setOnWatchlist(true);
      }
    } catch (error) {
      Alert.alert("Watchlist error", (error as Error).message);
    } finally {
      setWatchlistBusy(false);
    }
  }

  async function handleQuickRating(input: { stars: number; isFavorite: boolean }) {
    if (!user || !display) {
      Alert.alert("Sign in required", "Sign in to rate titles.");
      return;
    }

    const saved = await saveTitleRating(user.id, display, input);
    setSavedRating(saved.rating_value);
  }

  const posterUri = display?.poster_path ? `${posterBaseUrl}${display.poster_path}` : null;
  const runtimeLabel = formatRuntime(detail?.runtime_minutes ?? null);
  const ratingLabel = tmdbStars(detail?.vote_average ?? null);
  const yearLabel = display && display.year !== "Unknown" && display.year ? display.year : null;
  const directorHeading = detail?.director
    ? [yearLabel, "DIRECTED BY"].filter(Boolean).join(" • ")
    : yearLabel;

  const heroHeight = HERO_HEIGHT + insets.top;
  const posterTopInHero = heroHeight - POSTER_HEIGHT + POSTER_OVERHANG;
  const titleAnchorTop = posterTopInHero + TITLE_POSTER_ANCHOR;
  const modalVisible = visible && Boolean(title);

  return (
    <Modal
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent
      visible={modalVisible}
      onRequestClose={onClose}
    >
      {display ? (
      <View style={styles.root}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: FOOTER_HEIGHT + insets.bottom + spacing.xl * 2 }
          ]}
        >
          <View style={[styles.hero, { height: heroHeight }]}>
            <View style={styles.bannerClip} pointerEvents="none">
              {backdropUri ? (
                <Image resizeMode="cover" source={{ uri: backdropUri }} style={styles.banner} />
              ) : posterUri ? (
                <Image resizeMode="cover" source={{ uri: posterUri }} style={styles.banner} blurRadius={10} />
              ) : (
                <View style={[styles.banner, styles.bannerFallback]} />
              )}

              <View style={styles.bannerTopShade} />
              <BannerFade backgroundColor={colors.background} />
            </View>

            <Pressable
              hitSlop={12}
              onPress={onClose}
              style={[styles.iconButton, { top: insets.top + spacing.sm }]}
            >
              <Ionicons name="chevron-back" size={20} color={colors.text} />
            </Pressable>
            <Pressable
              hitSlop={12}
              onPress={() => Alert.alert("Coming soon", "More options is under development.")}
              style={[styles.iconButton, styles.iconButtonRight, { top: insets.top + spacing.sm }]}
            >
              <Ionicons name="ellipsis-horizontal" size={18} color={colors.text} />
            </Pressable>

            {posterUri ? (
              <View style={styles.posterFrame}>
                <Image source={{ uri: posterUri }} style={styles.posterThumb} />
              </View>
            ) : null}

            <View style={[styles.heroContent, { top: titleAnchorTop - 2 }]}>
              <View style={styles.titleCopy}>
                <Text style={styles.title}>{display.title}</Text>
                {directorHeading ? <Text style={styles.creditHeading}>{directorHeading}</Text> : null}
                {detail?.director ? <Text style={styles.directorName}>{detail.director}</Text> : null}
                <View style={styles.trailerRow}>
                  <Pressable
                    onPress={() => void openTrailer()}
                    style={[styles.trailerButton, !detail?.trailer_key && styles.trailerButtonDisabled]}
                  >
                    <Ionicons name="play" size={9} color={colors.text} />
                    <Text style={styles.trailerText}>TRAILER</Text>
                  </Pressable>
                  {runtimeLabel ? <Text style={styles.runtime}>{runtimeLabel}</Text> : null}
                </View>
              </View>
            </View>
          </View>

          <View style={styles.body}>
            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={colors.accent} size="small" />
              </View>
            ) : null}

            {detail?.tagline ? <Text style={styles.tagline}>{detail.tagline.toUpperCase()}</Text> : null}

            {display.overview ? <Text style={styles.overview}>{display.overview}</Text> : null}

            <View style={styles.ratingsBlock}>
              <Text style={styles.sectionLabel}>RATINGS</Text>
              <View style={styles.ratingsRow}>
                <View style={styles.histogram}>
                  {[14, 22, 34, 44, 32, 20, 12].map((height, index) => (
                    <View key={index} style={[styles.histogramBar, { height }]} />
                  ))}
                </View>
                <View style={styles.ratingSummary}>
                  <Text style={styles.ratingValue}>{ratingLabel ?? "—"}</Text>
                  <View style={styles.starRow}>
                    {[0, 1, 2, 3, 4].map((index) => (
                      <Ionicons key={index} name="star" size={12} color={colors.success} />
                    ))}
                  </View>
                  <Text style={styles.ratingSource}>TMDB average</Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={[styles.footerBar, { paddingBottom: insets.bottom + spacing.sm }]}>
          <Pressable
            disabled={watchlistBusy}
            onPress={() => void handleWatchlistPress()}
            style={[styles.secondaryAction, onWatchlist && styles.secondaryActionActive]}
          >
            <Ionicons name={onWatchlist ? "checkmark" : "add"} size={14} color={colors.text} />
            <Text style={styles.secondaryActionText}>{onWatchlist ? "In Watchlist" : "Watchlist"}</Text>
          </Pressable>
          <Pressable onPress={() => setRatingOpen(true)} style={styles.primaryAction}>
            <Ionicons name="star-outline" size={14} color={colors.accent} />
            <Text style={styles.primaryActionText}>{savedRating ? "Update rating" : "Rate / Review"}</Text>
          </Pressable>
        </View>

        <QuickRatingModal
          initialStars={savedRating}
          tmdb={display}
          visible={ratingOpen}
          onClose={() => setRatingOpen(false)}
          onSubmit={handleQuickRating}
        />
      </View>
      ) : (
        <View style={[styles.root, styles.loadingRoot]}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  fadeContainer: {
    bottom: -spacing.lg,
    height: HERO_HEIGHT * 0.88,
    left: 0,
    position: "absolute",
    right: 0
  }
});

function createStyles(colors: ColorScheme) {
  return StyleSheet.create({
    root: {
      backgroundColor: colors.background,
      flex: 1
    },
    loadingRoot: {
      alignItems: "center",
      justifyContent: "center"
    },
    scrollContent: {
      flexGrow: 1
    },
    hero: {
      position: "relative"
    },
    bannerClip: {
      ...StyleSheet.absoluteFillObject,
      overflow: "hidden"
    },
    banner: {
      ...StyleSheet.absoluteFillObject
    },
    bannerFallback: {
      backgroundColor: colors.card
    },
    bannerTopShade: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.18)"
    },
    iconButton: {
      alignItems: "center",
      backgroundColor: "rgba(0,0,0,0.45)",
      borderRadius: 999,
      height: 32,
      justifyContent: "center",
      left: spacing.lg,
      position: "absolute",
      width: 32,
      zIndex: 2
    },
    iconButtonRight: {
      left: undefined,
      right: spacing.lg
    },
    heroContent: {
      left: 0,
      paddingHorizontal: spacing.lg,
      position: "absolute",
      right: POSTER_WIDTH + POSTER_RIGHT + spacing.md,
      zIndex: 1
    },
    titleCopy: {
      gap: 3,
      minWidth: 0
    },
    title: {
      color: colors.text,
      fontSize: 23,
      fontWeight: "800",
      letterSpacing: -0.3,
      lineHeight: 27
    },
    creditHeading: {
      color: colors.muted,
      fontSize: 8,
      fontWeight: "700",
      letterSpacing: 0.8,
      marginTop: spacing.sm + 2
    },
    directorName: {
      color: colors.text,
      fontSize: 17,
      fontWeight: "800",
      letterSpacing: -0.2,
      lineHeight: 20,
      marginTop: 1
    },
    posterFrame: {
      borderColor: colors.border,
      borderRadius: 10,
      borderWidth: 1,
      bottom: -POSTER_OVERHANG,
      overflow: "hidden",
      position: "absolute",
      right: POSTER_RIGHT,
      zIndex: 2
    },
    posterThumb: {
      backgroundColor: colors.card,
      height: POSTER_HEIGHT,
      width: POSTER_WIDTH
    },
    trailerRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: spacing.sm,
      marginTop: spacing.sm
    },
    body: {
      gap: spacing.lg,
      paddingHorizontal: spacing.lg,
      paddingTop: POSTER_OVERHANG + spacing.xl + spacing.md
    },
    trailerButton: {
      alignItems: "center",
      backgroundColor: colors.accent,
      borderRadius: 5,
      flexDirection: "row",
      gap: 3,
      paddingHorizontal: spacing.sm,
      paddingVertical: 5
    },
    trailerButtonDisabled: {
      opacity: 0.65
    },
    trailerText: {
      color: colors.text,
      fontSize: 9,
      fontWeight: "800",
      letterSpacing: 0.5
    },
    runtime: {
      color: colors.muted,
      fontSize: 10,
      fontWeight: "700"
    },
    loadingRow: {
      alignItems: "flex-start",
      paddingVertical: spacing.xs
    },
    tagline: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 0.8,
      marginTop: spacing.xs
    },
    overview: {
      color: colors.text,
      fontSize: 13,
      lineHeight: 20
    },
    ratingsBlock: {
      gap: spacing.md,
      paddingTop: spacing.sm
    },
    sectionLabel: {
      color: colors.muted,
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 0.8
    },
    ratingsRow: {
      alignItems: "flex-end",
      flexDirection: "row",
      gap: spacing.md,
      justifyContent: "space-between"
    },
    histogram: {
      alignItems: "flex-end",
      flex: 1,
      flexDirection: "row",
      gap: 3,
      height: 58
    },
    histogramBar: {
      backgroundColor: colors.border,
      borderRadius: 2,
      flex: 1,
      minHeight: 6
    },
    ratingSummary: {
      alignItems: "flex-end",
      gap: 2,
      minWidth: 56
    },
    ratingValue: {
      color: colors.text,
      fontSize: 20,
      fontWeight: "900",
      lineHeight: 22
    },
    starRow: {
      flexDirection: "row",
      gap: 1
    },
    ratingSource: {
      color: colors.muted,
      fontSize: 10,
      fontWeight: "700"
    },
    footerBar: {
      backgroundColor: colors.background,
      borderTopColor: colors.border,
      borderTopWidth: 1,
      bottom: 0,
      flexDirection: "row",
      gap: spacing.sm,
      left: 0,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      position: "absolute",
      right: 0
    },
    secondaryAction: {
      alignItems: "center",
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: 10,
      borderWidth: 1,
      flex: 1,
      flexDirection: "row",
      gap: spacing.xs,
      justifyContent: "center",
      minHeight: 42,
      paddingHorizontal: spacing.sm
    },
    secondaryActionActive: {
      borderColor: colors.success,
    },
    secondaryActionText: {
      color: colors.text,
      fontSize: 11,
      fontWeight: "800"
    },
    primaryAction: {
      alignItems: "center",
      backgroundColor: colors.background,
      borderColor: colors.accent,
      borderRadius: 10,
      borderWidth: 1,
      flex: 1,
      flexDirection: "row",
      gap: spacing.xs,
      justifyContent: "center",
      minHeight: 42,
      paddingHorizontal: spacing.sm
    },
    primaryActionText: {
      color: colors.accent,
      fontSize: 11,
      fontWeight: "800"
    }
  });
}

export function filmTargetFromItem(item: {
  tmdb_id: number;
  media_type: MediaType;
  tmdb?: TmdbSearchResult;
}): TmdbSearchResult {
  if (item.tmdb) {
    return item.tmdb;
  }

  return {
    id: item.tmdb_id,
    media_type: item.media_type,
    title: "Loading...",
    year: "",
    poster_path: null
  };
}
