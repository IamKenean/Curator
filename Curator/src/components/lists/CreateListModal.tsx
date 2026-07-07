import { useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  LIST_TAG_SUGGESTIONS,
  type CreateCuratorListInput,
  type CuratorList,
  type ListVisibility
} from "../../lib/curatorLists";
import { useTheme } from "../../providers/ThemeProvider";
import type { ColorScheme } from "../../theme";
import { spacing } from "../../theme";
import type { TmdbSearchResult } from "../../types";
import { Button } from "../Button";
import { TextField } from "../TextField";
import { TmdbSearch } from "../TmdbSearch";
import { ListEntryRows } from "./ListEntryRows";

type CreateListModalProps = {
  visible: boolean;
  list?: CuratorList | null;
  onClose: () => void;
  onSubmit: (input: CreateCuratorListInput) => Promise<void>;
};

export function CreateListModal({ visible, list, onClose, onSubmit }: CreateListModalProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [entries, setEntries] = useState<TmdbSearchResult[]>([]);
  const [visibility, setVisibility] = useState<ListVisibility>("friends");
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [entrySearchOpen, setEntrySearchOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) {
      return;
    }

    setName(list?.name ?? "");
    setDescription(list?.description ?? "");
    setEntries(list?.entries ?? []);
    setVisibility(list?.visibility ?? "friends");
    setTags(list?.tags ?? []);
    setTagDraft("");
    setEntrySearchOpen(false);
  }, [visible, list]);

  const isEditing = Boolean(list);

  function handleDismiss() {
    if (entrySearchOpen) {
      setEntrySearchOpen(false);
      return;
    }

    onClose();
  }

  function addEntry(item: TmdbSearchResult) {
    setEntries((current) => {
      const exists = current.some((entry) => entry.id === item.id && entry.media_type === item.media_type);
      if (exists) {
        return current;
      }
      return [...current, item];
    });
  }

  function removeEntry(item: TmdbSearchResult) {
    setEntries((current) =>
      current.filter((entry) => !(entry.id === item.id && entry.media_type === item.media_type))
    );
  }

  function toggleTag(tag: string) {
    setTags((current) => {
      if (current.includes(tag)) {
        return current.filter((item) => item !== tag);
      }
      return [...current, tag];
    });
  }

  function addCustomTag() {
    const trimmed = tagDraft.trim();
    if (!trimmed) {
      return;
    }

    setTags((current) => (current.includes(trimmed) ? current : [...current, trimmed]));
    setTagDraft("");
  }

  async function handleCreate() {
    setSubmitting(true);
    try {
      await onSubmit({
        name,
        description,
        entries,
        visibility,
        tags
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  function handleEntrySelect(item: TmdbSearchResult | null) {
    if (!item) {
      return;
    }

    addEntry(item);
    setEntrySearchOpen(false);
  }

  const canSubmit = name.trim().length > 0 && entries.length > 0;

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={handleDismiss}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.overlay}
      >
        <Pressable style={styles.backdrop} onPress={handleDismiss} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
          <ScrollView
            bounces={false}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
          >
            <View style={styles.header}>
              <Text style={styles.title}>{isEditing ? "Edit list" : "Create list"}</Text>
              <Pressable onPress={onClose}>
                <Text style={styles.close}>Close</Text>
              </Pressable>
            </View>

            <TextField
              label="List name"
              placeholder='e.g. "Comfort rewatches"'
              value={name}
              onChangeText={setName}
              maxLength={80}
            />

            <TextField
              label="Description"
              placeholder="What is this list about?"
              value={description}
              onChangeText={setDescription}
              multiline
              maxLength={280}
              style={styles.descriptionInput}
            />
            <Text style={styles.counter}>{description.trim().length}/280</Text>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Entries</Text>
              <Text style={styles.sectionHint}>Add as many titles as you want.</Text>
              <ListEntryRows
                entries={entries}
                onAddPress={() => setEntrySearchOpen(true)}
                onRemove={removeEntry}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Visibility</Text>
              <View style={styles.visibilityRow}>
                <Pressable
                  onPress={() => setVisibility("public")}
                  style={[styles.visibilityChip, visibility === "public" && styles.visibilityChipSelected]}
                >
                  <Text
                    style={[
                      styles.visibilityChipText,
                      visibility === "public" && styles.visibilityChipTextSelected
                    ]}
                  >
                    Public
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setVisibility("friends")}
                  style={[styles.visibilityChip, visibility === "friends" && styles.visibilityChipSelected]}
                >
                  <Text
                    style={[
                      styles.visibilityChipText,
                      visibility === "friends" && styles.visibilityChipTextSelected
                    ]}
                  >
                    Friends only
                  </Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Tags (optional)</Text>
              <View style={styles.chipRow}>
                {LIST_TAG_SUGGESTIONS.map((tag) => {
                  const selected = tags.includes(tag);
                  return (
                    <Pressable
                      key={tag}
                      onPress={() => toggleTag(tag)}
                      style={[styles.chip, selected && styles.chipSelected]}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{tag}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.tagDraftRow}>
                <TextField
                  placeholder="Custom tag"
                  value={tagDraft}
                  onChangeText={setTagDraft}
                  maxLength={24}
                  style={styles.tagDraftInput}
                  onSubmitEditing={addCustomTag}
                  returnKeyType="done"
                />
                <Pressable onPress={addCustomTag} style={styles.tagAddButton}>
                  <Text style={styles.tagAddText}>Add</Text>
                </Pressable>
              </View>
              {tags.length > 0 ? (
                <View style={styles.selectedTagsRow}>
                  {tags.map((tag) => (
                    <Pressable key={tag} onPress={() => toggleTag(tag)} style={styles.selectedTag}>
                      <Text style={styles.selectedTagText}>{tag} ×</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>

            <Button
              title={submitting ? "Saving..." : isEditing ? "Save changes" : "Save list"}
              disabled={submitting || !canSubmit}
              onPress={() => void handleCreate()}
            />
          </ScrollView>
        </View>

        {entrySearchOpen ? (
          <View style={styles.pickerOverlay}>
            <Pressable
              accessibilityLabel="Close title search"
              style={styles.pickerScrim}
              onPress={() => setEntrySearchOpen(false)}
            />
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
              keyboardVerticalOffset={insets.top + spacing.md}
              pointerEvents="box-none"
              style={styles.pickerCenter}
            >
              <View style={styles.pickerCard}>
                <View style={styles.pickerHeader}>
                  <View style={styles.pickerHeaderCopy}>
                    <Text style={styles.pickerTitle}>Add to list</Text>
                    <Text style={styles.pickerSubtitle}>Search TMDB and tap a title to add it.</Text>
                  </View>
                  <Pressable
                    accessibilityLabel="Close"
                    hitSlop={10}
                    onPress={() => setEntrySearchOpen(false)}
                    style={styles.pickerCloseButton}
                  >
                    <Text style={styles.pickerCloseText}>×</Text>
                  </Pressable>
                </View>

                <ScrollView
                  bounces={false}
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.pickerBody}
                >
                  <TmdbSearch variant="send" resultsMaxHeight={360} onSelect={handleEntrySelect} />
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
          </View>
        ) : null}
      </KeyboardAvoidingView>
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
      maxHeight: "92%"
    },
    content: {
      gap: spacing.md,
      padding: spacing.lg
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
    descriptionInput: {
      minHeight: 88,
      textAlignVertical: "top"
    },
    counter: {
      color: colors.muted,
      fontSize: 11,
      marginTop: -spacing.sm,
      textAlign: "right"
    },
    section: {
      gap: spacing.sm
    },
    sectionLabel: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.6,
      textTransform: "uppercase"
    },
    sectionHint: {
      color: colors.muted,
      fontSize: 12,
      lineHeight: 16,
      marginTop: -spacing.xs
    },
    visibilityRow: {
      flexDirection: "row",
      gap: spacing.sm
    },
    visibilityChip: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: 999,
      borderWidth: 1,
      flex: 1,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2
    },
    visibilityChipSelected: {
      backgroundColor: "rgba(230, 57, 70, 0.16)",
      borderColor: colors.accent
    },
    visibilityChipText: {
      color: colors.muted,
      fontSize: 13,
      fontWeight: "700",
      textAlign: "center"
    },
    visibilityChipTextSelected: {
      color: colors.accent
    },
    chipRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.xs
    },
    chip: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: spacing.xs + 2
    },
    chipSelected: {
      backgroundColor: "rgba(230, 57, 70, 0.16)",
      borderColor: colors.accent
    },
    chipText: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: "700"
    },
    chipTextSelected: {
      color: colors.accent
    },
    tagDraftRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: spacing.sm
    },
    tagDraftInput: {
      flex: 1,
      minHeight: 44
    },
    tagAddButton: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: 12,
      borderWidth: 1,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2
    },
    tagAddText: {
      color: colors.accent,
      fontSize: 13,
      fontWeight: "800"
    },
    selectedTagsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.xs
    },
    selectedTag: {
      backgroundColor: "rgba(230, 57, 70, 0.12)",
      borderColor: colors.accent,
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs
    },
    selectedTagText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: "700"
    },
    pickerOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
      zIndex: 20
    },
    pickerScrim: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.62)"
    },
    pickerCenter: {
      alignItems: "center",
      justifyContent: "center",
      maxHeight: "82%",
      paddingHorizontal: spacing.lg,
      width: "100%"
    },
    pickerCard: {
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderRadius: 20,
      borderWidth: 1,
      maxHeight: "100%",
      overflow: "hidden",
      width: "100%"
    },
    pickerHeader: {
      alignItems: "flex-start",
      borderBottomColor: colors.border,
      borderBottomWidth: 1,
      flexDirection: "row",
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md
    },
    pickerHeaderCopy: {
      flex: 1,
      gap: spacing.xs
    },
    pickerTitle: {
      color: colors.text,
      fontSize: 20,
      fontWeight: "900"
    },
    pickerSubtitle: {
      color: colors.muted,
      fontSize: 13,
      lineHeight: 18
    },
    pickerCloseButton: {
      alignItems: "center",
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: 999,
      borderWidth: 1,
      height: 32,
      justifyContent: "center",
      width: 32
    },
    pickerCloseText: {
      color: colors.muted,
      fontSize: 22,
      fontWeight: "300",
      lineHeight: 24,
      marginTop: -2
    },
    pickerBody: {
      gap: spacing.md,
      padding: spacing.lg
    }
  });
}
