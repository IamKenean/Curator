import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View
} from "react-native";
import {
  getPutMeOnRequestNotificationsEnabled,
  setPutMeOnRequestNotificationsEnabled
} from "../lib/putMeOnNotifications";
import {
  COLOR_ROLE_LABELS,
  createPosterThemeFromTitle,
  DEFAULT_ROLE_COLORS,
  posterUri
} from "../lib/posterPalette";
import { getFeaturedAppThemes, getPremadeAppTheme, swatchesForAppTheme } from "../lib/premadeAppThemes";
import { getFeaturedPremadeThemes, premadeAsSearchResult } from "../lib/premadePosterThemes";
import { useAuth } from "../providers/AuthProvider";
import { useTheme } from "../providers/ThemeProvider";
import type { ColorScheme } from "../theme/colorSchemes";
import { spacing } from "../theme";
import type { TmdbSearchResult } from "../types";
import { Button } from "./Button";
import { MovieSearchPanel } from "./MovieSearchModal";

type SettingsModalProps = {
  visible: boolean;
  onClose: () => void;
  onSignOut: () => void;
};

const ROLE_KEYS = Object.keys(COLOR_ROLE_LABELS) as (keyof ColorScheme)[];

export function SettingsModal({ visible, onClose, onSignOut }: SettingsModalProps) {
  const { user } = useAuth();
  const {
    colors,
    mode,
    appThemeId,
    isAppTheme,
    posterTheme,
    isPosterTheme,
    setMode,
    applyAppTheme,
    applyPosterTheme,
    resetToDefaultTheme
  } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [putMeOnNotifs, setPutMeOnNotifs] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [applyingTheme, setApplyingTheme] = useState(false);

  useEffect(() => {
    if (!visible || !user) {
      return;
    }

    void getPutMeOnRequestNotificationsEnabled(user.id).then(setPutMeOnNotifs);
  }, [visible, user]);

  useEffect(() => {
    if (!visible) {
      setSearchOpen(false);
    }
  }, [visible]);

  async function togglePutMeOnNotifs(next: boolean) {
    if (!user) {
      return;
    }

    setPutMeOnNotifs(next);
    await setPutMeOnRequestNotificationsEnabled(user.id, next);
  }

  async function handlePosterPick(item: TmdbSearchResult) {
    setApplyingTheme(true);
    try {
      const theme = await createPosterThemeFromTitle(item);
      await applyPosterTheme(theme);
    } catch (error) {
      Alert.alert("Could not build theme", (error as Error).message);
    } finally {
      setApplyingTheme(false);
    }
  }

  async function handleAppThemePick(themeId: string | null) {
    if (themeId === null) {
      await resetToDefaultTheme();
      return;
    }

    await applyAppTheme(themeId);
  }

  const activePalette =
    mode === "poster" && posterTheme
      ? posterTheme.palette
      : mode === "app" && appThemeId
        ? getPremadeAppTheme(appThemeId)?.palette ?? DEFAULT_ROLE_COLORS
        : DEFAULT_ROLE_COLORS;
  const previewPoster = posterTheme ? posterUri(posterTheme.posterPath) : null;
  const featuredThemes = useMemo(() => getFeaturedPremadeThemes(), []);
  const featuredAppThemes = useMemo(() => getFeaturedAppThemes(), []);
  const activeAppTheme = featuredAppThemes.find((entry) => entry.id === appThemeId) ?? null;
  const paletteSourceLabel =
    posterTheme?.source === "curated" ? "Curated palette" : "Generated from poster";

  return (
    <>
      <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
        <View style={styles.overlay}>
          <Pressable style={styles.backdrop} onPress={onClose} />
          <View style={[styles.sheet, searchOpen && styles.sheetSearch]}>
            {searchOpen ? (
              <View style={styles.searchContainer}>
                <View style={styles.searchHeader}>
                  <Pressable onPress={() => setSearchOpen(false)}>
                    <Text style={styles.close}>Back</Text>
                  </Pressable>
                  <Text style={styles.searchTitle}>Choose a movie</Text>
                  <View style={styles.searchHeaderSpacer} />
                </View>
                <MovieSearchPanel
                  onClose={() => setSearchOpen(false)}
                  subtitle="Pick a poster to tint the whole app."
                  onSelect={(item) => void handlePosterPick(item)}
                />
              </View>
            ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
              <View style={styles.header}>
                <Text style={styles.title}>Settings</Text>
                <Pressable onPress={onClose}>
                  <Text style={styles.close}>Close</Text>
                </Pressable>
              </View>

              <View style={styles.section}>
                <View style={styles.rowCopy}>
                  <Text style={styles.rowTitle}>App theme</Text>
                  <Text style={styles.rowHint}>Built-in palettes — true black, grey surfaces, and bright red accents.</Text>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredRow}>
                  <Pressable
                    onPress={() => void handleAppThemePick(null)}
                    style={[styles.featuredChip, mode === "default" && styles.featuredChipSelected]}
                  >
                    <Text style={[styles.featuredChipText, mode === "default" && styles.featuredChipTextSelected]}>
                      Default
                    </Text>
                  </Pressable>
                  {featuredAppThemes.map((entry) => {
                    const selected = mode === "app" && appThemeId === entry.id;
                    return (
                      <Pressable
                        key={entry.id}
                        onPress={() => void handleAppThemePick(entry.id)}
                        style={[styles.featuredChip, selected && styles.featuredChipSelected]}
                      >
                        <Text style={[styles.featuredChipText, selected && styles.featuredChipTextSelected]}>
                          {entry.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                {activeAppTheme ? (
                  <View style={styles.extractedRow}>
                    {swatchesForAppTheme(activeAppTheme).map((swatch) => (
                      <View key={swatch} style={[styles.extractedSwatch, { backgroundColor: swatch }]} />
                    ))}
                  </View>
                ) : null}
              </View>

              <View style={styles.section}>
                <View style={styles.row}>
                  <View style={styles.rowCopy}>
                    <Text style={styles.rowTitle}>Poster theme</Text>
                    <Text style={styles.rowHint}>
                      Pick a movie poster — curated palettes are used when available, otherwise we generate from the
                      poster.
                    </Text>
                  </View>
                  <Switch
                    value={isPosterTheme}
                    disabled={!posterTheme || applyingTheme}
                    onValueChange={(enabled) => setMode(enabled ? "poster" : appThemeId ? "app" : "default")}
                    trackColor={{ false: colors.border, true: colors.accent }}
                    thumbColor={colors.text}
                  />
                </View>

                {posterTheme ? (
                  <View style={styles.posterPreview}>
                    {previewPoster ? (
                      <Image source={{ uri: previewPoster }} style={styles.posterImage} />
                    ) : (
                      <View style={[styles.posterImage, styles.posterFallback]}>
                        <Ionicons name="film-outline" size={18} color={colors.muted} />
                      </View>
                    )}
                    <View style={styles.posterCopy}>
                      <Text style={styles.posterTitle} numberOfLines={2}>
                        {posterTheme.title}
                      </Text>
                      <Text style={styles.posterMeta}>{paletteSourceLabel}</Text>
                    </View>
                  </View>
                ) : null}

                {featuredThemes.length > 0 ? (
                  <View style={styles.featuredSection}>
                    <Text style={styles.featuredLabel}>Popular palettes</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredRow}>
                      {featuredThemes.map((entry) => (
                        <Pressable
                          key={`${entry.mediaType}-${entry.tmdbId}`}
                          disabled={applyingTheme}
                          onPress={() => void handlePosterPick(premadeAsSearchResult(entry))}
                          style={styles.featuredChip}
                        >
                          <Text style={styles.featuredChipText}>{entry.label}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                ) : null}

                <Pressable
                  disabled={applyingTheme}
                  onPress={() => setSearchOpen(true)}
                  style={styles.chooseButton}
                >
                  {applyingTheme ? (
                    <ActivityIndicator color={colors.accent} size="small" />
                  ) : (
                    <>
                      <Ionicons name="color-palette-outline" size={16} color={colors.accent} />
                      <Text style={styles.chooseButtonText}>
                        {posterTheme ? "Choose another movie" : "Choose a movie"}
                      </Text>
                    </>
                  )}
                </Pressable>

                {posterTheme?.swatches.length ? (
                  <View style={styles.extractedRow}>
                    {posterTheme.swatches.slice(0, 6).map((swatch) => (
                      <View key={swatch} style={[styles.extractedSwatch, { backgroundColor: swatch }]} />
                    ))}
                  </View>
                ) : null}

                <View style={styles.roleGrid}>
                  {ROLE_KEYS.map((role) => (
                    <View key={role} style={styles.roleItem}>
                      <View style={styles.roleCompare}>
                        <View style={[styles.roleSwatch, { backgroundColor: DEFAULT_ROLE_COLORS[role] }]} />
                        <Ionicons name="arrow-forward" size={10} color={colors.muted} />
                        <View style={[styles.roleSwatch, { backgroundColor: activePalette[role] }]} />
                      </View>
                      <Text style={styles.roleLabel}>{COLOR_ROLE_LABELS[role]}</Text>
                    </View>
                  ))}
                </View>

                {posterTheme || isAppTheme ? (
                  <Pressable onPress={() => void resetToDefaultTheme()} style={styles.resetButton}>
                    <Text style={styles.resetButtonText}>Reset to default theme</Text>
                  </Pressable>
                ) : null}
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
            )}
          </View>
        </View>
      </Modal>
    </>
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
    sheetSearch: {
      height: "85%",
      maxHeight: "85%"
    },
    searchContainer: {
      flex: 1,
      minHeight: 0,
      padding: spacing.lg,
      paddingBottom: spacing.xl
    },
    searchHeader: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: spacing.sm
    },
    searchTitle: {
      color: colors.text,
      fontSize: 17,
      fontWeight: "800"
    },
    searchHeaderSpacer: {
      width: 40
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
    posterPreview: {
      alignItems: "center",
      flexDirection: "row",
      gap: spacing.sm
    },
    posterImage: {
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderRadius: 8,
      borderWidth: 1,
      height: 72,
      width: 48
    },
    posterFallback: {
      alignItems: "center",
      justifyContent: "center"
    },
    posterCopy: {
      flex: 1,
      gap: 2,
      minWidth: 0
    },
    posterTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "800"
    },
    posterMeta: {
      color: colors.muted,
      fontSize: 12
    },
    chooseButton: {
      alignItems: "center",
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderRadius: 12,
      borderWidth: 1,
      flexDirection: "row",
      gap: spacing.sm,
      justifyContent: "center",
      minHeight: 42,
      paddingHorizontal: spacing.md
    },
    chooseButtonText: {
      color: colors.accent,
      fontSize: 14,
      fontWeight: "800"
    },
    featuredSection: {
      gap: spacing.xs
    },
    featuredLabel: {
      color: colors.muted,
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 0.6,
      textTransform: "uppercase"
    },
    featuredRow: {
      gap: spacing.sm,
      paddingVertical: spacing.xs
    },
    featuredChip: {
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm
    },
    featuredChipSelected: {
      backgroundColor: `${colors.accent}2E`,
      borderColor: colors.accent
    },
    featuredChipText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: "700"
    },
    featuredChipTextSelected: {
      color: colors.accent
    },
    extractedRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm
    },
    extractedSwatch: {
      borderColor: colors.border,
      borderRadius: 999,
      borderWidth: 1,
      height: 24,
      width: 24
    },
    roleGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm
    },
    roleItem: {
      gap: spacing.xs,
      width: "31%"
    },
    roleCompare: {
      alignItems: "center",
      flexDirection: "row",
      gap: 4,
      justifyContent: "center"
    },
    roleSwatch: {
      borderColor: colors.border,
      borderRadius: 999,
      borderWidth: 1,
      height: 18,
      width: 18
    },
    roleLabel: {
      color: colors.muted,
      fontSize: 9,
      fontWeight: "700",
      textAlign: "center",
      textTransform: "uppercase"
    },
    resetButton: {
      alignItems: "center",
      paddingVertical: spacing.xs
    },
    resetButtonText: {
      color: colors.muted,
      fontSize: 13,
      fontWeight: "700"
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
