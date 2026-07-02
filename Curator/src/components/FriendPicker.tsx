import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "../theme";
import type { UserProfile } from "../types";
import { SearchField } from "./SearchField";
import { UserAvatar } from "./UserAvatar";

const FRIEND_ROW_HEIGHT = 56;
const FRIEND_ROW_HEIGHT_SEND = 46;
const DEFAULT_VISIBLE_COUNT = 2;

type FriendPickerProps = {
  friends: UserProfile[];
  selected?: UserProfile | null;
  onSelect: (friend: UserProfile) => void;
  visibleCount?: number;
  variant?: "default" | "send";
};

function isOnlineSeed(userId: string) {
  let hash = 0;
  for (let index = 0; index < userId.length; index += 1) {
    hash = (hash * 31 + userId.charCodeAt(index)) >>> 0;
  }
  return hash % 3 !== 0;
}

export function FriendPicker({
  friends,
  selected,
  onSelect,
  visibleCount = DEFAULT_VISIBLE_COUNT,
  variant = "default"
}: FriendPickerProps) {
  const [query, setQuery] = useState("");
  const isSend = variant === "send";

  const filteredFriends = useMemo(() => {
    const sorted = [...friends].sort((a, b) => a.username.localeCompare(b.username));
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      return sorted;
    }

    return sorted.filter((friend) => friend.username.toLowerCase().includes(trimmed));
  }, [friends, query]);

  const listMaxHeight =
    (isSend ? FRIEND_ROW_HEIGHT_SEND : FRIEND_ROW_HEIGHT) * visibleCount +
    Math.max(visibleCount - 1, 0) * (isSend ? spacing.xs : spacing.sm) +
    (isSend ? 0 : spacing.sm * 2);

  return (
    <View style={[styles.wrap, isSend && styles.wrapSend]}>
      <SearchField
        compact={isSend}
        placeholder="Find a friend by username"
        value={query}
        onChangeText={setQuery}
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
      />

      {filteredFriends.length === 0 ? (
        <Text style={styles.empty}>{query.trim() ? "No friends match that search." : "No friends to show."}</Text>
      ) : (
        <ScrollView
          keyboardShouldPersistTaps="always"
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
          style={[isSend ? styles.listSend : styles.list, { maxHeight: listMaxHeight }]}
          contentContainerStyle={isSend ? styles.listContentSend : styles.listContent}
        >
          {filteredFriends.map((item, index) => {
            const isSelected = selected?.id === item.id;

            if (isSend) {
              return (
                <View key={item.id}>
                  {index > 0 ? <View style={styles.divider} /> : null}
                  <Pressable
                    onPress={() => onSelect(item)}
                    style={[styles.friendSend, isSelected && styles.friendSendSelected]}
                  >
                    <View style={styles.avatarWrap}>
                      <UserAvatar profile={item} size={34} />
                      <View
                        style={[
                          styles.statusDot,
                          isOnlineSeed(item.id) ? styles.statusOnline : styles.statusOffline
                        ]}
                      />
                    </View>
                    <Text style={styles.friendNameSend}>@{item.username}</Text>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={isSelected ? colors.accent : colors.muted}
                    />
                  </Pressable>
                </View>
              );
            }

            return (
              <View key={item.id}>
                {index > 0 ? <View style={styles.separator} /> : null}
                <Pressable
                  onPress={() => onSelect(item)}
                  style={[styles.friend, isSelected && styles.selected]}
                >
                  <Text style={styles.friendName}>@{item.username}</Text>
                  {isSelected ? <Text style={styles.check}>Selected</Text> : null}
                </Pressable>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md
  },
  wrapSend: {
    gap: spacing.sm
  },
  list: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1
  },
  listSend: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1
  },
  listContent: {
    padding: spacing.sm
  },
  listContentSend: {
    paddingHorizontal: spacing.sm
  },
  separator: {
    height: spacing.sm
  },
  divider: {
    backgroundColor: colors.border,
    height: 1,
    marginHorizontal: spacing.sm
  },
  friend: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: FRIEND_ROW_HEIGHT,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  selected: {
    borderColor: colors.accent,
    borderWidth: 2
  },
  friendSend: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm + 2,
    minHeight: FRIEND_ROW_HEIGHT_SEND,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2
  },
  friendSendSelected: {
    backgroundColor: "rgba(230, 57, 70, 0.08)"
  },
  avatarWrap: {
    position: "relative"
  },
  statusDot: {
    borderColor: colors.background,
    borderRadius: 4,
    borderWidth: 1.5,
    bottom: 0,
    height: 8,
    position: "absolute",
    right: 0,
    width: 8
  },
  statusOnline: {
    backgroundColor: colors.success
  },
  statusOffline: {
    backgroundColor: colors.muted
  },
  friendName: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "800"
  },
  friendNameSend: {
    color: colors.text,
    flex: 1,
    fontSize: 14,
    fontWeight: "700"
  },
  check: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "800"
  },
  empty: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18
  }
});
