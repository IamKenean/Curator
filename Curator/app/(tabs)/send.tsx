import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { Button } from "../../src/components/Button";
import { EmptyState } from "../../src/components/EmptyState";
import { FriendPicker } from "../../src/components/FriendPicker";
import { Screen } from "../../src/components/Screen";
import { SendSectionCard } from "../../src/components/SendSectionCard";
import { StarRatingPicker } from "../../src/components/StarRatingPicker";
import { TmdbSearch } from "../../src/components/TmdbSearch";
import { sendRecommendation } from "../../src/lib/recommendations";
import { getFriendships, getOtherUser } from "../../src/lib/social";
import { useAuth } from "../../src/providers/AuthProvider";
import { colors, spacing } from "../../src/theme";
import type { Friendship, TmdbSearchResult, UserProfile } from "../../src/types";

const ESTIMATE_STAR_EMPTY = "rgba(229, 9, 20, 0.55)";

export default function SendScreen() {
  const { user } = useAuth();
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<UserProfile | null>(null);
  const [selectedTitle, setSelectedTitle] = useState<TmdbSearchResult | null>(null);
  const [estimatedRating, setEstimatedRating] = useState(0);
  const [senderRating, setSenderRating] = useState(0);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [sending, setSending] = useState(false);

  const friends = useMemo(() => {
    if (!user) {
      return [];
    }

    return friendships
      .filter((friendship) => friendship.status === "accepted")
      .map((friendship) => getOtherUser(friendship, user.id))
      .filter((friend): friend is UserProfile => Boolean(friend));
  }, [friendships, user]);

  useEffect(() => {
    if (friends.length === 1 && !selectedFriend) {
      setSelectedFriend(friends[0]);
    }
  }, [friends, selectedFriend]);

  const loadFriends = useCallback(async () => {
    if (!user) {
      return;
    }
    try {
      setFriendships(await getFriendships(user.id));
    } catch (error) {
      Alert.alert("Could not load friends", (error as Error).message);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      void loadFriends();
    }, [loadFriends])
  );

  async function submit() {
    if (!user) {
      Alert.alert("Sign in required", "Sign in again to send recommendations.");
      return;
    }

    if (!selectedFriend) {
      Alert.alert("Pick a friend", "Choose who you want to send this to in step 1.");
      return;
    }

    if (!selectedTitle) {
      Alert.alert("Pick a title", "Tap a movie or show from the search results in step 2.");
      return;
    }

    setSending(true);
    try {
      const result = await sendRecommendation({
        fromUserId: user.id,
        toUserId: selectedFriend.id,
        tmdbId: selectedTitle.id,
        mediaType: selectedTitle.media_type,
        estimatedRating: estimatedRating > 0 ? estimatedRating : null,
        senderRating: senderRating > 0 ? senderRating : null
      });
      const sentTitle = selectedTitle.title;
      const sentFriend = selectedFriend.username;
      setSelectedTitle(null);
      setEstimatedRating(0);
      setSenderRating(0);
      Alert.alert("Sent", result.warning ?? `${sentTitle} was sent to ${sentFriend}.`);
    } catch (error) {
      Alert.alert("Could not send recommendation", (error as Error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <Screen
      scrollEnabled={scrollEnabled}
      edges={["left", "right", "bottom"]}
      contentContainerStyle={styles.screenContent}
    >
      <SendSectionCard title="1. Pick a friend">
        {friends.length === 0 ? (
          <EmptyState title="No friends yet" body="Accept or add a friend before sending recommendations." />
        ) : (
          <FriendPicker
            friends={friends}
            selected={selectedFriend}
            onSelect={setSelectedFriend}
            variant="send"
          />
        )}
      </SendSectionCard>

      <SendSectionCard title="2. Pick a title">
        <TmdbSearch selected={selectedTitle} onSelect={setSelectedTitle} resultsMaxHeight={176} variant="send" />
      </SendSectionCard>

      <SendSectionCard
        title="3. Your estimate (optional)"
        helper="How much you think they'll enjoy it. Used for trust score."
      >
        <StarRatingPicker
          value={estimatedRating}
          onChange={setEstimatedRating}
          showFavorite={false}
          showClear={false}
          sendStyle
          emptyLabel="Not sure"
          starEmptyColor={ESTIMATE_STAR_EMPTY}
          onInteractionChange={(active) => setScrollEnabled(!active)}
        />
      </SendSectionCard>

      <SendSectionCard
        title="4. What do you rate it? (optional)"
        helper="Your personal take on the title. Doesn't affect trust score."
      >
        <StarRatingPicker
          value={senderRating}
          onChange={setSenderRating}
          showFavorite={false}
          showClear={false}
          sendStyle
          emptyLabel="Not rated yet"
          starEmptyColor={colors.muted}
          onInteractionChange={(active) => setScrollEnabled(!active)}
        />
      </SendSectionCard>

      <View style={styles.footer}>
        <Button
          title={sending ? "Sending..." : "Send Recommendation"}
          icon="paper-plane"
          compact
          disabled={sending}
          onPress={submit}
          style={styles.sendButton}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    gap: spacing.sm,
    paddingBottom: spacing.xl * 2,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs
  },
  footer: {
    marginTop: spacing.xs
  },
  sendButton: {
    borderRadius: 12,
    minHeight: 44,
    width: "100%"
  }
});
