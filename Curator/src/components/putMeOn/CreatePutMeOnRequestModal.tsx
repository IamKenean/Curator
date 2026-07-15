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
  MAX_PUT_ME_ON_EXAMPLE_FILMS,
  MAX_PUT_ME_ON_RESPONSES,
  MAX_USER_PUT_ME_ON_REQUESTS,
  PUT_ME_ON_GENRES,
  PUT_ME_ON_REQUEST_DAYS,
  type CreatePutMeOnRequestInput
} from "../../lib/putMeOnRequests";
import { useTheme } from "../../providers/ThemeProvider";
import type { ColorScheme } from "../../theme";
import { spacing } from "../../theme";
import type { TmdbSearchResult, UserProfile } from "../../types";
import { Button } from "../Button";
import { TextField } from "../TextField";
import { TmdbSearch } from "../TmdbSearch";
import { UserAvatar } from "../UserAvatar";
import { ExampleFilmSlots } from "./ExampleFilmSlots";

type CreatePutMeOnRequestModalProps = {
  visible: boolean;
  activeCount: number;
  friends: UserProfile[];
  onClose: () => void;
  onCreate: (input: CreatePutMeOnRequestInput) => Promise<void>;
};

export function CreatePutMeOnRequestModal({
  visible,
  activeCount,
  friends,
  onClose,
  onCreate
}: CreatePutMeOnRequestModalProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const [prompt, setPrompt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [useAllFriends, setUseAllFriends] = useState(true);
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [exampleFilms, setExampleFilms] = useState<TmdbSearchResult[]>([]);
  const [exampleSearchOpen, setExampleSearchOpen] = useState(false);

  useEffect(() => {
    if (!visible) {
      return;
    }

    setPrompt("");
    setUseAllFriends(true);
    setSelectedFriendIds(friends.map((friend) => friend.id));
    setSelectedGenres([]);
    setExampleFilms([]);
    setExampleSearchOpen(false);
  }, [visible, friends]);

  async function handleCreate() {
    setSubmitting(true);
    try {
      await onCreate({
        prompt,
        audience: useAllFriends ? "all_friends" : "selected",
        friendIds: useAllFriends ? [] : selectedFriendIds,
        genres: selectedGenres,
        exampleFilms
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    onClose();
  }

  function handleDismiss() {
    if (exampleSearchOpen) {
      setExampleSearchOpen(false);
      return;
    }

    handleClose();
  }

  const slotsLeft = MAX_USER_PUT_ME_ON_REQUESTS - activeCount;
  const allFriendsSelected =
    friends.length > 0 &&
    (useAllFriends || selectedFriendIds.length === friends.length);
  const canSubmit =
    prompt.trim().length > 0 &&
    friends.length > 0 &&
    (useAllFriends || selectedFriendIds.length > 0);

  function toggleSelectAll() {
    if (allFriendsSelected) {
      setUseAllFriends(false);
      setSelectedFriendIds([]);
      return;
    }

    setUseAllFriends(true);
    setSelectedFriendIds(friends.map((friend) => friend.id));
  }

  function toggleFriend(friendId: string) {
    setUseAllFriends(false);
    setSelectedFriendIds((current) => {
      if (current.includes(friendId)) {
        return current.filter((id) => id !== friendId);
      }
      return [...current, friendId];
    });
  }

  function toggleGenre(genre: string) {
    setSelectedGenres((current) => {
      if (current.includes(genre)) {
        return current.filter((item) => item !== genre);
      }
      return [...current, genre];
    });
  }

  function addExampleFilm(item: TmdbSearchResult) {
    setExampleFilms((current) => {
      if (current.length >= MAX_PUT_ME_ON_EXAMPLE_FILMS) {
        return current;
      }

      const exists = current.some((film) => film.id === item.id && film.media_type === item.media_type);
      if (exists) {
        return current;
      }

      return [...current, item];
    });
  }

  function removeExampleFilm(item: TmdbSearchResult) {
    setExampleFilms((current) =>
      current.filter((film) => !(film.id === item.id && film.media_type === item.media_type))
    );
  }

  function handleExampleSelect(item: TmdbSearchResult | null) {
    if (!item) {
      return;
    }

    addExampleFilm(item);
    setExampleSearchOpen(false);
  }

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
              <Text style={styles.title}>Create request</Text>
              <Pressable onPress={handleClose}>
                <Text style={styles.close}>Close</Text>
              </Pressable>
            </View>

            <Text style={styles.hint}>
              Tell friends what you're looking for. Closes after {MAX_PUT_ME_ON_RESPONSES} films or {PUT_ME_ON_REQUEST_DAYS}{" "}
              days · {slotsLeft} slot
              {slotsLeft === 1 ? "" : "s"} left
            </Text>

            <TextField
              placeholder='e.g. "Something that will ruin me."'
              value={prompt}
              onChangeText={setPrompt}
              multiline
              maxLength={160}
              style={styles.input}
            />
            <Text style={styles.counter}>{prompt.trim().length}/160</Text>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Who can put you on?</Text>
              {friends.length === 0 ? (
                <Text style={styles.emptyFriends}>Add friends first to receive recommendations.</Text>
              ) : (
                <>
                  <View style={styles.friendHeaderRow}>
                    <Text style={styles.friendHint}>Choose who gets notified.</Text>
                    <Pressable onPress={toggleSelectAll} hitSlop={8}>
                      <Text style={[styles.selectAll, allFriendsSelected && styles.selectAllActive]}>Select all</Text>
                    </Pressable>
                  </View>
                  <View style={styles.chipRow}>
                    {friends.map((friend) => {
                      const selected = allFriendsSelected || selectedFriendIds.includes(friend.id);
                      return (
                        <Pressable
                          key={friend.id}
                          onPress={() => toggleFriend(friend.id)}
                          style={[styles.friendChip, selected && styles.friendChipSelected]}
                        >
                          <UserAvatar profile={friend} size={22} />
                          <Text
                            style={[styles.friendChipText, selected && styles.friendChipTextSelected]}
                            numberOfLines={1}
                          >
                            @{friend.username}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Genres (optional)</Text>
              <View style={styles.chipRow}>
                {PUT_ME_ON_GENRES.map((genre) => {
                  const selected = selectedGenres.includes(genre);
                  return (
                    <Pressable
                      key={genre}
                      onPress={() => toggleGenre(genre)}
                      style={[styles.chip, selected && styles.chipSelected]}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{genre}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={[styles.section, styles.exampleSection]}>
              <Text style={styles.sectionLabel}>In the vein of (optional)</Text>
              <Text style={styles.sectionHint}>Tap + to add up to {MAX_PUT_ME_ON_EXAMPLE_FILMS} reference titles.</Text>
              <ExampleFilmSlots
                films={exampleFilms}
                maxSlots={MAX_PUT_ME_ON_EXAMPLE_FILMS}
                onAddPress={() => setExampleSearchOpen(true)}
                onRemove={removeExampleFilm}
              />
            </View>

            <Button
              title={submitting ? "Posting..." : "Post request"}
              disabled={submitting || !canSubmit}
              onPress={() => void handleCreate()}
            />
          </ScrollView>
        </View>

        {exampleSearchOpen ? (
          <View style={styles.pickerOverlay}>
            <Pressable
              accessibilityLabel="Close film search"
              style={styles.pickerScrim}
              onPress={() => setExampleSearchOpen(false)}
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
                    <Text style={styles.pickerTitle}>Pick a reference</Text>
                    <Text style={styles.pickerSubtitle}>
                      Choose a film that matches the vibe you're going for.
                    </Text>
                  </View>
                  <Pressable
                    accessibilityLabel="Close"
                    hitSlop={10}
                    onPress={() => setExampleSearchOpen(false)}
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
                  <TmdbSearch variant="send" resultsMaxHeight={360} onSelect={handleExampleSelect} />
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
  },
  exampleSection: {
    overflow: "visible",
    paddingTop: spacing.xs
  },
  hint: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18
  },
  input: {
    minHeight: 96,
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
  emptyFriends: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18
  },
  friendHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  friendHint: {
    color: colors.muted,
    fontSize: 12
  },
  selectAll: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600"
  },
  selectAllActive: {
    color: colors.text
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
  friendChip: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    maxWidth: "100%",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  friendChipSelected: {
    borderColor: colors.accent,
    backgroundColor: "rgba(230, 57, 70, 0.1)"
  },
  friendChipText: {
    color: colors.muted,
    flexShrink: 1,
    fontSize: 12,
    fontWeight: "700"
  },
  friendChipTextSelected: {
    color: colors.text
  }
  });
}
