import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../providers/ThemeProvider";
import type { ColorScheme } from "../theme/colorSchemes";
import { spacing } from "../theme";

type DropdownOption<T extends string> = {
  id: T;
  label: string;
};

type DropdownSelectProps<T extends string> = {
  value: T;
  options: DropdownOption<T>[];
  onChange: (value: T) => void;
};

export function DropdownSelect<T extends string>({ value, options, onChange }: DropdownSelectProps<T>) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.id === value);

  function select(next: T) {
    onChange(next);
    setOpen(false);
  }

  return (
    <>
      <Pressable hitSlop={8} onPress={() => setOpen(true)} style={styles.trigger}>
        <Text style={styles.triggerText}>{selected?.label ?? "Select"}</Text>
        <Ionicons name="chevron-down" size={14} color={colors.muted} />
      </Pressable>

      <Modal animationType="fade" transparent visible={open} onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <View style={styles.menu}>
            {options.map((option) => {
              const isSelected = option.id === value;
              return (
                <Pressable
                  key={option.id}
                  onPress={() => select(option.id)}
                  style={[styles.option, isSelected && styles.optionSelected]}
                >
                  <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>{option.label}</Text>
                  {isSelected ? <Ionicons name="checkmark" size={16} color={colors.accent} /> : null}
                </Pressable>
              );
            })}
          </View>
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
      gap: 4
    },
    triggerText: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: "700"
    },
    overlay: {
      alignItems: "flex-end",
      backgroundColor: "rgba(0, 0, 0, 0.35)",
      flex: 1,
      paddingHorizontal: spacing.sm,
      paddingTop: 160
    },
    menu: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: 12,
      borderWidth: 1,
      minWidth: 196,
      overflow: "hidden"
    },
    option: {
      alignItems: "center",
      flexDirection: "row",
      gap: spacing.sm,
      justifyContent: "space-between",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2
    },
    optionSelected: {
      backgroundColor: colors.background
    },
    optionText: {
      color: colors.text,
      flex: 1,
      fontSize: 14,
      fontWeight: "600"
    },
    optionTextSelected: {
      color: colors.accent,
      fontWeight: "800"
    }
  });
}
