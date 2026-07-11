import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatStarRating } from "../lib/ratings";
import { useTheme } from "../providers/ThemeProvider";
import type { ColorScheme } from "../theme/colorSchemes";
import { spacing } from "../theme";
import type { TmdbSearchResult } from "../types";
import { Button } from "./Button";
import { PosterCard } from "./PosterCard";
import { StarRatingPicker } from "./StarRatingPicker";

type QuickRatingModalProps = {
  visible: boolean;
  tmdb: TmdbSearchResult | null;
  initialStars?: number;
  onClose: () => void;
  onSubmit: (input: { stars: number; isFavorite: boolean }) => Promise<void>;
};

export function QuickRatingModal({
  visible,
  tmdb,
  initialStars = 0,
  onClose,
  onSubmit
}: QuickRatingModalProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [stars, setStars] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setStars(initialStars);
      setIsFavorite(false);
    }
  }, [initialStars, tmdb?.id, visible]);

  async function handleSubmit() {
    if (!stars) {
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({ stars, isFavorite });
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  if (!tmdb) {
    return null;
  }

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md }]}>
          <View style={styles.header}>
            <Text style={styles.title}>Quick rating</Text>
            <Pressable hitSlop={8} onPress={onClose}>
              <Text style={styles.close}>Close</Text>
            </Pressable>
          </View>

          <PosterCard item={tmdb} />

          <Text style={styles.preview}>
            {stars ? `${formatStarRating(stars)} ★` : "Tap or drag the stars"}
          </Text>

          <StarRatingPicker
            compact
            value={stars}
            onChange={setStars}
            isFavorite={isFavorite}
            onFavoriteChange={setIsFavorite}
          />

          <Button
            title={submitting ? "Saving..." : "Save rating"}
            disabled={submitting || !stars}
            onPress={() => void handleSubmit()}
          />
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: ColorScheme) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: "flex-end"
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.72)"
    },
    sheet: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg
    },
    header: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between"
    },
    title: {
      color: colors.text,
      fontSize: 18,
      fontWeight: "800"
    },
    close: {
      color: colors.muted,
      fontSize: 14,
      fontWeight: "700"
    },
    preview: {
      color: colors.muted,
      fontSize: 13,
      fontWeight: "700",
      textAlign: "center"
    }
  });
}
