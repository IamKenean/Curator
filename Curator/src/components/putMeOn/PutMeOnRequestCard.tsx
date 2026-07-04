import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import type { PutMeOnRequest } from "../../lib/putMeOnRequests";
import { colors, spacing } from "../../theme";
import { UserAvatar } from "../UserAvatar";
import { HiddenPosterRow } from "./HiddenPosterRow";
import { PutMeOnExampleFilms } from "./PutMeOnExampleFilms";
import { PutMeOnGenreTags } from "./PutMeOnGenreTags";

type PutMeOnRequestCardProps = {
  request: PutMeOnRequest;
  onPutThemOn: (ownerId: string, requestId: string) => void;
};

export function PutMeOnRequestCard({ request, onPutThemOn }: PutMeOnRequestCardProps) {
  function handlePutThemOn() {
    if (request.isMock) {
      Alert.alert("Preview only", "This is sample data. Use Put Them On for a real friend's request.");
      return;
    }

    onPutThemOn(request.user.id, request.id);
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <UserAvatar profile={request.user} size={36} />
        <View style={styles.headerCopy}>
          <Text style={styles.name}>{request.user.username}</Text>
          <Text style={styles.looking}>is looking for:</Text>
        </View>
      </View>

      <Text style={styles.prompt}>"{request.prompt}"</Text>
      <PutMeOnGenreTags genres={request.genres} />
      <Text style={styles.meta}>{request.responseCount} people put them on</Text>

      <HiddenPosterRow posters={request.hiddenPosters} extraCount={request.extraCount} size="md" hidden />

      <PutMeOnExampleFilms films={request.exampleFilms} />

      <View style={styles.footer}>
        <Pressable
          onPress={handlePutThemOn}
          style={[styles.action, request.isMock && styles.actionMock]}
        >
          <Text style={styles.actionText}>Put Them On</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm
  },
  headerCopy: {
    gap: 1
  },
  name: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800"
  },
  looking: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600"
  },
  prompt: {
    color: colors.text,
    fontSize: 16,
    fontStyle: "italic",
    fontWeight: "700",
    lineHeight: 21
  },
  meta: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "600"
  },
  footer: {
    alignItems: "flex-end",
    marginTop: spacing.xs
  },
  action: {
    borderColor: colors.accent,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  actionMock: {
    borderColor: colors.border
  },
  actionText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase"
  }
});
