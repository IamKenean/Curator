import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { ActivePutMeOnRequest } from "../../lib/putMeOnRequests";
import { MAX_USER_PUT_ME_ON_REQUESTS } from "../../lib/putMeOnRequests";
import { colors, spacing } from "../../theme";
import { PutMeOnActiveRequestCard } from "./PutMeOnActiveRequestCard";

type PutMeOnYourRequestsSectionProps = {
  requests: ActivePutMeOnRequest[];
  onCreatePress: () => void;
  onDeleteRequest: (requestId: string) => void;
};

export function PutMeOnYourRequestsSection({
  requests,
  onCreatePress,
  onDeleteRequest
}: PutMeOnYourRequestsSectionProps) {
  const canCreate = requests.length < MAX_USER_PUT_ME_ON_REQUESTS;

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.sectionLabel}>Your requests</Text>
        {canCreate ? (
          <Pressable onPress={onCreatePress} style={styles.createButton}>
            <Ionicons name="add" size={16} color={colors.accent} />
            <Text style={styles.createText}>Create request</Text>
          </Pressable>
        ) : (
          <Text style={styles.fullHint}>2/2 active</Text>
        )}
      </View>

      {requests.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="chatbubble-ellipses-outline" size={22} color={colors.muted} />
          <Text style={styles.emptyTitle}>Ask friends to put you on</Text>
          <Text style={styles.emptyBody}>Post what you're in the mood for and let them fill it with hidden picks.</Text>
        </View>
      ) : (
        requests.map((request) => (
          <PutMeOnActiveRequestCard
            key={request.id}
            request={request}
            onLongPress={() => onDeleteRequest(request.id)}
          />
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  sectionLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase"
  },
  createButton: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs
  },
  createText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "800"
  },
  fullHint: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700"
  },
  emptyCard: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.lg
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
    marginTop: spacing.xs
  },
  emptyBody: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center"
  }
});
