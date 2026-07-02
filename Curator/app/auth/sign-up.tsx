import { router } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { Button } from "../../src/components/Button";
import { Screen } from "../../src/components/Screen";
import { TextField } from "../../src/components/TextField";
import { getAuthErrorMessage, signUpWithUsername } from "../../src/lib/auth";
import { spacing } from "../../src/theme";

export default function SignUpScreen() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function signUp() {
    setLoading(true);

    const { data, error } = await signUpWithUsername({ username, email, password });
    setLoading(false);

    if (error) {
      Alert.alert("Sign up failed", getAuthErrorMessage(error.message));
      return;
    }

    if (!data.session) {
      Alert.alert(
        "Check your email",
        "Your account was created. Confirm your email, then come back and sign in.",
        [{ text: "OK", onPress: () => router.replace("/auth/sign-in") }]
      );
      return;
    }

    router.replace("/(tabs)");
  }

  return (
    <Screen title="Create account">
      <View style={styles.form}>
        <TextField
          label="Username"
          autoCapitalize="none"
          value={username}
          onChangeText={setUsername}
          placeholder="yourname"
        />
        <TextField label="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
        <TextField label="Password" secureTextEntry value={password} onChangeText={setPassword} />
        <Button
          title={loading ? "Creating..." : "Sign Up"}
          disabled={loading || username.trim().length < 2 || !email || password.length < 6}
          onPress={signUp}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.md
  }
});
