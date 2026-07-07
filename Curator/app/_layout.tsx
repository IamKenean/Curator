import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ConfigErrorScreen } from "../src/components/ConfigErrorScreen";
import { SplashGate } from "../src/components/SplashGate";
import { getBlockingEnvIssues } from "../src/lib/env";
import { AuthProvider } from "../src/providers/AuthProvider";
import { NotificationProvider } from "../src/providers/NotificationProvider";
import { ThemeProvider, useTheme } from "../src/providers/ThemeProvider";

function ThemedStack() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: "800" },
        contentStyle: { backgroundColor: colors.background }
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="auth/sign-in" options={{ title: "Sign In" }} />
      <Stack.Screen name="auth/sign-up" options={{ title: "Sign Up" }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="sent" options={{ title: "Sent" }} />
      <Stack.Screen name="rated" options={{ title: "Rated" }} />
      <Stack.Screen name="responses" options={{ title: "Responses" }} />
      <Stack.Screen name="category/[slug]" options={{ title: "Browse" }} />
      <Stack.Screen name="list/[id]" options={{ title: "List" }} />
    </Stack>
  );
}

export default function RootLayout() {
  const configIssues = getBlockingEnvIssues();

  if (configIssues.length > 0) {
    return (
      <>
        <StatusBar style="light" />
        <ConfigErrorScreen />
      </>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <SplashGate>
          <AuthProvider>
            <NotificationProvider>
              <StatusBar style="light" />
              <ThemedStack />
            </NotificationProvider>
          </AuthProvider>
        </SplashGate>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
