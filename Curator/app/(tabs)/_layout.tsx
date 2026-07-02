import { Redirect, Tabs } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useAuth } from "../../src/providers/AuthProvider";
import { colors } from "../../src/theme";

export default function TabsLayout() {
  const { loading, session } = useAuth();

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/auth/sign-in" />;
  }

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
      <Tabs.Screen name="search" options={{ title: "Movie Search", tabBarLabel: "Search" }} />
      <Tabs.Screen
        name="send"
        options={{
          title: "Send Recommendation",
          tabBarLabel: "Send",
          headerTitleStyle: { fontSize: 17, fontWeight: "800" }
        }}
      />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarLabel: "Profile" }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loading: {
    alignItems: "center",
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: "center"
  }
});
