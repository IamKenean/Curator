import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Button } from "../../src/components/Button";
import { EmptyState } from "../../src/components/EmptyState";
import { Screen } from "../../src/components/Screen";
import { trustScoreToPercent } from "../../src/lib/ratings";
import { getRecommendationStats, getTrustScores } from "../../src/lib/recommendations";
import { useAuth } from "../../src/providers/AuthProvider";
import { colors, spacing } from "../../src/theme";
import type { TrustScore } from "../../src/types";

function formatStatCount(count: number) {
  if (count > 99) {
    return "99+";
  }
  return String(count);
}

function ProfileStats({
  sent,
  rated,
  responsesCount,
  onSent,
  onRated,
  onResponses
}: {
  sent: number;
  rated: number;
  responsesCount: number;
  onSent: () => void;
  onRated: () => void;
  onResponses: () => void;
}) {
  const stats = [
    { count: sent, label: "Sent", onPress: onSent },
    { count: rated, label: "Rated", onPress: onRated },
    { count: responsesCount, label: "Responses", onPress: onResponses }
  ];

  return (
    <View style={styles.statsRow}>
      {stats.map((stat) => (
        <Pressable key={stat.label} onPress={stat.onPress} style={styles.statCell}>
          <Text style={styles.statValue}>{formatStatCount(stat.count)}</Text>
          <Text style={styles.statLabel} numberOfLines={2}>
            {stat.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
  const [sent, setSent] = useState(0);
  const [rated, setRated] = useState(0);
  const [responsesCount, setResponsesCount] = useState(0);
  const [trustScores, setTrustScores] = useState<TrustScore[]>([]);

  const load = useCallback(async () => {
    if (!user) {
      return;
    }

    try {
      const [stats, scores] = await Promise.all([getRecommendationStats(user.id), getTrustScores(user.id)]);
      setSent(stats.sent);
      setRated(stats.rated);
      setResponsesCount(stats.responses);
      setTrustScores(scores);
    } catch (error) {
      Alert.alert("Could not load profile", (error as Error).message);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  return (
    <Screen>
      <View style={styles.profileCard}>
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{profile?.username?.slice(0, 1).toUpperCase() ?? "C"}</Text>
          </View>
          <View style={styles.profileMain}>
            <View style={styles.identityCol}>
              <Text style={styles.username} numberOfLines={1}>
                @{profile?.username ?? "curator"}
              </Text>
              <Text style={styles.muted}>{profile?.avatar_url ? "Avatar set" : "No avatar yet"}</Text>
            </View>
            <View style={styles.statsSlot}>
              <ProfileStats
                sent={sent}
                rated={rated}
                responsesCount={responsesCount}
                onSent={() => router.push("/sent")}
                onRated={() => router.push("/rated")}
                onResponses={() => router.push("/responses")}
              />
            </View>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>Trust Scores</Text>
        {trustScores.length === 0 ? (
          <EmptyState
            title="No trust scores yet"
            body="Scores appear after you rate friends' recommendations that included their star estimate."
          />
        ) : null}
        {trustScores.map((score) => (
          <View key={`${score.user_id}-${score.friend_id}`} style={styles.scoreRow}>
            <View>
              <Text style={styles.friend}>@{score.friend?.username ?? "Unknown"}</Text>
              <Text style={styles.muted}>{score.total_recs} predictions rated</Text>
            </View>
            <Text style={styles.percent}>{trustScoreToPercent(score.score)}%</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>Taste Similarity</Text>
        <EmptyState title="Coming soon" />
      </View>

      <Button title="Sign Out" variant="secondary" onPress={signOut} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md
  },
  profileHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm
  },
  profileMain: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minWidth: 0
  },
  identityCol: {
    flexShrink: 1,
    gap: 2,
    justifyContent: "center",
    minWidth: 0
  },
  statsSlot: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    minWidth: 0
  },
  username: {
    color: colors.text,
    flexShrink: 1,
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 22
  },
  avatar: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  avatarText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900"
  },
  muted: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 14
  },
  statsRow: {
    flexDirection: "row",
    flexShrink: 0,
    gap: spacing.xs,
    justifyContent: "center"
  },
  statCell: {
    alignItems: "center",
    justifyContent: "flex-start",
    width: 56
  },
  statValue: {
    color: colors.star,
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 22,
    textAlign: "center",
    width: "100%"
  },
  statLabel: {
    color: colors.muted,
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 0.2,
    lineHeight: 10,
    textAlign: "center",
    textTransform: "uppercase",
    width: "100%"
  },
  section: {
    gap: spacing.md
  },
  heading: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800"
  },
  scoreRow: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: spacing.lg
  },
  friend: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "800"
  },
  percent: {
    color: colors.accent,
    fontSize: 24,
    fontWeight: "900"
  }
});
