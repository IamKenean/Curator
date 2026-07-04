import { Pressable, StyleSheet, Text, View } from "react-native";
import type { ActivePutMeOnRequest } from "../../lib/putMeOnRequests";
import { colors, spacing } from "../../theme";
import { HiddenPosterRow } from "./HiddenPosterRow";
import { PutMeOnExampleFilms } from "./PutMeOnExampleFilms";
import { PutMeOnGenreTags } from "./PutMeOnGenreTags";

type PutMeOnActiveRequestCardProps = {
  request: ActivePutMeOnRequest;
  onLongPress?: () => void;
};

export function PutMeOnActiveRequestCard({ request, onLongPress }: PutMeOnActiveRequestCardProps) {
  return (
    <Pressable onLongPress={onLongPress} delayLongPress={450} style={styles.card}>
      <Text style={styles.eyebrow}>Your active request</Text>
      <View style={styles.body}>
        <View style={styles.copy}>
          <Text style={styles.label}>You're looking for:</Text>
          <Text style={styles.prompt}>"{request.prompt}"</Text>
          <PutMeOnGenreTags genres={request.genres} />
          <Text style={styles.meta}>
            {request.audienceLabel} · {request.responseCount}{" "}
            {request.responseCount === 1 ? "person" : "people"} put you on · {request.daysLeft} days left
          </Text>
          {onLongPress ? <Text style={styles.holdHint}>Hold to delete</Text> : null}
        </View>
        {request.hiddenPosters.length > 0 || request.extraCount > 0 ? (
          <HiddenPosterRow
            posters={request.hiddenPosters}
            extraCount={request.extraCount}
            size="sm"
            hidden
          />
        ) : (
          <View style={styles.emptyPosters}>
            <Text style={styles.emptyPostersText}>Waiting for recs</Text>
          </View>
        )}
      </View>
      <PutMeOnExampleFilms films={request.exampleFilms} />
    </Pressable>
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
  eyebrow: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase"
  },
  body: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between"
  },
  copy: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0
  },
  label: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600"
  },
  prompt: {
    color: colors.text,
    fontSize: 17,
    fontStyle: "italic",
    fontWeight: "700",
    lineHeight: 22
  },
  meta: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "600",
    marginTop: spacing.xs
  },
  holdHint: {
    color: colors.muted,
    fontSize: 10,
    fontStyle: "italic",
    marginTop: spacing.xs
  },
  emptyPosters: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 8,
    borderStyle: "dashed",
    borderWidth: 1,
    height: 64,
    justifyContent: "center",
    width: 44
  },
  emptyPostersText: {
    color: colors.muted,
    fontSize: 8,
    fontWeight: "700",
    textAlign: "center",
    textTransform: "uppercase"
  }
});
