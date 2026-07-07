import { useEffect, useMemo, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { formatComparison, formatStarRating } from "../lib/ratings";
import { useTheme } from "../providers/ThemeProvider";
import type { ColorScheme } from "../theme";
import { spacing } from "../theme";
import type { Recommendation, TmdbSearchResult } from "../types";
import { Button } from "./Button";
import { PosterCard } from "./PosterCard";
import { StarRatingPicker } from "./StarRatingPicker";
import { TextField } from "./TextField";

type RatingModalProps = {
  visible: boolean;
  recommendation: Recommendation | null;
  tmdb?: TmdbSearchResult;
  onClose: () => void;
  onSubmit: (input: { stars: number; notes: string; isFavorite: boolean }) => Promise<void>;
};

export function RatingModal({ visible, recommendation, tmdb, onClose, onSubmit }: RatingModalProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [stars, setStars] = useState(0);
  const [notes, setNotes] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setStars(0);
      setNotes("");
      setIsFavorite(false);
    }
  }, [visible, recommendation?.id]);

  async function handleSubmit() {
    if (!stars) {
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({ stars, notes, isFavorite });
      setStars(0);
      setNotes("");
      setIsFavorite(false);
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  const comparison = formatComparison(recommendation?.estimated_rating, stars);

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.keyboardAvoid}>
          <View style={styles.sheet}>
            <ScrollView
              bounces={false}
              keyboardShouldPersistTaps="always"
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sheetTop}
            >
              <View style={styles.header}>
                <Text style={styles.title}>Rate it</Text>
                <Pressable onPress={onClose}>
                  <Text style={styles.close}>Close</Text>
                </Pressable>
              </View>

              {tmdb ? <PosterCard item={tmdb} /> : null}

              {recommendation?.estimated_rating ? (
                <View style={styles.estimateCard}>
                  <Text style={styles.estimateLabel}>Their estimate for you</Text>
                  <Text style={styles.estimateValue}>{formatStarRating(recommendation.estimated_rating)} ★</Text>
                </View>
              ) : null}

              {recommendation?.sender_rating ? (
                <Text style={styles.senderRating}>They rate it {formatStarRating(recommendation.sender_rating)} ★</Text>
              ) : null}
            </ScrollView>

            <StarRatingPicker
              value={stars}
              onChange={setStars}
              isFavorite={isFavorite}
              onFavoriteChange={setIsFavorite}
            />

            {comparison ? <Text style={styles.compareDiff}>{comparison.diffText}</Text> : null}

            <TextField
              label="Notes"
              multiline
              maxLength={500}
              value={notes}
              onChangeText={setNotes}
              placeholder="Thoughts on this one..."
              style={styles.notes}
            />

            <Button title={submitting ? "Saving..." : "Submit review"} disabled={submitting || !stars} onPress={handleSubmit} />
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function createStyles(colors: ColorScheme) {
  return StyleSheet.create({
    overlay: {
      backgroundColor: "rgba(0,0,0,0.72)",
      flex: 1,
      justifyContent: "flex-end"
    },
    keyboardAvoid: {
      flex: 1,
      justifyContent: "flex-end"
    },
    sheet: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      gap: spacing.lg,
      maxHeight: "92%",
      padding: spacing.lg
    },
    sheetTop: {
      gap: spacing.lg
    },
    header: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between"
    },
    title: {
      color: colors.text,
      fontSize: 24,
      fontWeight: "800"
    },
    close: {
      color: colors.accent,
      fontSize: 15,
      fontWeight: "700"
    },
    estimateCard: {
      alignItems: "center",
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: 14,
      borderWidth: 1,
      gap: spacing.xs,
      padding: spacing.md
    },
    estimateLabel: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 1,
      textTransform: "uppercase"
    },
    estimateValue: {
      color: colors.star,
      fontSize: 28,
      fontWeight: "800"
    },
    senderRating: {
      color: colors.muted,
      fontSize: 14,
      fontWeight: "700",
      textAlign: "center"
    },
    compareDiff: {
      color: colors.star,
      fontSize: 13,
      fontWeight: "700",
      textAlign: "center"
    },
    notes: {
      minHeight: 96,
      textAlignVertical: "top"
    }
  });
}
