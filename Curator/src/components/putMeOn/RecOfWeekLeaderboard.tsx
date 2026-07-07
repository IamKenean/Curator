import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { RecOfWeekBoard, RecOfWeekEntry } from "../../lib/recOfWeek";
import { formatRecOfWeekCountdown, REC_OF_WEEK_PREVIEW_COUNT } from "../../lib/recOfWeek";
import { useTheme } from "../../providers/ThemeProvider";
import type { ColorScheme } from "../../theme";
import { posterBaseUrl, spacing } from "../../theme";
import { UserAvatar } from "../UserAvatar";

type RecOfWeekLeaderboardProps = {
  board: RecOfWeekBoard | null;
  loading?: boolean;
  voting?: boolean;
  onVote: (submissionId: string) => Promise<void>;
  onPostPick: () => void;
};

export function RecOfWeekLeaderboard({ board, loading, voting, onVote, onPostPick }: RecOfWeekLeaderboardProps) {
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
            {preview.map((entry) => (
              <RecOfWeekRow
                key={entry.submissionId}
                entry={entry}
                selected={board.userVoteSubmissionId === entry.submissionId}
                voting={voting}
                votingEnabled={board.votingEnabled}
                onVote={() => void onVote(entry.submissionId)}
                styles={styles}
                colors={colors}
              />
            ))}
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
      />
    </>
  );
}

function RecOfWeekRow({
  entry,
  selected,
  voting,
  votingEnabled,
  onVote,
  styles,
  colors
}: {
  entry: RecOfWeekEntry;
  selected: boolean;
  voting?: boolean;
  votingEnabled: boolean;
  onVote: () => void;
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
  onVote
}: {
  visible: boolean;
  board: RecOfWeekBoard;
  countdown: string;
  voting?: boolean;
  onClose: () => void;
  onVote: (submissionId: string) => Promise<void>;
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
            {board.entries.map((entry) => (
              <RecOfWeekRow
                key={entry.submissionId}
                entry={entry}
                selected={board.userVoteSubmissionId === entry.submissionId}
                voting={voting}
                votingEnabled={board.votingEnabled}
                onVote={() => void onVote(entry.submissionId)}
                styles={styles}
                colors={colors}
              />
            ))}
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
      gap: spacing.xs,
      padding: spacing.sm
    },
    row: {
      alignItems: "center",
      flexDirection: "row",
      gap: spacing.sm,
      paddingHorizontal: spacing.xs,
      paddingVertical: spacing.sm
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
