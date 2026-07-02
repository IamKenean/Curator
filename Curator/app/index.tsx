import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../src/providers/AuthProvider";
import { colors, spacing } from "../src/theme";

export default function Index() {
  const { session, loading } = useAuth();
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    if (!loading) {
      setShowHelp(false);
      return;
    }

    const timer = setTimeout(() => setShowHelp(true), 12000);
    return () => clearTimeout(timer);
  }, [loading]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accent} />
        {showHelp ? (
          <Text style={styles.help}>
            Still loading? Check your internet connection, then force-quit and reopen the app.
          </Text>
        ) : null}
      </View>
    );
  }

  return <Redirect href={session ? "/(tabs)" : "/auth/sign-in"} />;
}

const styles = StyleSheet.create({
  loading: {
    alignItems: "center",
    backgroundColor: colors.background,
    flex: 1,
    gap: spacing.md,
    justifyContent: "center",
    padding: spacing.xl
  },
  help: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center"
  }
});
