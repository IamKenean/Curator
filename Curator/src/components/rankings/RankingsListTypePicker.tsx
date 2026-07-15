import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  DEFAULT_RANKING_LIST_TYPE,
  RANKING_LIST_TYPES,
  rankingListLabel,
  type RankingListType
} from "../../lib/rankingListTypes";
import { useTheme } from "../../providers/ThemeProvider";
import type { ColorScheme } from "../../theme/colorSchemes";
import { spacing } from "../../theme";

type RankingsListTypePickerProps = {
  value?: RankingListType;
  onChange: (listType: RankingListType) => void;
};

export function RankingsListTypePicker({
  value = DEFAULT_RANKING_LIST_TYPE,
  onChange
}: RankingsListTypePickerProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [open, setOpen] = useState(false);
  const label = rankingListLabel(value);

  function selectOption(listType: RankingListType) {
    onChange(listType);
    setOpen(false);
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        hitSlop={6}
        onPress={() => setOpen(true)}
        style={styles.trigger}
      >
        <Text style={styles.triggerText}>({label})</Text>
        <Ionicons name="chevron-down" size={12} color={colors.accent} />
      </Pressable>

      <Modal animationType="fade" transparent visible={open} onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.sheetTitle}>Choose a Top 10 list</Text>
            <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
              {RANKING_LIST_TYPES.map((option) => {
                const selected = option.id === value;
                return (
                  <Pressable
                    key={option.id}
                    onPress={() => selectOption(option.id)}
                    style={[styles.option, selected && styles.optionSelected]}
                  >
                    <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                      {option.label}
                    </Text>
                    {selected ? <Ionicons name="checkmark" size={16} color={colors.accent} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function createStyles(colors: ColorScheme) {
  return StyleSheet.create({
    trigger: {
      alignItems: "center",
      flexDirection: "row",
      gap: 2
    },
    triggerText: {
      color: colors.accent,
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 0.2,
      textTransform: "lowercase"
    },
    overlay: {
      backgroundColor: "rgba(0,0,0,0.72)",
      flex: 1,
      justifyContent: "center",
      padding: spacing.lg
    },
    sheet: {
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderRadius: 16,
      borderWidth: 1,
      gap: spacing.sm,
      maxHeight: "70%",
      padding: spacing.md
    },
    sheetTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "800",
      paddingBottom: spacing.xs
    },
    option: {
      alignItems: "center",
      borderRadius: 10,
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm
    },
    optionSelected: {
      backgroundColor: colors.card
    },
    optionText: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "600",
      textTransform: "lowercase"
    },
    optionTextSelected: {
      color: colors.accent,
      fontWeight: "800"
    }
  });
}
