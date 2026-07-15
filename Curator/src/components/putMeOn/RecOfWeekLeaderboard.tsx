import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { RecOfWeekBoard, RecOfWeekEntry } from "../../lib/recOfWeek";
import { formatRecOfWeekCountdown, REC_OF_WEEK_PREVIEW_COUNT } from "../../lib/recOfWeek";
import { getTmdbTitleDetail } from "../../lib/tmdb";
import { useTheme } from "../../providers/ThemeProvider";
import type { ColorScheme } from "../../theme";
import { backdropBaseUrl, posterBaseUrl, spacing } from "../../theme";
import type { TmdbSearchResult, TmdbTitleDetail } from "../../types";
import { UserAvatar } from "../UserAvatar";

function isRecOfWeekLeader(entry: RecOfWeekEntry): boolean {
  return entry.rank === 1;
}

const REC_OF_WEEK_LEADER_HERO_HEIGHT = 118;
const REC_OF_WEEK_POSTER_OVERHANG = 32;
const REC_OF_WEEK_POSTER_WIDTH = 72;
const REC_OF_WEEK_POSTER_HEIGHT = 108;

function HeroFade({ backgroundColor }: { backgroundColor: string }) {
  return (
    <LinearGradient
      colors={["transparent", backgroundColor]}
      locations={[0.2, 1]}
      pointerEvents="none"
      style={{
        bottom: 0,
        height: REC_OF_WEEK_LEADER_HERO_HEIGHT * 0.9,
        left: 0,
        position: "absolute",
        right: 0
      }}
    />
  );
}

type RecOfWeekLeaderboardProps = {
  board: RecOfWeekBoard | null;
  loading?: boolean;
  voting?: boolean;
  onVote: (submissionId: string) => Promise<void>;
  onPostPick: () => void;
  onOpenFilm: (tmdb: TmdbSearchResult) => void;
};

