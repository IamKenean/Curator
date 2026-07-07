import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMemo } from "react";
import { TmdbSearch } from "./TmdbSearch";
import { useTheme } from "../providers/ThemeProvider";
import { spacing } from "../theme";
import type { TmdbSearchResult } from "../types";

type MovieSearchPanelProps = {
  onClose: () => void;
  onSelect?: (item: TmdbSearchResult) => void;
  subtitle?: string;
  fill?: boolean;
};

export function MovieSearchPanel({ onClose, onSelect, subtitle, fill = true }: MovieSearchPanelProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={[styles.panel, fill && styles.panelFill]}>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      <View style={styles.searchBody}>
        <TmdbSearch
          autoFocus
          fill
          variant="send"
          onSelect={
            onSelect
              ? (item) => {
                  if (item) {
                    onSelect(item);
                    onClose();
                  }
                }
              : undefined
          }
        />
      </View>
      <Text style={styles.attribution}>powered by TMDB</Text>
    </View>
  );
}

type MovieSearchModalProps = {
  visible: boolean;
  onClose: () => void;
  onSelect?: (item: TmdbSearchResult) => void;
  subtitle?: string;
};

export function MovieSearchModal({ visible, onClose, onSelect, subtitle }: MovieSearchModalProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (!visible) {
    return null;
  }

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { paddingTop: insets.top + spacing.sm, paddingBottom: spacing.md }]}>
          <MovieSearchPanel onClose={onClose} onSelect={onSelect} subtitle={subtitle} />
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: "flex-start"
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0, 0, 0, 0.6)"
    },
    sheet: {
      backgroundColor: colors.background,
      borderBottomLeftRadius: 18,
      borderBottomRightRadius: 18,
      height: "80%",
      maxHeight: "85%",
      paddingHorizontal: spacing.md,
      width: "100%",
      zIndex: 1
    },
    panel: {
      flex: 1,
      minHeight: 0
    },
    panelFill: {
      flex: 1
    },
    subtitle: {
      color: colors.muted,
      fontSize: 13,
      lineHeight: 18,
      marginBottom: spacing.sm
    },
    searchBody: {
      flex: 1,
      minHeight: 0
    },
    attribution: {
      color: colors.muted,
      fontSize: 11,
      letterSpacing: 0.4,
      marginTop: spacing.sm,
      opacity: 0.7,
      textAlign: "center",
      textTransform: "lowercase"
    }
  });
}
