import { StyleSheet, Text, View } from "react-native";
import { TmdbSearch } from "../../src/components/TmdbSearch";
import { Screen } from "../../src/components/Screen";
import { colors, spacing } from "../../src/theme";

export default function SearchScreen() {
  return (
    <Screen>
      <TmdbSearch resultsMaxHeight={520} />
      <View style={styles.attributionWrap}>
        <Text style={styles.attribution}>powered by TMDB</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  attributionWrap: {
    alignItems: "center",
    marginTop: spacing.lg
  },
  attribution: {
    color: colors.muted,
    fontSize: 11,
    letterSpacing: 0.4,
    opacity: 0.7,
    textTransform: "lowercase"
  }
});