export function RecOfWeekLeaderboard({
  board,
  loading,
  voting,
  onVote,
  onPostPick,
  onOpenFilm
}: RecOfWeekLeaderboardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [viewAllOpen, setViewAllOpen] = useState(false);
  const [countdown, setCountdown] = useState("");

  useEffect(() => {
    if (!board) {
      return;
    }

    const tick = () => setCountdown(formatRecOfWeekCountdown(board.endsAt));
    tick();
    const timer = setInterval(tick, 30_000);
    return () => clearInterval(timer);
  }, [board]);

  if (loading && !board) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Rec of the week</Text>
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accent} size="small" />
        </View>
      </View>
    );
  }

  if (!board) {
    return null;
  }

  const preview = board.entries.slice(0, REC_OF_WEEK_PREVIEW_COUNT);
  const hasMore = board.entries.length > REC_OF_WEEK_PREVIEW_COUNT;

  function handlePostPress() {
    if (!board?.submissionsEnabled) {
      Alert.alert("Posting unavailable", "Run supabase/rec-of-week.sql in Supabase SQL Editor to enable the board.");
      return;
    }
    onPostPick();
  }

  return (
    <>
      <View style={styles.section}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.sectionLabel}>Rec of the week</Text>
            <Text style={styles.countdown}>Ends in {countdown || board.countdownLabel}</Text>
          </View>
          <View style={styles.headerActions}>
            {hasMore ? (
              <Pressable onPress={() => setViewAllOpen(true)}>
                <Text style={styles.viewAll}>View all</Text>
              </Pressable>
            ) : null}
            {board.canSubmit || board.canChangePick ? (
              <Pressable onPress={handlePostPress} style={styles.postButton}>
                <Ionicons name={board.canChangePick ? "swap-horizontal" : "add"} size={14} color={colors.accent} />
                <Text style={styles.postButtonText}>{board.canChangePick ? "Change pick" : "Post pick"}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        {board.entries.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="trophy-outline" size={22} color={colors.muted} />
            <Text style={styles.emptyTitle}>Post a movie you'd want friends to see</Text>
            <Text style={styles.emptyBody}>
              Everyone gets one pick per week. Friends vote on the best submission — top {REC_OF_WEEK_PREVIEW_COUNT} show here
              (max 10 on the board).
            </Text>
            {board.canSubmit ? (
              <Pressable onPress={handlePostPress} style={styles.emptyPostButton}>
                <Text style={styles.emptyPostButtonText}>Post your pick</Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <View style={styles.list}>
            {preview.map((entry) =>
              isRecOfWeekLeader(entry) ? (
                <RecOfWeekLeaderCard
                  key={entry.submissionId}
                  entry={entry}
                  selected={board.userVoteSubmissionId === entry.submissionId}
                  voting={voting}
                  votingEnabled={board.votingEnabled}
                  onVote={() => void onVote(entry.submissionId)}
                  onOpenFilm={() => onOpenFilm(entry.tmdb)}
                  styles={styles}
                  colors={colors}
                />
              ) : (
                <RecOfWeekRow
                  key={entry.submissionId}
                  entry={entry}
                  selected={board.userVoteSubmissionId === entry.submissionId}
                  voting={voting}
                  votingEnabled={board.votingEnabled}
                  onVote={() => void onVote(entry.submissionId)}
                  onOpenFilm={() => onOpenFilm(entry.tmdb)}
                  styles={styles}
                  colors={colors}
                />
              )
            )}
          </View>
        )}
      </View>

      <RecOfWeekViewAllModal
        visible={viewAllOpen}
        board={board}
        countdown={countdown || board.countdownLabel}
        voting={voting}
        onClose={() => setViewAllOpen(false)}
        onVote={onVote}
        onOpenFilm={onOpenFilm}
      />
    </>
  );
}

function RecOfWeekLeaderCard({
  entry,
  selected,
  voting,
  votingEnabled,
  onVote,
  onOpenFilm,
  styles,
  colors
}: {
  entry: RecOfWeekEntry;
  selected: boolean;
  voting?: boolean;
  votingEnabled: boolean;
  onVote: () => void;
  onOpenFilm: () => void;
  styles: ReturnType<typeof createStyles>;
  colors: ColorScheme;
}) {
  const [detail, setDetail] = useState<TmdbTitleDetail | null>(null);
  const display = detail ?? entry.tmdb;
  const posterUri = display?.poster_path ? `${posterBaseUrl}${display.poster_path}` : null;
  const yearLabel = display?.year && display.year !== "Unknown" ? display.year : null;

  useEffect(() => {
    let cancelled = false;
    void getTmdbTitleDetail(entry.tmdb.id, entry.tmdb.media_type)
      .then((loaded) => {
        if (!cancelled) {
          setDetail(loaded);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDetail(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [entry.tmdb.id, entry.tmdb.media_type]);

  const backdropUri = detail?.backdrop_path ? `${backdropBaseUrl}${detail.backdrop_path}` : null;

  function handleVote() {
    if (!votingEnabled) {
      Alert.alert("Voting unavailable", "Run supabase/rec-of-week.sql in Supabase SQL Editor to enable weekly voting.");
      return;
    }
    if (entry.isOwnSubmission) {
      Alert.alert("Can't vote for yourself", "Vote for a friend's pick instead.");
      return;
    }
    onVote();
  }

  return (
    <View style={styles.leaderCard}>
      <Pressable
        accessibilityRole="button"
        onPress={onOpenFilm}
        style={({ pressed }) => [pressed && styles.cardPressed]}
      >
        <View style={styles.leaderHeader}>
          <View style={styles.leaderHeaderMain}>
            <Text style={styles.leaderRank}>#1</Text>
            <View style={styles.leaderTitleGroup}>
              <Text numberOfLines={2} style={styles.leaderTitle}>
                {display?.title ?? "Unknown title"}
              </Text>
              {yearLabel ? <Text style={styles.leaderYear}>{yearLabel}</Text> : null}
            </View>
          </View>
          <View style={styles.leaderVoteBlock}>
            <Text style={styles.leaderVoteCount}>{entry.voteCount}</Text>
            <Text style={styles.leaderVoteLabel}>votes</Text>
          </View>
        </View>

        <View style={styles.leaderHero}>
          <View style={styles.leaderBannerClip} pointerEvents="none">
            {backdropUri ? (
              <Image resizeMode="cover" source={{ uri: backdropUri }} style={styles.leaderBanner} />
            ) : posterUri ? (
              <Image resizeMode="cover" source={{ uri: posterUri }} style={styles.leaderBanner} blurRadius={10} />
            ) : (
              <View style={[styles.leaderBanner, styles.leaderBannerFallback]} />
            )}
            <View style={styles.leaderBannerShade} />
            <HeroFade backgroundColor={colors.card} />
          </View>

          {posterUri ? (
            <View style={styles.leaderPosterFrame}>
              <Image source={{ uri: posterUri }} style={styles.leaderPoster} />
            </View>
          ) : null}
        </View>

        <View style={[styles.leaderSummaryBody, { paddingTop: REC_OF_WEEK_POSTER_OVERHANG + spacing.sm }]}>
          {detail?.tagline ? (
            <Text numberOfLines={1} style={styles.leaderTagline}>
              {detail.tagline.toUpperCase()}
            </Text>
          ) : null}
          {display?.overview ? (
            <Text numberOfLines={4} style={styles.leaderOverview}>
              {display.overview}
            </Text>
          ) : (
            <Text style={styles.leaderOverviewMuted}>No summary available yet.</Text>
          )}
        </View>
      </Pressable>

      <View style={styles.leaderBody}>
        <View style={styles.leaderSenderRow}>
          <UserAvatar profile={entry.user} size={22} />
          <Text numberOfLines={1} style={styles.leaderSenderMeta}>
            {entry.isOwnSubmission ? "Your pick" : `@${entry.user.username}`}
          </Text>
        </View>
        {entry.pitch ? (
          <Text numberOfLines={2} style={styles.leaderPitch}>
            "{entry.pitch}"
          </Text>
        ) : null}
        {!entry.isOwnSubmission ? (
          <Pressable
            disabled={voting}
            onPress={handleVote}
            style={[styles.leaderVoteButton, selected && styles.leaderVoteButtonSelected]}
          >
            <Ionicons
              name={selected ? "checkmark" : "heart-outline"}
              size={15}
              color={selected ? colors.text : colors.accent}
            />
            <Text style={[styles.leaderVoteButtonText, selected && styles.leaderVoteButtonTextSelected]}>
              {selected ? "Voted" : "Vote for this pick"}
            </Text>
          </Pressable>
        ) : (
          <Text style={styles.leaderOwnNote}>Leading the board — friends can vote for your pick.</Text>
        )}
      </View>
    </View>
  );
}

function RecOfWeekRow({
  entry,
  selected,
  voting,
  votingEnabled,
  onVote,
  onOpenFilm,
  styles,
  colors
}: {
  entry: RecOfWeekEntry;
  selected: boolean;
  voting?: boolean;
  votingEnabled: boolean;
  onVote: () => void;
  onOpenFilm: () => void;
  styles: ReturnType<typeof createStyles>;
  colors: ColorScheme;
}) {
  const posterUri = entry.tmdb.poster_path ? `${posterBaseUrl}${entry.tmdb.poster_path}` : null;

  function handleVote() {
    if (!votingEnabled) {
      Alert.alert("Voting unavailable", "Run supabase/rec-of-week.sql in Supabase SQL Editor to enable weekly voting.");
      return;
    }
    if (entry.isOwnSubmission) {
      Alert.alert("Can't vote for yourself", "Vote for a friend's pick instead.");
      return;
    }
    onVote();
  }

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        onPress={onOpenFilm}
        style={({ pressed }) => [styles.rowMain, pressed && styles.cardPressed]}
      >
        <Text style={styles.rank}>{entry.rank}</Text>
        {posterUri ? (
          <Image source={{ uri: posterUri }} style={styles.poster} />
        ) : (
          <View style={[styles.poster, styles.posterFallback]}>
            <Ionicons name="film-outline" size={14} color={colors.muted} />
          </View>
        )}
        <View style={styles.copy}>
          <Text numberOfLines={1} style={styles.title}>
            {entry.tmdb.title}
          </Text>
          <View style={styles.senderRow}>
            <UserAvatar profile={entry.user} size={18} />
            <Text numberOfLines={1} style={styles.senderMeta}>
              {entry.isOwnSubmission ? "Your pick" : entry.user.username}
            </Text>
          </View>
          {entry.pitch ? (
            <Text numberOfLines={1} style={styles.pitch}>
              "{entry.pitch}"
            </Text>
          ) : null}
        </View>
      </Pressable>
      <View style={styles.voteBlock}>
        <Text style={styles.voteCount}>{entry.voteCount}</Text>
        {!entry.isOwnSubmission ? (
          <Pressable
            disabled={voting}
            onPress={handleVote}
            style={[styles.voteButton, selected && styles.voteButtonSelected]}
          >
            <Ionicons
              name={selected ? "checkmark" : "heart-outline"}
              size={14}
              color={selected ? colors.text : colors.accent}
            />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function RecOfWeekViewAllModal({
  visible,
  board,
  countdown,
  voting,
  onClose,
  onVote,
  onOpenFilm
}: {
  visible: boolean;
  board: RecOfWeekBoard;
  countdown: string;
  voting?: boolean;
  onClose: () => void;
  onVote: (submissionId: string) => Promise<void>;
  onOpenFilm: (tmdb: TmdbSearchResult) => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Rec of the week</Text>
              <Text style={styles.countdown}>Ends in {countdown}</Text>
            </View>
            <Pressable onPress={onClose}>
              <Text style={styles.modalClose}>Close</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalList}>
            {board.entries.map((entry) =>
              isRecOfWeekLeader(entry) ? (
                <RecOfWeekLeaderCard
                  key={entry.submissionId}
                  entry={entry}
                  selected={board.userVoteSubmissionId === entry.submissionId}
                  voting={voting}
                  votingEnabled={board.votingEnabled}
                  onVote={() => void onVote(entry.submissionId)}
                  onOpenFilm={() => onOpenFilm(entry.tmdb)}
                  styles={styles}
                  colors={colors}
                />
              ) : (
                <RecOfWeekRow
                  key={entry.submissionId}
                  entry={entry}
                  selected={board.userVoteSubmissionId === entry.submissionId}
                  voting={voting}
                  votingEnabled={board.votingEnabled}
                  onVote={() => void onVote(entry.submissionId)}
                  onOpenFilm={() => onOpenFilm(entry.tmdb)}
                  styles={styles}
                  colors={colors}
                />
              )
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: ColorScheme) {
  return StyleSheet.create({
    section: {
      gap: spacing.sm
    },
    header: {
      alignItems: "flex-start",
      flexDirection: "row",
      justifyContent: "space-between"
    },
    headerCopy: {
      flex: 1,
      gap: 2
    },
    headerActions: {
      alignItems: "flex-end",
      gap: spacing.xs
    },
    sectionLabel: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.8,
      textTransform: "uppercase"
    },
    countdown: {
      color: colors.accent,
      fontSize: 11,
      fontWeight: "700"
    },
    viewAll: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: "700"
    },
    postButton: {
      alignItems: "center",
      flexDirection: "row",
      gap: 4
    },
    postButtonText: {
      color: colors.accent,
      fontSize: 11,
      fontWeight: "800"
    },
    loading: {
      alignItems: "center",
      paddingVertical: spacing.lg
    },
    list: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: 14,
      borderWidth: 1,
      gap: spacing.sm,
      padding: spacing.sm
    },
    leaderCard: {
      backgroundColor: colors.background,
      borderColor: colors.accent,
      borderRadius: 14,
      borderWidth: 1.5,
      overflow: "visible"
    },
    leaderHeader: {
      alignItems: "center",
      backgroundColor: "rgba(0,0,0,0.88)",
      borderTopLeftRadius: 12,
      borderTopRightRadius: 12,
      flexDirection: "row",
      gap: spacing.sm,
      justifyContent: "space-between",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2
    },
    leaderHeaderMain: {
      alignItems: "center",
      flex: 1,
      flexDirection: "row",
      gap: spacing.sm,
      minWidth: 0
    },
    leaderRank: {
      color: colors.accent,
      fontSize: 22,
      fontWeight: "900",
      letterSpacing: -0.3
    },
    leaderTitleGroup: {
      flex: 1,
      gap: 1,
      minWidth: 0
    },
    leaderTitle: {
      color: colors.text,
      fontSize: 17,
      fontWeight: "800",
      lineHeight: 20
    },
    leaderYear: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: "700"
    },
    leaderVoteBlock: {
      alignItems: "flex-end",
      gap: 1
    },
    leaderVoteCount: {
      color: colors.text,
      fontSize: 20,
      fontWeight: "900",
      lineHeight: 22
    },
    leaderVoteLabel: {
      color: colors.muted,
      fontSize: 9,
      fontWeight: "700",
      letterSpacing: 0.4,
      textTransform: "uppercase"
    },
    leaderHero: {
      height: REC_OF_WEEK_LEADER_HERO_HEIGHT,
      overflow: "visible",
      position: "relative"
    },
    leaderBannerClip: {
      ...StyleSheet.absoluteFillObject,
      overflow: "hidden"
    },
    leaderBanner: {
      ...StyleSheet.absoluteFillObject
    },
    leaderBannerFallback: {
      backgroundColor: colors.border
    },
    leaderBannerShade: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.22)"
    },
    leaderPosterFrame: {
      borderColor: colors.border,
      borderRadius: 10,
      borderWidth: 1,
      bottom: -REC_OF_WEEK_POSTER_OVERHANG,
      height: REC_OF_WEEK_POSTER_HEIGHT,
      overflow: "hidden",
      position: "absolute",
      right: spacing.md,
      width: REC_OF_WEEK_POSTER_WIDTH,
      zIndex: 2
    },
    leaderPoster: {
      height: "100%",
      width: "100%"
    },
    leaderSummaryBody: {
      gap: spacing.xs,
      paddingBottom: spacing.xs,
      paddingHorizontal: spacing.md
    },
    leaderTagline: {
      color: colors.muted,
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 0.6
    },
    leaderOverview: {
      color: colors.text,
      fontSize: 12,
      lineHeight: 17
    },
    leaderOverviewMuted: {
      color: colors.muted,
      fontSize: 12,
      lineHeight: 17
    },
    leaderBody: {
      borderTopColor: colors.border,
      borderTopWidth: 1,
      gap: spacing.sm,
      paddingBottom: spacing.md,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm
    },
    leaderSenderRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: spacing.sm
    },
    leaderSenderMeta: {
      color: colors.text,
      flex: 1,
      fontSize: 13,
      fontWeight: "700"
    },
    leaderPitch: {
      color: colors.muted,
      fontSize: 12,
      fontStyle: "italic",
      lineHeight: 17
    },
    leaderVoteButton: {
      alignItems: "center",
      alignSelf: "flex-start",
      borderColor: colors.accent,
      borderRadius: 999,
      borderWidth: 1,
      flexDirection: "row",
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm
    },
    leaderVoteButtonSelected: {
      backgroundColor: colors.accent,
      borderColor: colors.accent
    },
    leaderVoteButtonText: {
      color: colors.accent,
      fontSize: 12,
      fontWeight: "800"
    },
    leaderVoteButtonTextSelected: {
      color: colors.text
    },
    leaderOwnNote: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: "600",
      lineHeight: 15
    },
    row: {
      alignItems: "center",
      flexDirection: "row",
      gap: spacing.sm,
      paddingHorizontal: spacing.xs,
      paddingVertical: spacing.sm
    },
    rowMain: {
      alignItems: "center",
      flex: 1,
      flexDirection: "row",
      gap: spacing.sm,
      minWidth: 0
    },
    cardPressed: {
      opacity: 0.88
    },
    rank: {
      color: colors.muted,
      fontSize: 13,
      fontWeight: "800",
      width: 16
    },
    poster: {
      backgroundColor: colors.border,
      borderRadius: 6,
      height: 48,
      width: 32
    },
    posterFallback: {
      alignItems: "center",
      justifyContent: "center"
    },
    copy: {
      flex: 1,
      gap: 2,
      minWidth: 0
    },
    title: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "800"
    },
    senderRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: spacing.xs
    },
    senderMeta: {
      color: colors.muted,
      flex: 1,
      fontSize: 11,
      fontWeight: "600"
    },
    pitch: {
      color: colors.muted,
      fontSize: 10,
      fontStyle: "italic"
    },
    voteBlock: {
      alignItems: "center",
      gap: 2,
      minWidth: 28
    },
    voteCount: {
      color: colors.text,
      fontSize: 12,
      fontWeight: "900"
    },
    voteButton: {
      alignItems: "center",
      borderColor: colors.border,
      borderRadius: 999,
      borderWidth: 1,
      height: 28,
      justifyContent: "center",
      width: 28
    },
    voteButtonSelected: {
      backgroundColor: colors.accent,
      borderColor: colors.accent
    },
    emptyCard: {
      alignItems: "center",
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: 14,
      borderWidth: 1,
      gap: spacing.xs,
      padding: spacing.lg
    },
    emptyTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "800",
      marginTop: spacing.xs,
      textAlign: "center"
    },
    emptyBody: {
      color: colors.muted,
      fontSize: 13,
      lineHeight: 18,
      textAlign: "center"
    },
    emptyPostButton: {
      backgroundColor: colors.accent,
      borderRadius: 999,
      marginTop: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm
    },
    emptyPostButtonText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: "800"
    },
    modalOverlay: {
      flex: 1,
      justifyContent: "flex-end"
    },
    modalBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.72)"
    },
    modalSheet: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: "80%",
      paddingBottom: spacing.xl
    },
    modalHeader: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg
    },
    modalTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: "900"
    },
    modalClose: {
      color: colors.accent,
      fontSize: 14,
      fontWeight: "700"
    },
    modalList: {
      gap: spacing.xs,
      padding: spacing.lg,
      paddingTop: spacing.md
    }
  });
}
