import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { trustColorForPercent } from "../lib/trustColors";
import { colors, spacing } from "../theme";
import type { FriendProfileDetail } from "../lib/friendInsights";
import { Button } from "./Button";
import { UserAvatar } from "./UserAvatar";

type FriendProfileModalProps = {
  visible: boolean;
  profile: FriendProfileDetail | null;
  onClose: () => void;
  onPutMeOn: (friendId: string) => void;
};

function StatBlock({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.statBlock}>
      <Text style={[styles.statValue, color ? { color } : null]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export function FriendProfileModal({ visible, profile, onClose, onPutMeOn }: FriendProfileModalProps) {
  if (!profile) {
    return null;
  }

  const yourTrustColor = trustColorForPercent(profile.yourTrustPercent);
  const theirTrustColor = trustColorForPercent(profile.theirTrustPercent);

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            <View style={styles.header}>
              <View style={styles.headerMain}>
                <UserAvatar profile={profile.friend} size={56} />
                <View style={styles.headerText}>
                  <Text style={styles.username}>@{profile.friend.username}</Text>
                </View>
              </View>
              <Pressable onPress={onClose}>
                <Text style={styles.close}>Close</Text>
              </Pressable>
            </View>

            <View style={styles.trustRow}>
              <StatBlock
                label="Your trust in them"
                value={profile.yourTrustPercent != null ? `${profile.yourTrustPercent}%` : "—"}
                color={yourTrustColor}
              />
              <View style={styles.trustDivider} />
              <StatBlock
                label="Their trust in you"
                value={profile.theirTrustPercent != null ? `${profile.theirTrustPercent}%` : "—"}
                color={theirTrustColor}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recent activity</Text>
              <Text style={styles.activity}>{profile.activityLine}</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Genres they rec most</Text>
              <View style={styles.genreRow}>
                {profile.topGenres.map((genre) => (
                  <View key={genre} style={styles.genreChip}>
                    <Text style={styles.genreChipText}>{genre}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.metricsRow}>
              <StatBlock
                label="Hit rate with you"
                value={profile.hitRateWithYou != null ? `${profile.hitRateWithYou}%` : "—"}
              />
              <StatBlock
                label="Taste match"
                value={profile.tasteMatchPercent != null ? `${profile.tasteMatchPercent}%` : "—"}
              />
              <StatBlock label="Recs sent to you" value={`${profile.sentCount}`} />
            </View>

            <Text style={styles.hitRateNote}>
              Hit rate is based on watched recs between you two. Global stats across all friendships require more data.
            </Text>

            <Button
              title="Put Me On"
              icon="paper-plane"
              onPress={() => onPutMeOn(profile.friend.id)}
              style={styles.putMeOnButton}
            />
          </ScrollView>
        </View>
      </View>
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
    maxHeight: "88%"
  },
  content: {
    gap: spacing.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  headerMain: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: spacing.md
  },
  headerText: {
    flex: 1,
    gap: spacing.xs
  },
  username: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "900"
  },
  close: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: "700"
  },
  trustRow: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    paddingVertical: spacing.md
  },
  trustDivider: {
    backgroundColor: colors.border,
    height: "70%",
    width: 1
  },
  statBlock: {
    alignItems: "center",
    flex: 1,
    gap: spacing.xs
  },
  statValue: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "900"
  },
  statLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 14,
    paddingHorizontal: spacing.sm,
    textAlign: "center"
  },
  section: {
    gap: spacing.sm
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800"
  },
  activity: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20
  },
  genreRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  genreChip: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  genreChipText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700"
  },
  metricsRow: {
    flexDirection: "row",
    gap: spacing.sm
  },
  hitRateNote: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 16
  },
  putMeOnButton: {
    marginTop: spacing.sm
  }
});
