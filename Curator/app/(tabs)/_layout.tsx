import { Redirect, Tabs } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useAuth } from "../../src/providers/AuthProvider";
import { useTheme } from "../../src/providers/ThemeProvider";

function ThemedTabs() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: "800" },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border
        }
      }}
    >
      <Tabs.Screen name="index" options={{ headerShown: false, tabBarLabel: "Home" }} />
      <Tabs.Screen name="friends" options={{ title: "Friends", tabBarLabel: "Friends" }} />
      <Tabs.Screen name="search" options={{ headerShown: false, tabBarLabel: "Put Me On" }} />
      <Tabs.Screen name="send" options={{ headerShown: false, tabBarLabel: "Send" }} />
      <Tabs.Screen name="profile" options={{ headerShown: false, tabBarLabel: "Profile" }} />
    </Tabs>
  );
}

export default function TabsLayout() {
  const { loading, session } = useAuth();
  const { colors } = useTheme();

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/auth/sign-in" />;
  }

  return <ThemedTabs />;
}

const styles = StyleSheet.create({
  loading: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center"
  }
});
