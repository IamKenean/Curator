import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { PutMeOnSort } from "../../lib/putMeOnFeed";
import type { ActivePutMeOnRequest } from "../../lib/putMeOnRequests";
import { MAX_USER_PUT_ME_ON_REQUESTS } from "../../lib/putMeOnRequests";
import type { PutMeOnRequest } from "../../lib/putMeOnRequests";
import { useTheme } from "../../providers/ThemeProvider";
import type { ColorScheme } from "../../theme";
import { spacing } from "../../theme";
import { PutMeOnActiveRequestCard } from "./PutMeOnActiveRequestCard";
import { PutMeOnRequestCard } from "./PutMeOnRequestCard";

type RequestsTab = "yours" | "open";

const SORT_LABELS: Record<PutMeOnSort, string> = {
  newest: "Newest",
  most_responses: "Most responses",
  ending_soon: "Ending soon"
};

type PutMeOnRequestsPanelProps = {
  yourRequests: ActivePutMeOnRequest[];
  openRequests: PutMeOnRequest[];
  sortBy: PutMeOnSort;
  onCreatePress: () => void;
  onDeleteRequest: (requestId: string) => void;
  onPutThemOn: (ownerId: string, requestId: string) => void;
  onCycleSort: () => void;
};

export function PutMeOnRequestsPanel({
  yourRequests,
  openRequests,
  sortBy,
  onCreatePress,
  onDeleteRequest,
  onPutThemOn,
  onCycleSort
}: PutMeOnRequestsPanelProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [activeTab, setActiveTab] = useState<RequestsTab>("open");
  const canCreate = yourRequests.length < MAX_USER_PUT_ME_ON_REQUESTS;

  const sortedOpen = useMemo(() => {
    const copy = [...openRequests];
    if (sortBy === "most_responses") {
      copy.sort((a, b) => b.responseCount - a.responseCount);
      return copy;
    }
    if (sortBy === "ending_soon") {
      copy.sort((a, b) => a.responseCount - b.responseCount);
      return copy;
    }
    return copy;
  }, [openRequests, sortBy]);

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={styles.tabs}>
          <Pressable
            onPress={() => setActiveTab("yours")}
            style={[styles.tab, activeTab === "yours" && styles.tabSelected]}
          >
            <Text style={[styles.tabText, activeTab === "yours" && styles.tabTextSelected]}>Your requests</Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab("open")}
            style={[styles.tab, activeTab === "open" && styles.tabSelected]}
          >
            <Text style={[styles.tabText, activeTab === "open" && styles.tabTextSelected]}>
              Open requests{openRequests.length > 0 ? ` (${openRequests.length})` : ""}
            </Text>
          </Pressable>
        </View>

        {activeTab === "yours" ? (
          canCreate ? (
            <Pressable onPress={onCreatePress} style={styles.createButton}>
              <Ionicons name="add" size={16} color={colors.accent} />
              <Text style={styles.createText}>Create</Text>
            </Pressable>
          ) : (
            <Text style={styles.fullHint}>2/2 active</Text>
          )
        ) : (
          <Pressable onPress={onCycleSort} style={styles.sortButton}>
            <Text style={styles.sortText}>{SORT_LABELS[sortBy]}</Text>
            <Ionicons name="chevron-down" size={12} color={colors.muted} />
          </Pressable>
        )}
      </View>

      {activeTab === "yours" ? (
        <View style={styles.panelBody}>
          {yourRequests.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="chatbubble-ellipses-outline" size={22} color={colors.muted} />
              <Text style={styles.emptyTitle}>Ask friends to put you on</Text>
              <Text style={styles.emptyBody}>Post what you're in the mood for and let them fill it with hidden picks.</Text>
            </View>
          ) : (
            yourRequests.map((request) => (
              <PutMeOnActiveRequestCard
                key={request.id}
                request={request}
                onLongPress={() => onDeleteRequest(request.id)}
              />
            ))
          )}
        </View>
      ) : (
        <View style={styles.panelBody}>
          {sortedOpen.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="people-outline" size={22} color={colors.muted} />
              <Text style={styles.emptyTitle}>No open requests</Text>
              <Text style={styles.emptyBody}>When friends ask for recs, they'll show up here.</Text>
            </View>
          ) : (
            sortedOpen.map((request) => (
              <PutMeOnRequestCard key={request.id} request={request} onPutThemOn={onPutThemOn} />
            ))
          )}
        </View>
      )}
    </View>
  );
}

function createStyles(colors: ColorScheme) {
  return StyleSheet.create({
    section: {
      gap: spacing.sm
    },
    header: {
      alignItems: "center",
      flexDirection: "row",
      gap: spacing.sm,
      justifyContent: "space-between"
    },
    tabs: {
      flex: 1,
      flexDirection: "row",
      gap: spacing.xs
    },
    tab: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: spacing.xs + 2
    },
    tabSelected: {
      backgroundColor: colors.accent,
      borderColor: colors.accent
    },
    tabText: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: "700"
    },
    tabTextSelected: {
      color: colors.text
    },
    createButton: {
      alignItems: "center",
      flexDirection: "row",
      gap: 2
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
    sortButton: {
      alignItems: "center",
      flexDirection: "row",
      gap: 2
    },
    sortText: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: "700"
    },
    panelBody: {
      gap: spacing.sm
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
}
