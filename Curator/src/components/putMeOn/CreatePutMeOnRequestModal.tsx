import { useEffect, useState } from "react";
import {
  Image,
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
  MAX_USER_PUT_ME_ON_REQUESTS,
  PUT_ME_ON_GENRES,
  PUT_ME_ON_REQUEST_DAYS,
  type CreatePutMeOnRequestInput
} from "../../lib/putMeOnRequests";
import { colors, posterBaseUrl, spacing } from "../../theme";
import type { TmdbSearchResult, UserProfile } from "../../types";
import { Button } from "../Button";
import { TextField } from "../TextField";
import { TmdbSearch } from "../TmdbSearch";
import { UserAvatar } from "../UserAvatar";

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
  const insets = useSafeAreaInsets();
  const [prompt, setPrompt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [useAllFriends, setUseAllFriends] = useState(true);
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [exampleFilms, setExampleFilms] = useState<TmdbSearchResult[]>([]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    setPrompt("");
    setUseAllFriends(true);
    setSelectedFriendIds(friends.map((friend) => friend.id));
    setSelectedGenres([]);
    setExampleFilms([]);
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

  function addExampleFilm(item: TmdbSearchResult | null) {
    if (!item) {
      return;
    }

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

  const examplesFull = exampleFilms.length >= MAX_PUT_ME_ON_EXAMPLE_FILMS;

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.overlay}
      >
        <Pressable style={styles.backdrop} onPress={handleClose} />
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
              Tell friends what you're looking for. Active for {PUT_ME_ON_REQUEST_DAYS} days · {slotsLeft} slot
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

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Example films (optional)</Text>
              <Text style={styles.sectionHint}>Up to {MAX_PUT_ME_ON_EXAMPLE_FILMS} titles in the vibe you're after.</Text>
              {exampleFilms.length > 0 ? (
                <View style={styles.exampleRow}>
                  {exampleFilms.map((film) => {
                    const uri = film.poster_path ? `${posterBaseUrl}${film.poster_path}` : undefined;

                    return (
                      <View key={`${film.media_type}-${film.id}`} style={styles.exampleItem}>
                        {uri ? (
                          <Image source={{ uri }} style={styles.examplePoster} />
                        ) : (
                          <View style={[styles.examplePoster, styles.examplePosterFallback]} />
                        )}
                        <Pressable hitSlop={6} onPress={() => removeExampleFilm(film)} style={styles.exampleRemove}>
                          <Text style={styles.exampleRemoveText}>×</Text>
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              ) : null}
              {!examplesFull ? (
                <TmdbSearch onSelect={addExampleFilm} resultsMaxHeight={140} variant="send" />
              ) : null}
            </View>

            <Button
              title={submitting ? "Posting..." : "Post request"}
              disabled={submitting || !canSubmit}
              onPress={() => void handleCreate()}
            />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
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
  exampleRow: {
    flexDirection: "row",
    gap: spacing.sm
  },
  exampleItem: {
    position: "relative"
  },
  examplePoster: {
    backgroundColor: colors.border,
    borderRadius: 6,
    height: 72,
    width: 48
  },
  examplePosterFallback: {
    opacity: 0.5
  },
  exampleRemove: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    height: 18,
    justifyContent: "center",
    position: "absolute",
    right: -4,
    top: -4,
    width: 18
  },
  exampleRemoveText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 14
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
