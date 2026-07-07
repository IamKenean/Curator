import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getFriendshipState, searchUsers, sendFriendRequest } from "../lib/social";
import { useTheme } from "../providers/ThemeProvider";
import type { ColorScheme } from "../theme";
import { spacing } from "../theme";
import type { Friendship, UserProfile } from "../types";
import { SearchField } from "./SearchField";
import { UserAvatar } from "./UserAvatar";

type AddFriendModalProps = {
  visible: boolean;
  userId: string;
  friendships: Friendship[];
  onClose: () => void;
  onUpdated: () => void;
};

function statusLabel(friendships: Friendship[], userId: string, profileId: string) {
  const state = getFriendshipState(friendships, userId, profileId);
  if (state === "accepted") {
    return "Added";
  }
  if (state === "pending_out") {
    return "Pending";
  }
  if (state === "pending_in") {
    return "Requested";
  }
  return null;
}

export function AddFriendModal({ visible, userId, friendships, onClose, onUpdated }: AddFriendModalProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const inputRef = useRef<TextInput>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setQuery("");
      setResults([]);
      setLoading(false);
      setSendingId(null);
      return;
    }

    const handle = setTimeout(() => inputRef.current?.focus(), 120);
    return () => clearTimeout(handle);
  }, [visible]);

  useEffect(() => {
    if (!visible || !userId) {
      return;
    }

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const handle = setTimeout(() => {
      searchUsers(trimmed, userId)
        .then(setResults)
        .catch((error: Error) => {
          Alert.alert("Search failed", error.message);
          setResults([]);
        })
        .finally(() => setLoading(false));
    }, 350);

    return () => clearTimeout(handle);
  }, [query, visible, userId]);

  async function sendRequest(profile: UserProfile) {
    if (!userId || sendingId) {
      return;
    }

    setSendingId(profile.id);
    try {
      await sendFriendRequest(userId, profile.id);
      onUpdated();
      onClose();
    } catch (error) {
      Alert.alert("Could not send request", (error as Error).message);
    } finally {
      setSendingId(null);
    }
  }

  if (!visible || !userId) {
    return null;
  }

  const trimmedQuery = query.trim();
  const showEmpty =
    trimmedQuery.length >= 2 && !loading && results.length === 0;

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { paddingTop: insets.top + spacing.sm, paddingBottom: spacing.md }]}>
          <View style={styles.searchWrap}>
            <SearchField
              ref={inputRef}
              compact
              placeholder="Search username"
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            {loading ? <ActivityIndicator color={colors.accent} size="small" style={styles.loader} /> : null}
          </View>

          {trimmedQuery.length > 0 && trimmedQuery.length < 2 ? (
            <Text style={styles.hint}>Keep typing to search.</Text>
          ) : null}

          {showEmpty ? <Text style={styles.hint}>No users found.</Text> : null}

          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            renderItem={({ item, index }) => {
              const label = statusLabel(friendships, userId, item.id);
              const isLast = index === results.length - 1;

              return (
                <View style={[styles.row, !isLast && styles.rowBorder]}>
                  <UserAvatar profile={item} size={36} />
                  <Text style={styles.name} numberOfLines={1}>
                    @{item.username}
                  </Text>
                  {label ? (
                    <Text style={styles.status}>{label}</Text>
                  ) : (
                    <Pressable
                      disabled={sendingId === item.id}
                      hitSlop={8}
                      onPress={() => sendRequest(item)}
                      style={styles.addButton}
                    >
                      <Text style={styles.addText}>{sendingId === item.id ? "..." : "Add"}</Text>
                    </Pressable>
                  )}
                </View>
              );
            }}
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
      maxHeight: "72%",
      minHeight: 240,
      paddingHorizontal: spacing.md,
      width: "100%",
      zIndex: 1
    },
    searchWrap: {
      marginBottom: spacing.sm,
      position: "relative"
    },
    loader: {
      position: "absolute",
      right: spacing.sm + 2,
      top: 12
    },
    hint: {
      color: colors.muted,
      fontSize: 13,
      marginBottom: spacing.sm,
      paddingHorizontal: spacing.xs
    },
    list: {
      flexGrow: 0
    },
    listContent: {
      paddingBottom: spacing.xs
    },
    row: {
      alignItems: "center",
      flexDirection: "row",
      gap: spacing.sm,
      minHeight: 52,
      paddingVertical: spacing.sm
    },
    rowBorder: {
      borderBottomColor: colors.border,
      borderBottomWidth: StyleSheet.hairlineWidth
    },
    name: {
      color: colors.text,
      flex: 1,
      fontSize: 15,
      fontWeight: "700",
      minWidth: 0
    },
    addButton: {
      paddingHorizontal: spacing.xs,
      paddingVertical: spacing.xs
    },
    addText: {
      color: colors.accent,
      fontSize: 14,
      fontWeight: "800"
    },
    status: {
      color: colors.muted,
      fontSize: 13,
      fontWeight: "700"
    }
  });
}
