import { Link, router } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { Button } from "../../src/components/Button";
import { Screen } from "../../src/components/Screen";
import { TextField } from "../../src/components/TextField";
import { getAuthErrorMessage, signInWithEmail } from "../../src/lib/auth";
import { colors, spacing } from "../../src/theme";

export default function SignInScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function signIn() {
    setLoading(true);
    const { error } = await signInWithEmail(email, password);
    setLoading(false);

    if (error) {
      Alert.alert("Sign in failed", getAuthErrorMessage(error.message));
      return;
    }

    router.replace("/(tabs)");
  }

  return (
    <Screen title="Curator">
      <Text style={styles.subtitle}>Send better movie and TV recommendations to people you trust.</Text>
      <View style={styles.form}>
        <TextField label="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
        <TextField label="Password" secureTextEntry value={password} onChangeText={setPassword} />
        <Button title={loading ? "Signing in..." : "Sign In"} disabled={loading || !email || !password} onPress={signIn} />
      </View>
      <Link href="/auth/sign-up" style={styles.link}>
        Need an account? Sign up
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 22
  },
  form: {
    gap: spacing.md
  },
  link: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: "700"
  }
});
