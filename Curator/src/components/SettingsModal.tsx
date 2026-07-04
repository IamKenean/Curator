import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import {
  getPutMeOnRequestNotificationsEnabled,
  setPutMeOnRequestNotificationsEnabled
} from "../lib/putMeOnNotifications";
import { useAuth } from "../providers/AuthProvider";
import { paletteSwatches } from "../theme/colorSchemes";
import { useTheme } from "../providers/ThemeProvider";
import { spacing } from "../theme";
import { Button } from "./Button";
type SettingsModalProps = {
  visible: boolean;
  onClose: () => void;
  onSignOut: () => void;
};

export function SettingsModal({ visible, onClose, onSignOut }: SettingsModalProps) {
  const { user } = useAuth();
  const { colors, isSuperDark, toggleSuperDark } = useTheme();
  const styles = createStyles(colors);
  const [putMeOnNotifs, setPutMeOnNotifs] = useState(true);

  useEffect(() => {
    if (!visible || !user) {
      return;
    }

    void getPutMeOnRequestNotificationsEnabled(user.id).then(setPutMeOnNotifs);
  }, [visible, user]);

  async function togglePutMeOnNotifs(next: boolean) {
    if (!user) {
      return;
    }

    setPutMeOnNotifs(next);
    await setPutMeOnRequestNotificationsEnabled(user.id, next);
  }
  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            <View style={styles.header}>
              <Text style={styles.title}>Settings</Text>
              <Pressable onPress={onClose}>
                <Text style={styles.close}>Close</Text>
              </Pressable>
            </View>

            <View style={styles.section}>
              <View style={styles.row}>
                <View style={styles.rowCopy}>
                  <Text style={styles.rowTitle}>Super dark mode</Text>
                  <Text style={styles.rowHint}>Warm, muted palette on a deep black base.</Text>
                </View>
                <Switch
                  value={isSuperDark}
                  onValueChange={toggleSuperDark}
                  trackColor={{ false: colors.border, true: colors.accent }}
                  thumbColor={colors.text}
                />
              </View>

              <View style={styles.swatchRow}>
                {paletteSwatches.map((swatch) => (
                  <View key={swatch.name} style={styles.swatchItem}>
                    <View style={[styles.swatch, { backgroundColor: swatch.color }]} />
                    <Text style={styles.swatchLabel} numberOfLines={1}>
                      {swatch.name}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.row}>
                <View style={styles.rowCopy}>
                  <Text style={styles.rowTitle}>Put Me On requests</Text>
                  <Text style={styles.rowHint}>Alerts when friends ask you for recommendations.</Text>
                </View>
                <Switch
                  value={putMeOnNotifs}
                  onValueChange={(value) => void togglePutMeOnNotifs(value)}
                  trackColor={{ false: colors.border, true: colors.accent }}
                  thumbColor={colors.text}
                />
              </View>
            </View>

            <View style={styles.section}>
              <Pressable onPress={onSignOut} style={styles.signOutRow}>
                <Ionicons name="log-out-outline" size={18} color={colors.accent} />
                <Text style={styles.signOutText}>Sign Out</Text>
              </Pressable>
            </View>

            <Button title="Done" variant="secondary" onPress={onClose} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>["colors"]) {
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
      maxHeight: "85%"
    },
    content: {
      gap: spacing.lg,
      padding: spacing.lg,
      paddingBottom: spacing.xl * 2
    },
    header: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between"
    },
    title: {
      color: colors.text,
      fontSize: 22,
      fontWeight: "900"
    },
    close: {
      color: colors.accent,
      fontSize: 15,
      fontWeight: "700"
    },
    section: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: 16,
      borderWidth: 1,
      gap: spacing.md,
      padding: spacing.md
    },
    row: {
      alignItems: "center",
      flexDirection: "row",
      gap: spacing.md,
      justifyContent: "space-between"
    },
    rowCopy: {
      flex: 1,
      gap: spacing.xs
    },
    rowTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "800"
    },
    rowHint: {
      color: colors.muted,
      fontSize: 12,
      lineHeight: 16
    },
    swatchRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm
    },
    swatchItem: {
      alignItems: "center",
      gap: spacing.xs,
      width: "22%"
    },
    swatch: {
      borderColor: colors.border,
      borderRadius: 999,
      borderWidth: 1,
      height: 28,
      width: 28
    },
    swatchLabel: {
      color: colors.muted,
      fontSize: 9,
      fontWeight: "700",
      textAlign: "center"
    },
    signOutRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: spacing.sm,
      justifyContent: "center",
      paddingVertical: spacing.sm
    },
    signOutText: {
      color: colors.accent,
      fontSize: 14,
      fontWeight: "800",
      letterSpacing: 0.4,
      textTransform: "uppercase"
    }
  });
}
