import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TmdbSearch } from "./TmdbSearch";
import { colors, spacing } from "../theme";

type MovieSearchModalProps = {
  visible: boolean;
  onClose: () => void;
};

export function MovieSearchModal({ visible, onClose }: MovieSearchModalProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Ionicons name="search-outline" size={20} color={colors.text} />
              <Text style={styles.title}>Search movies</Text>
            </View>
            <Pressable onPress={onClose}>
              <Text style={styles.close}>Close</Text>
            </Pressable>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
          >
            <TmdbSearch resultsMaxHeight={480} />
            <Text style={styles.attribution}>powered by TMDB</Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
    maxHeight: "92%"
  },
  header: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md
  },
  titleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800"
  },
  close: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: "700"
  },
  content: {
    gap: spacing.md,
    padding: spacing.lg
  },
  attribution: {
    color: colors.muted,
    fontSize: 11,
    letterSpacing: 0.4,
    opacity: 0.7,
    textAlign: "center",
    textTransform: "lowercase"
  }
});
